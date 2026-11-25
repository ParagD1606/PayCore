-- Migration 015: Ledger Reversal Schema
-- Adds reversal support to ledger_transactions:
--   - original_transaction_id FK column (nullable; only set on reversals)
--   - UNIQUE constraint to prevent double-reversals
--   - Trigger to prevent reversing a reversal
--   - 'reversal' added to transaction_type CHECK constraint
--   - Index on original_transaction_id for fast FK lookups

-- 1. Add original_transaction_id column (nullable FK)
ALTER TABLE ledger_transactions
    ADD COLUMN original_transaction_id UUID
        REFERENCES ledger_transactions(id);

-- 2. UNIQUE constraint: at most one reversal per original transaction
ALTER TABLE ledger_transactions
    ADD CONSTRAINT uq_ledger_transactions_original_transaction_id
        UNIQUE (original_transaction_id);

-- 3. Trigger function: prevent reversing a reversal
CREATE OR REPLACE FUNCTION prevent_reversal_of_reversal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.original_transaction_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM ledger_transactions
            WHERE id = NEW.original_transaction_id
              AND original_transaction_id IS NOT NULL
        ) THEN
            RAISE EXCEPTION
                'Cannot reverse a reversal: transaction % is itself a reversal.',
                NEW.original_transaction_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_reversal_of_reversal
    BEFORE INSERT ON ledger_transactions
    FOR EACH ROW EXECUTE FUNCTION prevent_reversal_of_reversal();

-- 4. Extend transaction_type CHECK to include 'reversal'
--    Drop the existing unnamed check and recreate it with the new value set.
ALTER TABLE ledger_transactions
    DROP CONSTRAINT IF EXISTS ledger_transactions_transaction_type_check;

ALTER TABLE ledger_transactions
    ADD CONSTRAINT ledger_transactions_transaction_type_check
        CHECK (
            transaction_type IN (
                'payment_capture',
                'refund',
                'adjustment',
                'reversal'
            )
        );

-- 5. Index on original_transaction_id for fast FK lookups
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_original_transaction_id
    ON ledger_transactions (original_transaction_id);
