
CREATE TABLE payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    merchant_id UUID NOT NULL
        REFERENCES merchants(id),

    merchant_order_reference VARCHAR(100) NOT NULL,

    amount BIGINT NOT NULL
        CHECK (amount > 0),

    currency VARCHAR(3) NOT NULL DEFAULT 'INR'
        CHECK (currency ~ '^[A-Z]{3}$'),

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'cancelled')),

    description TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_merchant_order_reference
        UNIQUE (merchant_id, merchant_order_reference)
);

CREATE INDEX idx_payment_orders_merchant_created
ON payment_orders(merchant_id, created_at DESC);
