#!/bin/bash
# UI Audit Snapshot Script
# Captures UI state and verifies key pages are accessible

set -e

echo "=================================================="
echo "UI Audit Snapshot"
echo "=================================================="
echo ""

# Create artifacts directory
mkdir -p artifacts

# Check if dist directory exists
if [ ! -d "dist" ]; then
  echo "❌ ERROR: dist directory not found. Run build first."
  exit 1
fi

# Check for key files
echo "Checking for key UI files..."
PASSED=0
FAILED=0

check_file() {
  local file=$1
  echo -n "  Checking ${file}... "
  if [ -f "dist/${file}" ]; then
    echo "✅"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo "❌"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Check key files
check_file "index.html"
check_file "assets/index.js" || check_file "assets/index-*.js" || echo "    (JS bundle may have hash)"

# Count total files in dist
FILE_COUNT=$(find dist -type f | wc -l)
echo ""
echo "Total files in dist/: ${FILE_COUNT}"

# Create UI audit report
cat > artifacts/ui_audit_snapshot.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "dist_files_count": ${FILE_COUNT},
  "checks_passed": ${PASSED},
  "checks_failed": ${FAILED},
  "status": "$([ $FAILED -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
}
EOF

# Generate file listing
find dist -type f | sort > artifacts/ui_file_listing.txt

echo ""
echo "=================================================="
echo "UI Audit Snapshot Results"
echo "=================================================="
echo "Files checked: $((PASSED + FAILED))"
echo "Passed: ${PASSED}"
echo "Failed: ${FAILED}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "❌ UI Audit Snapshot FAILED"
  exit 1
else
  echo "✅ UI Audit Snapshot PASSED"
  exit 0
fi
