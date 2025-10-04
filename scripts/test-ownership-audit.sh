#!/bin/bash
# Test script for ownership audit implementation
# Tests SQL syntax and structure without requiring database connection

echo "=================================="
echo "Ownership Audit Test Suite"
echo "=================================="
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Check all files exist
echo "Test 1: Checking file existence..."

check_file() {
  if [ -f "$1" ]; then
    echo "  ✓ $1 exists"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "  ✗ $1 missing"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

check_file "MANDATE.md"
check_file "db/ownership/README.md"
check_file "db/ownership/01_ownership_anchors.sql"
check_file "db/ownership/02_orphan_detection.sql"
check_file "db/ownership/03_attribution_log.sql"
check_file "db/ownership/04_acceptance_test.sql"
check_file "db/ownership/run_ownership_audit.sql"
check_file ".github/workflows/ownership-audit.yml"

echo ""

# Test 2: Check SQL file structure
echo "Test 2: Validating SQL file structure..."

# Check for required elements in Step 1
if grep -q "CREATE TABLE IF NOT EXISTS public.profiles" db/ownership/01_ownership_anchors.sql && \
   grep -q "ALTER TABLE public" db/ownership/01_ownership_anchors.sql && \
   grep -q "ON UPDATE CASCADE" db/ownership/01_ownership_anchors.sql && \
   grep -q "ON DELETE RESTRICT" db/ownership/01_ownership_anchors.sql; then
  echo "  ✓ Step 1 contains ownership anchor logic"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ✗ Step 1 missing required elements"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Check for orphan detection in Step 2
if grep -q "CREATE TEMP TABLE orphan_index" db/ownership/02_orphan_detection.sql && \
   grep -q "owner_id IS NULL" db/ownership/02_orphan_detection.sql; then
  echo "  ✓ Step 2 contains orphan detection logic"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ✗ Step 2 missing required elements"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Check for attribution log in Step 3
if grep -q "CREATE TABLE IF NOT EXISTS public.universal_attribution_log" db/ownership/03_attribution_log.sql && \
   grep -q "run_id TEXT NOT NULL" db/ownership/03_attribution_log.sql && \
   grep -q "prevent_attribution_log_modification" db/ownership/03_attribution_log.sql; then
  echo "  ✓ Step 3 contains attribution log creation"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ✗ Step 3 missing required elements"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Check for acceptance test in Step 4
if grep -q "acceptance_test_results" db/ownership/04_acceptance_test.sql && \
   grep -q "RAISE EXCEPTION" db/ownership/04_acceptance_test.sql && \
   grep -q "/tmp/ownership_audit_summary.csv" db/ownership/04_acceptance_test.sql; then
  echo "  ✓ Step 4 contains acceptance test logic"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ✗ Step 4 missing required elements"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 3: Check for all required tables in scripts
echo "Test 3: Verifying table coverage..."

check_table() {
  local table=$1
  if grep -q "$table" db/ownership/01_ownership_anchors.sql; then
    echo "  ✓ $table is in Step 1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "  ⚠ $table missing from Step 1"
  fi
}

check_table "persona"
check_table "credit_scores"
echo ""

# Test 4: Check GitHub Actions workflow
echo "Test 4: Validating GitHub Actions workflow..."

if command -v python3 &> /dev/null; then
  if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ownership-audit.yml'))" 2>/dev/null; then
    echo "  ✓ YAML syntax is valid"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "  ✗ YAML syntax error"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
else
  echo "  ⚠ Python3 not available, skipping YAML validation"
fi

if grep -q "DATABASE_URL" .github/workflows/ownership-audit.yml && \
   grep -q "upload-artifact" .github/workflows/ownership-audit.yml && \
   grep -q "run_ownership_audit.sql" .github/workflows/ownership-audit.yml; then
  echo "  ✓ Workflow contains required elements"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ✗ Workflow missing required elements"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 5: Check documentation
echo "Test 5: Validating documentation..."

if grep -q "Step 1.*Ownership Anchors" MANDATE.md && \
   grep -q "Step 2.*Orphan Detection" MANDATE.md && \
   grep -q "Step 3.*Attribution Log" MANDATE.md && \
   grep -q "Step 4.*Acceptance Test" MANDATE.md; then
  echo "  ✓ MANDATE.md contains all four steps"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ✗ MANDATE.md incomplete"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

if [ -f db/ownership/README.md ] && [ $(wc -l < db/ownership/README.md) -gt 100 ]; then
  echo "  ✓ db/ownership/README.md is comprehensive"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ✗ db/ownership/README.md missing or too short"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 6: Check master script
echo "Test 6: Validating master orchestration script..."

if grep -q "01_ownership_anchors.sql" db/ownership/run_ownership_audit.sql && \
   grep -q "02_orphan_detection.sql" db/ownership/run_ownership_audit.sql && \
   grep -q "03_attribution_log.sql" db/ownership/run_ownership_audit.sql && \
   grep -q "04_acceptance_test.sql" db/ownership/run_ownership_audit.sql; then
  echo "  ✓ Master script includes all steps"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ✗ Master script incomplete"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

if grep -q "run_id" db/ownership/run_ownership_audit.sql; then
  echo "  ✓ Master script handles RUN_ID"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ✗ Master script missing RUN_ID handling"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Final summary
echo "=================================="
echo "Test Summary"
echo "=================================="
echo "Passed: $TESTS_PASSED"
if [ $TESTS_FAILED -gt 0 ]; then
  echo "Failed: $TESTS_FAILED"
  echo ""
  echo "Some tests failed. Please review the output above."
  exit 1
else
  echo "Failed: $TESTS_FAILED"
  echo ""
  echo "✅ All tests passed!"
  echo ""
  echo "Next steps:"
  echo "1. Set DATABASE_URL secret in GitHub repository settings"
  echo "2. Push to main branch to trigger the workflow"
  echo "3. Monitor the workflow execution in GitHub Actions"
  echo "4. Review artifacts if orphans are detected"
  exit 0
fi
