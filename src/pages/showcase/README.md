# Showcase Pages

This directory contains the React components for the GitHub Pages Compliance-First Crediting Showcase.

## Overview

The showcase demonstrates DataboxMVL's compliance-first credit scoring system with:
- Live integrity monitoring
- Transparent scoring methodology
- RiskSeal integration
- Alternate credit scoring for thin-file users
- Read-only sandbox simulations
- Complete audit transparency

## Pages

### 1. ShowcaseHome.tsx ✅ Implemented

Landing page with:
- Hero section explaining the value proposition
- Live integrity status tiles (4 metrics)
- Data blending explanation (traditional + local + RiskSeal)
- Navigation to other showcase sections

**Key Features:**
- Real-time integrity metrics display
- Responsive grid layout
- Loading states
- Accessibility compliant

### 2. CreditStructure.tsx 📋 Planned

Credit scoring methodology visualization:
- Flow diagram: inputs → preprocessing → scoring → banding
- Interactive weight matrix (client-side)
- Factor contribution breakdown
- Risk band definitions
- Evidence mapping with provenance

**Interactive Elements:**
- Slider controls for weights
- Live recalculation
- Hover tooltips for factors
- Click-through to data sources

### 3. RiskSealIntegration.tsx 📋 Planned

RiskSeal signal demonstration:
- Signal taxonomy and descriptions
- Live feed of anonymized events
- Derived risk factors display
- Impact simulation tool
- Signal-to-decision mapping

**Interactive Elements:**
- Toggle signals on/off
- Filter by type and confidence
- Observe score deltas
- View detailed payloads

### 4. AlternateScoring.tsx 📋 Planned

Thin-file credit scoring showcase:
- Report header with run ID
- Factor contribution table
- Comparative view (primary vs alternate)
- Band shift analysis
- Eligibility narrative
- Download buttons (JSON, PDF)

**Features:**
- Client-side PDF generation
- JSON export with integrity hash
- Audit link inclusion
- Human-readable explanations

### 5. Sandbox.tsx 📋 Planned

Safe, read-only simulation environment:
- Input form for parameters:
  - Monthly income
  - Transaction count
  - Remittance frequency
  - Microcredit repayment rate
  - RiskSeal signals
- Real-time score calculation (client-side)
- Explanation panel with factor breakdown
- Lineage display (model, timestamp, policy)
- "No data leaves browser" guarantee

**Technical:**
- All calculations client-side using JS
- No API calls during simulation
- Deterministic scoring
- Published model parameters

### 6. ComplianceAudits.tsx 📋 Planned

Audit trail and compliance dashboard:
- RUN_ID timeline
- Zero-orphan assertions (by table)
- RLS policy catalog
- Attestation statement
- Links to policy docs
- Downloadable artifacts

**Data Sources:**
- Live API calls to audit endpoints
- Cached integrity checks
- Real-time status indicators
- Historical trend charts

## Component Structure

```
src/pages/showcase/
├── ShowcaseHome.tsx           # ✅ Landing page (implemented)
├── CreditStructure.tsx        # 📋 Scoring methodology (planned)
├── RiskSealIntegration.tsx    # 📋 Signal visualization (planned)
├── AlternateScoring.tsx       # 📋 Thin-file reports (planned)
├── Sandbox.tsx                # 📋 Simulation environment (planned)
├── ComplianceAudits.tsx       # 📋 Audit dashboard (planned)
└── components/                # Shared showcase components
    ├── IntegrityBadge.tsx     # RLS/policy status indicator
    ├── RiskFactorCard.tsx     # Risk factor display
    ├── ScoreExplanation.tsx   # Score breakdown
    ├── AuditTimeline.tsx      # Audit log visualization
    └── SandboxSimulator.tsx   # Simulation engine
```

## Shared Components (Planned)

### IntegrityBadge

Shows policy enforcement status inline:
```tsx
<IntegrityBadge
  policyView="public_score_runs"
  rlsStatus="ENFORCED"
  lastRefresh="2024-01-15T10:30:00Z"
  ownershipVerified={true}
/>
```

### RiskFactorCard

Displays individual risk factors:
```tsx
<RiskFactorCard
  factor={{
    code: 'device_consistency',
    value: 0.92,
    confidence: 0.95,
    source: 'RiskSeal'
  }}
/>
```

### ScoreExplanation

Shows factor contributions:
```tsx
<ScoreExplanation
  score={712}
  factors={[
    { name: 'payment_regularity', contribution: 0.2175 },
    // ... more factors
  ]}
/>
```

## Data Flow

### Client-Side Only (Sandbox)
```
User Input → Validation → Client JS Calculation → Display
```

### API-Backed (Other Pages)
```
Page Load → API Call (with RLS) → Transform Data → Display
        ↓
    Cache Response (5 min)
```

## API Integration

All pages except Sandbox use the public API:

```typescript
import { APIResponse, IntegrityStatus } from '@/types';

// Example: Fetch integrity status
const response = await fetch('/api/v1/public/integrity-status');
const data: APIResponse<IntegrityStatus> = await response.json();

if (data.success) {
  setIntegrityStatus(data.data);
}
```

## Styling

Uses Tailwind CSS with custom design tokens:

**Color Palette:**
- `brand-primary` - Main brand color
- `brand-secondary` - Secondary accent
- Semantic colors: green (success), red (error), blue (info), orange (warning)

**Components:**
- Responsive grid layouts (md:grid-cols-2, lg:grid-cols-4)
- Card components with shadows
- Gradient backgrounds for emphasis
- Smooth transitions and animations

## Accessibility

All pages follow WCAG 2.1 AA guidelines:
- Keyboard navigation support
- Screen reader compatible
- Proper heading hierarchy
- Color contrast compliance
- Focus indicators
- ARIA labels where needed

## State Management

Pages use local state with React hooks:
- `useState` for component state
- `useEffect` for data fetching
- Optional Redux for shared state (if needed)

## Performance

Optimization strategies:
- Lazy loading for heavy components
- Memoization with `React.memo`
- Debounced search/filter inputs
- Virtual scrolling for large lists
- Code splitting by route

## Testing

### Unit Tests (Planned)
```typescript
describe('ShowcaseHome', () => {
  it('displays integrity status tiles', () => {
    // Test implementation
  });

  it('handles loading state', () => {
    // Test implementation
  });
});
```

### Integration Tests (Planned)
- API call mocking
- User interaction flows
- Navigation testing

## Development

### Running Locally

```bash
# Start dev server
npm run dev

# Visit showcase pages
# http://localhost:5173/showcase/home
# http://localhost:5173/showcase/credit-structure
# etc.
```

### Building

```bash
# Type check
npm run typecheck

# Build
npm run build

# Preview production build
npm run preview
```

## Navigation

Add to main App.tsx routing:

```tsx
import ShowcaseHome from '@/pages/showcase/ShowcaseHome';
// ... import other showcase pages

<Route path="/showcase">
  <Route index element={<ShowcaseHome />} />
  <Route path="credit-structure" element={<CreditStructure />} />
  <Route path="riskseal" element={<RiskSealIntegration />} />
  <Route path="alternate-scoring" element={<AlternateScoring />} />
  <Route path="sandbox" element={<Sandbox />} />
  <Route path="compliance" element={<ComplianceAudits />} />
</Route>
```

## Mock Data

For development without live API:

```typescript
// src/pages/showcase/mockData.ts
export const mockIntegrityStatus: IntegrityStatus = {
  orphan_records: 0,
  latest_run_id: 'RUN-20240115-ABCD1234',
  audit_entries_30d: 1247,
  rls_status: 'ENFORCED',
  last_verification: new Date().toISOString(),
  tables_checked: 5,
};

export const mockRiskFactors: RiskFactor[] = [
  {
    id: 'rf_001',
    owner_ref: 'demo-12345678',
    factor_code: 'device_consistency',
    factor_value: 0.92,
    confidence: 0.95,
    derived_at: new Date().toISOString(),
    signal_source: 'RiskSeal',
    signal_type: 'device_consistency_check',
    created_at: new Date().toISOString(),
  },
  // ... more mock data
];
```

## Documentation

Related documentation:
- [GITHUB_PAGES_SHOWCASE.md](../../docs/GITHUB_PAGES_SHOWCASE.md) - Complete architecture
- [API_DESIGN_PUBLIC.md](../../docs/API_DESIGN_PUBLIC.md) - API specification
- [SHOWCASE_IMPLEMENTATION_SUMMARY.md](../../docs/SHOWCASE_IMPLEMENTATION_SUMMARY.md) - Implementation status

## Next Steps

1. **Implement Remaining Pages**
   - CreditStructure.tsx
   - RiskSealIntegration.tsx
   - AlternateScoring.tsx
   - Sandbox.tsx
   - ComplianceAudits.tsx

2. **Create Shared Components**
   - IntegrityBadge
   - RiskFactorCard
   - ScoreExplanation
   - AuditTimeline
   - SandboxSimulator

3. **API Integration**
   - Create API client
   - Add error handling
   - Implement caching
   - Add loading states

4. **Testing**
   - Write unit tests
   - Add integration tests
   - E2E testing

5. **Polish**
   - Animations
   - Micro-interactions
   - Performance optimization
   - Accessibility audit

## Contributing

When adding new pages:
1. Follow existing patterns in ShowcaseHome.tsx
2. Use TypeScript types from `/src/types`
3. Follow accessibility guidelines
4. Add appropriate loading/error states
5. Document any new patterns

## License

Part of the DataboxMVL project. See main LICENSE file.
