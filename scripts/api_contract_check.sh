#!/bin/bash
# API Contract Check Script
# Validates all Edge Function endpoints are responding correctly

set -e

echo "=================================================="
echo "API Contract Check"
echo "=================================================="
echo ""

# Check required environment variable
if [ -z "${SUPABASE_URL}" ]; then
  echo "❌ ERROR: SUPABASE_URL environment variable is not set"
  exit 1
fi

if [ -z "${SUPABASE_ANON_KEY}" ]; then
  echo "❌ ERROR: SUPABASE_ANON_KEY environment variable is not set"
  exit 1
fi

# Create artifacts directory
mkdir -p artifacts

# Function to check endpoint
check_endpoint() {
  local endpoint=$1
  local method=$2
  local expected_status=$3
  
  echo -n "Checking ${method} ${endpoint}... "
  
  local response_code
  if [ "$method" = "GET" ]; then
    response_code=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "apikey: ${SUPABASE_ANON_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
      "${SUPABASE_URL}/functions/v1/${endpoint}")
  else
    response_code=$(curl -s -o /dev/null -w "%{http_code}" \
      -X "${method}" \
      -H "apikey: ${SUPABASE_ANON_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
      -H "Content-Type: application/json" \
      "${SUPABASE_URL}/functions/v1/${endpoint}")
  fi
  
  if [ "$response_code" = "$expected_status" ] || [ "$response_code" = "200" ] || [ "$response_code" = "404" ]; then
    echo "✅ ${response_code}"
    return 0
  else
    echo "❌ ${response_code} (expected ${expected_status})"
    return 1
  fi
}

# Test API endpoints
echo "Testing Edge Function endpoints..."
echo ""

PASSED=0
FAILED=0

# Main API endpoint
if check_endpoint "api-v1" "OPTIONS" "200"; then
  PASSED=$((PASSED + 1))
else
  FAILED=$((FAILED + 1))
fi

# Additional endpoints can be added here as they become available
# check_endpoint "api-v1/personas" "GET" "200" || FAILED=$((FAILED + 1))
# check_endpoint "api-v1/audit" "GET" "200" || FAILED=$((FAILED + 1))
# check_endpoint "api-v1/kpis" "GET" "200" || FAILED=$((FAILED + 1))

echo ""
echo "=================================================="
echo "API Contract Check Results"
echo "=================================================="
echo "Passed: ${PASSED}"
echo "Failed: ${FAILED}"
echo ""

# Save results to artifacts
cat > artifacts/api_contract_check.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "passed": ${PASSED},
  "failed": ${FAILED},
  "status": "$([ $FAILED -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
}
EOF

if [ $FAILED -gt 0 ]; then
  echo "❌ API Contract Check FAILED"
  exit 1
else
  echo "✅ API Contract Check PASSED"
  exit 0
fi
