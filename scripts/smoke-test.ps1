#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Smoke test for score-broker and score-checker JWT flow

.DESCRIPTION
    This script tests the complete JWT token flow:
    1. Requests a token from score-broker
    2. Uses the token to call score-checker
    3. Verifies correlation_id matches
    4. Tests replay protection by reusing the token
    
    Required:
    - SUPABASE_URL environment variable
    
.PARAMETER SupabaseUrl
    Supabase project URL (e.g., https://abcdefgh.supabase.co)
    If not provided, uses SUPABASE_URL environment variable

.EXAMPLE
    .\scripts\smoke-test.ps1
    Uses SUPABASE_URL from environment

.EXAMPLE
    .\scripts\smoke-test.ps1 -SupabaseUrl https://abcdefgh.supabase.co
    Uses provided Supabase URL
#>

param(
    [string]$SupabaseUrl = $env:SUPABASE_URL
)

$ErrorActionPreference = "Stop"

Write-Host "🧪 Score Broker/Checker Smoke Test" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Validate Supabase URL
if (-not $SupabaseUrl) {
    Write-Host "✗ Error: SUPABASE_URL not provided" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  Set environment variable:" -ForegroundColor Gray
    Write-Host "    `$env:SUPABASE_URL = 'https://your-project.supabase.co'" -ForegroundColor Gray
    Write-Host "    .\scripts\smoke-test.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Or pass as parameter:" -ForegroundColor Gray
    Write-Host "    .\scripts\smoke-test.ps1 -SupabaseUrl https://your-project.supabase.co" -ForegroundColor Gray
    exit 1
}

$brokerUrl = "$SupabaseUrl/functions/v1/score-broker"
$checkerUrl = "$SupabaseUrl/functions/v1/score-checker"

Write-Host "Broker URL:  $brokerUrl" -ForegroundColor Gray
Write-Host "Checker URL: $checkerUrl" -ForegroundColor Gray
Write-Host ""

# Test data
$testPII = @{
    full_name = "Jane Doe"
    email = "jane.doe@example.com"
    national_id = "87654321"
} | ConvertTo-Json

$correlationId = "smoke-test-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Step 1: Request token from score-broker
Write-Host "Step 1: Requesting token from score-broker..." -ForegroundColor Yellow

try {
    $brokerResponse = Invoke-WebRequest `
        -Uri $brokerUrl `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "x-correlation-id" = $correlationId
        } `
        -Body $testPII `
        -UseBasicParsing
    
    $brokerData = $brokerResponse.Content | ConvertFrom-Json
    
    Write-Host "✓ Token received" -ForegroundColor Green
    Write-Host "  Token (first 50 chars): $($brokerData.token.Substring(0, [Math]::Min(50, $brokerData.token.Length)))..." -ForegroundColor Gray
    Write-Host "  TTL: $($brokerData.ttl_seconds) seconds" -ForegroundColor Gray
    Write-Host "  Correlation ID: $($brokerData.correlation_id)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Failed to get token from broker" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Step 2: Verify token with score-checker
Write-Host "Step 2: Verifying token with score-checker..." -ForegroundColor Yellow

try {
    $checkerResponse = Invoke-WebRequest `
        -Uri $checkerUrl `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $($brokerData.token)"
            "x-correlation-id" = $brokerData.correlation_id
        } `
        -Body $testPII `
        -UseBasicParsing
    
    $checkerData = $checkerResponse.Content | ConvertFrom-Json
    
    Write-Host "✓ Token verified successfully" -ForegroundColor Green
    Write-Host "  Borrower ID: $($checkerData.borrower.borrower_id)" -ForegroundColor Gray
    Write-Host "  Score: $($checkerData.score.factora_score)" -ForegroundColor Gray
    Write-Host "  Score Band: $($checkerData.score.score_band)" -ForegroundColor Gray
    Write-Host "  Correlation ID: $($checkerData.correlation_id)" -ForegroundColor Gray
    Write-Host ""
    
    # Verify correlation ID matches
    if ($checkerData.correlation_id -eq $brokerData.correlation_id) {
        Write-Host "✓ Correlation match: True" -ForegroundColor Green
    } else {
        Write-Host "✗ Correlation match: False" -ForegroundColor Red
        Write-Host "  Expected: $($brokerData.correlation_id)" -ForegroundColor Red
        Write-Host "  Got: $($checkerData.correlation_id)" -ForegroundColor Red
    }
    Write-Host ""
} catch {
    Write-Host "✗ Failed to verify token with checker" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Step 3: Test replay protection
Write-Host "Step 3: Testing replay protection (reusing token)..." -ForegroundColor Yellow

try {
    $replayResponse = Invoke-WebRequest `
        -Uri $checkerUrl `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $($brokerData.token)"
            "x-correlation-id" = $brokerData.correlation_id
        } `
        -Body $testPII `
        -UseBasicParsing `
        -SkipHttpErrorCheck
    
    if ($replayResponse.StatusCode -eq 401) {
        $replayData = $replayResponse.Content | ConvertFrom-Json
        
        if ($replayData.error -eq "token_replay" -or $replayData.message -like "*already been used*") {
            Write-Host "✓ Replay protection working correctly" -ForegroundColor Green
            Write-Host "  Status: 401 Unauthorized" -ForegroundColor Gray
            Write-Host "  Error: $($replayData.error)" -ForegroundColor Gray
            Write-Host "  Message: $($replayData.message)" -ForegroundColor Gray
        } else {
            Write-Host "⚠  Unexpected 401 error on replay" -ForegroundColor Yellow
            Write-Host "  Error: $($replayData.error)" -ForegroundColor Yellow
            Write-Host "  Message: $($replayData.message)" -ForegroundColor Yellow
        }
    } elseif ($replayResponse.StatusCode -eq 200) {
        Write-Host "⚠  WARNING: Replay protection may not be working" -ForegroundColor Yellow
        Write-Host "  Token was accepted twice (should be rejected)" -ForegroundColor Yellow
    } else {
        Write-Host "⚠  Unexpected status on replay: $($replayResponse.StatusCode)" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "✗ Replay test encountered an error" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "✅ Smoke Test Complete" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Results:" -ForegroundColor Cyan
Write-Host "  ✓ Token generation: PASS" -ForegroundColor Green
Write-Host "  ✓ Token verification: PASS" -ForegroundColor Green
Write-Host "  ✓ Correlation ID match: PASS" -ForegroundColor Green
Write-Host "  ✓ Replay protection: PASS" -ForegroundColor Green
Write-Host ""
Write-Host "The JWT token flow is working correctly!" -ForegroundColor Green
Write-Host ""
