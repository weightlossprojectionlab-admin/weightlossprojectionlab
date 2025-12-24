# Firestore Security Rules for AI Health Profiles

## Overview
This document outlines the Firestore security rules needed for the AI Health Profile feature.

## Security Model
- **aiHealthProfile** subcollection: Server-write only, client-read (owner + admins)
- **ai-decisions** collection: Admin-only access
- All writes use Firebase Admin SDK (no client writes)

## Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function: Check if user is admin
    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)/profile).data.isAdmin == true;
    }

    // Helper function: Check if user is owner
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    // AI Health Profile (subcollection under users)
    match /users/{uid}/aiHealthProfile/{profileId} {
      // Read: Owner or Admin
      allow read: if isOwner(uid) || isAdmin();

      // Write: NEVER (server-only via Admin SDK)
      allow write: if false;
    }

    // AI Decisions (for admin review)
    match /ai-decisions/{decisionId} {
      // Read: Admin only
      allow read: if isAdmin();

      // Write: Admin only (for review actions)
      allow write: if isAdmin();

      // Create: Server only (via Admin SDK for new decisions)
      // Admins can update (approve/reject) but not create
      allow create: if false;
    }
  }
}
```

## Firestore Indexes

### Required Composite Index

**Collection:** `ai-decisions`

**Fields:**
1. `type` (Ascending)
2. `reviewStatus` (Ascending)
3. `createdAt` (Descending)

**Purpose:** Efficiently filter AI decisions by type and review status in admin panel

**Creation Command:**
```bash
# Via Firebase Console
# Navigate to: Firestore Database > Indexes > Composite
# Add fields: type ASC, reviewStatus ASC, createdAt DESC
```

**Or via firebase.json:**
```json
{
  "firestore": {
    "indexes": [
      {
        "collectionGroup": "ai-decisions",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "type", "order": "ASCENDING" },
          { "fieldPath": "reviewStatus", "order": "ASCENDING" },
          { "fieldPath": "createdAt", "order": "DESCENDING" }
        ]
      }
    ]
  }
}
```

## Data Structure

### users/{uid}/aiHealthProfile/current
```typescript
{
  restrictions: {
    sodium?: { limit: 1500, unit: 'mg', reason: 'Stage 3 CKD' },
    potassium?: { limit: 2000, unit: 'mg', reason: 'CKD + dialysis' },
    // ... other nutrients
  },
  calorieAdjustment?: { multiplier: 1.3, reason: 'Active cancer treatment' },
  monitorNutrients: ['sodium', 'potassium'],
  criticalWarnings: ['Avoid grapefruit - medication interaction'],
  confidence: 75,
  reviewStatus: 'unreviewed' | 'approved' | 'modified',
  generatedAt: '2025-01-05T12:00:00Z',
  lastReviewedBy?: 'admin-uid'
}
```

### ai-decisions/{id}
```typescript
{
  type: 'health-profile' | 'meal-safety' | 'meal-analysis',
  userId: 'user-uid',
  payload: { /* type-specific data */ },
  confidence: 75,
  reviewStatus: 'unreviewed' | 'approved' | 'rejected' | 'reversed',
  adminNotes?: 'Sodium limit looks correct for Stage 3 CKD',
  reviewedAt?: Timestamp,
  reviewedBy?: 'admin-uid',
  createdAt: Timestamp
}
```

## Testing Rules

```javascript
// Test 1: Owner can read their health profile
// PASS: User abc123 reading /users/abc123/aiHealthProfile/current

// Test 2: Owner cannot write their health profile
// FAIL: User abc123 writing /users/abc123/aiHealthProfile/current

// Test 3: Admin can read any health profile
// PASS: Admin xyz789 reading /users/abc123/aiHealthProfile/current

// Test 4: Non-admin cannot read ai-decisions
// FAIL: User abc123 reading /ai-decisions/decision1

// Test 5: Admin can read ai-decisions
// PASS: Admin xyz789 reading /ai-decisions/decision1

// Test 6: Admin can update ai-decisions (approve/reject)
// PASS: Admin xyz789 updating /ai-decisions/decision1 with reviewStatus

// Test 7: Admin cannot create ai-decisions directly
// FAIL: Admin xyz789 creating /ai-decisions/new-decision
// (Must use Admin SDK server-side)
```

## Deployment Checklist

- [ ] Deploy Firestore rules to production
- [ ] Create composite index (ai-decisions: type/reviewStatus/createdAt)
- [ ] Verify index is built (check Firebase Console)
- [ ] Test rules with Firebase Emulator
- [ ] Verify admin users have `isAdmin: true` in profile
- [ ] Test client cannot write to aiHealthProfile
- [ ] Test server can write via Admin SDK
- [ ] Monitor Firebase Console for rule violations

## Notes

- **Why server-write only?** Prevents users from manipulating their dietary restrictions to bypass safety checks
- **Why admin-only ai-decisions?** Protects sensitive health data and prevents tampering with review workflow
- **Index creation:** Manual index creation required before first deployment to avoid query errors
