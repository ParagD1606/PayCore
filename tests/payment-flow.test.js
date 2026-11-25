const request = require("supertest");
const crypto = require("crypto");

const app = require("../src/app");
const pool = require("../src/config/database");

describe("Payment Gateway Integration", () => {
  let merchantId;
  let apiKey;
  let orderId;

  const email = `test-${crypto.randomUUID()}@example.com`;

  beforeAll(async () => {
    apiKey = "pg_live_" + crypto.randomBytes(32).toString("hex");

    const keyHash = crypto
      .createHash("sha256")
      .update(apiKey)
      .digest("hex");

    const result = await pool.query(
      `INSERT INTO merchants (business_name, email)
       VALUES ($1, $2)
       RETURNING id`,
      ["Integration Test Store", email]
    );

    merchantId = result.rows[0].id;

    await pool.query(
      `INSERT INTO merchant_api_keys
       (merchant_id, key_hash, key_prefix)
       VALUES ($1, $2, $3)`,
      [merchantId, keyHash, apiKey.substring(0, 16)]
    );
  });

  afterAll(async () => {
    if (merchantId) {
      await pool.query(
        `DELETE FROM idempotency_keys
         WHERE merchant_id = $1`,
        [merchantId]
      );

      await pool.query(
        `DELETE FROM payment_intents
         WHERE order_id IN (
           SELECT id FROM payment_orders
           WHERE merchant_id = $1
         )`,
        [merchantId]
      );

      await pool.query(
        `DELETE FROM payment_orders WHERE merchant_id = $1`,
        [merchantId]
      );

      await pool.query(
        `DELETE FROM merchant_api_keys WHERE merchant_id = $1`,
        [merchantId]
      );

      await pool.query(
        `DELETE FROM merchants WHERE id = $1`,
        [merchantId]
      );
    }
  });

  it("should reject requests without API key", async () => {
    const response = await request(app)
      .get("/api/merchant/profile");

    expect(response.status).toBe(401);
  });

  it("should reject invalid API keys", async () => {
    const response = await request(app)
      .get("/api/merchant/profile")
      .set("x-api-key", "invalid");

    expect(response.status).toBe(401);
  });

  it("should authenticate a valid merchant", async () => {
    const response = await request(app)
      .get("/api/merchant/profile")
      .set("x-api-key", apiKey);

    expect(response.status).toBe(200);
    expect(response.body.merchant.id).toBe(merchantId);
  });

  it("should create an order", async () => {
    const response = await request(app)
      .post("/api/orders")
      .set("x-api-key", apiKey)
      .send({
        merchant_order_reference: "INTEGRATION-ORDER-001",
        amount: 50000,
        currency: "INR",
        description: "Integration test order",
      });

    expect(response.status).toBe(201);

    orderId = response.body.order.id;

    expect(response.body.order.amount).toBe("50000");
    expect(response.body.order.status).toBe("pending");
  });

  it("should reject duplicate merchant order references", async () => {
    const response = await request(app)
      .post("/api/orders")
      .set("x-api-key", apiKey)
      .send({
        merchant_order_reference: "INTEGRATION-ORDER-001",
        amount: 50000,
        currency: "INR",
      });

    expect(response.status).toBe(409);
  });

  it("should create a payment intent", async () => {
    const response = await request(app)
      .post("/api/payment-intents")
      .set("x-api-key", apiKey)
      .set("Idempotency-Key", "integration-intent-001")
      .send({ order_id: orderId });

    expect(response.status).toBe(201);
    expect(response.body.payment_intent.order_id).toBe(orderId);

    expect(response.body.payment_intent.status)
      .toBe("requires_payment_method");
  });

  it("should return the same intent for a repeated request", async () => {
    const response = await request(app)
      .post("/api/payment-intents")
      .set("x-api-key", apiKey)
      .set("Idempotency-Key", "integration-intent-001")
      .send({ order_id: orderId });

    expect(response.status).toBe(201);

    const stored = await pool.query(
      `SELECT id FROM payment_intents WHERE order_id = $1`,
      [orderId]
    );

    expect(response.body.payment_intent.id)
      .toBe(stored.rows[0].id);

    expect(stored.rowCount).toBe(1);
  });

  it("should handle concurrent duplicate requests", async () => {
    const orderResponse = await request(app)
        .post("/api/orders")
        .set("x-api-key", apiKey)
        .send({
        merchant_order_reference: "INTEGRATION-CONCURRENT-001",
        amount: 75000,
        currency: "INR",
        });

    expect(orderResponse.status).toBe(201);

    const concurrentOrderId = orderResponse.body.order.id;

    const sendRequest = () =>
        request(app)
        .post("/api/payment-intents")
        .set("x-api-key", apiKey)
        .set("Idempotency-Key", "concurrent-intent-001")
        .send({ order_id: concurrentOrderId });

    const [first, second] = await Promise.all([
        sendRequest(),
        sendRequest(),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    expect(first.body.payment_intent.id)
        .toBe(second.body.payment_intent.id);

    const result = await pool.query(
        `SELECT COUNT(*)::int AS count
        FROM payment_intents
        WHERE order_id = $1`,
        [concurrentOrderId]
    );

    expect(result.rows[0].count).toBe(1);
});
});