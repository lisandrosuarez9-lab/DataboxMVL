-- Migration: tokens_used table for persistent replay protection
-- Status: SCAFFOLDING ONLY (not wired to edge functions yet)
-- 
-- This migration creates a table for tracking used JWT tokens to support
-- persistent replay protection across function restarts and horizontal scaling.
-- 
-- Future implementation will need to:
-- 1. Update score-checker to insert used nonces into this table
-- 2. Query this table before accepting a token
-- 3. Implement cleanup job for expired tokens
-- 4. Consider performance impact (may need caching layer)
--
-- Created: 2025-11-08
-- Purpose: Phase 1 JWT hardening - persistent replay protection foundation

-- Create tokens_used table
CREATE TABLE IF NOT EXISTS tokens_used (
    -- JWT ID (jti claim) - unique identifier for each token
    jti TEXT PRIMARY KEY,
    
    -- Nonce from JWT claims - used for replay detection
    nonce TEXT NOT NULL,
    
    -- Correlation ID from JWT claims - for tracking and debugging
    correlation_id TEXT NOT NULL,
    
    -- Token expiration timestamp (from JWT exp claim)
    -- Used for automatic cleanup of old tokens
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- When this token was first used/redeemed
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Requester ID hash from JWT claims (privacy-preserving)
    requester_id TEXT,
    
    -- PII hash from JWT claims (privacy-preserving)
    pii_hash TEXT,
    
    -- Scope from JWT claims (e.g., 'score:single')
    scope TEXT
);

-- Index on nonce for fast replay detection
CREATE INDEX IF NOT EXISTS idx_tokens_used_nonce ON tokens_used(nonce);

-- Index on expires_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_tokens_used_expires_at ON tokens_used(expires_at);

-- Index on correlation_id for debugging and tracing
CREATE INDEX IF NOT EXISTS idx_tokens_used_correlation_id ON tokens_used(correlation_id);

-- Add table comment
COMMENT ON TABLE tokens_used IS 'Tracks used JWT tokens for replay protection. Scaffolding only - not yet wired to edge functions.';

-- Add column comments
COMMENT ON COLUMN tokens_used.jti IS 'JWT ID (jti claim) - unique token identifier';
COMMENT ON COLUMN tokens_used.nonce IS 'Nonce from JWT claims for replay detection';
COMMENT ON COLUMN tokens_used.correlation_id IS 'Correlation ID for request tracking';
COMMENT ON COLUMN tokens_used.expires_at IS 'Token expiration timestamp for cleanup';
COMMENT ON COLUMN tokens_used.used_at IS 'Timestamp when token was first redeemed';
COMMENT ON COLUMN tokens_used.requester_id IS 'Privacy-preserving requester identifier hash';
COMMENT ON COLUMN tokens_used.pii_hash IS 'Privacy-preserving PII hash';
COMMENT ON COLUMN tokens_used.scope IS 'Token scope (e.g., score:single)';

-- Optional: Create a function to clean up expired tokens
-- This can be called periodically via pg_cron or manually
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete tokens that expired more than 1 hour ago (grace period)
    DELETE FROM tokens_used 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_tokens() IS 'Removes expired tokens from tokens_used table. Call periodically for maintenance.';

-- Example usage (manual cleanup):
-- SELECT cleanup_expired_tokens();

-- Future TODO items for connecting this to edge functions:
-- 1. Grant appropriate permissions to edge function service role
-- 2. Update score-checker to INSERT into tokens_used when validating tokens
-- 3. Update score-checker to SELECT from tokens_used to check for replays
-- 4. Set up automatic cleanup job (pg_cron or external scheduler)
-- 5. Add monitoring/alerting for replay attempts
-- 6. Consider adding rate limiting data to this table
