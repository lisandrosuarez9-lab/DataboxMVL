#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Generates Ed25519 keypair and sets Supabase secrets (Windows-friendly, base64-encoded)

.DESCRIPTION
    This script generates a new Ed25519 keypair using Node.js/jose, base64-encodes the JWKs
    to avoid PowerShell quoting issues, and sets them as Supabase secrets using npx.
    
    Required tools:
    - Node.js 18+ with npm/npx
    - Internet connection to download @supabase/cli if needed
    
.PARAMETER ProjectRef
    Optional Supabase project reference (e.g., 'abcdefghijklmnop'). 
    If not provided, uses the linked project.

.PARAMETER DryRun
    If specified, generates keys but does not set secrets (preview mode)

.EXAMPLE
    .\scripts\set-secrets.ps1
    Generates keys and sets secrets for the linked Supabase project

.EXAMPLE
    .\scripts\set-secrets.ps1 -ProjectRef abcdefghijklmnop
    Generates keys and sets secrets for a specific project

.EXAMPLE
    .\scripts\set-secrets.ps1 -DryRun
    Generates keys but does not set secrets (preview only)
#>

param(
    [string]$ProjectRef = "",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "🔐 Ed25519 Keypair Generator & Secret Setter" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Generate keypair using Node.js inline script with jose
Write-Host ""
Write-Host "Generating Ed25519 keypair..." -ForegroundColor Yellow

# Create temporary directory for the script
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("keygen_" + [System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$tempScript = Join-Path $tempDir "generate.mjs"
$tempPackage = Join-Path $tempDir "package.json"

# Create minimal package.json for ES modules
$packageJson = @"
{
  "type": "module"
}
"@
Set-Content -Path $tempPackage -Value $packageJson

$genScriptContent = @"
import * as jose from 'jose';

(async () => {
  try {
    // Generate Ed25519 keypair with extractable option
    const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA', { 
      crv: 'Ed25519',
      extractable: true 
    });
    
    const privateJWK = await jose.exportJWK(privateKey);
    const publicJWK = await jose.exportJWK(publicKey);
    
    privateJWK.kid = 'score-broker-ed25519-v1';
    publicJWK.kid = 'score-broker-ed25519-v1';
    
    const privateJson = JSON.stringify(privateJWK);
    const publicJson = JSON.stringify(publicJWK);
    
    // Base64 encode for PowerShell safety
    const privateB64 = Buffer.from(privateJson).toString('base64');
    const publicB64 = Buffer.from(publicJson).toString('base64');
    
    // Also prepare a trusted JWKs array (containing the public key)
    const trustedJWKs = JSON.stringify({ keys: [publicJWK] });
    const trustedB64 = Buffer.from(trustedJWKs).toString('base64');
    
    console.log(JSON.stringify({
      privateJWK: privateJson,
      publicJWK: publicJson,
      privateB64: privateB64,
      publicB64: publicB64,
      trustedB64: trustedB64
    }));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message, stack: err.stack }));
    process.exit(1);
  }
})();
"@

try {
    # Write temporary script
    Set-Content -Path $tempScript -Value $genScriptContent
    
    # Install jose in temp directory
    Write-Host "  Installing jose package..." -ForegroundColor Gray
    Push-Location $tempDir
    $null = npm install --silent jose 2>&1
    Pop-Location
    
    # Run the script
    $output = node $tempScript
    
    # Clean up temp directory
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    
    if ($output -match '"error"') {
        $errorData = $output | ConvertFrom-Json
        throw $errorData.error
    }
    
    $keys = $output | ConvertFrom-Json
    Write-Host "✓ Keypair generated successfully" -ForegroundColor Green
} catch {
    # Clean up temp directory on error
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✗ Failed to generate keypair: $_" -ForegroundColor Red
    exit 1
}

# Display keys (preview)
Write-Host ""
Write-Host "Generated Keys (preview):" -ForegroundColor Cyan
Write-Host "-------------------------" -ForegroundColor Cyan
Write-Host "Private JWK (first 60 chars): $($keys.privateJWK.Substring(0, [Math]::Min(60, $keys.privateJWK.Length)))..." -ForegroundColor Gray
Write-Host "Public JWK (first 60 chars):  $($keys.publicJWK.Substring(0, [Math]::Min(60, $keys.publicJWK.Length)))..." -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - Not setting secrets" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Would set the following secrets:" -ForegroundColor Yellow
    Write-Host "  SCORE_BROKER_ED25519_JWK_B64" -ForegroundColor Gray
    Write-Host "  SCORE_CHECKER_ED25519_PUBLIC_JWK_B64" -ForegroundColor Gray
    Write-Host "  SCORE_CHECKER_TRUSTED_JWKS_B64" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Base64 values:" -ForegroundColor Cyan
    Write-Host "SCORE_BROKER_ED25519_JWK_B64=$($keys.privateB64)" -ForegroundColor Gray
    Write-Host "SCORE_CHECKER_ED25519_PUBLIC_JWK_B64=$($keys.publicB64)" -ForegroundColor Gray
    Write-Host "SCORE_CHECKER_TRUSTED_JWKS_B64=$($keys.trustedB64)" -ForegroundColor Gray
    exit 0
}

# Set secrets using npx supabase CLI
Write-Host "Setting Supabase secrets..." -ForegroundColor Yellow
Write-Host ""

$projectArg = if ($ProjectRef) { "--project-ref $ProjectRef" } else { "" }

# Prepare secret arguments (use base64 values to avoid quoting issues)
$secret1 = "SCORE_BROKER_ED25519_JWK_B64=$($keys.privateB64)"
$secret2 = "SCORE_CHECKER_ED25519_PUBLIC_JWK_B64=$($keys.publicB64)"
$secret3 = "SCORE_CHECKER_TRUSTED_JWKS_B64=$($keys.trustedB64)"

Write-Host "Setting secrets with npx supabase..." -ForegroundColor Cyan

try {
    # Use npx to run supabase CLI (downloads if needed)
    # Pass all three secrets in a single command to avoid multiple authentications
    if ($ProjectRef) {
        $cmd = "npx --yes supabase@latest secrets set --project-ref $ProjectRef `"$secret1`" `"$secret2`" `"$secret3`""
    } else {
        $cmd = "npx --yes supabase@latest secrets set `"$secret1`" `"$secret2`" `"$secret3`""
    }
    
    Write-Host "Executing: npx supabase secrets set ..." -ForegroundColor Gray
    Invoke-Expression $cmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Secrets set successfully!" -ForegroundColor Green
    } else {
        throw "Supabase CLI returned exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "✗ Failed to set secrets: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual steps:" -ForegroundColor Yellow
    Write-Host "  1. Ensure you're logged in: npx supabase login" -ForegroundColor Gray
    Write-Host "  2. Link your project: npx supabase link --project-ref <your-project-ref>" -ForegroundColor Gray
    Write-Host "  3. Run this script again" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Deploy the edge functions:" -ForegroundColor White
Write-Host "     npx --yes supabase@latest functions deploy score-broker" -ForegroundColor Gray
Write-Host "     npx --yes supabase@latest functions deploy score-checker" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Run the smoke test:" -ForegroundColor White
Write-Host "     .\scripts\smoke-test.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Security note: The private key has been set as a Supabase secret." -ForegroundColor Yellow
Write-Host "    It is not stored locally. Keep your Supabase access secure!" -ForegroundColor Yellow
Write-Host ""
