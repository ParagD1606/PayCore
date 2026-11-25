const { validateLedgerEntries } = require("./ledger.validation");

async function provisionPlatformAccounts(client) {
  await client.query(
    `INSERT INTO ledger_accounts (
      merchant_id,
      account_code,
      account_name,
      account_type,
      currency
    )
    VALUES (
      NULL,
      'GATEWAY_CLEARING',
      'Gateway Clearing Account',
      'asset',
      'INR'
    )
    ON CONFLICT (account_code, currency)
    WHERE merchant_id IS NULL
    DO NOTHING`
  );
}

async function provisionMerchantAccounts(client, merchantId) {
  await client.query(
    `INSERT INTO ledger_accounts (
      merchant_id,
      account_code,
      account_name,
      account_type,
      currency
    )
    VALUES (
      $1,
      'MERCHANT_PAYABLE',
      'Merchant Payable Account',
      'liability',
      'INR'
    )
    ON CONFLICT (merchant_id, account_code, currency)
    WHERE merchant_id IS NOT NULL
    DO NOTHING`,
    [merchantId]
  );
}

async function postPaymentCapture(client, paymentIntentId) {
  const intentResult = await client.query(
    `SELECT
      pi.id,
      pi.amount,
      pi.currency,
      po.merchant_id
     FROM payment_intents pi
     JOIN payment_orders po ON po.id = pi.order_id
     WHERE pi.id = $1
     FOR UPDATE OF pi`,
    [paymentIntentId]
  );

  if (intentResult.rowCount === 0) {
    throw new Error("Payment intent not found");
  }

  const intent = intentResult.rows[0];

  const accountsResult = await client.query(
    `SELECT id, account_code
     FROM ledger_accounts
     WHERE currency = $1
       AND (
         merchant_id IS NULL
         OR merchant_id = $2
       )`,
    [intent.currency, intent.merchant_id]
  );

  const accounts = accountsResult.rows;

  const clearingAccount = accounts.find(
    (account) => account.account_code === "GATEWAY_CLEARING"
  );

  const payableAccount = accounts.find(
    (account) => account.account_code === "MERCHANT_PAYABLE"
  );

  if (!clearingAccount || !payableAccount) {
    throw new Error("Required ledger accounts are missing");
  }

  const amount = Number(intent.amount);

  const entries = [
    {
      accountId: clearingAccount.id,
      entryType: "debit",
      amount,
    },
    {
      accountId: payableAccount.id,
      entryType: "credit",
      amount,
    },
  ];

  validateLedgerEntries(entries);

  const transactionResult = await client.query(
    `INSERT INTO ledger_transactions (
      payment_intent_id,
      transaction_type,
      currency,
      description
    )
    VALUES ($1, 'payment_capture', $2, $3)
    RETURNING id`,
    [
      paymentIntentId,
      intent.currency,
      "Payment capture ledger posting",
    ]
  );

  const ledgerTransactionId = transactionResult.rows[0].id;

  for (const entry of entries) {
    await client.query(
      `INSERT INTO ledger_entries (
        ledger_transaction_id,
        ledger_account_id,
        entry_type,
        amount
      )
      VALUES ($1, $2, $3, $4)`,
      [
        ledgerTransactionId,
        entry.accountId,
        entry.entryType,
        entry.amount,
      ]
    );
  }

  return {
    ledgerTransactionId,
    entries,
    amount,
    currency: intent.currency,
  };
}

/**
 * Reverse a ledger transaction by creating mirror entries with flipped debit/credit.
 * Original rows remain immutable. Caller is responsible for BEGIN/COMMIT/ROLLBACK.
 *
 * Concurrency: locks the original transaction with FOR UPDATE; unique constraint on
 * original_transaction_id prevents duplicate reversals under race conditions.
 *
 * @param {import('pg').PoolClient} client
 * @param {string} originalTransactionId - UUID of the transaction to reverse
 */
async function reverseLedgerTransaction(client, originalTransactionId) {
  const lockResult = await client.query(
    `SELECT
        id,
        payment_intent_id,
        transaction_type,
        currency,
        original_transaction_id
     FROM ledger_transactions
     WHERE id = $1
     FOR UPDATE`,
    [originalTransactionId]
  );

  if (lockResult.rowCount === 0) {
    const err = new Error("Ledger transaction not found");
    err.statusCode = 404;
    throw err;
  }

  const original = lockResult.rows[0];

  if (
    original.transaction_type === "reversal" ||
    original.original_transaction_id !== null
  ) {
    const err = new Error("Cannot reverse a reversal transaction");
    err.statusCode = 422;
    throw err;
  }

  const existingReversal = await client.query(
    `SELECT id
     FROM ledger_transactions
     WHERE original_transaction_id = $1
     FOR UPDATE`,
    [originalTransactionId]
  );

  if (existingReversal.rowCount > 0) {
    const err = new Error("This transaction has already been reversed");
    err.statusCode = 409;
    throw err;
  }

  const entriesResult = await client.query(
    `SELECT ledger_account_id, entry_type, amount
     FROM ledger_entries
     WHERE ledger_transaction_id = $1
     ORDER BY created_at ASC, id ASC`,
    [originalTransactionId]
  );

  const originalEntries = entriesResult.rows;

  if (originalEntries.length < 2) {
    const err = new Error(
      "Cannot reverse a ledger transaction without at least two entries"
    );
    err.statusCode = 422;
    throw err;
  }

  const mirrorEntries = originalEntries.map((entry) => ({
    accountId: entry.ledger_account_id,
    entryType: entry.entry_type === "debit" ? "credit" : "debit",
    amount: Number(entry.amount),
  }));

  validateLedgerEntries(mirrorEntries);

  const reversalTxResult = await client.query(
    `INSERT INTO ledger_transactions (
      payment_intent_id,
      transaction_type,
      currency,
      description,
      original_transaction_id
    )
    VALUES ($1, 'reversal', $2, $3, $4)
    RETURNING id`,
    [
      original.payment_intent_id,
      original.currency,
      `Reversal of ${originalTransactionId}`,
      originalTransactionId,
    ]
  );

  const reversalTransactionId = reversalTxResult.rows[0].id;

  const reversedEntries = [];

  for (const entry of mirrorEntries) {
    await client.query(
      `INSERT INTO ledger_entries (
        ledger_transaction_id,
        ledger_account_id,
        entry_type,
        amount
      )
      VALUES ($1, $2, $3, $4)`,
      [
        reversalTransactionId,
        entry.accountId,
        entry.entryType,
        entry.amount,
      ]
    );

    reversedEntries.push({
      ledgerAccountId: entry.accountId,
      entryType: entry.entryType,
      amount: entry.amount,
    });
  }

  return {
    reversalTransactionId,
    originalTransactionId,
    entries: reversedEntries,
  };
}

module.exports = {
  provisionPlatformAccounts,
  provisionMerchantAccounts,
  postPaymentCapture,
  reverseLedgerTransaction,
};
