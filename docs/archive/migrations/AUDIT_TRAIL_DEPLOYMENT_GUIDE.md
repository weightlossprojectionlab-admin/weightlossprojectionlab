# Unified Audit Trail System - Deployment Guide

## Executive Summary

This guide provides step-by-step instructions for deploying the unified audit trail system across all entities in the Wellness Projection Lab application. The system provides enterprise-grade audit logging with HIPAA compliance, real-time tracking, and comprehensive reporting.

**Key Features:**
- Entity-agnostic design (medications, documents, vitals, health reports, etc.)
- Immutable audit trail (write-once, read-many)
- Field-level change tracking
- Real-time UI with filtering and search
- 6-year retention policy (HIPAA compliant)
- Export to CSV/JSON

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Deployment Checklist](#deployment-checklist)
4. [API Route Integration Examples](#api-route-integration-examples)
5. [Dashboard Integration](#dashboard-integration)
6. [Firestore Index Deployment](#firestore-index-deployment)
7. [Testing Guide](#testing-guide)
8. [Migration from Legacy System](#migration-from-legacy-system)
9. [Performance Considerations](#performance-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Data Model

```
users/{userId}/patients/{patientId}/
  ├── medications/{medicationId}/auditLogs/{logId}
  ├── documents/{documentId}/auditLogs/{logId}
  ├── healthReports/{reportId}/auditLogs/{logId}
  ├── vitals/{vitalId}/auditLogs/{logId}
  ├── weight-logs/{logId}/auditLogs/{auditLogId}
  ├── meal-logs/{logId}/auditLogs/{auditLogId}
  └── step-logs/{logId}/auditLogs/{auditLogId}
```

### Query Strategy

- **Collection Group Queries**: Used for cross-entity queries (e.g., all audit logs for a patient)
- **Firestore Indexes**: Required for compound queries (patientId + performedAt, etc.)
- **Client-side Filtering**: For search queries and array filters exceeding 10 items

---

## File Structure

### Core Files (Already Created)

```
types/
  └── audit.ts                    # Unified type system

lib/
  └── audit-operations.ts         # CRUD operations, queries

hooks/
  └── useAuditTrail.ts           # Real-time Firestore listener

components/audit/
  ├── AuditTrailViewer.tsx       # Main viewer component
  ├── AuditLogCard.tsx           # Timeline card component
  ├── AuditFilters.tsx           # Filter controls
  └── FieldChangeDisplay.tsx     # Before/after diff display

firestore.indexes.json           # Firestore indexes (UPDATED)
firestore.rules                  # Security rules (UPDATED)
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Review Code**: Ensure all files are created correctly
- [ ] **TypeScript Compilation**: Run `npm run build` to check for errors
- [ ] **Linting**: Run `npm run lint` and fix any issues
- [ ] **Test Locally**: Test audit log creation and queries locally

### Firestore Configuration

- [ ] **Deploy Indexes**: `firebase deploy --only firestore:indexes`
- [ ] **Wait for Index Build**: Monitor Firebase Console (can take 5-30 minutes)
- [ ] **Deploy Security Rules**: `firebase deploy --only firestore:rules`
- [ ] **Verify Rules**: Test read/write permissions in Firebase Console

### Application Deployment

- [ ] **Build Application**: `npm run build`
- [ ] **Deploy to Production**: `netlify deploy --prod` (or your deployment platform)
- [ ] **Smoke Test**: Verify audit trail UI loads correctly
- [ ] **Monitor Logs**: Check Netlify/Firebase logs for errors

### Post-Deployment Verification

- [ ] **Create Test Audit Log**: Update a medication/document to trigger audit log
- [ ] **Verify UI Display**: Check audit trail viewer shows the log
- [ ] **Test Filters**: Verify entity type, action, date range filters work
- [ ] **Test Export**: Export audit logs to CSV/JSON
- [ ] **Test Permissions**: Verify family members can/cannot access based on RBAC

---

## API Route Integration Examples

### Example 1: Health Vitals Update Route

**File**: `app/api/admin/users/[uid]/health-vitals/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createAuditLog, calculateFieldChanges } from '@/lib/audit-operations'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params
    const updates = await request.json()

    // Assume you have auth context (userId, patientId)
    const userId = request.headers.get('x-user-id') || uid
    const patientId = uid // For vitals, patient ID = user ID

    // Get current vital signs
    const vitalRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .collection('vitals')
      .doc('latest') // Or specific vitalId

    const vitalDoc = await vitalRef.get()
    const oldData = vitalDoc.exists ? vitalDoc.data() : {}

    // Update vital signs
    await vitalRef.update(updates)

    // Get updated data
    const updatedDoc = await vitalRef.get()
    const newData = updatedDoc.data() || {}

    // Calculate field changes
    const fieldLabels = {
      bloodPressureSystolic: 'Blood Pressure (Systolic)',
      bloodPressureDiastolic: 'Blood Pressure (Diastolic)',
      bloodSugar: 'Blood Sugar',
      temperature: 'Temperature',
      oxygenLevel: 'Oxygen Level',
      heartRate: 'Heart Rate'
    }

    const changes = calculateFieldChanges(oldData, newData, fieldLabels)

    // Create audit log (only if there are changes)
    if (changes.length > 0) {
      await createAuditLog({
        entityType: 'vital_signs',
        entityId: vitalDoc.id,
        entityName: 'Vital Signs',
        patientId,
        userId,
        action: 'updated',
        performedBy: userId,
        performedByName: 'System', // Or get from auth context
        changes
      })

      logger.info('[Vitals API] Audit log created', {
        patientId,
        vitalId: vitalDoc.id,
        changesCount: changes.length
      })
    }

    return NextResponse.json({ success: true, data: newData })
  } catch (error) {
    logger.error('[Vitals API] Error updating vitals', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to update vitals' },
      { status: 500 }
    )
  }
}
```

---

### Example 2: Document Upload/Delete Route

**File**: `app/api/patients/[patientId]/documents/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createAuditLog } from '@/lib/audit-operations'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { logger } from '@/lib/logger'

/**
 * POST - Upload document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Verify auth and patient access
    const authResult = await assertPatientAccess(request, patientId, 'uploadDocuments')
    if (authResult instanceof Response) return authResult

    const { userId, ownerUserId } = authResult

    // Parse form data (file upload)
    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string
    const title = formData.get('title') as string

    // Upload file to storage (implementation omitted)
    const fileUrl = await uploadToStorage(file)

    // Create document record
    const documentRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('documents')
      .doc()

    const documentData = {
      id: documentRef.id,
      patientId,
      userId: ownerUserId,
      title,
      category,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString()
    }

    await documentRef.set(documentData)

    // Get user info for audit log
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userName = userDoc.exists ? userDoc.data()?.name || 'Unknown User' : 'Unknown User'

    // Create audit log
    await createAuditLog({
      entityType: 'document',
      entityId: documentRef.id,
      entityName: title,
      patientId,
      userId: ownerUserId,
      action: 'created',
      performedBy: userId,
      performedByName: userName,
      metadata: {
        fileType: file.type,
        fileSize: file.size
      }
    })

    logger.info('[Documents API] Document uploaded and logged', {
      patientId,
      documentId: documentRef.id,
      fileName: file.name
    })

    return NextResponse.json({ success: true, data: documentData })
  } catch (error) {
    logger.error('[Documents API] Error uploading document', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; documentId: string }> }
) {
  try {
    const { patientId, documentId } = await params

    const authResult = await assertPatientAccess(request, patientId, 'deleteDocuments')
    if (authResult instanceof Response) return authResult

    const { userId, ownerUserId } = authResult

    const documentRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('documents')
      .doc(documentId)

    const documentDoc = await documentRef.get()
    const documentData = documentDoc.data()

    // Delete from storage (implementation omitted)
    await deleteFromStorage(documentData?.fileUrl)

    // Delete document record
    await documentRef.delete()

    // Get user info
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userName = userDoc.exists ? userDoc.data()?.name || 'Unknown User' : 'Unknown User'

    // Create audit log
    await createAuditLog({
      entityType: 'document',
      entityId: documentId,
      entityName: documentData?.title || 'Document',
      patientId,
      userId: ownerUserId,
      action: 'deleted',
      performedBy: userId,
      performedByName: userName,
      metadata: {
        fileType: documentData?.fileType,
        fileSize: documentData?.fileSize
      }
    })

    logger.info('[Documents API] Document deleted and logged', {
      patientId,
      documentId,
      fileName: documentData?.fileName
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[Documents API] Error deleting document', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
```

---

### Example 3: Patient Profile Update Route

**File**: `app/api/patients/[patientId]/profile/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createAuditLog, calculateFieldChanges } from '@/lib/audit-operations'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    const authResult = await assertPatientAccess(request, patientId, 'editPatientInfo')
    if (authResult instanceof Response) return authResult

    const { userId, ownerUserId } = authResult

    const updates = await request.json()

    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()
    const oldData = patientDoc.data() || {}

    await patientRef.update({
      ...updates,
      lastModified: new Date().toISOString(),
      lastModifiedBy: userId
    })

    const updatedDoc = await patientRef.get()
    const newData = updatedDoc.data() || {}

    // Field labels for audit log
    const fieldLabels = {
      name: 'Patient Name',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      height: 'Height',
      targetWeight: 'Target Weight',
      activityLevel: 'Activity Level'
    }

    const changes = calculateFieldChanges(oldData, newData, fieldLabels)

    if (changes.length > 0) {
      const userDoc = await adminDb.collection('users').doc(userId).get()
      const userName = userDoc.exists ? userDoc.data()?.name || 'Unknown User' : 'Unknown User'

      await createAuditLog({
        entityType: 'patient_profile',
        entityId: patientId,
        entityName: newData.name || 'Patient Profile',
        patientId,
        userId: ownerUserId,
        action: 'updated',
        performedBy: userId,
        performedByName: userName,
        changes
      })

      logger.info('[Patient Profile API] Audit log created', {
        patientId,
        changesCount: changes.length
      })
    }

    return NextResponse.json({ success: true, data: newData })
  } catch (error) {
    logger.error('[Patient Profile API] Error updating profile', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
```

---

## Dashboard Integration

### Add AuditTrailViewer to Family Admin Dashboard

**File**: `app/family-admin/page.tsx`

1. **Import the component**:

```typescript
import { AuditTrailViewer } from '@/components/audit/AuditTrailViewer'
```

2. **Add to the page** (example placement):

```typescript
export default function FamilyAdminPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      <PageHeader title="Family Admin Dashboard" />

      {/* Existing sections */}
      <FamilyMembersSection />
      <PermissionsSection />

      {/* NEW: Audit Trail Section */}
      <section>
        <AuditTrailViewer
          userId={user?.uid}
          title="Family Activity Log"
          showPatientName={true}
          defaultFilters={{
            limit: 100,
            orderBy: 'performedAt',
            orderDirection: 'desc'
          }}
        />
      </section>
    </div>
  )
}
```

3. **Add as a separate tab** (if using tabbed layout):

```typescript
<TabbedPageHeader
  title="Family Admin"
  tabs={[
    { label: 'Members', href: '/family-admin' },
    { label: 'Permissions', href: '/family-admin/permissions' },
    { label: 'Audit Log', href: '/family-admin/audit' } // NEW
  ]}
  activeTab="Audit Log"
/>

{/* Route: app/family-admin/audit/page.tsx */}
<AuditTrailViewer
  userId={user?.uid}
  showPatientName={true}
/>
```

---

## Firestore Index Deployment

### Deploy Indexes

```bash
# Deploy firestore indexes
firebase deploy --only firestore:indexes

# Monitor progress in Firebase Console
# Go to: Firebase Console > Firestore Database > Indexes
# Wait for all indexes to show "Enabled" status (can take 5-30 minutes)
```

### Verify Indexes

Run a test query to ensure indexes are working:

```typescript
// In browser console or API route
const { logs } = await queryAuditLogs({
  patientId: 'test_patient_id',
  entityType: 'medication',
  limit: 10
})

console.log(`Found ${logs.length} audit logs`)
```

If you see an error like "The query requires an index", check:
1. Indexes are deployed (`firebase deploy --only firestore:indexes`)
2. Indexes are built (check Firebase Console)
3. Query matches index definition exactly

---

## Testing Guide

### Unit Tests

Create `lib/audit-operations.test.ts`:

```typescript
import { calculateFieldChanges } from './audit-operations'

describe('calculateFieldChanges', () => {
  it('should detect string changes', () => {
    const oldData = { name: 'Aspirin', strength: '250mg' }
    const newData = { name: 'Aspirin', strength: '500mg' }
    const fieldLabels = { strength: 'Strength' }

    const changes = calculateFieldChanges(oldData, newData, fieldLabels)

    expect(changes).toHaveLength(1)
    expect(changes[0].field).toBe('strength')
    expect(changes[0].oldValue).toBe('250mg')
    expect(changes[0].newValue).toBe('500mg')
  })

  it('should detect array changes', () => {
    const oldData = { tags: ['a', 'b'] }
    const newData = { tags: ['a', 'c'] }
    const fieldLabels = { tags: 'Tags' }

    const changes = calculateFieldChanges(oldData, newData, fieldLabels)

    expect(changes).toHaveLength(1)
    expect(changes[0].metadata?.arrayDiff).toEqual({
      added: ['c'],
      removed: ['b'],
      unchanged: ['a']
    })
  })
})
```

### Integration Tests

Test audit log creation end-to-end:

```typescript
// Test: Update medication and verify audit log
const medicationId = 'test_med_123'

// Update medication via API
await fetch(`/api/patients/${patientId}/medications/${medicationId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ strength: '500mg' })
})

// Wait for Firestore write
await new Promise(resolve => setTimeout(resolve, 1000))

// Query audit logs
const { logs } = await queryAuditLogs({
  patientId,
  entityId: medicationId,
  limit: 1
})

// Verify audit log
expect(logs).toHaveLength(1)
expect(logs[0].action).toBe('updated')
expect(logs[0].changes).toHaveLength(1)
expect(logs[0].changes[0].field).toBe('strength')
```

---

## Migration from Legacy System

### Migrate Medication Audit Logs

If you have existing medication audit logs, migrate them:

```typescript
// scripts/migrate-medication-audit-logs.ts
import { adminDb } from '../lib/firebase-admin'
import type { AuditLog, MedicationAuditLog } from '../types/audit'

async function migrateMedicationAuditLogs() {
  const usersSnapshot = await adminDb.collection('users').get()

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id
    const patientsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .get()

    for (const patientDoc of patientsSnapshot.docs) {
      const patientId = patientDoc.id
      const medicationsSnapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('patients')
        .doc(patientId)
        .collection('medications')
        .get()

      for (const medicationDoc of medicationsSnapshot.docs) {
        const medicationId = medicationDoc.id
        const auditLogsSnapshot = await adminDb
          .collection('users')
          .doc(userId)
          .collection('patients')
          .doc(patientId)
          .collection('medications')
          .doc(medicationId)
          .collection('auditLogs')
          .get()

        // Audit logs are already in correct format from medication route
        // Just verify they have the new unified fields
        for (const auditLogDoc of auditLogsSnapshot.docs) {
          const legacyLog = auditLogDoc.data() as MedicationAuditLog

          // Add unified fields if missing
          const updates: Partial<AuditLog> = {}

          if (!legacyLog.entityType) {
            updates.entityType = 'medication'
          }

          if (!legacyLog.entityId) {
            updates.entityId = medicationId
          }

          if (!legacyLog.entityName && legacyLog.medicationName) {
            updates.entityName = legacyLog.medicationName
          }

          // Set 6-year retention
          if (!legacyLog.retainUntil) {
            const retainDate = new Date(legacyLog.performedAt)
            retainDate.setFullYear(retainDate.getFullYear() + 6)
            updates.retainUntil = retainDate.toISOString()
          }

          if (Object.keys(updates).length > 0) {
            await auditLogDoc.ref.update(updates)
            console.log(`Migrated audit log: ${auditLogDoc.id}`)
          }
        }
      }
    }
  }

  console.log('Migration complete!')
}

migrateMedicationAuditLogs()
```

Run migration:

```bash
ts-node scripts/migrate-medication-audit-logs.ts
```

---

## Performance Considerations

### Firestore Read Optimization

1. **Use Collection Group Queries Wisely**: Collection group queries scan all subcollections, which can be slow for large datasets. Always add filters (patientId, userId) to reduce scan scope.

2. **Pagination**: Always use `limit()` to cap results. Default is 50 in useAuditTrail hook.

3. **Client-side Filtering**: For filters that exceed Firestore limits (e.g., >10 items in `in` query), use client-side filtering.

### Write Performance

1. **Batch Writes**: Use `createAuditLogsBatch()` when creating multiple audit logs in one operation.

2. **Transactions**: Use transactions when audit log creation must be atomic with the main operation.

### Cost Optimization

1. **Archive Old Logs**: Run `archiveExpiredAuditLogs()` periodically via Cloud Function to mark old logs as archived.

2. **Monitor Reads**: Set up Cloud Monitoring alerts for excessive Firestore reads.

---

## Troubleshooting

### Issue: "The query requires an index"

**Solution**: Deploy Firestore indexes and wait for build completion.

```bash
firebase deploy --only firestore:indexes
```

### Issue: Audit logs not showing in UI

**Checklist**:
1. Check Firestore rules allow read access
2. Verify `userId` or `patientId` is provided to useAuditTrail
3. Check browser console for errors
4. Verify audit logs exist in Firestore Console

### Issue: Changes array is empty

**Cause**: `calculateFieldChanges()` is comparing identical values.

**Solution**: Ensure old and new data are different, and field names match.

### Issue: Performance degradation

**Cause**: Too many audit logs, missing indexes, or unbounded queries.

**Solutions**:
- Add indexes for all common query patterns
- Use pagination (limit results)
- Archive old logs
- Add caching layer (e.g., Redis) for frequently accessed logs

---

## Summary

You now have a complete unified audit trail system deployed. Key files:

- **Types**: `types/audit.ts`
- **Backend**: `lib/audit-operations.ts`
- **Frontend**: `hooks/useAuditTrail.ts`, `components/audit/*`
- **Config**: `firestore.indexes.json`, `firestore.rules`

Next steps:
1. Deploy to production
2. Integrate audit logging into all API routes
3. Add audit trail viewer to family dashboard
4. Monitor performance and costs
5. Set up automated archiving (Cloud Function)

For questions or issues, refer to this guide or consult the codebase documentation.
