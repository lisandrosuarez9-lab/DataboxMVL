# FactorA Universal Ownership & Attribution Mandate

**Purpose:**  
Every operational table must be anchored to `profiles.user_id`. No row may exist without a valid owner. This mandate enforces schema‑level sovereignty, detects orphans, logs attribution, and fails pipelines if integrity is broken.  

---

## Step 1 — Ownership Anchors

- **Scope:**  
  `persona`, `transaccion`, `remesa`, `microcredito`, `factura_utilidad`, `telco_topup`, `financial_events`, `credit_scores`, `score_runs`.  

- **Requirements:**  
  - Each table must contain an `owner_id UUID` column.  
  - Each `owner_id` must be constrained by a foreign key to `profiles.user_id`.  
  - Constraint must be:  
    - `ON UPDATE CASCADE`  
    - `ON DELETE RESTRICT`  
  - If the column or constraint already exists, skip gracefully.  

---

## Step 2 — Orphan Detection

- Create a temporary `orphan_index` table.  
- For each table in scope, insert rows where:  
  - `owner_id IS NULL`, or  
  - `owner_id NOT IN (SELECT user_id FROM public.profiles)`.  
- Output the contents of `orphan_index` for visibility.  

---

## Step 3 — Attribution Log

- Ensure a universal attribution log exists:  

  ```sql
  universal_attribution_log(
    id BIGSERIAL PRIMARY KEY,
    run_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    attributed_owner UUID,
    attributed_by TEXT DEFAULT current_user,
    attributed_at TIMESTAMPTZ DEFAULT NOW()
  )
  ```

- This table is **append‑only**. No updates or deletes permitted.  
- Every manual attribution must be logged here with the `RUN_ID`.  

---

## Step 4 — Acceptance Test

- Summarize orphan counts per table.  
- If any count > 0, the pipeline must **fail immediately**.  
- If all counts = 0, the pipeline passes.  
- Always emit artifacts:  
  - `run_id.txt` (with the current RUN_ID).  
  - `ownership_audit_summary.csv` (table_name, remaining_orphans).  
  - `ownership_audit_summary.json` (same data in JSON).  

---

## Execution Rules

- **No placeholders:** The audit never inserts fake owners.  
- **No automatic attribution:** Orphans are surfaced, not silently fixed.  
- **Fail‑fast:** Any orphan causes the pipeline to fail.  
- **Immutable logging:** All attributions must be explicit and logged under a `RUN_ID`.  

---

## CI/CD Integration

- **Trigger:**  
  - On every push to `main`.  
  - On a daily schedule.  
  - On manual dispatch.  

- **Secrets:**  
  - `DATABASE_URL` must be set in GitHub → Repo → Settings → Secrets → Actions.  

- **Artifacts:**  
  - Always upload `run_id.txt`, `ownership_audit_summary.csv`, `ownership_audit_summary.json`.  

- **Failure condition:**  
  - If any orphan exists, job fails.  
  - If zero orphans, job passes.  

---

## Optional Extensions

- **Audit Snapshots:** Insert per‑RUN_ID summaries into `audit_snapshot` for historical traceability.  
- **Re‑establish FK:** Once real `auth.users` entries exist, re‑add `profiles.user_id → auth.users.id` foreign key.  
- **Reporting:** Generate Markdown/HTML dashboards from the CSV/JSON artifacts for regulator‑facing evidence.  

---

## Mandate Summary

This agenda enforces **schema‑wide ownership sovereignty**. Every row in every critical table must be anchored to a valid profile. Every orphan must be surfaced, logged, and remediated explicitly. Every pipeline run produces immutable artifacts proving compliance.
