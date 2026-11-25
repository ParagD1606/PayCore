
CREATE OR REPLACE FUNCTION validate_ledger_transaction_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_transaction_id UUID;
    entry_count INTEGER;
    debit_total NUMERIC;
    credit_total NUMERIC;
    currency_mismatch_count INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'ledger_transactions' THEN
        target_transaction_id := NEW.id;
    ELSE
        target_transaction_id := NEW.ledger_transaction_id;
    END IF;

    SELECT
        COUNT(*),
        COALESCE(
            SUM(le.amount) FILTER (
                WHERE le.entry_type = 'debit'
            ), 0
        ),
        COALESCE(
            SUM(le.amount) FILTER (
                WHERE le.entry_type = 'credit'
            ), 0
        ),
        COUNT(*) FILTER (
            WHERE lt.currency <> la.currency
        )
    INTO
        entry_count,
        debit_total,
        credit_total,
        currency_mismatch_count
    FROM ledger_entries le
    JOIN ledger_transactions lt
        ON lt.id = le.ledger_transaction_id
    JOIN ledger_accounts la
        ON la.id = le.ledger_account_id
    WHERE le.ledger_transaction_id = target_transaction_id;

    IF entry_count < 2 THEN
        RAISE EXCEPTION
            'Ledger transaction % must contain at least two entries',
            target_transaction_id;
    END IF;

    IF debit_total <> credit_total THEN
        RAISE EXCEPTION
            'Ledger transaction % is not balanced',
            target_transaction_id;
    END IF;

    IF currency_mismatch_count > 0 THEN
        RAISE EXCEPTION
            'Ledger transaction % contains currency mismatches',
            target_transaction_id;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS enforce_ledger_balance
ON ledger_entries;

CREATE CONSTRAINT TRIGGER enforce_transaction_integrity
AFTER INSERT ON ledger_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_ledger_transaction_integrity();

CREATE CONSTRAINT TRIGGER enforce_entry_integrity
AFTER INSERT ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_ledger_transaction_integrity();
