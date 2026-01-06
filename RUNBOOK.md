# WPL Phase 2 Business Logic - RUNBOOK

## Overview

This runbook provides instructions for running, testing, and deploying the Phase 2 business logic modules for the Weight Loss Project Lab (WPL).

## Prerequisites

- Node.js 18+ and npm installed
- Firebase Admin SDK configured (see `.env.local`)
- Firebase Emulator Suite (optional for local testing)

## Installation

```bash
npm install
```

Ensure you have these dependencies:
- `firebase-admin` (already installed per package.json)
- `@types/node`
- `jest` and testing libraries

## Project Structure

```
weightlossprojectlab/
├── functions/
│   ├── coaching/
│   │   ├── readiness.ts          # Coaching eligibility & readiness
│   │   └── ai_coach.ts            # AI coach plans & nudges
│   ├── engagement/
│   │   ├── retention.ts           # Weekly missions & XP awards
│   │   ├── group_missions.ts      # Social missions & trust scores
│   │   └── xp_integrity.ts        # XP fairness & duplicate prevention
│   ├── schedulers.ts              # Cron job configurations
│   └── index.ts                   # Exported functions
├── schemas/
│   └── firestore/
│       ├── users.ts               # User-related schemas
│       ├── missions.ts            # Mission schemas
│       ├── groups.ts              # Group & social schemas
│       ├── xp.ts                  # XP & audit schemas
│       └── index.ts               # Schema exports
├── lib/
│   ├── prdRefs.ts                 # PRD reference constants
│   └── firebase-admin.ts          # Firebase Admin SDK setup
└── __tests__/
    └── functions/                 # Unit tests
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test -- xp_integrity.test.ts
npm test -- eligibility.test.ts
npm test -- nudge_scheduling.test.ts
```

### Watch Mode
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

## Local Development with Emulators

### 1. Start Firebase Emulators

```bash
# If you have firebase-tools installed
firebase emulators:start
```

This starts:
- Firestore Emulator: `localhost:8080`
- Auth Emulator: `localhost:9099`
- Functions Emulator: `localhost:5001`

### 2. Configure Environment

Update `.env.local` to point to emulators:
```bash
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

## Manual Function Testing

### Test Coaching Readiness Analysis

```typescript
// Create a test script: test-readiness.ts
import { analyzeUserProgress } from './functions/coaching/readiness';

const testUid = 'test-user-123';

analyzeUserProgress(testUid)
  .then(() => console.log('✅ Analysis complete'))
  .catch(err => console.error('❌ Error:', err));
```

Run:
```bash
npx ts-node test-readiness.ts
```

### Test XP Event Processing

```typescript
// test-xp.ts
import { onXPEventWrite } from './functions/engagement/xp_integrity';

const testUid = 'test-user-123';

onXPEventWrite(testUid, {
  eventType: 'weight_log',
  baseXP: 50,
  metadata: { weight: 79.5 }
})
  .then(() => console.log('✅ XP awarded'))
  .catch(err => console.error('❌ Error:', err));
```

### Test Weekly Mission Assignment

```typescript
// test-missions.ts
import { assignWeeklyMissions } from './functions/engagement/retention';

const testUid = 'test-user-123';

assignWeeklyMissions(testUid)
  .then(() => console.log('✅ Missions assigned'))
  .catch(err => console.error('❌ Error:', err));
```

## Scheduler Testing

### Manual Scheduler Triggers

```typescript
// test-schedulers.ts
import { SCHEDULERS } from './functions/schedulers';

// Trigger nudge delivery
await SCHEDULERS.deliverNudges.handler();

// Trigger user progress analysis
const testUid = 'test-user-123';
await SCHEDULERS.analyzeUserProgress.handler(testUid);

// Trigger weekly mission assignment
await SCHEDULERS.assignWeeklyMissions.handler();
```

### Scheduler Configuration

All schedulers are defined in `functions/schedulers.ts`:

| Scheduler | Schedule | Description |
|-----------|----------|-------------|
| `analyzeUserProgress` | Daily 02:00 | Analyze user progress for coaching eligibility |
| `buildWeeklyAICoachPlan` | Monday 06:00 | Build weekly AI coach plans |
| `deliverNudges` | Every 10 min | Deliver pending nudges |
| `assignWeeklyMissions` | Monday 07:00 | Assign weekly missions |
| `checkExpiredMissions` | Daily 00:00 | Archive expired missions |
| `calculateTrustScores` | Daily 03:00 | Calculate group member trust scores |
| `checkInactiveMembers` | Daily 09:00 | Check for inactive group members |

## Test Data Setup

### Create Test User with Firestore Data

```typescript
// setup-test-data.ts
import { adminDb } from './lib/firebase-admin';

async function setupTestUser() {
  const uid = 'test-user-123';
  const userRef = adminDb.collection('users').doc(uid);

  // Create user profile
  await userRef.set({
    uid,
    email: 'test@example.com',
    displayName: 'Test User',
    timezone: 'America/New_York',
    quietHoursStart: 22,
    quietHoursEnd: 7,
    createdAt: new Date(),
    lastActiveAt: new Date(),
  });

  // Create stats
  await userRef.collection('stats').doc('current').set({
    totalXP: 0,
    level: 1,
    currentStreak: 5,
    longestStreak: 10,
    missionsCompleted: 0,
    weightLogsCount: 0,
    mealLogsCount: 0,
    updatedAt: new Date(),
  });

  // Add some weight logs
  for (let i = 0; i < 15; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    await userRef.collection('weightLogs').add({
      logId: `log_${i}`,
      weight: 80 - (i * 0.1),
      loggedAt: date,
      createdAt: new Date(),
    });
  }

  console.log('✅ Test user created:', uid);
}

setupTestUser();
```

## Sample Test Events & Expected Writes

### 1. Weight Log Event → XP Award

**Input:**
```json
{
  "uid": "test-user-123",
  "eventType": "weight_log",
  "baseXP": 50,
  "metadata": {
    "weight": 79.5
  }
}
```

**Expected Firestore Writes:**
- `users/{uid}/xp_daily/{date}`: `{ totalXP: 50, eventCounts: { weight_log: 1 } }`
- `users/{uid}/stats/current`: `{ totalXP: increment(50) }`
- `users/{uid}/xp_history/{eventId}`: `{ eventType: 'weight_log', xpAwarded: 50 }`
- `xp_audit/{eventId}`: Full audit log with reason and multiplier

### 2. Mission Complete → XP Award

**Input:**
```json
{
  "uid": "test-user-123",
  "missionId": "mission_123",
  "xpReward": 100
}
```

**Expected Firestore Writes:**
- `users/{uid}/missions_active/{missionId}`: `{ status: 'completed', completedAt: timestamp }`
- `users/{uid}/xp_daily/{date}`: `{ totalXP: 100 }` (via XP system)
- `users/{uid}/stats/current`: `{ totalXP: increment(100), missionsCompleted: increment(1) }`

### 3. Coaching Eligibility Analysis

**Input:**
```json
{
  "uid": "test-user-123"
}
```

**Expected Firestore Writes:**
- `users/{uid}/coachingStatus/current`:
```json
{
  "eligible": true,
  "eligibleReason": "consistency",
  "streakDays": 15,
  "adherence": 0.85,
  "weightLogCount": 12,
  "lastAnalyzedAt": "2025-10-07T02:00:00Z"
}
```

### 4. Nudge Delivery

**Input:** Cron trigger at 08:30 AM

**Expected Firestore Reads:**
- Query `nudgeQueue` for pending nudges in current time window

**Expected Firestore Writes (per nudge):**
- `users/{uid}/nudgeQueue/{nudgeId}`: `{ status: 'sent', sentAt: timestamp }`
- `users/{uid}/coachTelemetry/{date}`: `{ nudgesSent: increment(1) }`

## Validation Checklist

### XP Integrity
- [ ] Daily cap enforced (500 XP limit)
- [ ] Repeat penalty applied after 3rd action (0.5 multiplier)
- [ ] Duplicate meal photos rejected (24h window)
- [ ] Weight logs require 12h interval
- [ ] Weight delta sanity check (10% threshold)
- [ ] Grace days bypass cap

### Coaching Eligibility
- [ ] Consistency unlock: ≥14 streak + ≥10 logs + ≥0.8 adherence
- [ ] Plateau unlock: 21 days + <1% change + ≥0.8 adherence
- [ ] Goal struggle: ≥2 failed missions + ≥0.75 engagement
- [ ] AI coach plan created on unlock
- [ ] Human coach unlocked after 7-day review

### Nudges
- [ ] Max 2 nudges per day enforced
- [ ] Quiet hours respected (22:00-07:00)
- [ ] Fatigue threshold checked (≥0.6 skips delivery)
- [ ] Delivery windows honored (4-hour windows)

### Missions
- [ ] Weekly missions assigned on Monday
- [ ] Progress tracking updates correctly
- [ ] XP awarded on completion
- [ ] Expired missions archived

### Group Missions
- [ ] Trust score calculated daily
- [ ] Inactive members detected (7+ days)
- [ ] Recovery missions created
- [ ] Shared XP calculated: Base 100 + (AvgCompletion*50) + (Support*2)

## Troubleshooting

### Common Issues

**1. Firebase Admin SDK not initialized**
```
Error: Firebase Admin SDK not initialized
```
**Solution:** Check `.env.local` has all required variables:
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

**2. Firestore permission denied**
```
Error: Missing or insufficient permissions
```
**Solution:** Ensure service account has Firestore read/write permissions or use emulators.

**3. Type errors with Timestamp**
```
Error: Type 'FieldValue' is not assignable to type 'Timestamp'
```
**Solution:** Use type assertions or separate interfaces for reads vs writes.

## Deployment

### Firebase Functions Deployment

1. Initialize Firebase Functions (if not done):
```bash
firebase init functions
```

2. Copy function files to `functions/` directory

3. Update `functions/package.json` with dependencies

4. Deploy:
```bash
firebase deploy --only functions
```

5. Deploy schedulers:
```bash
firebase deploy --only functions:scheduledAnalyzeUserProgress
firebase deploy --only functions:scheduledDeliverNudges
# ... etc for all schedulers
```

## Monitoring & Logs

### View Function Logs
```bash
firebase functions:log
```

### View Specific Function
```bash
firebase functions:log --only analyzeUserProgress
```

### Monitor XP Audit Log
Query Firestore collection `xp_audit` to see all XP events with reasons and multipliers.

## Support

For issues or questions:
- Check PRD v1.3.7 for requirements
- Review code comments (all link to PRD paths)
- Check `lib/prdRefs.ts` for PRD reference constants

---

## Phase 3: Orchestration & Interface Layer

### Phase 3 Overview

Phase 3 adds the AI orchestration layer and user-facing dashboards:
- **AI Orchestration**: Prompt templates, PII redaction, model routing, decision logging
- **Trust & Safety**: Risk scoring, moderation dashboard foundation
- **User Dashboards**: Coaching, Missions, Groups pages
- **API Routes**: `/api/ai/orchestrate`, `/api/trust-safety/*`, `/api/perks/*`

### Phase 3 Testing

#### Test AI Orchestration

```typescript
// test-orchestration.ts
import { orchestrateAI } from './lib/ai/orchestrator';

const request = {
  templateId: 'nudge_motivation',
  variables: {
    recentAction: 'logged weight',
    daysSinceLastLog: '1',
    currentGoal: 'lose 10kg',
    tone: 'supportive',
  },
  userId: 'test-user-123',
  dataSensitivity: 'Public' as const,
};

orchestrateAI(request)
  .then((result) => {
    console.log('✅ Decision ID:', result.decisionId);
    console.log('✅ Result:', result.result);
    console.log('✅ Confidence:', result.confidence);
    console.log('✅ Model:', result.model);
  })
  .catch((err) => console.error('❌ Error:', err));
```

Run:
```bash
npx ts-node test-orchestration.ts
```

#### Test Risk Scoring

```typescript
// test-risk-scoring.ts
import { calculateRiskScore } from './lib/trust-safety/riskScoring';

const caseData = {
  reason: 'coach_no_show',
  evidence: [
    { type: 'zoom', data: { duration: 300 } },
    { type: 'stripe', data: {} },
  ],
  targetHistory: {
    priorDisputes: 2,
    completedSessions: 10,
  },
};

const result = calculateRiskScore(caseData);

console.log('✅ Risk Score:', result.score);
console.log('✅ Recommendation:', result.recommendation);
console.log('✅ Confidence:', result.confidence);
console.log('✅ Signals:', result.signals.map((s) => s.signal));
```

#### Test API Routes

```bash
# Test AI Orchestration Endpoint
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
    "userId": "test123",
    "dataSensitivity": "Public"
  }'
```

#### Run Unit Tests

```bash
# All tests
npm test

# AI Orchestration tests
npm test -- ai-orchestration.test.ts

# Watch mode
npm test -- --watch
```

#### Run E2E Tests

```bash
# Install Playwright (first time)
npx playwright install

# Run all E2E tests
npx playwright test

# Run specific test
npx playwright test coaching.spec.ts

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui
```

### Phase 3 Environment Variables

Add to `.env.local`:

```bash
# Feature Flags
NEXT_PUBLIC_PERKS_ENABLED=false
NEXT_PUBLIC_AI_ORCHESTRATION=true
NEXT_PUBLIC_TS_DASHBOARD=true

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL_FAST=gpt-3.5-turbo
OPENAI_MODEL_BALANCED=gpt-4o-mini
OPENAI_MODEL_ACCURATE=gpt-4-turbo

# Trust & Safety
TS_SLA_FIRST_RESPONSE_HOURS=4
TS_SLA_RESOLUTION_HOURS=72
```

### Phase 3 Firestore Setup

Create indexes in Firebase Console:

```javascript
// ai_decisions indexes
db.collection('ai_decisions')
  .createIndex({ executedBy: 'asc', timestamp: 'desc' });
db.collection('ai_decisions')
  .createIndex({ confidence: 'asc', timestamp: 'desc' });

// disputes indexes
db.collection('disputes')
  .createIndex({ status: 'asc', riskScore: 'desc' });
db.collection('disputes')
  .createIndex({ status: 'asc', slaDeadline: 'asc' });
```

### View Phase 3 Pages

```bash
# Start dev server
npm run dev

# Visit pages:
http://localhost:3000/coaching           # Coaching dashboard
http://localhost:3000/missions           # Missions tab (TODO)
http://localhost:3000/groups             # Groups list (TODO)
http://localhost:3000/admin/trust-safety # T&S dashboard (TODO)
http://localhost:3000/perks              # Perks (feature-flagged)
```

### Phase 3 Debugging

**Check AI Decision Logs:**
```typescript
import { queryAIDecisions } from '@/lib/ai/decisionLogger';

const decisions = await queryAIDecisions({
  limit: 10,
  confidenceThreshold: 0.6,  // Low confidence decisions
});
```

**Check Risk Score Components:**
```typescript
import { calculateRiskScore, canAutoResolve } from '@/lib/trust-safety/riskScoring';

const result = calculateRiskScore(caseData);
console.log('Can auto-resolve?', canAutoResolve(result));
```

---

**Last Updated:** 2025-10-07
**PRD Version:** 1.3.7
**Phase:** 3 - Orchestration & Interface Layer
