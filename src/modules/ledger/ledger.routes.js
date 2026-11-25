const express = require("express");
const { z } = require("zod");

const pool = require("../../config/database");
const authenticateMerchant = require("../../middleware/auth");
const { reverseLedgerTransaction } = require("./ledger.service");

const router = express.Router();

const transactionIdSchema = z.string().uuid();

async function listLedgerTransactions(req, res, next) {
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20)
  );
  const offset = (page - 1) * limit;
  const transactionType =
    typeof req.query.transaction_type === "string"
      ? req.query.transaction_type
      : null;

  const allowedTypes = new Set([
    "payment_capture",
    "refund",
    "adjustment",
    "reversal",
  ]);

  if (transactionType && !allowedTypes.has(transactionType)) {
    return res.status(400).json({ error: "Invalid transaction type filter" });
  }

  try {
    const params = [req.merchant.id];
    const filters = ["po.merchant_id = $1"];

    if (transactionType) {
      params.push(transactionType);
      filters.push(`lt.transaction_type = $${params.length}`);
    }

    const where = filters.join(" AND ");

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM ledger_transactions lt
       JOIN payment_intents pi ON pi.id = lt.payment_intent_id
       JOIN payment_orders po ON po.id = pi.order_id
       WHERE ${where}`,
      params
    );

    params.push(limit);
    params.push(offset);

    const result = await pool.query(
      `SELECT
          lt.id,
          lt.payment_intent_id,
          lt.transaction_type,
          lt.currency,
          lt.description,
          lt.original_transaction_id,
          lt.created_at,
          COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'debit'), 0)::bigint AS debit_total,
          COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'credit'), 0)::bigint AS credit_total
       FROM ledger_transactions lt
       JOIN payment_intents pi ON pi.id = lt.payment_intent_id
       JOIN payment_orders po ON po.id = pi.order_id
       LEFT JOIN ledger_entries le ON le.ledger_transaction_id = lt.id
       WHERE ${where}
       GROUP BY lt.id
       ORDER BY lt.created_at DESC
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

async function getLedgerTransaction(req, res, next) {
  const idValidation = transactionIdSchema.safeParse(req.params.id);

  if (!idValidation.success) {
    return res.status(400).json({ error: "Invalid ledger transaction id" });
  }

  try {
    const result = await pool.query(
      `SELECT
          lt.id,
          lt.payment_intent_id,
          lt.transaction_type,
          lt.currency,
          lt.description,
          lt.original_transaction_id,
          lt.created_at
       FROM ledger_transactions lt
       JOIN payment_intents pi ON pi.id = lt.payment_intent_id
       JOIN payment_orders po ON po.id = pi.order_id
       WHERE lt.id = $1
         AND po.merchant_id = $2`,
      [idValidation.data, req.merchant.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Ledger transaction not found" });
    }

    const entries = await pool.query(
      `SELECT
          le.id,
          le.entry_type,
          le.amount,
          le.created_at,
          la.id AS account_id,
          la.account_code,
          la.account_name,
          la.account_type,
          la.currency AS account_currency
       FROM ledger_entries le
       JOIN ledger_accounts la ON la.id = le.ledger_account_id
       WHERE le.ledger_transaction_id = $1
       ORDER BY le.created_at ASC, le.id ASC`,
      [idValidation.data]
    );

    const reversal = await pool.query(
      `SELECT id, created_at
       FROM ledger_transactions
       WHERE original_transaction_id = $1`,
      [idValidation.data]
    );

    return res.status(200).json({
      transaction: result.rows[0],
      entries: entries.rows,
      reversal: reversal.rows[0] || null,
    });
  } catch (error) {
    next(error);
  }
}

router.get(
  "/transactions",
  authenticateMerchant,
  listLedgerTransactions
);

router.get(
  "/transactions/:id",
  authenticateMerchant,
  getLedgerTransaction
);

router.post(
  "/transactions/:id/reverse",
  authenticateMerchant,
  async (req, res, next) => {
    const idValidation = transactionIdSchema.safeParse(req.params.id);

    if (!idValidation.success) {
      return res.status(400).json({
        error: "Invalid ledger transaction id",
      });
    }

    const originalTransactionId = idValidation.data;
    const merchantId = req.merchant.id;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const ownershipResult = await client.query(
        `SELECT lt.id
         FROM ledger_transactions lt
         JOIN payment_intents pi ON pi.id = lt.payment_intent_id
         JOIN payment_orders po ON po.id = pi.order_id
         WHERE lt.id = $1
           AND po.merchant_id = $2`,
        [originalTransactionId, merchantId]
      );

      if (ownershipResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          error: "Transaction not found or does not belong to this merchant",
        });
      }

      const result = await reverseLedgerTransaction(
        client,
        originalTransactionId
      );

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Ledger transaction reversed successfully",
        reversalTransactionId: result.reversalTransactionId,
        originalTransactionId: result.originalTransactionId,
        entries: result.entries,
      });
    } catch (err) {
      await client.query("ROLLBACK");

      if (err.code === "23505") {
        return res.status(409).json({
          error: "This transaction has already been reversed",
        });
      }

      if (
        typeof err.message === "string" &&
        err.message.includes("Cannot reverse a reversal")
      ) {
        return res.status(422).json({
          error: "Cannot reverse a reversal transaction",
        });
      }

      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }

      next(err);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
