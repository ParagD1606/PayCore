
CREATE TABLE ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    payment_intent_id UUID NOT NULL UNIQUE
        REFERENCES payment_intents(id),

    transaction_type VARCHAR(30) NOT NULL
        CHECK (
            transaction_type IN (
                'payment_capture',
                'refund',
                'adjustment'
            )
        ),

    currency VARCHAR(3) NOT NULL DEFAULT 'INR',

    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
