# Factora Credit Score - Single-CTA Frontend

## Overview

The Factora Credit Score feature provides a simple, focused interface for users to:
1. Submit their personal information for credit evaluation
2. Receive an instant credit score
3. View their borrower profile and score details

## Access

The Factora single-CTA page is accessible at:
- **Local Development**: `http://localhost:5173/DataboxMVL/factora`
- **Production**: `https://lisandrosuarez9-lab.github.io/DataboxMVL/factora`

## Architecture

### Components

- **Hero.tsx** - Landing section with single CTA button "Get Started"
- **IntakeForm.tsx** - Form to collect borrower information
- **ProfileCard.tsx** - Displays credit score results and borrower details
- **Spinner.tsx** - Loading indicator for async operations

### Data Flow

1. User clicks "Get Started" on Hero
2. IntakeForm collects:
   - Full Name
   - National ID
   - Email
   - Phone
   - Consent (required)
   - Optional: Intent for financing, Prior borrowing history
3. Form submits to Supabase score-checker function
4. ProfileCard displays results with:
   - Credit score (0-850 range)
   - Score band (Poor/Fair/Good/Excellent)
   - Borrower information
   - Borrower ID and timestamp

### API Integration

**Endpoint**: `https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker`

**Method**: POST

**Payload**:
```json
{
  "full_name": "John Doe",
  "national_id": "123456789",
  "email": "john@example.com",
  "phone": "+1-555-000-0000",
  "consent": true,
  "consent_text": "I consent to the processing of my personal data for credit evaluation purposes",
  "intake_source": "github_pages_demo",
  "intake_form_version": "v1",
  "intent_financing": false,
  "prior_borrowing": false
}
```

**Response**:
```json
{
  "borrower": {
    "borrower_id": "uuid",
    "full_name": "John Doe",
    "national_id": "123456789",
    "email": "john@example.com",
    "phone": "+1-555-000-0000",
    "created_at": "2025-11-08T01:00:00.000Z"
  },
  "enrichment": {
    "ip_address": "...",
    "user_agent": "...",
    "timestamp": "..."
  },
  "score": {
    "factora_score": 720,
    "score_band": "Good",
    "risk_level": "Low"
  }
}
```

## Environment Variables

The application requires these environment variables for production deployment:

```bash
VITE_SUPABASE_URL=https://rzashahhkafjicjpupww.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_anon_key_here
VITE_PROFILE_FN_URL=https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker
VITE_SCORE_CHECKER_URL=https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker
```

**⚠️ SECURITY**: Never commit `.env.production` with real keys. Use `.env.production.example` as a template and inject secrets via CI/CD.

## Development

### Local Development

1. Copy environment template:
```bash
cp .env.production.example .env.local
```

2. Update `.env.local` with your Supabase credentials

3. Start development server:
```bash
npm run dev
```

4. Navigate to: `http://localhost:5173/DataboxMVL/factora`

### Building

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Testing

Test the score checker function directly:

```bash
curl -X POST https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "AI Test User",
    "national_id": "000000000",
    "email": "ai.test@example.com",
    "phone": "+1-000-000-0000",
    "consent": true,
    "consent_text": "I agree",
    "intake_source": "github_pages_demo",
    "intake_form_version": "v1",
    "intent_financing": false,
    "prior_borrowing": false
  }'
```

## Deployment

### Automated Deployment (Recommended)

The application automatically deploys to GitHub Pages when changes are pushed to the `main` branch.

**Prerequisites**:
1. Set GitHub Secret: `VITE_SUPABASE_ANON_KEY`
2. Enable GitHub Pages in repository settings (source: GitHub Actions)

### Manual Deployment

```bash
npm run deploy
```

This uses the `gh-pages` package to deploy the `dist/` directory to the `gh-pages` branch.

## Launch Agent

For deterministic, auditable deployments, use the Launch Automation Agent:

```bash
# Dry run (validation only)
npm run launch-agent:dry-run

# Full deployment
npm run launch-agent

# Verbose mode
npm run launch-agent:verbose
```

See [LAUNCH_AGENT_MANDATE.md](../docs/LAUNCH_AGENT_MANDATE.md) for complete details.

## Styling

Custom styles are in `src/styles/factora.css` with:
- Gradient purple/indigo color scheme
- Responsive design (mobile-first)
- Smooth transitions and hover effects
- Score-based color coding (red/orange/blue/green)

## Security & Compliance

✅ **Consent Required**: Users must explicitly consent to data processing
✅ **HTTPS Only**: All API calls use secure connections
✅ **No Secret Exposure**: Secrets injected via CI, never committed
✅ **CORS Validated**: Origin validation for GitHub Pages domain
✅ **Data Minimization**: Only required fields collected

## Troubleshooting

### CORS Errors

Ensure the score-checker function has proper CORS headers:
```typescript
headers: {
  'Access-Control-Allow-Origin': 'https://lisandrosuarez9-lab.github.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

### Build Errors

1. Clear cache and reinstall:
```bash
rm -rf node_modules .vite dist
npm ci
npm run build
```

2. Check TypeScript errors:
```bash
npm run typecheck
```

### API Errors

Check the browser console for detailed error messages. Common issues:
- Missing environment variables
- Invalid API URL
- Network/DNS issues
- Invalid payload format

## Support

For issues or questions:
- Check existing documentation in `docs/`
- Review GitHub Issues
- Check deployment logs in GitHub Actions

---

**Last Updated**: 2025-11-08
**Version**: 1.0.0
