# Healthcare Provider Multi-Member Assignment Migration Guide

## Overview

This guide explains how to migrate from the old single-patient provider model to the new multi-patient provider model where one provider can be assigned to multiple family members.

## Schema Changes

### Old Schema
```typescript
interface HealthcareProvider {
  id: string
  patientId: string  // Single patient only
  // ... other fields
}
```

### New Schema
```typescript
interface HealthcareProvider {
  id: string
  userId: string           // Account owner who manages this provider
  patientIds: string[]     // Array of patient IDs (NEW)
  patientId?: string       // Legacy field for backward compatibility (DEPRECATED)
  patientNotes?: Record<string, string>  // Per-patient notes (NEW)
  // ... other fields
}
```

## Migration Script

Use this Firebase Admin script to migrate existing provider records:

```typescript
import { getFirestore } from 'firebase-admin/firestore'

async function migrateProvidersToMultiMember() {
  const db = getFirestore()
  const providersRef = db.collection('healthcareProviders')

  const snapshot = await providersRef.get()
  const batch = db.batch()
  let updateCount = 0

  for (const doc of snapshot.docs) {
    const data = doc.data()

    // Skip if already migrated
    if (data.patientIds && Array.isArray(data.patientIds)) {
      console.log(`Provider ${doc.id} already migrated`)
      continue
    }

    // Migrate single patientId to array
    const updates: any = {
      patientIds: data.patientId ? [data.patientId] : [],
      updatedAt: new Date()
    }

    // Add userId if not present (use owner from first patient)
    if (!data.userId && data.patientId) {
      const patientDoc = await db.collection('patients').doc(data.patientId).get()
      if (patientDoc.exists) {
        updates.userId = patientDoc.data()?.userId
      }
    }

    batch.update(doc.ref, updates)
    updateCount++

    // Commit in batches of 500 (Firestore limit)
    if (updateCount % 500 === 0) {
      await batch.commit()
      console.log(`Committed batch of ${updateCount} providers`)
    }
  }

  // Commit remaining
  if (updateCount % 500 !== 0) {
    await batch.commit()
  }

  console.log(`Migration complete! Updated ${updateCount} provider records`)
}

// Run the migration
migrateProvidersToMultiMember()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
```

## API Changes

### GET /api/patients/[patientId]/providers

**Old Behavior:**
- Fetched providers where `patientId === [patientId]`

**New Behavior:**
- Fetches providers where `patientIds` array contains `[patientId]`
- Also fetches providers where legacy `patientId === [patientId]` for backward compatibility

### POST /api/patients/[patientId]/providers

**Old Request Body:**
```json
{
  "name": "Dr. Smith",
  "specialty": "Cardiology",
  "patientId": "patient123"
}
```

**New Request Body:**
```json
{
  "name": "Dr. Smith",
  "specialty": "Cardiology",
  "patientIds": ["patient123", "patient456"],
  "patientNotes": {
    "patient123": "Primary cardiologist",
    "patient456": "Consultation only"
  }
}
```

### New Endpoint: PATCH /api/providers/[providerId]/patients

Add or remove patient assignments from a provider:

```typescript
// Add patients
PATCH /api/providers/[providerId]/patients
{
  "action": "add",
  "patientIds": ["patient789"]
}

// Remove patients
PATCH /api/providers/[providerId]/patients
{
  "action": "remove",
  "patientIds": ["patient456"]
}
```

## UI Component Updates

### Provider Selection Component

**Before:**
```tsx
<ProviderCard provider={provider} />
```

**After:**
```tsx
<ProviderCard
  provider={provider}
  assignedPatients={patients.filter(p => provider.patientIds.includes(p.id))}
  onAssignPatient={(patientId) => handleAssign(provider.id, patientId)}
  onUnassignPatient={(patientId) => handleUnassign(provider.id, patientId)}
/>
```

### Add Provider Form

Add a multi-select for family members:

```tsx
<div className="space-y-2">
  <label>Assign to Family Members</label>
  <FamilyMemberMultiSelect
    patients={familyMembers}
    selectedPatientIds={selectedPatientIds}
    onChange={setSelectedPatientIds}
  />
</div>
```

## Firestore Indexes

Add these composite indexes to support the new query patterns:

```json
{
  "indexes": [
    {
      "collectionGroup": "healthcareProviders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "patientIds", "arrayConfig": "CONTAINS" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "healthcareProviders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "patientIds", "arrayConfig": "CONTAINS" },
        { "fieldPath": "specialty", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Security Rules Update

Update Firestore rules to handle the new `patientIds` array:

```javascript
match /healthcareProviders/{providerId} {
  // Allow read if user owns any of the assigned patients
  allow read: if request.auth != null &&
    exists(/databases/$(database)/documents/patients/$(resource.data.patientIds[0])) &&
    get(/databases/$(database)/documents/patients/$(resource.data.patientIds[0])).data.userId == request.auth.uid;

  // More secure: check all patient IDs
  allow read: if request.auth != null &&
    resource.data.userId == request.auth.uid;

  // Allow write if user is the owner
  allow write: if request.auth != null &&
    request.resource.data.userId == request.auth.uid;
}
```

## Backward Compatibility

The system maintains backward compatibility by:

1. **Keeping `patientId` field**: Old code can still read this field
2. **Dual queries**: API queries check both `patientIds` array and legacy `patientId`
3. **Gradual migration**: Old records work until migrated
4. **Type safety**: TypeScript marks `patientId` as deprecated

## Testing Checklist

- [ ] Migrate test database with migration script
- [ ] Verify providers appear correctly for each family member
- [ ] Test adding a provider to multiple family members
- [ ] Test removing a provider from one family member
- [ ] Verify provider list shows correct family member assignments
- [ ] Test provider communication with multiple family members
- [ ] Verify legacy `patientId` field still works
- [ ] Test RBAC permissions with shared providers
- [ ] Verify Firestore security rules allow/deny correctly
- [ ] Test performance with 10+ family members sharing one provider

## Rollback Plan

If issues arise, rollback steps:

1. Revert API route changes
2. Revert UI component updates
3. Keep migrated data (it's backward compatible)
4. Deploy previous version from git

The `patientId` field is preserved, so old code continues to work.

## Example Usage

### Assigning a Pediatrician to Multiple Children

```typescript
// Create provider for multiple children
const provider = await createProvider({
  name: 'Dr. Sarah Johnson',
  specialty: 'Pediatrics',
  patientIds: [child1.id, child2.id, child3.id],
  patientNotes: {
    [child1.id]: 'Regular checkups, vaccinations up to date',
    [child2.id]: 'Asthma monitoring, inhaler prescribed',
    [child3.id]: 'New patient, transferred from Dr. Lee'
  }
})

// Later, add a new baby to the same pediatrician
await assignPatientToProvider(provider.id, newBaby.id, {
  note: 'Newborn care, first visit scheduled'
})
```

### Family Doctor Scenario

```typescript
// Family doctor treats everyone
const familyDoctor = await createProvider({
  name: 'Dr. Michael Chen',
  specialty: 'Primary Care',
  patientIds: [dad.id, mom.id, child1.id, child2.id],
  facility: 'City Medical Center',
  phone: '555-0123'
})
```

## Questions?

Contact the development team or refer to:
- `/types/providers.ts` - Updated TypeScript interfaces
- `/app/api/patients/[patientId]/providers/route.ts` - API implementation
- `/components/providers/` - UI components
