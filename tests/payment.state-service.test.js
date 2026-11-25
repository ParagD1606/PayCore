
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const pool = require("../src/config/database");
const {
  updatePaymentState,
} = require("../src/modules/payments/payment.state-service");

describe("Payment State Service", () => {
  let paymentIntentId;

  beforeAll(async () => {
    const merchant = await pool.query(
      `INSERT INTO merchants (business_name, email)
       VALUES ($1, $2)
       RETURNING id`,
      ["State Test Merchant", `state-${Date.now()}@test.com`]
    );

    const order = await pool.query(
      `INSERT INTO payment_orders
       (merchant_id, merchant_order_reference, amount, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [merchant.rows[0].id, `state-order-${Date.now()}`, 50000, "INR"]
    );

    const intent = await pool.query(
      `INSERT INTO payment_intents (order_id, amount, currency)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [order.rows[0].id, 50000, "INR"]
    );

    paymentIntentId = intent.rows[0].id;
  });

  afterAll(async () => {
    await pool.query(
      `DELETE FROM payment_intents WHERE id = $1`,
      [paymentIntentId]
    );

    await pool.query(
      `DELETE FROM payment_orders
       WHERE merchant_order_reference LIKE 'state-order-%'`
    );

    await pool.query(
      `DELETE FROM merchants
       WHERE business_name = 'State Test Merchant'`
    );
  });

  it("updates payment state to processing", async () => {
    const result = await updatePaymentState(
      paymentIntentId,
      "processing"
    );

    expect(result.status).toBe("processing");
  });

  it("rejects invalid state transitions", async () => {
    await expect(
      updatePaymentState(paymentIntentId, "cancelled")
    ).rejects.toThrow("Invalid payment transition");
  });
});
