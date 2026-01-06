# WPL Phase 3: Orchestration & Interface Layer - Architecture

## Overview

Phase 3 builds the orchestration layer and user-facing interfaces on top of Phase 2's business logic. This phase implements:

1. **Trust & Safety Dashboard** - AISA moderation interface
2. **AI Orchestration Layer** - Prompt templates, model router, decision logging
3. **User Interface Hooks** - Coaching, Missions, Groups
4. **Sponsor Perks System** - Feature-flagged partner benefits

**PRD Version:** 1.3.7
**Phase:** 3 - Orchestration & Interface Layer
**Base:** Phase 2 (functions/, schemas/ - untouched)

---

## Directory Structure

```
weightlossprojectlab/
├── app/
│   ├── (dashboard)/                    # Authenticated user routes
│   │   ├── layout.tsx                  # Dashboard layout wrapper
│   │   ├── coaching/
│   │   │   └── page.tsx                # 📊 Coaching tab (weekly plan, progress)
│   │   ├── missions/
│   │   │   └── page.tsx                # 🎯 Missions tab (daily/weekly/seasonal)
│   │   ├── groups/
│   │   │   ├── page.tsx                # 👥 Groups list
│   │   │   └── [groupId]/
│   │   │       └── page.tsx            # Group dashboard (streaks, trust, support)
│   │   ├── perks/
│   │   │   └── page.tsx                # 🎁 Sponsor Perks (feature-flagged)
│   │   └── admin/
│   │       └── trust-safety/
│   │           └── page.tsx            # 🛡️ AISA Moderation Dashboard
│   │
│   └── api/                            # API routes
│       ├── ai/
│       │   ├── orchestrate/
│       │   │   └── route.ts            # AI orchestration endpoint
│       │   └── prompt-templates/
│       │       └── route.ts            # Prompt template management
│       ├── trust-safety/
│       │   ├── cases/
│       │   │   └── route.ts            # Moderation case management
│       │   └── actions/
│       │       └── route.ts            # Admin actions (lock, escalate, note)
│       └── perks/
│           ├── verify/
│           │   └── route.ts            # Perk redemption verification
│           └── eligibility/
│               └── route.ts            # Check Champion tier eligibility
│
├── components/
│   ├── coaching/
│   │   ├── WeeklyPlanCard.tsx          # AI coach weekly plan display
│   │   ├── ProgressChart.tsx           # Coaching progress visualization
│   │   └── CoachingActions.tsx         # Action buttons for coaching
│   ├── missions/
│   │   ├── MissionCard.tsx             # Individual mission card
│   │   ├── MissionProgress.tsx         # Progress bar component
│   │   └── SeasonalChallenge.tsx       # Seasonal challenge banner
│   ├── groups/
│   │   ├── GroupCard.tsx               # Group overview card
│   │   ├── GroupStreakDisplay.tsx      # Shared streak visualization
│   │   ├── TrustScoreBadge.tsx         # Trust score indicator
│   │   └── SupportButton.tsx           # Group support action button
│   ├── perks/
│   │   ├── PerkCard.tsx                # Partner perk display card
│   │   ├── RedemptionFlow.tsx          # Redemption UI flow
│   │   └── EligibilityBanner.tsx       # Champion tier status
│   └── trust-safety/
│       ├── CaseCard.tsx                # Moderation case card
│       ├── QueueView.tsx               # Queue filtering and display
│       ├── ActionPanel.tsx             # Admin action buttons
│       └── EvidenceViewer.tsx          # Evidence display panel
│
├── hooks/
│   ├── useCoaching.ts                  # Coaching data hook
│   ├── useMissions.ts                  # Missions data hook
│   ├── useGroups.ts                    # Groups data hook
│   ├── usePerks.ts                     # Perks eligibility & redemption hook
│   ├── useTrustSafety.ts               # T&S moderation hook
│   └── useAIOrchestration.ts           # AI orchestration hook
│
├── lib/
│   ├── ai/
│   │   ├── orchestrator.ts             # AI orchestration logic
│   │   ├── promptTemplates.ts          # Prompt template library
│   │   ├── modelRouter.ts              # Model selection logic
│   │   ├── piiRedaction.ts             # PII redaction utilities
│   │   └── decisionLogger.ts           # Decision audit logging
│   ├── trust-safety/
│   │   ├── caseManager.ts              # Case lifecycle management
│   │   ├── riskScoring.ts              # Risk score calculation
│   │   └── moderationActions.ts        # Admin action handlers
│   └── perks/
│       ├── eligibility.ts              # Champion tier eligibility check
│       ├── redemption.ts               # Redemption flow logic
│       └── webhooks.ts                 # Partner webhook verification
│
├── types/
│   ├── ai.ts                           # AI orchestration types
│   ├── trust-safety.ts                 # T&S moderation types
│   └── perks.ts                        # Sponsor perks types
│
└── __tests__/
    ├── components/                     # Component unit tests
    ├── hooks/                          # Hook unit tests
    ├── e2e/                            # Playwright E2E tests
    │   ├── coaching.spec.ts
    │   ├── missions.spec.ts
    │   ├── groups.spec.ts
    │   ├── perks.spec.ts
    │   └── trust-safety.spec.ts
    └── lib/
        ├── ai-orchestration.test.ts
        └── trust-safety.test.ts
```

---

## Component Architecture

### 1. Trust & Safety Dashboard

**Route:** `/app/(dashboard)/admin/trust-safety/page.tsx`

**Features:**
- Queue views: new, awaiting_evidence, escalated, closed
- Case cards showing:
  - Sentiment trend
  - Group health metrics
  - Flag status
- Admin actions:
  - Temporary lock
  - Add note
  - Escalate to crisis team
  - Close case

**Data Flow:**
```
TrustSafetyDashboard
  ├── useTrustSafety() → Firestore query
  ├── QueueView
  │   └── CaseCard[]
  │       ├── EvidenceViewer
  │       └── ActionPanel
  └── Filters (reason, coach, date, score_range)
```

**Firestore Queries:**
- `disputes/{disputeId}` - Case records
- `disputes` collection with status filters
- Real-time subscriptions with `onSnapshot`

**API Routes:**
- `POST /api/trust-safety/cases` - Create case
- `PATCH /api/trust-safety/cases/:id` - Update case
- `POST /api/trust-safety/actions/:id` - Execute admin action

---

### 2. AI Orchestration Layer

**Core Files:**
- `lib/ai/orchestrator.ts` - Main orchestration logic
- `lib/ai/promptTemplates.ts` - Template library
- `lib/ai/modelRouter.ts` - Model selection
- `lib/ai/piiRedaction.ts` - PII handling
- `lib/ai/decisionLogger.ts` - Audit logging

**Features:**

#### Prompt Templates
```typescript
interface PromptTemplate {
  id: string;
  name: string;
  category: 'coaching' | 'moderation' | 'nutrition';
  template: string;
  variables: string[];
  piiFields: string[];  // Auto-redact before sending
  modelPreference: 'fast' | 'accurate' | 'balanced';
}
```

**Examples:**
- `coach_weekly_plan` - Generate 7-day plan
- `nudge_motivation` - Daily nudge content
- `meal_analysis_followup` - Nutrition insights
- `moderation_risk_assess` - Risk scoring for disputes

#### Model Router
```typescript
type ModelTier = 'fast' | 'accurate' | 'balanced';

function selectModel(
  context: AIContext,
  dataSensitivity: 'Public' | 'PII' | 'PHI' | 'Financial'
): AIModel {
  // Low-risk + fast → gpt-3.5-turbo
  // Sensitive + high accuracy → gpt-4
  // Balanced → gpt-4o-mini
}
```

**Routing Logic:**
- Public data + low-risk → `gpt-3.5-turbo` (fast)
- PHI/Financial + sensitive → `gpt-4` (accurate)
- PII + moderate → `gpt-4o-mini` (balanced)

#### Decision Logs
```typescript
interface AIDecisionLog {
  decisionId: string;
  timestamp: Timestamp;
  decision: string;
  confidence: number;        // 0.0-1.0
  rationale: string;
  policyReference: string;   // PRD section
  model: string;
  executedBy: 'AISA' | 'system';
  reviewedBy?: string;
  reversalReason?: string;
}
```

**Storage:** `ai_decisions/{decisionId}` collection
**Retention:** 365 days per PRD
**Access:** Auditors (read-only), T&S agents (review)

---

### 3. User Interface Hooks

#### Coaching Tab (`/coaching`)

**Components:**
- `WeeklyPlanCard` - Display AI coach plan
- `ProgressChart` - Adherence & action rate visualization
- `CoachingActions` - "Complete Action" buttons

**Hook:** `useCoaching(uid)`
```typescript
interface CoachingData {
  status: CoachingStatus;
  aiCoachPlan: AICoachPlan | null;
  progress: {
    actionRate: number;
    engagementScore: number;
    daysRemaining: number;
  };
  actions: CoachingAction[];
}
```

**Data Sources:**
- `users/{uid}/coachingStatus/current`
- `users/{uid}/aiCoachPlan/current`
- `users/{uid}/nudgeQueue` (completed actions)

---

#### Missions Tab (`/missions`)

**Components:**
- `MissionCard` - Individual mission with progress
- `SeasonalChallenge` - Banner for active challenges
- `MissionProgress` - Progress bar (0-100%)

**Hook:** `useMissions(uid)`
```typescript
interface MissionsData {
  active: UserMission[];
  completed: MissionHistory[];
  seasonal: SeasonalChallenge | null;
  groupMissions: GroupMission[];
}
```

**Data Sources:**
- `users/{uid}/missions_active`
- `users/{uid}/missions_history` (recent)
- `seasonal_challenges/{seasonId}` (active)
- `groups/{groupId}/socialMissions` (user's groups)

---

#### Group Dashboard (`/groups/[groupId]`)

**Components:**
- `GroupStreakDisplay` - Shared streak visualization
- `TrustScoreBadge` - Member trust score
- `SupportButton` - Cheer/tip/motivate actions

**Hook:** `useGroups(uid, groupId?)`
```typescript
interface GroupData {
  group: GroupDocument;
  members: GroupMember[];
  socialMissions: GroupMission[];
  userTrustScore: number;
  sharedStreak: number;
  supportActions: SupportAction[];
}
```

**Data Sources:**
- `groups/{groupId}`
- `groups/{groupId}/members`
- `groups/{groupId}/socialMissions`
- `groups/{groupId}/supportActions`

**Support Actions:**
- Cheer: +2 XP to recipient
- Tip: Share knowledge (+3 XP)
- Motivate: Send encouragement (+2 XP)

---

### 4. Sponsor Perks System

**Route:** `/app/(dashboard)/perks/page.tsx` (feature-flagged)

**Eligibility:**
- Champion tier: ≥ 10,000 XP
- Opt-in required: `profile.perksOptIn === true`

**Components:**
- `PerkCard` - Display partner offer
- `RedemptionFlow` - Multi-step redemption UI
- `EligibilityBanner` - Status and progress to Champion

**Hook:** `usePerks(uid)`
```typescript
interface PerksData {
  eligible: boolean;
  tier: 'Bronze' | 'Silver' | 'Champion';
  totalXP: number;
  xpToNextTier: number;
  availablePerks: Perk[];
  redeemedPerks: PerkRedemption[];
}
```

**Perk Structure:**
```typescript
interface Perk {
  perkId: string;
  partnerId: string;
  partnerName: string;
  title: string;
  description: string;
  value: string;           // "$10 off", "Free month"
  tier: 'Champion';
  redemptionType: 'code' | 'link' | 'webhook';
  redemptionUrl?: string;
  expiresAt: Timestamp;
}
```

**Redemption Flow:**
1. User clicks "Redeem" on perk card
2. Check eligibility: `GET /api/perks/eligibility`
3. Generate redemption code/link
4. Verify with partner: `POST /api/perks/verify` (webhook)
5. Log redemption in `perks_redemptions/{redemptionId}`
6. Display success with code/link

**Feature Flag:**
```typescript
// lib/featureFlags.ts
export const FEATURE_FLAGS = {
  SPONSOR_PERKS_ENABLED: process.env.NEXT_PUBLIC_PERKS_ENABLED === 'true',
};
```

---

## API Routes

### Trust & Safety API

#### `POST /api/trust-safety/cases`
Create new moderation case
```typescript
Request: {
  reporterId: string;
  targetId: string;  // User or group
  reason: 'scam' | 'abuse' | 'payment_dispute' | 'other';
  description: string;
  evidence: Evidence[];
}
Response: { caseId: string; }
```

#### `POST /api/trust-safety/actions/:caseId`
Execute admin action
```typescript
Request: {
  action: 'lock' | 'note' | 'escalate' | 'close';
  duration?: number;      // For lock (hours)
  note?: string;
  escalateTo?: 'crisis_team';
}
Response: { success: boolean; updatedCase: Case; }
```

---

### AI Orchestration API

#### `POST /api/ai/orchestrate`
Main AI orchestration endpoint
```typescript
Request: {
  templateId: string;
  variables: Record<string, any>;
  userId: string;
  dataSensitivity: 'Public' | 'PII' | 'PHI' | 'Financial';
}
Response: {
  decisionId: string;
  result: string;
  confidence: number;
  rationale: string;
  model: string;
}
```

**Process:**
1. Load template from `lib/ai/promptTemplates.ts`
2. Redact PII fields via `piiRedaction.ts`
3. Route to appropriate model via `modelRouter.ts`
4. Call OpenAI API
5. Log decision via `decisionLogger.ts`
6. Return result with metadata

---

### Perks API

#### `GET /api/perks/eligibility`
Check user eligibility
```typescript
Response: {
  eligible: boolean;
  tier: string;
  totalXP: number;
  xpToNextTier: number;
  optInRequired: boolean;
}
```

#### `POST /api/perks/verify`
Verify and create redemption
```typescript
Request: {
  perkId: string;
  userId: string;
}
Response: {
  redemptionId: string;
  code?: string;
  link?: string;
  expiresAt: Timestamp;
}
```

---

## Data Model Extensions

### AI Decisions Collection
```
ai_decisions/{decisionId}
  - decision: string
  - confidence: number
  - rationale: string
  - policyReference: string (PRD path)
  - model: string
  - executedBy: 'AISA' | 'system'
  - timestamp: Timestamp
  - reviewedBy?: string
  - reversalReason?: string
  - dataSensitivity: 'Public' | 'PII' | 'PHI' | 'Financial'
```

### Trust & Safety Cases
```
disputes/{caseId}
  - reporterId: string
  - targetId: string
  - status: 'new' | 'triage' | 'awaiting_evidence' | 'resolved' | 'closed'
  - reason: string
  - riskScore: number (0-100)
  - evidence: Evidence[]
  - actions: AdminAction[]
  - sentimentTrend: 'improving' | 'declining' | 'stable'
  - groupHealth?: number (0-1.0)
  - assignedTo?: string
  - createdAt: Timestamp
  - resolvedAt?: Timestamp
  - slaDeadline: Timestamp
```

### Perks Redemptions
```
perks_redemptions/{redemptionId}
  - userId: string
  - perkId: string
  - partnerId: string
  - redeemedAt: Timestamp
  - expiresAt: Timestamp
  - code?: string
  - link?: string
  - status: 'active' | 'used' | 'expired'
  - webhookVerified: boolean
```

---

## Testing Strategy

### Unit Tests
- All hooks (useCoaching, useMissions, useGroups, usePerks, useTrustSafety)
- AI orchestration (prompt templates, model router, PII redaction)
- Trust & Safety (risk scoring, case lifecycle)
- Perks (eligibility, redemption)

### Playwright E2E Tests
- `coaching.spec.ts` - View plan, complete actions
- `missions.spec.ts` - View missions, mark progress
- `groups.spec.ts` - View group, send support action
- `perks.spec.ts` - Check eligibility, redeem perk
- `trust-safety.spec.ts` - Create case, admin actions

**Test Scenarios:**
1. **Coaching Flow:**
   - User views AI coach plan
   - Completes daily action
   - Progress chart updates

2. **Missions Flow:**
   - User views active missions
   - Completes mission (weight log)
   - XP awarded, mission marked complete

3. **Group Support:**
   - User joins group
   - Sends cheer to member
   - Trust score updates

4. **Perk Redemption:**
   - Champion user views perks
   - Redeems perk
   - Receives code/link

5. **Trust & Safety:**
   - Admin views new cases
   - Reviews evidence
   - Takes action (lock/note/escalate)
   - Case moves to appropriate queue

---

## Security & Privacy

### PII Redaction
```typescript
// lib/ai/piiRedaction.ts
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,  // Basic pattern
};

export function redactPII(text: string, fields: string[]): string {
  // Replace with [REDACTED_EMAIL], [REDACTED_PHONE], etc.
}
```

### Data Sensitivity Tags
All data passed to AI includes sensitivity classification:
- `Public` - Leaderboard stats, aggregated data
- `PII` - Email, name, contact info
- `PHI` - Weight logs, meal data
- `Financial` - Stripe records, payouts

### Access Control
- T&S Dashboard: `role === 'ts_agent' || role === 'ts_lead'`
- AI Decision Review: `role === 'auditor' || role === 'ts_lead'`
- Perks Admin: `role === 'admin'`

---

## Feature Flags

```typescript
// lib/featureFlags.ts
export const FEATURE_FLAGS = {
  SPONSOR_PERKS_ENABLED: process.env.NEXT_PUBLIC_PERKS_ENABLED === 'true',
  AI_ORCHESTRATION_ENABLED: process.env.NEXT_PUBLIC_AI_ORCHESTRATION === 'true',
  TRUST_SAFETY_DASHBOARD: process.env.NEXT_PUBLIC_TS_DASHBOARD === 'true',
};

// Usage in components
import { FEATURE_FLAGS } from '@/lib/featureFlags';

export default function PerksPage() {
  if (!FEATURE_FLAGS.SPONSOR_PERKS_ENABLED) {
    return <ComingSoonBanner feature="Sponsor Perks" />;
  }
  // ...
}
```

---

## Deployment Checklist

### Environment Variables
```bash
# .env.local additions
NEXT_PUBLIC_PERKS_ENABLED=false
NEXT_PUBLIC_AI_ORCHESTRATION=true
NEXT_PUBLIC_TS_DASHBOARD=true
OPENAI_API_KEY=sk-...
OPENAI_MODEL_FAST=gpt-3.5-turbo
OPENAI_MODEL_ACCURATE=gpt-4
OPENAI_MODEL_BALANCED=gpt-4o-mini
```

### Firestore Indexes
```
disputes:
  - status ASC, riskScore DESC
  - status ASC, slaDeadline ASC
  - assignedTo ASC, status ASC

ai_decisions:
  - executedBy ASC, timestamp DESC
  - confidence ASC, timestamp DESC

perks_redemptions:
  - userId ASC, redeemedAt DESC
  - status ASC, expiresAt ASC
```

### Next Steps
1. Install dependencies: `swr`, `@heroicons/react`, `chart.js`, `react-chartjs-2`
2. Generate all component files
3. Implement hooks with useSWR
4. Create API routes
5. Write tests
6. Update RUNBOOK.md and PHASE3_SUMMARY.md

---

**Architecture Status: ✅ DEFINED**
**Next: Implementation**
