
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    business_name VARCHAR(150) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
