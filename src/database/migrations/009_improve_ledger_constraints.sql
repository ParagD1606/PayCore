
-- Remove the old uniqueness constraint.
ALTER TABLE ledger_accounts
DROP CONSTRAINT uq_ledger_account;

-- Platform accounts: one account per code and currency.
CREATE UNIQUE INDEX uq_platform_ledger_account
ON ledger_accounts(account_code, currency)
WHERE merchant_id IS NULL;

-- Merchant accounts: one account per merchant, code and currency.
CREATE UNIQUE INDEX uq_merchant_ledger_account
ON ledger_accounts(merchant_id, account_code, currency)
WHERE merchant_id IS NOT NULL;


-- Allow multiple ledger transactions per payment intent.
ALTER TABLE ledger_transactions
DROP CONSTRAINT IF EXISTS ledger_transactions_payment_intent_id_key;

-- But allow only one payment capture per intent.
CREATE UNIQUE INDEX uq_payment_capture_per_intent
ON ledger_transactions(payment_intent_id)
WHERE transaction_type = 'payment_capture';
