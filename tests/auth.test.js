const request = require("supertest");
const crypto = require("crypto");

const app = require("../src/app");
const pool = require("../src/config/database");

describe("Merchant Authentication", () => {
  let merchantId;
  let apiKey;
  let apiKeyId;
  let otherMerchantId;
  let otherApiKey;
  let otherOrderId;

  beforeAll(async () => {
    apiKey = "pg_live_" + crypto.randomBytes(32).toString("hex");
    otherApiKey = "pg_live_" + crypto.randomBytes(32).toString("hex");

    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const otherHash = crypto
      .createHash("sha256")
      .update(otherApiKey)
      .digest("hex");

    const merchant = await pool.query(
      `INSERT INTO merchants (business_name, email)
       VALUES ($1, $2)
       RETURNING id`,
      ["Auth Test Merchant", `auth-${crypto.randomUUID()}@example.com`]
    );

    merchantId = merchant.rows[0].id;

    const key = await pool.query(
      `INSERT INTO merchant_api_keys
       (merchant_id, key_hash, key_prefix)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [merchantId, keyHash, apiKey.substring(0, 16)]
    );

    apiKeyId = key.rows[0].id;

    const other = await pool.query(
      `INSERT INTO merchants (business_name, email)
       VALUES ($1, $2)
       RETURNING id`,
      ["Other Auth Merchant", `auth-other-${crypto.randomUUID()}@example.com`]
    );

    otherMerchantId = other.rows[0].id;

    await pool.query(
      `INSERT INTO merchant_api_keys
       (merchant_id, key_hash, key_prefix)
       VALUES ($1, $2, $3)`,
      [otherMerchantId, otherHash, otherApiKey.substring(0, 16)]
    );

    const order = await pool.query(
      `INSERT INTO payment_orders
       (merchant_id, merchant_order_reference, amount, currency)
       VALUES ($1, $2, 10000, 'INR')
       RETURNING id`,
      [otherMerchantId, `auth-other-order-${crypto.randomUUID()}`]
    );

    otherOrderId = order.rows[0].id;
  });

  afterAll(async () => {
    for (const id of [merchantId, otherMerchantId]) {
      if (!id) continue;

      await pool.query(
        `DELETE FROM payment_intents
         WHERE order_id IN (
           SELECT id FROM payment_orders WHERE merchant_id = $1
         )`,
        [id]
      );
      await pool.query(`DELETE FROM payment_orders WHERE merchant_id = $1`, [id]);
      await pool.query(
        `DELETE FROM idempotency_keys WHERE merchant_id = $1`,
        [id]
      );
      await pool.query(
        `DELETE FROM merchant_api_keys WHERE merchant_id = $1`,
        [id]
      );
      await pool.query(`DELETE FROM merchants WHERE id = $1`, [id]);
    }
  });

  it("rejects missing API key", async () => {
    const response = await request(app).get("/api/merchant/profile");
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/API key/i);
  });

  it("rejects malformed API key", async () => {
    const response = await request(app)
      .get("/api/merchant/profile")
      .set("x-api-key", "not-a-valid-key");

    expect(response.status).toBe(401);
  });

  it("authenticates a valid active merchant key", async () => {
    const response = await request(app)
      .get("/api/merchant/profile")
      .set("x-api-key", apiKey);

    expect(response.status).toBe(200);
    expect(response.body.merchant.id).toBe(merchantId);
    expect(JSON.stringify(response.body)).not.toContain(apiKey);
  });

  it("updates last_used_at on successful authentication", async () => {
    await request(app).get("/api/merchant/profile").set("x-api-key", apiKey);

    const result = await pool.query(
      `SELECT last_used_at FROM merchant_api_keys WHERE id = $1`,
      [apiKeyId]
    );

    expect(result.rows[0].last_used_at).not.toBeNull();
  });

  it("rejects inactive API keys", async () => {
    await pool.query(
      `UPDATE merchant_api_keys SET is_active = FALSE WHERE id = $1`,
      [apiKeyId]
    );

    const response = await request(app)
      .get("/api/merchant/profile")
      .set("x-api-key", apiKey);

    expect(response.status).toBe(401);

    await pool.query(
      `UPDATE merchant_api_keys SET is_active = TRUE WHERE id = $1`,
      [apiKeyId]
    );
  });

  it("rejects suspended merchants", async () => {
    await pool.query(
      `UPDATE merchants SET status = 'suspended' WHERE id = $1`,
      [merchantId]
    );

    const response = await request(app)
      .get("/api/merchant/profile")
      .set("x-api-key", apiKey);

    expect(response.status).toBe(401);

    await pool.query(
      `UPDATE merchants SET status = 'active' WHERE id = $1`,
      [merchantId]
    );
  });

  it("rejects payment intents for another merchant's order", async () => {
    const response = await request(app)
      .post("/api/payment-intents")
      .set("x-api-key", apiKey)
      .set("Idempotency-Key", `auth-ownership-${crypto.randomUUID()}`)
      .send({ order_id: otherOrderId });

    expect(response.status).toBe(404);
  });

  it("rejects ledger reversal for another merchant's transaction", async () => {
    const fakeId = crypto.randomUUID();

    const response = await request(app)
      .post(`/api/ledger/transactions/${fakeId}/reverse`)
      .set("x-api-key", apiKey);

    expect(response.status).toBe(404);
  });
});
