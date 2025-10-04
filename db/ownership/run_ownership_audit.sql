-- Master Ownership Audit Script
-- Runs all four steps of the FactorA Universal Ownership & Attribution Mandate
-- This script orchestrates the complete ownership audit process

\echo ''
\echo '╔════════════════════════════════════════════════════════════╗'
\echo '║  FactorA Universal Ownership & Attribution Mandate         ║'
\echo '║  Complete Ownership Audit Execution                        ║'
\echo '╚════════════════════════════════════════════════════════════╝'
\echo ''

-- Set variables
\set ON_ERROR_STOP on
\timing on

-- Generate RUN_ID if not set
\set run_id `echo ${RUN_ID:-$(date +%Y%m%d_%H%M%S)_$(uuidgen | cut -c1-8)}`

-- Write RUN_ID to file for artifact collection
\! echo ":run_id" > /tmp/run_id.txt

\echo 'RUN_ID: ' :run_id
\echo ''

-- Execute Step 1: Ownership Anchors
\echo '┌────────────────────────────────────────────────────────────┐'
\echo '│ STEP 1: Establishing Ownership Anchors                    │'
\echo '└────────────────────────────────────────────────────────────┘'
\i db/ownership/01_ownership_anchors.sql

\echo ''

-- Execute Step 2: Orphan Detection
\echo '┌────────────────────────────────────────────────────────────┐'
\echo '│ STEP 2: Orphan Detection                                  │'
\echo '└────────────────────────────────────────────────────────────┘'
\i db/ownership/02_orphan_detection.sql

\echo ''

-- Execute Step 3: Attribution Log
\echo '┌────────────────────────────────────────────────────────────┐'
\echo '│ STEP 3: Universal Attribution Log                         │'
\echo '└────────────────────────────────────────────────────────────┘'
\i db/ownership/03_attribution_log.sql

\echo ''

-- Execute Step 4: Acceptance Test
\echo '┌────────────────────────────────────────────────────────────┐'
\echo '│ STEP 4: Acceptance Test & Artifact Generation             │'
\echo '└────────────────────────────────────────────────────────────┘'
\i db/ownership/04_acceptance_test.sql

\echo ''
\echo '╔════════════════════════════════════════════════════════════╗'
\echo '║  Ownership Audit Complete                                  ║'
\echo '╚════════════════════════════════════════════════════════════╝'
\echo ''
\echo 'Artifacts generated in /tmp/:'
\echo '  - run_id.txt'
\echo '  - ownership_audit_summary.csv'
\echo '  - ownership_audit_summary.json'
\echo ''
