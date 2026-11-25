CREATE TABLE payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL
        REFERENCES payment_orders(id),

    amount BIGINT NOT NULL
        CHECK (amount > 0),

    currency VARCHAR(3) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'requires_payment_method'
        CHECK (
            status IN (
                'requires_payment_method',
                'processing',
                'requires_action',
                'succeeded',
                'failed',
                'cancelled'
            )
        ),

    idempotency_key VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_payment_intent_order UNIQUE (order_id)
);

CREATE UNIQUE INDEX uq_payment_intent_idempotency
ON payment_intents(idempotency_key)
WHERE idempotency_key IS NOT NULL;
