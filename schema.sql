-- ====================================================================
-- Charap Application Database Schema for Google Cloud SQL (PostgreSQL)
-- ====================================================================

-- 0. Enable UUID generation extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
-- Stores registered permanent users (OAuth & email accounts)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Identities Table
-- Maps external OAuth providers (Google, GitHub, Facebook, Apple) to user accounts
CREATE TABLE IF NOT EXISTS user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'facebook', 'apple'
    provider_account_id VARCHAR(255) NOT NULL, -- Provider's unique sub/account ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_provider_account UNIQUE(provider, provider_account_id)
);

-- 3. Guests Table
-- Tracks anonymous guest sessions, rate limiting metrics, and account linking status
CREATE TABLE IF NOT EXISTS guests (
    guest_uuid UUID PRIMARY KEY,
    ip_address VARCHAR(45),
    request_count INT DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Index for fast user identity lookups during OAuth authentication
CREATE INDEX IF NOT EXISTS idx_user_identities_lookup ON user_identities(provider, provider_account_id);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
