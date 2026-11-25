const crypto = require("crypto");

const pool = require("../../config/database");

const {
  createPaymentIntentSchema,
} = require("./payment.validation");

async function createPaymentIntent(req, res, next) {
  const validation = createPaymentIntentSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.error.flatten().fieldErrors,
    });
  }

  const idempotencyKey = req.header("Idempotency-Key");

  if (
    !idempotencyKey ||
    idempotencyKey.trim().length < 8 ||
    idempotencyKey.length > 255
  ) {
    return res.status(400).json({
      error: "A valid Idempotency-Key header is required",
    });
  }

  const { order_id } = validation.data;

  const requestHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        method: req.method,
        endpoint: "/api/payment-intents",
        body: validation.data,
      })
    )
    .digest("hex");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const keyResult = await client.query(
      `INSERT INTO idempotency_keys (
        merchant_id,
        idempotency_key,
        request_hash
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (merchant_id, idempotency_key)
      DO NOTHING
      RETURNING id`,
      [
        req.merchant.id,
        idempotencyKey,
        requestHash,
      ]
    );

    if (keyResult.rowCount === 0) {
      const existingResult = await client.query(
        `SELECT
          request_hash,
          status,
          response_status,
          response_body
         FROM idempotency_keys
         WHERE merchant_id = $1
           AND idempotency_key = $2
         FOR UPDATE`,
        [req.merchant.id, idempotencyKey]
      );

      const existing = existingResult.rows[0];

      if (existing.request_hash !== requestHash) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          error: "Idempotency key reused with a different request",
        });
      }

      if (existing.status === "completed" && existing.response_body) {
        await client.query("COMMIT");

        return res
          .status(existing.response_status)
          .json(existing.response_body);
      }

      await client.query("ROLLBACK");

      return res.status(409).json({
        error: "Request is still processing. Please retry.",
      });
    }

    const orderResult = await client.query(
      `SELECT id, amount, currency
       FROM payment_orders
       WHERE id = $1
         AND merchant_id = $2
         AND status = 'pending'`,
      [order_id, req.merchant.id]
    );

    if (orderResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Order not found or is not eligible for payment",
      });
    }

    const order = orderResult.rows[0];

    const intentResult = await client.query(
      `INSERT INTO payment_intents (
        order_id,
        amount,
        currency
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        order_id,
        amount,
        currency,
        status,
        created_at`,
      [
        order.id,
        order.amount,
        order.currency,
      ]
    );

    const responseBody = {
      message: "Payment intent created successfully",
      payment_intent: intentResult.rows[0],
    };

    await client.query(
      `UPDATE idempotency_keys
       SET status = 'completed',
           response_status = 201,
           response_body = $1
       WHERE merchant_id = $2
         AND idempotency_key = $3`,
      [
        JSON.stringify(responseBody),
        req.merchant.id,
        idempotencyKey,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json(responseBody);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        error: "A payment intent already exists for this order",
      });
    }

    next(error);
  } finally {
    client.release();
  }
}

async function listPaymentIntents(req, res, next) {
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20)
  );
  const offset = (page - 1) * limit;
  const status = typeof req.query.status === "string" ? req.query.status : null;
  const search =
    typeof req.query.q === "string" ? req.query.q.trim() : "";

  const allowedStatuses = new Set([
    "requires_payment_method",
    "processing",
    "requires_action",
    "succeeded",
    "failed",
    "cancelled",
  ]);

  if (status && !allowedStatuses.has(status)) {
    return res.status(400).json({ error: "Invalid payment intent status filter" });
  }

  try {
    const params = [req.merchant.id];
    const filters = ["po.merchant_id = $1"];

    if (status) {
      params.push(status);
      filters.push(`pi.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      filters.push(
        `(pi.id::text ILIKE $${params.length} OR po.merchant_order_reference ILIKE $${params.length})`
      );
    }

    const where = filters.join(" AND ");

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM payment_intents pi
       JOIN payment_orders po ON po.id = pi.order_id
       WHERE ${where}`,
      params
    );

    params.push(limit);
    params.push(offset);

    const result = await pool.query(
      `SELECT
          pi.id,
          pi.order_id,
          pi.amount,
          pi.currency,
          pi.status,
          pi.created_at,
          pi.updated_at,
          po.merchant_order_reference
       FROM payment_intents pi
       JOIN payment_orders po ON po.id = pi.order_id
       WHERE ${where}
       ORDER BY pi.created_at DESC
       LIMIT $${params.length - 1}
       OFFSET $${params.length}`,
      params
    );

    return res.status(200).json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        total_pages: Math.max(
          1,
          Math.ceil(countResult.rows[0].total / limit)
        ),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getPaymentIntent(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
          pi.id,
          pi.order_id,
          pi.amount,
          pi.currency,
          pi.status,
          pi.created_at,
          pi.updated_at,
          po.merchant_order_reference,
          po.status AS order_status
       FROM payment_intents pi
       JOIN payment_orders po ON po.id = pi.order_id
       WHERE pi.id = $1
         AND po.merchant_id = $2`,
      [req.params.id, req.merchant.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Payment intent not found" });
    }

    const attempts = await pool.query(
      `SELECT
          id,
          attempt_number,
          provider,
          provider_reference,
          status,
          failure_code,
          failure_message,
          created_at,
          completed_at
       FROM payment_attempts
       WHERE payment_intent_id = $1
       ORDER BY attempt_number ASC`,
      [req.params.id]
    );

    return res.status(200).json({
      payment_intent: result.rows[0],
      attempts: attempts.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPaymentIntent,
  listPaymentIntents,
  getPaymentIntent,
};
