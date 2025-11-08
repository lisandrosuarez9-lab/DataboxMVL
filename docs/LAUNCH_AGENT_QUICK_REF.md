# Launch Agent Quick Reference

## Command Summary

```bash
# Full deployment
npm run launch-agent

# Dry run (safe validation)
npm run launch-agent:dry-run

# Verbose output
npm run launch-agent:verbose

# Skip specific steps
node scripts/launch-agent.cjs --skip-steps=3,4

# Custom contract
node scripts/launch-agent.cjs --contract=custom-contract.json
```

## Exit Codes
- `0` = Success
- `1` = Failure

## Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| `INVALID_NODE_VERSION` | Node < 18 | Upgrade Node.js |
| `BUILD_FAILED` | npm build failed | Fix build errors |
| `FUNCTION_AUTH_REQUIRED` | Function needs auth | Configure public access |
| `CORS_MISSING` | CORS not configured | Add CORS headers |
| `SECRET_IN_REPO` | Secrets committed | Rotate & scrub history |
| `SITE_NOT_LIVE` | Pages not loading | Wait or check config |

## Steps Overview

| Step | Name | Can Skip? | Output |
|------|------|-----------|--------|
| Preflight | Environment validation | No | Runtime versions |
| 0 | Load contract | No | Contract checksum |
| 1 | File validation | No | file-manifest.json |
| 2 | Build | Yes* | dist-artifact-manifest.json |
| 3 | Function tests | Yes* | response-sample.json |
| 4 | Deploy | Yes* | deploy-report.json |
| 5 | Smoke test | Yes* | Test results |
| 7 | Security | No | Security validation |
| 9 | Artifacts | No | All manifests |
| 10 | Report | No | launch-report.json |

*Can skip with `--skip-steps`

## Artifacts Location

All artifacts saved to: `artifacts/`

Key files:
- `launch-report.json` - Complete run report
- `file-manifest.json` - Source files with SHA256
- `dist-artifact-manifest.json` - Build outputs with SHA256
- `response-sample.json` - Function test response
- `deploy-report.json` - Deployment metadata
- `previous-gh-pages-hash.txt` - Rollback reference
- `correlation-<id>.log.json` - Detailed logs

## Rollback

```bash
# Manual rollback to previous deployment
PREV_HASH=$(cat artifacts/previous-gh-pages-hash.txt)
git push origin $PREV_HASH:gh-pages --force
```

## Common Workflows

### Pre-deployment Validation
```bash
# Validate without deploying
npm run launch-agent:dry-run
```

### Full Production Deploy
```bash
# Complete deployment with all steps
npm run launch-agent
```

### Debug Failed Deployment
```bash
# Run with verbose logging
npm run launch-agent:verbose

# Check the report
cat artifacts/launch-report.json | jq .errors

# View detailed logs
cat artifacts/correlation-*.log.json
```

### Skip Network Tests (for local testing)
```bash
# Skip function tests and deployment
node scripts/launch-agent.cjs --skip-steps=3,4,5 --dry-run
```

## CI/CD Integration

Minimal GitHub Actions:
```yaml
- name: Deploy
  run: npm run launch-agent
  
- name: Upload artifacts
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: launch-artifacts
    path: artifacts/
```

## Troubleshooting

### Build fails
```bash
# Clean and retry manually
rm -rf node_modules dist .vite
npm ci
npm run build
```

### Function returns 401
- Check function is configured for public access
- Or provide authentication method

### CORS errors
- Ensure function has CORS headers
- Check origin matches exactly

### Site not live after 5 min
- GitHub Pages can take up to 10 min
- Check Pages settings enabled
- Verify deploy.yml workflow

### Security check fails
- Review matches carefully
- Comments and docs are excluded
- Real secrets must be rotated

## Support

- Full docs: `docs/LAUNCH_AGENT.md`
- Architecture: `ARCHITECTURE.md`
- Issues: Check `artifacts/launch-report.json`
