# Audit Infrastructure Documentation

## Overview
This document provides a comprehensive overview of the audit infrastructure in place for the Databox MVL Dashboard, including schema definitions, trigger functions, and compliance controls.

## Schema Structure

### Private Schema
The `private` schema contains audit-related tables and functions that are not directly accessible to regular users.

### Audit Tables
```sql
-- Persona Flag Audit Table
CREATE TABLE private.persona_flag_audit (
    audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    persona_id BIGINT REFERENCES public.persona(id),
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by TEXT
);
```

[Rest of documentation content...]