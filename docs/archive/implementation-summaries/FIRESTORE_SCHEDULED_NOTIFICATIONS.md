# Scheduled Notifications Collection

## Overview
Event-driven notification scheduling system for household duties. Replaces inefficient polling-based cron with targeted notification processing.

## Collection: `scheduled_notifications`

### Schema

```typescript
{
  id: string // Auto-generated Firestore ID
  type: 'duty_reminder' | 'duty_overdue' | 'duty_assigned'
  dutyId: string // Reference to household_duties/{dutyId}
  scheduledFor: string // ISO 8601 timestamp - when to send
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  retryCount: number // Retry attempts for failed notifications
  createdAt: string // ISO 8601 - when scheduled
  sentAt?: string // ISO 8601 - when actually sent
  error?: string // Error message if failed
  metadata: {
    householdId: string
    assignedTo: string[] // Caregiver user IDs
    dutyName: string
    priority: string
  }
}
```

### Required Firestore Index

**Index Name:** `scheduled_notifications_processing`

**Fields:**
- `scheduledFor` (ASC)
- `status` (ASC)

**Query Scope:** Collection

**Create via Firebase Console:**
1. Go to Firestore > Indexes
2. Click "Create Index"
3. Collection ID: `scheduled_notifications`
4. Add field: `scheduledFor` (Ascending)
5. Add field: `status` (Ascending)
6. Query scope: Collection
7. Click "Create"

**Or via firestore.indexes.json:**

```json
{
  "indexes": [
    {
      "collectionGroup": "scheduled_notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "scheduledFor", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Scheduled notifications - server-side only (Admin SDK)
    match /scheduled_notifications/{notificationId} {
      // No client access - only Admin SDK can read/write
      allow read, write: if false;
    }
  }
}
```

## Usage Flow

### 1. Duty Created → Schedule Notifications

```typescript
// When duty is created
POST /api/household-duties

→ scheduleDutyNotifications(duty)
  → Create scheduled_notification for reminder (24hrs before due)
  → Create scheduled_notification for overdue (at due time)
```

### 2. Cron Processes Scheduled Notifications

```typescript
// Every hour
GET /api/cron/duty-notifications

→ Query: scheduled_notifications WHERE scheduledFor <= now AND status = 'pending'
→ For each notification:
  → Send email/in-app notification
  → Mark status = 'sent'
```

### 3. Duty Updated → Reschedule

```typescript
// When duty nextDueDate changes
PATCH /api/household-duties/{dutyId}

→ Cancel existing pending notifications
→ Create new scheduled notifications with updated times
```

## Performance Benefits

### Before (30-min cron):
- Query ALL household_duties (e.g., 1000 duties)
- Check each duty's due date
- 48 cron runs/day × 1000 reads = 48,000 reads/day

### After (event-driven + hourly cron):
- Query ONLY scheduled_notifications WHERE scheduledFor <= now
- Typically 1-5 notifications per hour
- 24 cron runs/day × 5 reads = 120 reads/day

**Result:** 99.75% reduction in Firestore reads

## Monitoring

### Key Metrics

```typescript
// Pending count (should stay low, <100)
db.collection('scheduled_notifications')
  .where('status', '==', 'pending')
  .count()

// Failed notifications (last 24 hours)
db.collection('scheduled_notifications')
  .where('status', '==', 'failed')
  .where('createdAt', '>=', yesterday)
  .get()

// Average latency (sentAt - scheduledFor)
// Should be < 1 hour
```

### Alerts

- Pending count > 100 → Cron likely failing
- Failed rate > 5% → Notification service issues
- Latency > 2 hours → Cron not running frequently enough

## Migration from Old System

See `scripts/backfill-duty-schedules.ts` to create scheduled_notifications for existing duties.
