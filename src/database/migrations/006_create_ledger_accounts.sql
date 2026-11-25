
CREATE TABLE ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    merchant_id UUID
        REFERENCES merchants(id),

    account_code VARCHAR(50) NOT NULL,

    account_name VARCHAR(100) NOT NULL,

    account_type VARCHAR(20) NOT NULL
        CHECK (
            account_type IN (
                'asset',
                'liability',
                'revenue',
                'expense',
                'equity'
            )
        ),

    currency VARCHAR(3) NOT NULL DEFAULT 'INR',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ledger_account
        UNIQUE (merchant_id, account_code, currency)
);
