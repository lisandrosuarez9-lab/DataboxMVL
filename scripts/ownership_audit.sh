#!/bin/bash
# Ownership Audit Script for CI/CD
# Runs ownership audit and generates artifacts

set -e

# Check required environment variables
if [ -z "${DATABASE_URL}" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

if [ -z "${RUN_ID}" ]; then
  echo "❌ ERROR: RUN_ID environment variable is not set"
  exit 1
fi

echo "=================================================="
echo "Ownership Audit"
echo "RUN_ID: ${RUN_ID}"
echo "=================================================="
echo ""

# Create artifacts directory
mkdir -p artifacts

# Run the ownership audit
psql "$DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -v run_id="${RUN_ID}" \
  -f db/ownership/run_ownership_audit.sql \
  2>&1 | tee artifacts/ownership_audit.log

EXIT_CODE=${PIPESTATUS[0]}

# Copy artifacts
if [ -f /tmp/run_id.txt ]; then
  cp /tmp/run_id.txt artifacts/
fi

if [ -f /tmp/ownership_audit_summary.csv ]; then
  cp /tmp/ownership_audit_summary.csv artifacts/
fi

if [ -f /tmp/ownership_audit_summary.json ]; then
  cp /tmp/ownership_audit_summary.json artifacts/
fi

# Check results
if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Ownership audit PASSED - No orphans detected"
  exit 0
else
  echo ""
  echo "❌ Ownership audit FAILED - Orphans detected"
  if [ -f artifacts/ownership_audit_summary.csv ]; then
    echo ""
    echo "Orphan counts:"
    cat artifacts/ownership_audit_summary.csv
  fi
  exit 1
fi
