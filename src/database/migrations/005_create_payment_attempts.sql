
CREATE TABLE payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    payment_intent_id UUID NOT NULL
        REFERENCES payment_intents(id),

    attempt_number INTEGER NOT NULL
        CHECK (attempt_number > 0),

    provider VARCHAR(50) NOT NULL DEFAULT 'simulated',

    provider_reference VARCHAR(100),

    status VARCHAR(20) NOT NULL
        CHECK (
            status IN (
                'processing',
                'succeeded',
                'failed'
            )
        ),

    failure_code VARCHAR(50),

    failure_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completed_at TIMESTAMPTZ,

    CONSTRAINT uq_intent_attempt_number
        UNIQUE (payment_intent_id, attempt_number)
);

CREATE INDEX idx_payment_attempts_intent
ON payment_attempts(payment_intent_id);
