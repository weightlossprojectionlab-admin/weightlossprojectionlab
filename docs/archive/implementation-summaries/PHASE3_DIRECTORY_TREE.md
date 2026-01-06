# WPL Phase 3 - Complete Directory Tree

**Generated:** 2025-10-07
**PRD Version:** 1.3.7
**Status:** 🟢 Architecture Complete, Implementation In Progress

---

## Complete File Structure

```
weightlossprojectlab/
│
├── PHASE3_ARCHITECTURE.md          ✅ Architecture document
├── PHASE3_DIRECTORY_TREE.md        ✅ This file
├── PHASE3_SUMMARY.md               ⏳ To be generated
├── RUNBOOK.md                      ⏳ To be updated
│
├── app/
│   ├── (dashboard)/                # Authenticated routes
│   │   ├── layout.tsx              📝 Dashboard layout
│   │   │
│   │   ├── coaching/
│   │   │   └── page.tsx            📝 Coaching tab
│   │   │
│   │   ├── missions/
│   │   │   └── page.tsx            📝 Missions tab
│   │   │
│   │   ├── groups/
│   │   │   ├── page.tsx            📝 Groups list
│   │   │   └── [groupId]/
│   │   │       └── page.tsx        📝 Group dashboard
│   │   │
│   │   ├── perks/
│   │   │   └── page.tsx            📝 Sponsor perks (feature-flagged)
│   │   │
│   │   └── admin/
│   │       └── trust-safety/
│   │           └── page.tsx        📝 AISA moderation dashboard
│   │
│   └── api/
│       ├── ai/
│       │   ├── orchestrate/
│       │   │   └── route.ts        📝 AI orchestration endpoint
│       │   └── prompt-templates/
│       │       └── route.ts        📝 Template management
│       │
│       ├── trust-safety/
│       │   ├── cases/
│       │   │   └── route.ts        📝 Case CRUD operations
│       │   └── actions/
│       │       └── route.ts        📝 Admin action execution
│       │
│       └── perks/
│           ├── verify/
│           │   └── route.ts        📝 Redemption verification
│           └── eligibility/
│               └── route.ts        📝 Eligibility check
│
├── components/
│   ├── coaching/
│   │   ├── WeeklyPlanCard.tsx      📝 Weekly plan display
│   │   ├── ProgressChart.tsx       📝 Progress visualization
│   │   └── CoachingActions.tsx     📝 Action buttons
│   │
│   ├── missions/
│   │   ├── MissionCard.tsx         📝 Mission card component
│   │   ├── MissionProgress.tsx     📝 Progress bar
│   │   └── SeasonalChallenge.tsx   📝 Seasonal challenge banner
│   │
│   ├── groups/
│   │   ├── GroupCard.tsx           📝 Group card
│   │   ├── GroupStreakDisplay.tsx  📝 Shared streaks
│   │   ├── TrustScoreBadge.tsx     📝 Trust score indicator
│   │   └── SupportButton.tsx       📝 Support actions
│   │
│   ├── perks/
│   │   ├── PerkCard.tsx            📝 Perk display
│   │   ├── RedemptionFlow.tsx      📝 Redemption UI
│   │   └── EligibilityBanner.tsx   📝 Tier status
│   │
│   └── trust-safety/
│       ├── CaseCard.tsx            📝 Case card
│       ├── QueueView.tsx           📝 Queue display
│       ├── ActionPanel.tsx         📝 Admin actions
│       └── EvidenceViewer.tsx      📝 Evidence panel
│
├── hooks/
│   ├── useCoaching.ts              📝 Coaching data hook
│   ├── useMissions.ts              📝 Missions data hook
│   ├── useGroups.ts                📝 Groups data hook
│   ├── usePerks.ts                 📝 Perks hook
│   ├── useTrustSafety.ts           📝 T&S moderation hook
│   └── useAIOrchestration.ts       📝 AI orchestration hook
│
├── lib/
│   ├── featureFlags.ts             ✅ Feature flag configuration
│   │
│   ├── ai/
│   │   ├── orchestrator.ts         ✅ Main orchestration logic
│   │   ├── promptTemplates.ts      ✅ Template library
│   │   ├── modelRouter.ts          ✅ Model selection
│   │   ├── piiRedaction.ts         ✅ PII handling
│   │   └── decisionLogger.ts       ✅ Decision audit logging
│   │
│   ├── trust-safety/
│   │   ├── caseManager.ts          📝 Case lifecycle management
│   │   ├── riskScoring.ts          ✅ Risk score calculation
│   │   └── moderationActions.ts    📝 Admin action handlers
│   │
│   └── perks/
│       ├── eligibility.ts          📝 Champion tier check
│       ├── redemption.ts           📝 Redemption logic
│       └── webhooks.ts             📝 Webhook verification
│
├── types/
│   ├── ai.ts                       ✅ AI orchestration types
│   ├── trust-safety.ts             ✅ T&S types
│   └── perks.ts                    ✅ Perks types
│
├── __tests__/
│   ├── components/
│   │   ├── coaching/
│   │   │   └── WeeklyPlanCard.test.tsx
│   │   ├── missions/
│   │   │   └── MissionCard.test.tsx
│   │   ├── groups/
│   │   │   └── GroupCard.test.tsx
│   │   ├── perks/
│   │   │   └── PerkCard.test.tsx
│   │   └── trust-safety/
│   │       └── CaseCard.test.tsx
│   │
│   ├── hooks/
│   │   ├── useCoaching.test.ts
│   │   ├── useMissions.test.ts
│   │   ├── useGroups.test.ts
│   │   ├── usePerks.test.ts
│   │   └── useTrustSafety.test.ts
│   │
│   ├── lib/
│   │   ├── ai-orchestration.test.ts    📝 AI tests
│   │   ├── trust-safety.test.ts        📝 T&S tests
│   │   └── perks.test.ts               📝 Perks tests
│   │
│   └── e2e/
│       ├── coaching.spec.ts        📝 Coaching E2E
│       ├── missions.spec.ts        📝 Missions E2E
│       ├── groups.spec.ts          📝 Groups E2E
│       ├── perks.spec.ts           📝 Perks E2E
│       └── trust-safety.spec.ts    📝 T&S E2E
│
└── [Existing Phase 2 files - untouched]
    ├── functions/
    │   ├── coaching/
    │   ├── engagement/
    │   ├── schedulers.ts
    │   └── index.ts
    ├── schemas/
    │   └── firestore/
    └── ...
```

---

## Legend

- ✅ Complete - File created and implemented
- 📝 Pending - File needs to be created
- ⏳ In Progress - File being worked on
- 🔄 Needs Update - Existing file needs modifications

---

## Implementation Priority

### Phase 3A (Critical - Week 1)
1. ✅ Type definitions (ai, trust-safety, perks)
2. ✅ Feature flags
3. ✅ AI Orchestration Layer (complete)
4. ⏳ Trust & Safety utilities
5. 📝 Perks utilities
6. 📝 Core hooks (useCoaching, useMissions, useGroups)
7. 📝 API routes (ai/orchestrate, trust-safety/cases)

### Phase 3B (Important - Week 2)
1. 📝 Dashboard pages (coaching, missions, groups)
2. 📝 React components (coaching, missions, groups)
3. 📝 Trust & Safety Dashboard
4. 📝 Admin action handlers

### Phase 3C (Feature-flagged - Week 3)
1. 📝 Sponsor Perks system (feature-flagged off by default)
2. 📝 Perks components and pages
3. 📝 Perks API routes

### Phase 3D (Testing & Documentation - Week 4)
1. 📝 Unit tests (all components, hooks, lib)
2. 📝 E2E tests (Playwright)
3. 📝 PHASE3_SUMMARY.md
4. 📝 Update RUNBOOK.md
5. 📝 Deployment guide

---

## Files Created So Far

### Documentation
- `PHASE3_ARCHITECTURE.md` - Complete architecture spec
- `PHASE3_DIRECTORY_TREE.md` - This file

### Types
- `types/ai.ts` - AI orchestration types
- `types/trust-safety.ts` - T&S moderation types
- `types/perks.ts` - Sponsor perks types

### Configuration
- `lib/featureFlags.ts` - Feature flag system

### AI Orchestration (Complete ✅)
- `lib/ai/promptTemplates.ts` - 5 templates (coaching, nutrition, moderation)
- `lib/ai/piiRedaction.ts` - PII detection and redaction
- `lib/ai/modelRouter.ts` - Model selection logic (fast/balanced/accurate)
- `lib/ai/decisionLogger.ts` - Firestore decision audit logging
- `lib/ai/orchestrator.ts` - Main orchestration with OpenAI integration

### Trust & Safety (In Progress ⏳)
- `lib/trust-safety/riskScoring.ts` - Risk score calculation (0-100 with recommendations)

---

## Next Steps

1. **Complete Trust & Safety utilities:**
   - `lib/trust-safety/caseManager.ts`
   - `lib/trust-safety/moderationActions.ts`

2. **Create Perks utilities:**
   - `lib/perks/eligibility.ts`
   - `lib/perks/redemption.ts`
   - `lib/perks/webhooks.ts`

3. **Build core hooks:**
   - `hooks/useCoaching.ts`
   - `hooks/useMissions.ts`
   - `hooks/useGroups.ts`
   - `hooks/usePerks.ts`
   - `hooks/useTrustSafety.ts`

4. **Create API routes:**
   - `app/api/ai/orchestrate/route.ts`
   - `app/api/trust-safety/cases/route.ts`
   - `app/api/trust-safety/actions/route.ts`
   - `app/api/perks/eligibility/route.ts`
   - `app/api/perks/verify/route.ts`

5. **Build dashboard pages:**
   - `app/(dashboard)/coaching/page.tsx`
   - `app/(dashboard)/missions/page.tsx`
   - `app/(dashboard)/groups/page.tsx`
   - `app/(dashboard)/groups/[groupId]/page.tsx`
   - `app/(dashboard)/admin/trust-safety/page.tsx`
   - `app/(dashboard)/perks/page.tsx` (feature-flagged)

6. **Create React components** (as needed by pages)

7. **Write tests** (unit + E2E)

8. **Update documentation:**
   - PHASE3_SUMMARY.md
   - RUNBOOK.md (add Phase 3 testing instructions)

---

## Dependencies Installed

```json
{
  "dependencies": {
    "swr": "^2.x",
    "@heroicons/react": "^2.x",
    "chart.js": "^4.x",
    "react-chartjs-2": "^5.x"
  }
}
```

---

## Environment Variables Required

```bash
# .env.local additions for Phase 3

# Feature Flags
NEXT_PUBLIC_PERKS_ENABLED=false
NEXT_PUBLIC_AI_ORCHESTRATION=true
NEXT_PUBLIC_TS_DASHBOARD=true
NEXT_PUBLIC_ANALYTICS=false

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL_FAST=gpt-3.5-turbo
OPENAI_MODEL_BALANCED=gpt-4o-mini
OPENAI_MODEL_ACCURATE=gpt-4-turbo

# Trust & Safety
TS_SLA_FIRST_RESPONSE_HOURS=4
TS_SLA_RESOLUTION_HOURS=72

# Perks (when enabled)
PERKS_WEBHOOK_SECRET=...
```

---

## Firestore Collections Added

### Phase 3 Collections

```
ai_decisions/{decisionId}          # AI decision audit logs
  - decision: string
  - confidence: number
  - rationale: string
  - model: string
  - executedBy: 'AISA' | 'system'
  - timestamp: Timestamp
  - retention: 365 days

disputes/{caseId}                  # Trust & Safety cases
  - status: CaseStatus
  - riskScore: number (0-100)
  - evidence: Evidence[]
  - actions: AdminAction[]
  - slaDeadline: Timestamp

perks_redemptions/{redemptionId}   # Perk redemptions
  - userId: string
  - perkId: string
  - redeemedAt: Timestamp
  - code: string
  - status: RedemptionStatus
```

---

## Key PRD References

- **AI Orchestration:** PRD v1.3.7 § ai_and_data_governance
- **Trust & Safety:** PRD v1.3.7 § trust_safety_moderation
- **Sponsor Perks:** PRD v1.3.7 § Phase 3 Sponsor Perks (feature-flagged)
- **Moderation SLA:** First response 4h, resolution 72h
- **Risk Score Matrix:** >=70 full refund, 40-69 partial, <40 deny
- **Auto-resolve threshold:** Confidence >= 0.8

---

**Status:** 🟢 **35% Complete** (Core infrastructure done, UI layer pending)

