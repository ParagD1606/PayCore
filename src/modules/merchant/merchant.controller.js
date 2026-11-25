const pool = require("../../config/database");

async function getOverview(req, res, next) {
  try {
    const merchantId = req.merchant.id;

    const metricsResult = await pool.query(
      `SELECT
          (SELECT COUNT(*)::int
             FROM payment_orders
            WHERE merchant_id = $1) AS total_orders,
          (SELECT COUNT(*)::int
             FROM payment_intents pi
             JOIN payment_orders po ON po.id = pi.order_id
            WHERE po.merchant_id = $1) AS total_payment_intents,
          (SELECT COUNT(*)::int
             FROM payment_intents pi
             JOIN payment_orders po ON po.id = pi.order_id
            WHERE po.merchant_id = $1
              AND pi.status = 'succeeded') AS successful_payments,
          (SELECT COUNT(*)::int
             FROM payment_intents pi
             JOIN payment_orders po ON po.id = pi.order_id
            WHERE po.merchant_id = $1
              AND pi.status = 'failed') AS failed_payments,
          (SELECT COALESCE(SUM(pi.amount), 0)::bigint
             FROM payment_intents pi
             JOIN payment_orders po ON po.id = pi.order_id
            WHERE po.merchant_id = $1
              AND pi.status = 'succeeded') AS total_payment_volume`,
      [merchantId]
    );

    const volumeByDay = await pool.query(
      `SELECT
          DATE(pi.created_at) AS day,
          COALESCE(SUM(pi.amount), 0)::bigint AS volume,
          COUNT(*)::int AS count
       FROM payment_intents pi
       JOIN payment_orders po ON po.id = pi.order_id
       WHERE po.merchant_id = $1
         AND pi.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(pi.created_at)
       ORDER BY day ASC`,
      [merchantId]
    );

    const statusDistribution = await pool.query(
      `SELECT
          pi.status,
          COUNT(*)::int AS count
       FROM payment_intents pi
       JOIN payment_orders po ON po.id = pi.order_id
       WHERE po.merchant_id = $1
       GROUP BY pi.status
       ORDER BY count DESC`,
      [merchantId]
    );

    const recentOrders = await pool.query(
      `SELECT
          id,
          merchant_order_reference,
          amount,
          currency,
          status,
          created_at
       FROM payment_orders
       WHERE merchant_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [merchantId]
    );

    const recentIntents = await pool.query(
      `SELECT
          pi.id,
          pi.order_id,
          pi.amount,
          pi.currency,
          pi.status,
          pi.created_at,
          po.merchant_order_reference
       FROM payment_intents pi
       JOIN payment_orders po ON po.id = pi.order_id
       WHERE po.merchant_id = $1
       ORDER BY pi.created_at DESC
       LIMIT 5`,
      [merchantId]
    );

    const recentLedger = await pool.query(
      `SELECT
          lt.id,
          lt.transaction_type,
          lt.currency,
          lt.description,
          lt.created_at,
          lt.payment_intent_id
       FROM ledger_transactions lt
       JOIN payment_intents pi ON pi.id = lt.payment_intent_id
       JOIN payment_orders po ON po.id = pi.order_id
       WHERE po.merchant_id = $1
       ORDER BY lt.created_at DESC
       LIMIT 5`,
      [merchantId]
    );

    return res.status(200).json({
      metrics: metricsResult.rows[0],
      volume_by_day: volumeByDay.rows,
      status_distribution: statusDistribution.rows,
      recent_orders: recentOrders.rows,
      recent_payment_intents: recentIntents.rows,
      recent_ledger_transactions: recentLedger.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
};
