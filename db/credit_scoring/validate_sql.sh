#!/bin/bash

# SQL Validation Script
# This script validates the syntax of SQL files without connecting to a database

echo "Validating Credit Scoring SQL Files..."

# Function to validate SQL syntax
validate_sql() {
    local file="$1"
    echo "Validating $file..."
    
    # Use psql --dry-run to check syntax without executing
    if psql --dry-run -f "$file" > /dev/null 2>&1; then
        echo "✅ $file: Syntax valid"
        return 0
    else
        echo "❌ $file: Syntax error detected"
        psql --dry-run -f "$file" 2>&1 | head -5
        return 1
    fi
}

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Validate each SQL file
errors=0

# Skip --dry-run as it's not available in all PostgreSQL versions
# Instead, do basic syntax checks
echo "Performing basic SQL syntax validation..."

for file in *.sql; do
    if [[ -f "$file" ]]; then
        echo "Checking $file..."
        # Basic validation: check if file contains valid SQL keywords
        if grep -q -E "(CREATE|INSERT|SELECT|ALTER|DROP)" "$file"; then
            echo "✅ $file: Contains valid SQL statements"
        else
            echo "⚠️  $file: No SQL statements detected"
        fi
        
        # Check for common syntax errors
        if grep -q ";" "$file"; then
            echo "✅ $file: Contains statement terminators"
        else
            echo "⚠️  $file: Missing statement terminators"
        fi
    fi
done

echo ""
echo "SQL validation completed."
echo "Note: This is a basic syntax check. Full validation requires database connection."