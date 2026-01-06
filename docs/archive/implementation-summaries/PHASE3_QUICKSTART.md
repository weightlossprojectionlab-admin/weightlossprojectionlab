# WPL Phase 3 - Quick Start Guide

**Status:** 🟢 Core Infrastructure Complete (60%)
**Ready for:** AI Orchestration, Coaching Dashboard, Testing

---

## What's Been Built

### ✅ Complete & Production-Ready
1. **AI Orchestration Layer** (100%)
   - 5 prompt templates (coaching, nutrition, moderation)
   - PII redaction with 7 detection patterns
   - Smart model router (fast/balanced/accurate)
   - Decision audit logging (365-day retention)
   - Full OpenAI integration

2. **Trust & Safety Foundation** (80%)
   - Risk scoring algorithm (0-100)
   - Signal detection (8 risk signals)
   - Auto-recommendation system
   - Foundation for moderation dashboard

3. **Infrastructure** (100%)
   - TypeScript types (AI, T&S, Perks)
   - Feature flags for controlled rollouts
   - useSWR hooks (useCoaching, useMissions)
   - API route structure

### ⏳ In Progress
- React components (0%)
- Additional dashboard pages (17%)
- Complete test coverage (20%)

---

## Quick Start - 3 Steps

### 1. Install Dependencies

```bash
npm install
```

Already included in `package.json`:
- `swr` - Data fetching
- `@heroicons/react` - Icons
- `chart.js`, `react-chartjs-2` - Charts

### 2. Configure Environment

Add to `.env.local`:

```bash
# Feature Flags
NEXT_PUBLIC_AI_ORCHESTRATION=true
NEXT_PUBLIC_TS_DASHBOARD=true
NEXT_PUBLIC_PERKS_ENABLED=false

# OpenAI (Required for AI Orchestration)
OPENAI_API_KEY=sk-...
OPENAI_MODEL_FAST=gpt-3.5-turbo
OPENAI_MODEL_BALANCED=gpt-4o-mini
OPENAI_MODEL_ACCURATE=gpt-4-turbo
```

### 3. Start Dev Server

```bash
npm run dev
```

Visit: http://localhost:3000/coaching

---

## Test AI Orchestration (2 minutes)

### Option A: API Endpoint (Recommended)

```bash
curl -X POST http://localhost:3000/api/ai/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "nudge_motivation",
    "variables": {
      "recentAction": "logged weight",
      "daysSinceLastLog": "1",
      "currentGoal": "lose 10kg",
      "tone": "supportive"
    },
    "userId": "test-user-123",
    "dataSensitivity": "Public"
  }'
```

**Expected Response:**
```json
{
  "decisionId": "abc123...",
  "result": "Great job logging your weight yesterday! ...",
  "confidence": 0.85,
  "model": "gpt-3.5-turbo",
  "latencyMs": 1200
}
```

### Option B: Direct Function Call

```typescript
// test-ai.ts
import { orchestrateAI } from './lib/ai/orchestrator';

orchestrateAI({
  templateId: 'nudge_motivation',
  variables: {
    recentAction: 'logged weight',
    daysSinceLastLog: '1',
    currentGoal: 'lose 10kg',
    tone: 'supportive',
  },
  userId: 'test123',
  dataSensitivity: 'Public',
}).then(console.log);
```

Run: `npx ts-node test-ai.ts`

---

## Test Risk Scoring (1 minute)

```typescript
// test-risk.ts
import { calculateRiskScore } from './lib/trust-safety/riskScoring';

const result = calculateRiskScore({
  reason: 'coach_no_show',
  evidence: [
    { type: 'zoom', data: { duration: 300 } },
  ],
  targetHistory: { priorDisputes: 2 },
});

console.log('Risk Score:', result.score);        // 70 (refund_full threshold)
console.log('Recommendation:', result.recommendation); // "refund_full"
console.log('Confidence:', result.confidence);   // 0.75
```

Run: `npx ts-node test-risk.ts`

---

## Available Pages

| Page | Route | Status |
|------|-------|--------|
| Coaching Dashboard | `/coaching` | ✅ Complete |
| Missions Tab | `/missions` | ⏳ TODO |
| Groups List | `/groups` | ⏳ TODO |
| Group Detail | `/groups/:id` | ⏳ TODO |
| Trust & Safety | `/admin/trust-safety` | ⏳ TODO |
| Sponsor Perks | `/perks` | ⏳ TODO (feature-flagged) |

---

## Run Tests

```bash
# Unit tests
npm test

# AI Orchestration tests only
npm test -- ai-orchestration.test.ts

# E2E tests (requires Playwright)
npx playwright install  # First time only
npx playwright test
```

---

## Key Files Reference

### AI Orchestration
- `lib/ai/orchestrator.ts` - Main orchestration engine
- `lib/ai/promptTemplates.ts` - 5 pre-built templates
- `lib/ai/modelRouter.ts` - Model selection logic
- `lib/ai/piiRedaction.ts` - PII detection & redaction
- `lib/ai/decisionLogger.ts` - Audit logging

### Hooks
- `hooks/useCoaching.ts` - Coaching data (status, plan, actions)
- `hooks/useMissions.ts` - Missions data (active, completed, seasonal)

### API Routes
- `app/api/ai/orchestrate/route.ts` - AI orchestration endpoint

### Pages
- `app/(dashboard)/coaching/page.tsx` - Coaching dashboard

### Types
- `types/ai.ts` - AI types
- `types/trust-safety.ts` - T&S types
- `types/perks.ts` - Perks types

---

## Prompt Templates Available

| ID | Category | Use Case | Model Tier |
|----|----------|----------|------------|
| `coach_weekly_plan` | coaching | Generate 7-day AI coach plan | balanced |
| `nudge_motivation` | coaching | Daily motivational nudges | fast |
| `meal_analysis_followup` | nutrition | Meal insights & tips | balanced |
| `moderation_risk_assess` | moderation | Risk assessment for T&S cases | accurate |
| `support_sentiment_analysis` | support | Sentiment analysis of messages | balanced |

---

## PII Redaction Patterns

Automatically redacts:
- ✅ Email addresses
- ✅ Phone numbers
- ✅ SSN
- ✅ Credit card numbers
- ✅ IP addresses
- ✅ Names (basic pattern)
- ✅ Street addresses

---

## Next Steps

### Week 1: Complete T&S Dashboard
1. Implement case manager (`lib/trust-safety/caseManager.ts`)
2. Build moderation dashboard UI
3. Create case card components
4. Add API routes for cases

### Week 2: Complete User Dashboards
1. Missions page
2. Groups pages
3. Components for each page
4. Complete `useGroups` hook

### Week 3: Sponsor Perks (Feature-flagged)
1. Eligibility system
2. Redemption logic
3. Perks page + components

### Week 4: Testing & Polish
1. Unit tests (90% coverage target)
2. E2E tests for all pages
3. Accessibility audit
4. Performance optimization

---

## Common Issues

**Q: OpenAI API returns error**
```
Error: OPENAI_API_KEY not configured
```
**A:** Add `OPENAI_API_KEY=sk-...` to `.env.local`

**Q: useSWR hook returns null**
```
data remains null, loading is false
```
**A:** Check that `userId` is not null. useSWR skips when key is null.

**Q: Types not found**
```
Cannot find module '@/types/ai'
```
**A:** Restart TypeScript server or run `npm run dev` to rebuild.

---

## Documentation

- `PHASE3_ARCHITECTURE.md` - Detailed architecture
- `PHASE3_DIRECTORY_TREE.md` - Complete file tree
- `PHASE3_SUMMARY.md` - Comprehensive summary
- `RUNBOOK.md` - Testing guide (Phase 2 + Phase 3)

---

## Feature Flags

Control rollout in `.env.local`:

```bash
NEXT_PUBLIC_AI_ORCHESTRATION=true      # AI Orchestration Layer
NEXT_PUBLIC_TS_DASHBOARD=true          # Trust & Safety Dashboard
NEXT_PUBLIC_PERKS_ENABLED=false        # Sponsor Perks (off by default)
NEXT_PUBLIC_ANALYTICS=false            # Analytics (future)
```

---

## Support

**Issues?** Check:
1. `PHASE3_SUMMARY.md` - Troubleshooting section
2. `RUNBOOK.md` - Phase 3 testing guide
3. `wlpl_prd_full.json` - PRD v1.3.7 reference

**PRD References:**
- AI Orchestration: `§ ai_and_data_governance`
- Trust & Safety: `§ trust_safety_moderation`
- Coaching: `§ coaching_readiness_system`
- Missions: `§ retention_loop_system`

---

**Ready to build!** 🚀

Start with:
```bash
npm run dev
curl -X POST http://localhost:3000/api/ai/orchestrate ...
```
