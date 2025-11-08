# Phase 1 Activation Quick Reference

**One-page guide for activating Phase 1 without guesswork.**

## Prerequisites ✅

- [ ] Node.js 18+ installed
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Supabase project created
- [ ] Repository cloned

## Activation Steps (5 minutes)

### 1. Generate Keys (1 min)

```bash
npm run generate-jwk
```

Copy the output - you'll need both keys.

### 2. Set Secrets (1 min)

```bash
# Replace <private-jwk> and <public-jwk> with values from step 1
supabase secrets set SCORE_BROKER_ED25519_JWK='<private-jwk>'
supabase secrets set SCORE_CHECKER_ED25519_PUBLIC_JWK='<public-jwk>'
```

Verify:
```bash
supabase secrets list
```

### 3. Deploy Functions (2 min)

```bash
supabase functions deploy score-broker
supabase functions deploy score-checker
```

### 4. Test (1 min)

```bash
export SUPABASE_URL="https://your-project.supabase.co"
npm run phase1:smoke-test
```

Expected output: `✅ Phase 1 Smoke Test PASSED`

## Quick Commands

| Action | Command |
|--------|---------|
| Generate keys | `npm run generate-jwk` |
| Rotate keys | `npm run rotate-key` |
| Smoke test | `npm run phase1:smoke-test` |
| Check logs | `supabase functions logs score-broker` |
| List secrets | `supabase secrets list` |
| Deploy function | `supabase functions deploy <function-name>` |

## Troubleshooting

### "Failed to load signing key"
- Check secrets are set: `supabase secrets list`
- Regenerate and reset: `npm run generate-jwk`

### "Token verification failed"
- Ensure both keys are from same generation
- Regenerate both and set again

### Smoke test fails
- Check SUPABASE_URL is correct
- Verify functions are deployed: `supabase functions list`
- Check logs: `supabase functions logs score-checker`

## Security Reminders

⚠️ **Never commit keys to git**
⚠️ **Keep private keys secret**
⚠️ **Rotate keys every 90 days**
⚠️ **Store backup keys securely**

## Full Documentation

- **Complete Deployment Guide**: [PHASE_1_DEPLOYMENT_RUNBOOK.md](PHASE_1_DEPLOYMENT_RUNBOOK.md)
- **Implementation Details**: [PHASE_1_JWT_IMPLEMENTATION.md](PHASE_1_JWT_IMPLEMENTATION.md)
- **Scripts Documentation**: [../scripts/README.md](../scripts/README.md)

## Support

If issues persist after checking above:
1. Check function logs: `supabase functions logs <function-name>`
2. Review full runbook: [PHASE_1_DEPLOYMENT_RUNBOOK.md](PHASE_1_DEPLOYMENT_RUNBOOK.md)
3. Contact DevOps team

---

**Quick Start Time**: ~5 minutes  
**Version**: 1.0  
**Last Updated**: 2025-11-08
