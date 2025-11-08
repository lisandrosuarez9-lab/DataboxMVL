-- db/migrations/20251108_tokens_used.sql
-- Placeholder for persistent token replay protection (future Phase 2)
create table if not exists tokens_used (
  jti text primary key,
  nonce text not null,
  exp timestamptz not null,
  created_at timestamptz default now()
);