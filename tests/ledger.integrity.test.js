
const crypto = require("crypto");

const pool = require("../src/config/database");

async function withLedgerFixture(testFn) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const suffix = crypto.randomUUID();

    const merchantResult = await client.query(
      `INSERT INTO merchants (business_name, email)
       VALUES ($1, $2)
       RETURNING id`,
      ["Ledger Test Merchant", `ledger-${suffix}@test.com`]
    );

    const merchantId = merchantResult.rows[0].id;

    const orderResult = await client.query(
      `INSERT INTO payment_orders
       (merchant_id, merchant_order_reference, amount, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [merchantId, `ledger-order-${suffix}`, 10000, "INR"]
    );

    const intentResult = await client.query(
      `INSERT INTO payment_intents
       (order_id, amount, currency)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [orderResult.rows[0].id, 10000, "INR"]
    );

    const inrAccount = await client.query(
      `INSERT INTO ledger_accounts
       (merchant_id, account_code, account_name, account_type, currency)
       VALUES ($1, $2, $3, 'asset', 'INR')
       RETURNING id`,
      [merchantId, `INR-${suffix}`, "INR Test Account"]
    );

    const usdAccount = await client.query(
      `INSERT INTO ledger_accounts
       (merchant_id, account_code, account_name, account_type, currency)
       VALUES ($1, $2, $3, 'asset', 'USD')
       RETURNING id`,
      [merchantId, `USD-${suffix}`, "USD Test Account"]
    );

    await testFn(client, {
      paymentIntentId: intentResult.rows[0].id,
      inrAccountId: inrAccount.rows[0].id,
      usdAccountId: usdAccount.rows[0].id,
    });
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}

async function createLedgerTransaction(client, paymentIntentId) {
  const result = await client.query(
    `INSERT INTO ledger_transactions
     (payment_intent_id, transaction_type, currency, description)
     VALUES ($1, 'payment_capture', 'INR', 'Integrity test')
     RETURNING id`,
    [paymentIntentId]
  );

  return result.rows[0].id;
}

async function insertEntry(
  client,
  transactionId,
  accountId,
  entryType,
  amount
) {
  await client.query(
    `INSERT INTO ledger_entries
     (ledger_transaction_id, ledger_account_id, entry_type, amount)
     VALUES ($1, $2, $3, $4)`,
    [transactionId, accountId, entryType, amount]
  );
}

describe("Ledger Database Integrity", () => {
  it("accepts a valid balanced transaction", async () => {
    await withLedgerFixture(async (client, fixture) => {
      const transactionId = await createLedgerTransaction(
        client,
        fixture.paymentIntentId
      );

      await insertEntry(
        client, transactionId, fixture.inrAccountId, "debit", 10000
      );

      await insertEntry(
        client, transactionId, fixture.inrAccountId, "credit", 10000
      );

      await expect(
        client.query("SET CONSTRAINTS ALL IMMEDIATE")
      ).resolves.toBeDefined();
    });
  });

  it("rejects a transaction without entries", async () => {
    await withLedgerFixture(async (client, fixture) => {
      await createLedgerTransaction(client, fixture.paymentIntentId);

      await expect(
        client.query("SET CONSTRAINTS ALL IMMEDIATE")
      ).rejects.toThrow("at least two entries");
    });
  });

  it("rejects an unbalanced transaction", async () => {
    await withLedgerFixture(async (client, fixture) => {
      const transactionId = await createLedgerTransaction(
        client,
        fixture.paymentIntentId
      );

      await insertEntry(
        client, transactionId, fixture.inrAccountId, "debit", 10000
      );

      await insertEntry(
        client, transactionId, fixture.inrAccountId, "credit", 9000
      );

      await expect(
        client.query("SET CONSTRAINTS ALL IMMEDIATE")
      ).rejects.toThrow("is not balanced");
    });
  });

  it("rejects a currency mismatch", async () => {
    await withLedgerFixture(async (client, fixture) => {
      const transactionId = await createLedgerTransaction(
        client,
        fixture.paymentIntentId
      );

      await insertEntry(
        client, transactionId, fixture.inrAccountId, "debit", 10000
      );

      await insertEntry(
        client, transactionId, fixture.usdAccountId, "credit", 10000
      );

      await expect(
        client.query("SET CONSTRAINTS ALL IMMEDIATE")
      ).rejects.toThrow("currency mismatches");
    });
  });

  it("rejects updates to immutable ledger entries", async () => {
    await withLedgerFixture(async (client, fixture) => {
      const transactionId = await createLedgerTransaction(
        client,
        fixture.paymentIntentId
      );

      await insertEntry(
        client, transactionId, fixture.inrAccountId, "debit", 10000
      );
      await insertEntry(
        client, transactionId, fixture.inrAccountId, "credit", 10000
      );
      await client.query("SET CONSTRAINTS ALL IMMEDIATE");

      await expect(
        client.query(
          `UPDATE ledger_entries
           SET amount = 1
           WHERE ledger_transaction_id = $1`,
          [transactionId]
        )
      ).rejects.toThrow(/immutable/i);
    });
  });

  it("rejects deletes of immutable ledger entries", async () => {
    await withLedgerFixture(async (client, fixture) => {
      const transactionId = await createLedgerTransaction(
        client,
        fixture.paymentIntentId
      );

      await insertEntry(
        client, transactionId, fixture.inrAccountId, "debit", 10000
      );
      await insertEntry(
        client, transactionId, fixture.inrAccountId, "credit", 10000
      );
      await client.query("SET CONSTRAINTS ALL IMMEDIATE");

      await expect(
        client.query(
          `DELETE FROM ledger_entries
           WHERE ledger_transaction_id = $1`,
          [transactionId]
        )
      ).rejects.toThrow(/immutable/i);
    });
  });

  it("rejects updates to immutable ledger transactions", async () => {
    await withLedgerFixture(async (client, fixture) => {
      const transactionId = await createLedgerTransaction(
        client,
        fixture.paymentIntentId
      );

      await insertEntry(
        client, transactionId, fixture.inrAccountId, "debit", 10000
      );
      await insertEntry(
        client, transactionId, fixture.inrAccountId, "credit", 10000
      );
      await client.query("SET CONSTRAINTS ALL IMMEDIATE");

      await expect(
        client.query(
          `UPDATE ledger_transactions
           SET currency = 'USD'
           WHERE id = $1`,
          [transactionId]
        )
      ).rejects.toThrow(/immutable/i);
    });
  });

  it("rejects ledger account currency changes", async () => {
    await withLedgerFixture(async (client, fixture) => {
      await expect(
        client.query(
          `UPDATE ledger_accounts
           SET currency = 'USD'
           WHERE id = $1`,
          [fixture.inrAccountId]
        )
      ).rejects.toThrow(/currency cannot be changed/i);
    });
  });

  it("rolls back a failed unbalanced ledger posting", async () => {
    await withLedgerFixture(async (client, fixture) => {
      const nested = await client.query("SAVEPOINT unbalanced_case");

      try {
        const transactionId = await createLedgerTransaction(
          client,
          fixture.paymentIntentId
        );

        await insertEntry(
          client, transactionId, fixture.inrAccountId, "debit", 10000
        );
        await insertEntry(
          client, transactionId, fixture.inrAccountId, "credit", 1
        );

        await client.query("SET CONSTRAINTS ALL IMMEDIATE");
        throw new Error("expected unbalanced transaction to fail");
      } catch (error) {
        expect(String(error.message)).toMatch(/not balanced/i);
        await client.query("ROLLBACK TO SAVEPOINT unbalanced_case");
      }

      const leftover = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM ledger_transactions
         WHERE payment_intent_id = $1`,
        [fixture.paymentIntentId]
      );

      expect(leftover.rows[0].count).toBe(0);
      expect(nested).toBeDefined();
    });
  });
});
