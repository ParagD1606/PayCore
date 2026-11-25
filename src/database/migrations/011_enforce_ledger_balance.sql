CREATE OR REPLACE FUNCTION check_ledger_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_transaction_id UUID;
    debit_total NUMERIC;
    credit_total NUMERIC;
    entry_count INTEGER;
BEGIN
    target_transaction_id := NEW.ledger_transaction_id;

    SELECT
        COUNT(*),
        COALESCE(
            SUM(amount) FILTER (WHERE entry_type = 'debit'),
            0
        ),
        COALESCE(
            SUM(amount) FILTER (WHERE entry_type = 'credit'),
            0
        )
    INTO entry_count, debit_total, credit_total
    FROM ledger_entries
    WHERE ledger_transaction_id = target_transaction_id;

    IF entry_count < 2 OR debit_total <> credit_total THEN
        RAISE EXCEPTION
            'Unbalanced ledger transaction: %',
            target_transaction_id;
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER enforce_ledger_balance
AFTER INSERT ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_ledger_balance();