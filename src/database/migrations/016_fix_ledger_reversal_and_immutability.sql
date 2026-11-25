-- Migration 016: Fix ledger reversal support and harden immutability
--
-- Migration 015 added original_transaction_id but left payment_intent_id
-- as NOT NULL, which blocks inserting reversal transactions. This migration:
--   1. Makes payment_intent_id nullable (reversals inherit it when present)
--   2. Enforces reversal column/type consistency via CHECK constraints
--   3. Makes ledger_transactions immutable (no UPDATE/DELETE)
--   4. Prevents changing ledger_account currency after creation
--   5. Rejects empty originals at the DB level when inserting a reversal

-- 1. Allow reversals (and other non-capture postings) without requiring a
--    payment_intent_id. Application code copies it from the original when set.
ALTER TABLE ledger_transactions
    ALTER COLUMN payment_intent_id DROP NOT NULL;

-- 2. Consistency: reversal rows must reference an original; non-reversals must not.
ALTER TABLE ledger_transactions
    ADD CONSTRAINT chk_ledger_reversal_consistency
        CHECK (
            (
                transaction_type = 'reversal'
                AND original_transaction_id IS NOT NULL
            )
            OR
            (
                transaction_type <> 'reversal'
                AND original_transaction_id IS NULL
            )
        );

-- 3. Immutable ledger transactions (audit trail). Use reversals instead of edits.
CREATE OR REPLACE FUNCTION prevent_ledger_transaction_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Ledger transactions are immutable. Use reversal transactions instead.';
END;
$$;

CREATE TRIGGER ledger_transactions_immutable
    BEFORE UPDATE OR DELETE ON ledger_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_transaction_mutation();

-- 4. Prevent currency changes on ledger accounts (would break posted integrity).
CREATE OR REPLACE FUNCTION prevent_ledger_account_currency_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.currency IS DISTINCT FROM OLD.currency THEN
        RAISE EXCEPTION
            'Ledger account currency cannot be changed after creation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER ledger_accounts_currency_immutable
    BEFORE UPDATE ON ledger_accounts
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_account_currency_change();

-- 5. Reject reversing a transaction that has no entries (defence in depth;
--    application also validates). Runs BEFORE INSERT on reversals.
CREATE OR REPLACE FUNCTION prevent_empty_original_reversal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    entry_count INTEGER;
BEGIN
    IF NEW.original_transaction_id IS NOT NULL THEN
        SELECT COUNT(*)
        INTO entry_count
        FROM ledger_entries
        WHERE ledger_transaction_id = NEW.original_transaction_id;

        IF entry_count < 2 THEN
            RAISE EXCEPTION
                'Cannot reverse ledger transaction %: original has insufficient entries',
                NEW.original_transaction_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_empty_original_reversal
    BEFORE INSERT ON ledger_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_empty_original_reversal();
