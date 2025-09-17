-- Create audit table in private schema
CREATE TABLE IF NOT EXISTS private.audit_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    client_info TEXT
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON private.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON private.audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON private.audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON private.audit_log(changed_at);