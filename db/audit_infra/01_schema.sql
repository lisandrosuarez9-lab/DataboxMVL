-- Create private schema for audit infrastructure
CREATE SCHEMA IF NOT EXISTS private;

-- Ensure search_path is secure
SET search_path = '';