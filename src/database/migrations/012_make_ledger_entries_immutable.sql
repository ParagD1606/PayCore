CREATE OR REPLACE FUNCTION prevent_ledger_entry_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Ledger entries are immutable. Use reversal entries instead.';
END;
$$;

CREATE TRIGGER ledger_entries_immutable
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_entry_mutation();