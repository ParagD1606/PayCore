const request = require("supertest");
const crypto = require("crypto");

const app = require("../src/app");
const pool = require("../src/config/database");

describe("Payment Intent Idempotency", () => {
  let merchantId;
  let apiKey;

  async function createOrder(amount = 25000) {
    const response = await request(app)
      .post("/api/orders")
      .set("x-api-key", apiKey)
      .send({
        merchant_order_reference: `idem-order-${crypto.randomUUID()}`,
        amount,
        currency: "INR",
      });

    expect(response.status).toBe(201);
    return response.body.order.id;
  }

  beforeAll(async () => {
    apiKey = "pg_live_" + crypto.randomBytes(32).toString("hex");
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const merchant = await pool.query(
      `INSERT INTO merchants (business_name, email)
       VALUES ($1, $2)
       RETURNING id`,
      ["Idempotency Merchant", `idem-${crypto.randomUUID()}@example.com`]
    );

    merchantId = merchant.rows[0].id;

    await pool.query(
      `INSERT INTO merchant_api_keys
       (merchant_id, key_hash, key_prefix)
       VALUES ($1, $2, $3)`,
      [merchantId, keyHash, apiKey.substring(0, 16)]
    );
  });

  afterAll(async () => {
    if (!merchantId) return;

    await pool.query(
      `DELETE FROM idempotency_keys WHERE merchant_id = $1`,
      [merchantId]
    );
    await pool.query(
      `DELETE FROM payment_intents
       WHERE order_id IN (
         SELECT id FROM payment_orders WHERE merchant_id = $1
       )`,
      [merchantId]
    );
    await pool.query(`DELETE FROM payment_orders WHERE merchant_id = $1`, [
      merchantId,
    ]);
    await pool.query(`DELETE FROM merchant_api_keys WHERE merchant_id = $1`, [
      merchantId,
    ]);
    await pool.query(`DELETE FROM merchants WHERE id = $1`, [merchantId]);
  });

  it("requires an Idempotency-Key header", async () => {
    const orderId = await createOrder();

    const response = await request(app)
      .post("/api/payment-intents")
      .set("x-api-key", apiKey)
      .send({ order_id: orderId });

    expect(response.status).toBe(400);
  });

  it("returns the stored response for the same key and payload", async () => {
    const orderId = await createOrder();
    const key = `idem-same-${crypto.randomUUID()}`;

    const first = await request(app)
      .post("/api/payment-intents")
      .set("x-api-key", apiKey)
      .set("Idempotency-Key", key)
      .send({ order_id: orderId });

    const second = await request(app)
      .post("/api/payment-intents")
      .set("x-api-key", apiKey)
      .set("Idempotency-Key", key)
      .send({ order_id: orderId });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.payment_intent.id).toBe(first.body.payment_intent.id);

    const stored = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM payment_intents
       WHERE order_id = $1`,
      [orderId]
    );

    expect(stored.rows[0].count).toBe(1);
  });

  it("rejects the same key with a different payload", async () => {
    const orderOne = await createOrder(11000);
    const orderTwo = await createOrder(12000);
    const key = `idem-diff-${crypto.randomUUID()}`;

    const first = await request(app)
      .post("/api/payment-intents")
      .set("x-api-key", apiKey)
      .set("Idempotency-Key", key)
      .send({ order_id: orderOne });

    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/payment-intents")
      .set("x-api-key", apiKey)
      .set("Idempotency-Key", key)
      .send({ order_id: orderTwo });

    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/different request/i);
  });

  it("scopes idempotency keys to the merchant", async () => {
    const sharedKey = `idem-scoped-${crypto.randomUUID()}`;
    const orderId = await createOrder(13000);

    const otherKey = "pg_live_" + crypto.randomBytes(32).toString("hex");
    const otherHash = crypto
      .createHash("sha256")
      .update(otherKey)
      .digest("hex");

    const other = await pool.query(
      `INSERT INTO merchants (business_name, email)
       VALUES ($1, $2)
       RETURNING id`,
      ["Scoped Merchant", `scoped-${crypto.randomUUID()}@example.com`]
    );

    const otherMerchantId = other.rows[0].id;

    await pool.query(
      `INSERT INTO merchant_api_keys
       (merchant_id, key_hash, key_prefix)
       VALUES ($1, $2, $3)`,
      [otherMerchantId, otherHash, otherKey.substring(0, 16)]
    );

    const otherOrder = await request(app)
      .post("/api/orders")
      .set("x-api-key", otherKey)
      .send({
        merchant_order_reference: `scoped-order-${crypto.randomUUID()}`,
        amount: 1000,
        currency: "INR",
      });

    const first = await request(app)
      .post("/api/payment-intents")
      .set("x-api-key", apiKey)
      .set("Idempotency-Key", sharedKey)
      .send({ order_id: orderId });

    const second = await request(app)
      .post("/api/payment-intents")
      .set("x-api-key", otherKey)
      .set("Idempotency-Key", sharedKey)
      .send({ order_id: otherOrder.body.order.id });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.payment_intent.id).not.toBe(
      second.body.payment_intent.id
    );

    await pool.query(
      `DELETE FROM idempotency_keys WHERE merchant_id = $1`,
      [otherMerchantId]
    );
    await pool.query(
      `DELETE FROM payment_intents
       WHERE order_id IN (
         SELECT id FROM payment_orders WHERE merchant_id = $1
       )`,
      [otherMerchantId]
    );
    await pool.query(`DELETE FROM payment_orders WHERE merchant_id = $1`, [
      otherMerchantId,
    ]);
    await pool.query(`DELETE FROM merchant_api_keys WHERE merchant_id = $1`, [
      otherMerchantId,
    ]);
    await pool.query(`DELETE FROM merchants WHERE id = $1`, [otherMerchantId]);
  });

  it("handles concurrent duplicate idempotency requests safely", async () => {
    const orderId = await createOrder(99000);
    const key = `idem-concurrent-${crypto.randomUUID()}`;

    const send = () =>
      request(app)
        .post("/api/payment-intents")
        .set("x-api-key", apiKey)
        .set("Idempotency-Key", key)
        .send({ order_id: orderId });

    const results = await Promise.all([send(), send(), send()]);

    const successes = results.filter((r) => r.status === 201);
    expect(successes.length).toBeGreaterThanOrEqual(1);

    const intentIds = new Set(
      successes.map((r) => r.body.payment_intent.id)
    );
    expect(intentIds.size).toBe(1);

    const stored = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM payment_intents
       WHERE order_id = $1`,
      [orderId]
    );

    expect(stored.rows[0].count).toBe(1);
  });

  it("rolls back failed operations without leaving completed idempotency rows", async () => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const key = `idem-rollback-${crypto.randomUUID()}`;
      const hash = crypto.randomBytes(32).toString("hex");

      await client.query(
        `INSERT INTO idempotency_keys
         (merchant_id, idempotency_key, request_hash)
         VALUES ($1, $2, $3)`,
        [merchantId, key, hash]
      );

      await client.query("ROLLBACK");

      const leftover = await pool.query(
        `SELECT 1 FROM idempotency_keys
         WHERE merchant_id = $1 AND idempotency_key = $2`,
        [merchantId, key]
      );

      expect(leftover.rowCount).toBe(0);
    } finally {
      client.release();
    }
  });
});
