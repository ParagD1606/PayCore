ALTER TABLE payment_intents
DROP COLUMN IF EXISTS idempotency_key;

CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    merchant_id UUID NOT NULL
        REFERENCES merchants(id) ON DELETE CASCADE,

    idempotency_key VARCHAR(255) NOT NULL,

    request_hash VARCHAR(64) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'completed')),

    response_status INTEGER,
    response_body JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_merchant_idempotency_key
        UNIQUE (merchant_id, idempotency_key)
);