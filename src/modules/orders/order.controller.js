const pool = require("../../config/database");
const { createOrderSchema } = require("./order.validation");

async function createOrder(req, res, next) {
  const validation = createOrderSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.error.flatten().fieldErrors,
    });
  }

  const {
    merchant_order_reference,
    amount,
    currency,
    description,
    metadata,
  } = validation.data;

  try {
    const result = await pool.query(
      `INSERT INTO payment_orders (
        merchant_id,
        merchant_order_reference,
        amount,
        currency,
        description,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        merchant_order_reference,
        amount,
        currency,
        status,
        description,
        metadata,
        created_at`,
      [
        req.merchant.id,
        merchant_order_reference,
        amount,
        currency,
        description || null,
        JSON.stringify(metadata),
      ]
    );

    return res.status(201).json({
      message: "Order created successfully",
      order: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Order reference already exists",
      });
    }

    next(error);
  }
}

async function listOrders(req, res, next) {
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20)
  );
  const offset = (page - 1) * limit;
  const status = typeof req.query.status === "string" ? req.query.status : null;
  const search =
    typeof req.query.q === "string" ? req.query.q.trim() : "";

  const allowedStatuses = new Set(["pending", "paid", "cancelled"]);
  if (status && !allowedStatuses.has(status)) {
    return res.status(400).json({ error: "Invalid order status filter" });
  }

  try {
    const params = [req.merchant.id];
    const filters = ["merchant_id = $1"];

    if (status) {
      params.push(status);
      filters.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      filters.push(`merchant_order_reference ILIKE $${params.length}`);
    }

    const where = filters.join(" AND ");

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM payment_orders
       WHERE ${where}`,
      params
    );

    params.push(limit);
    params.push(offset);

    const result = await pool.query(
      `SELECT
          id,
          merchant_order_reference,
          amount,
          currency,
          status,
          description,
          metadata,
          created_at,
          updated_at
       FROM payment_orders
       WHERE ${where}
       ORDER BY created_at DESC
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

async function getOrder(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
          id,
          merchant_order_reference,
          amount,
          currency,
          status,
          description,
          metadata,
          created_at,
          updated_at
       FROM payment_orders
       WHERE id = $1
         AND merchant_id = $2`,
      [req.params.id, req.merchant.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(200).json({ order: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
};
