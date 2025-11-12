#!/bin/bash
# Manual CORS Verification Script
# This script demonstrates how to test the CORS implementation

echo "=================================================="
echo "CORS Implementation Verification Script"
echo "=================================================="
echo ""

FUNCTION_URL="https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker"
ORIGIN="https://lisandrosuarez9-lab.github.io"

echo "Testing OPTIONS preflight request..."
echo "URL: $FUNCTION_URL"
echo "Origin: $ORIGIN"
echo ""

# Test 1: OPTIONS with custom headers
echo "Test 1: OPTIONS with x-factora-correlation-id"
echo "----------------------------------------------"
echo "Command:"
echo "curl -i -X OPTIONS \\"
echo "  '$FUNCTION_URL' \\"
echo "  -H 'Origin: $ORIGIN' \\"
echo "  -H 'Access-Control-Request-Method: POST' \\"
echo "  -H 'Access-Control-Request-Headers: content-type,authorization,apikey,x-client-info,x-factora-correlation-id'"
echo ""
echo "Expected Response Headers:"
echo "  - Access-Control-Allow-Origin: $ORIGIN"
echo "  - Access-Control-Allow-Headers: content-type,authorization,apikey,x-client-info,x-factora-correlation-id"
echo "  - Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "  - Access-Control-Max-Age: 86400"
echo "  - Vary: Origin, Access-Control-Request-Headers, Access-Control-Request-Method"
echo ""

# Uncomment to run actual test (requires curl and deployed function)
# curl -i -X OPTIONS \
#   "$FUNCTION_URL" \
#   -H "Origin: $ORIGIN" \
#   -H "Access-Control-Request-Method: POST" \
#   -H "Access-Control-Request-Headers: content-type,authorization,apikey,x-client-info,x-factora-correlation-id"

echo ""
echo "Test 2: OPTIONS with minimal headers"
echo "----------------------------------------------"
echo "Command:"
echo "curl -i -X OPTIONS \\"
echo "  '$FUNCTION_URL' \\"
echo "  -H 'Origin: $ORIGIN' \\"
echo "  -H 'Access-Control-Request-Method: POST'"
echo ""
echo "Expected Response Headers:"
echo "  - Access-Control-Allow-Origin: $ORIGIN"
echo "  - Access-Control-Allow-Headers: authorization, apikey, content-type, x-client-info, x-factora-correlation-id (fallback)"
echo "  - Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "  - Access-Control-Max-Age: 86400"
echo "  - Vary: Origin, Access-Control-Request-Method"
echo ""

# Uncomment to run actual test
# curl -i -X OPTIONS \
#   "$FUNCTION_URL" \
#   -H "Origin: $ORIGIN" \
#   -H "Access-Control-Request-Method: POST"

echo ""
echo "Test 3: OPTIONS with invalid origin"
echo "----------------------------------------------"
echo "Command:"
echo "curl -i -X OPTIONS \\"
echo "  '$FUNCTION_URL' \\"
echo "  -H 'Origin: https://malicious-site.com' \\"
echo "  -H 'Access-Control-Request-Method: POST' \\"
echo "  -H 'Access-Control-Request-Headers: content-type'"
echo ""
echo "Expected Response Headers:"
echo "  - Access-Control-Allow-Origin: $ORIGIN (default to whitelisted)"
echo "  - Access-Control-Allow-Headers: content-type"
echo "  - Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "  - Access-Control-Max-Age: 86400"
echo "  - Vary: Origin, Access-Control-Request-Headers, Access-Control-Request-Method"
echo ""

# Uncomment to run actual test
# curl -i -X OPTIONS \
#   "$FUNCTION_URL" \
#   -H "Origin: https://malicious-site.com" \
#   -H "Access-Control-Request-Method: POST" \
#   -H "Access-Control-Request-Headers: content-type"

echo ""
echo "=================================================="
echo "To run actual tests:"
echo "1. Uncomment the curl commands in this script"
echo "2. Ensure the score-checker function is deployed:"
echo "   supabase functions deploy score-checker"
echo "3. Run this script: ./tests/verify-cors-manual.sh"
echo "=================================================="
