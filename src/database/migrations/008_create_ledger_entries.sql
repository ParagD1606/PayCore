
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ledger_transaction_id UUID NOT NULL
        REFERENCES ledger_transactions(id),

    ledger_account_id UUID NOT NULL
        REFERENCES ledger_accounts(id),

    entry_type VARCHAR(10) NOT NULL
        CHECK (entry_type IN ('debit', 'credit')),

    amount BIGINT NOT NULL
        CHECK (amount > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_entries_transaction
ON ledger_entries(ledger_transaction_id);

CREATE INDEX idx_ledger_entries_account
ON ledger_entries(ledger_account_id);
