-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Identities Table (For Google & Social OAuth provider mapping)
CREATE TABLE user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'facebook', 'apple'
    provider_account_id VARCHAR(255) NOT NULL, -- Provider's sub / unique ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_provider_account UNIQUE(provider, provider_account_id)
);

-- 3. Guests Table (For Guest tracking & rate limiting)
CREATE TABLE guests (
    guest_uuid UUID PRIMARY KEY,
    ip_address VARCHAR(45),
    request_count INT DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Index for fast user identity lookups
CREATE INDEX idx_user_identities_lookup ON user_identities(provider, provider_account_id);
