const request = require("supertest");
const crypto = require("crypto");

const app = require("../src/app");
const pool = require("../src/config/database");
const {
  provisionPlatformAccounts,
  provisionMerchantAccounts,
  postPaymentCapture,
  reverseLedgerTransaction,
} = require("../src/modules/ledger/ledger.service");

/**
 * Ledger rows are immutable by design. Test cleanup temporarily disables
 * the immutability triggers (table-owner privilege) so fixtures can be removed.
 */
async function cleanupMerchantLedgerData(merchantId) {
  await pool.query(
    `ALTER TABLE ledger_entries DISABLE TRIGGER ledger_entries_immutable`
  );
  await pool.query(
    `ALTER TABLE ledger_transactions DISABLE TRIGGER ledger_transactions_immutable`
  );

  try {
    await pool.query(
      `DELETE FROM ledger_entries
       WHERE ledger_transaction_id IN (
         SELECT id FROM ledger_transactions
         WHERE payment_intent_id IN (
           SELECT id FROM payment_intents
           WHERE order_id IN (
             SELECT id FROM payment_orders WHERE merchant_id = $1
           )
         )
       )`,
      [merchantId]
    );
    await pool.query(
      `DELETE FROM ledger_transactions
       WHERE payment_intent_id IN (
         SELECT id FROM payment_intents
         WHERE order_id IN (
           SELECT id FROM payment_orders WHERE merchant_id = $1
         )
       )`,
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
    await pool.query(`DELETE FROM ledger_accounts WHERE merchant_id = $1`, [
      merchantId,
    ]);
    await pool.query(
      `DELETE FROM merchant_api_keys WHERE merchant_id = $1`,
      [merchantId]
    );
    await pool.query(`DELETE FROM merchants WHERE id = $1`, [merchantId]);
  } finally {
    await pool.query(
      `ALTER TABLE ledger_entries ENABLE TRIGGER ledger_entries_immutable`
    );
    await pool.query(
      `ALTER TABLE ledger_transactions ENABLE TRIGGER ledger_transactions_immutable`
    );
  }
}

async function withReversalFixture(testFn) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const suffix = crypto.randomUUID();

    const merchant = await client.query(
      `INSERT INTO merchants (business_name, email)
       VALUES ($1, $2)
       RETURNING id`,
      ["Reversal Merchant", `rev-${suffix}@test.com`]
    );

    const merchantId = merchant.rows[0].id;

    await provisionPlatformAccounts(client);
    await provisionMerchantAccounts(client, merchantId);

    const order = await client.query(
      `INSERT INTO payment_orders
       (merchant_id, merchant_order_reference, amount, currency)
       VALUES ($1, $2, 50000, 'INR')
       RETURNING id`,
      [merchantId, `rev-order-${suffix}`]
    );

    const intent = await client.query(
      `INSERT INTO payment_intents (order_id, amount, currency, status)
       VALUES ($1, 50000, 'INR', 'succeeded')
       RETURNING id`,
      [order.rows[0].id]
    );

    const capture = await postPaymentCapture(client, intent.rows[0].id);

    await testFn(client, {
      merchantId,
      paymentIntentId: intent.rows[0].id,
      ledgerTransactionId: capture.ledgerTransactionId,
      amount: capture.amount,
    });
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}

describe("Ledger Reversal", () => {
  it("creates a balanced mirror reversal and preserves the original", async () => {
    await withReversalFixture(async (client, fixture) => {
      const originalEntries = await client.query(
        `SELECT ledger_account_id, entry_type, amount
         FROM ledger_entries
         WHERE ledger_transaction_id = $1
         ORDER BY entry_type, ledger_account_id`,
        [fixture.ledgerTransactionId]
      );

      const result = await reverseLedgerTransaction(
        client,
        fixture.ledgerTransactionId
      );

      await expect(
        client.query("SET CONSTRAINTS ALL IMMEDIATE")
      ).resolves.toBeDefined();

      expect(result.reversalTransactionId).not.toBe(
        fixture.ledgerTransactionId
      );
      expect(result.entries).toHaveLength(originalEntries.rowCount);

      const reversal = await client.query(
        `SELECT transaction_type, currency, original_transaction_id, payment_intent_id
         FROM ledger_transactions
         WHERE id = $1`,
        [result.reversalTransactionId]
      );

      expect(reversal.rows[0].transaction_type).toBe("reversal");
      expect(reversal.rows[0].original_transaction_id).toBe(
        fixture.ledgerTransactionId
      );
      expect(reversal.rows[0].payment_intent_id).toBe(fixture.paymentIntentId);
      expect(reversal.rows[0].currency).toBe("INR");

      const reversalEntries = await client.query(
        `SELECT ledger_account_id, entry_type, amount::bigint AS amount
         FROM ledger_entries
         WHERE ledger_transaction_id = $1`,
        [result.reversalTransactionId]
      );

      for (const original of originalEntries.rows) {
        const flipped =
          original.entry_type === "debit" ? "credit" : "debit";

        const match = reversalEntries.rows.find(
          (entry) =>
            entry.ledger_account_id === original.ledger_account_id &&
            entry.entry_type === flipped &&
            Number(entry.amount) === Number(original.amount)
        );

        expect(match).toBeTruthy();
      }

      const stillThere = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM ledger_entries
         WHERE ledger_transaction_id = $1`,
        [fixture.ledgerTransactionId]
      );

      expect(stillThere.rows[0].count).toBe(originalEntries.rowCount);
    });
  });

  it("rejects duplicate reversals", async () => {
    await withReversalFixture(async (client, fixture) => {
      await reverseLedgerTransaction(client, fixture.ledgerTransactionId);

      await expect(
        reverseLedgerTransaction(client, fixture.ledgerTransactionId)
      ).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });

  it("rejects reversing a reversal", async () => {
    await withReversalFixture(async (client, fixture) => {
      const first = await reverseLedgerTransaction(
        client,
        fixture.ledgerTransactionId
      );

      await expect(
        reverseLedgerTransaction(client, first.reversalTransactionId)
      ).rejects.toMatchObject({
        statusCode: 422,
      });
    });
  });

  it("rejects reversing a missing transaction", async () => {
    await withReversalFixture(async (client) => {
      await expect(
        reverseLedgerTransaction(client, crypto.randomUUID())
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  it("serializes concurrent reversal attempts safely", async () => {
    const setup = await pool.connect();
    let ledgerTransactionId;
    let merchantId;
    let apiKey;

    try {
      await setup.query("BEGIN");

      const suffix = crypto.randomUUID();
      apiKey = "pg_live_" + crypto.randomBytes(32).toString("hex");
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

      const merchant = await setup.query(
        `INSERT INTO merchants (business_name, email)
         VALUES ($1, $2)
         RETURNING id`,
        ["Concurrent Reversal Merchant", `crev-${suffix}@test.com`]
      );

      merchantId = merchant.rows[0].id;

      await setup.query(
        `INSERT INTO merchant_api_keys
         (merchant_id, key_hash, key_prefix)
         VALUES ($1, $2, $3)`,
        [merchantId, keyHash, apiKey.substring(0, 16)]
      );

      await provisionPlatformAccounts(setup);
      await provisionMerchantAccounts(setup, merchantId);

      const order = await setup.query(
        `INSERT INTO payment_orders
         (merchant_id, merchant_order_reference, amount, currency)
         VALUES ($1, $2, 42000, 'INR')
         RETURNING id`,
        [merchantId, `crev-order-${suffix}`]
      );

      const intent = await setup.query(
        `INSERT INTO payment_intents (order_id, amount, currency, status)
         VALUES ($1, 42000, 'INR', 'succeeded')
         RETURNING id`,
        [order.rows[0].id]
      );

      const capture = await postPaymentCapture(setup, intent.rows[0].id);
      ledgerTransactionId = capture.ledgerTransactionId;

      await setup.query("COMMIT");
    } catch (error) {
      await setup.query("ROLLBACK");
      throw error;
    } finally {
      setup.release();
    }

    try {
      const reverseOnce = async () => {
        const client = await pool.connect();

        try {
          await client.query("BEGIN");
          const result = await reverseLedgerTransaction(
            client,
            ledgerTransactionId
          );
          await client.query("COMMIT");
          return { ok: true, result };
        } catch (error) {
          await client.query("ROLLBACK");
          return {
            ok: false,
            statusCode: error.statusCode || error.code,
            message: error.message,
          };
        } finally {
          client.release();
        }
      };

      const outcomes = await Promise.all([
        reverseOnce(),
        reverseOnce(),
        reverseOnce(),
      ]);

      const successes = outcomes.filter((o) => o.ok);
      const failures = outcomes.filter((o) => !o.ok);

      expect(successes).toHaveLength(1);
      expect(failures.length).toBeGreaterThanOrEqual(1);

      const stored = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM ledger_transactions
         WHERE original_transaction_id = $1`,
        [ledgerTransactionId]
      );

      expect(stored.rows[0].count).toBe(1);

      const apiResponse = await request(app)
        .post(`/api/ledger/transactions/${ledgerTransactionId}/reverse`)
        .set("x-api-key", apiKey);

      expect(apiResponse.status).toBe(409);
    } finally {
      await cleanupMerchantLedgerData(merchantId);
    }
  });

  it("exposes a successful reversal through the merchant API", async () => {
    const suffix = crypto.randomUUID();
    const apiKey = "pg_live_" + crypto.randomBytes(32).toString("hex");
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const client = await pool.connect();

    let merchantId;
    let ledgerTransactionId;

    try {
      await client.query("BEGIN");

      const merchant = await client.query(
        `INSERT INTO merchants (business_name, email)
         VALUES ($1, $2)
         RETURNING id`,
        ["API Reversal Merchant", `arev-${suffix}@test.com`]
      );

      merchantId = merchant.rows[0].id;

      await client.query(
        `INSERT INTO merchant_api_keys
         (merchant_id, key_hash, key_prefix)
         VALUES ($1, $2, $3)`,
        [merchantId, keyHash, apiKey.substring(0, 16)]
      );

      await provisionPlatformAccounts(client);
      await provisionMerchantAccounts(client, merchantId);

      const order = await client.query(
        `INSERT INTO payment_orders
         (merchant_id, merchant_order_reference, amount, currency)
         VALUES ($1, $2, 15000, 'INR')
         RETURNING id`,
        [merchantId, `arev-order-${suffix}`]
      );

      const intent = await client.query(
        `INSERT INTO payment_intents (order_id, amount, currency, status)
         VALUES ($1, 15000, 'INR', 'succeeded')
         RETURNING id`,
        [order.rows[0].id]
      );

      const capture = await postPaymentCapture(client, intent.rows[0].id);
      ledgerTransactionId = capture.ledgerTransactionId;

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    try {
      const response = await request(app)
        .post(`/api/ledger/transactions/${ledgerTransactionId}/reverse`)
        .set("x-api-key", apiKey);

      expect(response.status).toBe(201);
      expect(response.body.originalTransactionId).toBe(ledgerTransactionId);
      expect(response.body.reversalTransactionId).toBeTruthy();
      expect(response.body.entries.length).toBeGreaterThanOrEqual(2);

      const duplicate = await request(app)
        .post(`/api/ledger/transactions/${ledgerTransactionId}/reverse`)
        .set("x-api-key", apiKey);

      expect(duplicate.status).toBe(409);

      const reverseAgain = await request(app)
        .post(
          `/api/ledger/transactions/${response.body.reversalTransactionId}/reverse`
        )
        .set("x-api-key", apiKey);

      expect(reverseAgain.status).toBe(422);
    } finally {
      await cleanupMerchantLedgerData(merchantId);
    }
  });
});
