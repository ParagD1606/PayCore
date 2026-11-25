
CREATE TABLE merchant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    merchant_id UUID NOT NULL
        REFERENCES merchants(id) ON DELETE CASCADE,

    key_hash VARCHAR(64) NOT NULL UNIQUE,

    key_prefix VARCHAR(20) NOT NULL,

    name VARCHAR(100) NOT NULL DEFAULT 'Default Key',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_merchant_api_keys_merchant_id
ON merchant_api_keys(merchant_id);
