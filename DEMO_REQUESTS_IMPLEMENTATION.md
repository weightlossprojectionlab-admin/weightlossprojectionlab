# Demo Request System - Complete Implementation Guide

## Overview

This document provides a comprehensive guide to the Demo Request system implemented for the Weight Loss Projection Lab (WPL) platform. The system captures demo requests from marketing pages, stores them in Firebase, and provides an admin dashboard for managing and scheduling demos.

---

## Architecture Overview

### System Components

1. **Frontend Components**
   - `DemoRequestModal.tsx` - Multi-step wizard modal for capturing requests
   - `DemoRequestButton.tsx` - Client component wrapper for triggering modal

2. **API Routes**
   - `POST /api/demo-requests` - Create new demo request (public)
   - `PATCH /api/admin/demo-requests/[id]` - Update request status (admin-only)
   - `DELETE /api/admin/demo-requests/[id]` - Delete request (admin-only)

3. **Admin Dashboard**
   - `/admin/demo-requests` - View and manage all demo requests
   - Real-time updates via Firestore `onSnapshot`
   - Filterable by status (pending, scheduled, completed, cancelled)
   - Searchable by name, email, company, role, use case

4. **Firebase Backend**
   - Collection: `demo_requests`
   - Security rules with validation
   - Real-time listeners for admin dashboard

5. **Type Definitions**
   - `types/demo-requests.ts` - TypeScript interfaces

---

## Data Schema

### DemoRequest Interface

```typescript
interface DemoRequest {
  id: string // Firestore auto-generated

  // Contact Info
  name: string // Required
  email: string // Required
  phone?: string
  company?: string
  companySize?: 'solo' | '2-10' | '11-50' | '51-200' | '201-1000' | '1000+'
  role?: string // e.g., "Family Caregiver", "Healthcare Provider"

  // Scheduling Preferences
  preferredDate?: string // ISO date string
  preferredTime?: 'morning' | 'afternoon' | 'evening'
  timezone?: string // Auto-detected from browser

  // Context
  useCase?: string // Why they want a demo
  currentSolution?: string // What they're using now
  urgency?: 'low' | 'medium' | 'high'

  // Status Tracking
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
  submittedAt: string // ISO timestamp
  scheduledAt?: string
  completedAt?: string
  cancelledAt?: string

  // Admin Fields
  assignedTo?: string // Admin UID
  internalNotes?: string // Admin notes
  followUpDate?: string

  // Audit Trail
  ipAddress: string
  userAgent: string
  source: string // e.g., "blog/patients", "blog/dashboard"
  utmParams?: { // Marketing tracking
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
  }
}
```

---

## Firebase Security Rules

```javascript
match /demo_requests/{requestId} {
  // Read: Admin-only
  allow read: if isAdmin();

  // List queries: Admin-only
  allow list: if isAdmin();

  // Create: Anyone can submit (with validation)
  allow create: if request.resource.data.keys().hasAll(['name', 'email', 'submittedAt', 'status']) &&
                   request.resource.data.status == 'pending' &&
                   request.resource.data.name is string &&
                   request.resource.data.name.size() > 0 &&
                   request.resource.data.name.size() <= 100 &&
                   request.resource.data.email is string &&
                   request.resource.data.email.matches(/^[\\w\\-.]+@[\\w\\-.]+\\.[a-z]{2,}$/i) &&
                   request.resource.data.submittedAt is string &&
                   timestamp(request.resource.data.submittedAt) <= request.time;

  // Update: Admin-only (for status changes)
  allow update: if isAdmin() &&
                   request.resource.data.email == resource.data.email &&
                   request.resource.data.name == resource.data.name &&
                   request.resource.data.diff(resource.data).affectedKeys()
                     .hasOnly(['status', 'scheduledAt', 'completedAt', 'cancelledAt',
                               'assignedTo', 'internalNotes', 'followUpDate']);

  // Delete: Admin-only
  allow delete: if isAdmin();
}
```

---

## User Flow

### Customer Journey

1. **User clicks "View Demo" button** on marketing page (e.g., `/blog/patients`, `/blog/dashboard`)
2. **Modal opens** with 3-step wizard:
   - **Step 1**: Contact info (name, email, phone, company)
   - **Step 2**: Demo preferences (date, time, timezone, use case)
   - **Step 3**: Additional context (current solution, urgency)
3. **User submits form**
4. **API creates demo request** in Firestore
5. **Success screen** shown to user
6. **Confirmation email sent** (TODO: Phase 2)

### Admin Journey

1. **Admin navigates to** `/admin/demo-requests`
2. **Real-time dashboard displays** all demo requests
3. **Unread count badge** shown in admin sidebar
4. **Admin can:**
   - Filter by status (pending, scheduled, completed, cancelled)
   - Search by name, email, company, role, use case
   - Update status (Schedule, Complete, Cancel)
   - View full request details
   - Track UTM parameters and source
5. **Admin receives email notification** of new requests (TODO: Phase 2)

---

## Key Features

### Frontend (DemoRequestModal)

- **Multi-step wizard** (3 steps) for progressive disclosure
- **Auto-timezone detection** using `Intl.DateTimeFormat()`
- **UTM parameter capture** from URL query string
- **Form validation** (required fields, email regex)
- **Loading states** during submission
- **Success/error handling** with toast notifications
- **Mobile-responsive** design
- **Accessibility** (aria-labels, keyboard navigation)

### Admin Dashboard

- **Real-time updates** via Firestore `onSnapshot`
- **Filter by status** (all, pending, scheduled, completed, cancelled)
- **Search functionality** (name, email, company, role, use case)
- **Quick actions** (Schedule, Complete, Cancel)
- **Stats dashboard** (total, pending, scheduled, completed, cancelled)
- **Expandable details** (technical info, UTM params)
- **Status badges** with color coding
- **Priority indicators** (high urgency flag)

### Security & Validation

- **Firestore security rules** prevent unauthorized access
- **Email regex validation** on client and server
- **Name length limits** (max 100 characters)
- **Timestamp validation** (prevents future dates)
- **Contact info immutability** after submission
- **IP address logging** for abuse tracking
- **Rate limiting** (TODO: Phase 2)

---

## API Endpoints

### POST /api/demo-requests

**Purpose**: Create a new demo request (public endpoint)

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1 (555) 123-4567",
  "company": "Acme Healthcare",
  "companySize": "11-50",
  "role": "Family Caregiver",
  "preferredDate": "2025-12-30",
  "preferredTime": "morning",
  "timezone": "America/New_York",
  "useCase": "Managing health for elderly parents",
  "currentSolution": "Excel spreadsheets",
  "urgency": "medium",
  "source": "blog/patients",
  "utmParams": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "family_health"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "requestId": "abc123xyz",
  "message": "Demo request submitted successfully. We will contact you within 24 hours."
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Name and email are required"
}
```

---

### PATCH /api/admin/demo-requests/[id]

**Purpose**: Update demo request status or admin fields (admin-only)

**Authentication**: Requires admin Firebase Auth token in `Authorization: Bearer <token>` header

**Request Body**:
```json
{
  "status": "scheduled",
  "scheduledAt": "2025-12-30T10:00:00Z",
  "internalNotes": "Scheduled via Zoom for 10 AM EST",
  "assignedTo": "admin-uid-123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Demo request updated successfully",
  "updated": {
    "status": "scheduled",
    "scheduledAt": "2025-12-30T10:00:00Z"
  }
}
```

**Error Response** (403 Forbidden):
```json
{
  "error": "Unauthorized. Admin access required."
}
```

---

### DELETE /api/admin/demo-requests/[id]

**Purpose**: Delete a demo request (admin-only)

**Authentication**: Requires admin Firebase Auth token

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Demo request deleted successfully"
}
```

---

## Admin Nav Integration

### Pending Count Badge

The admin sidebar shows an unread count badge for pending demo requests:

```typescript
interface AdminNavProps {
  pendingCounts?: {
    recipes?: number
    cases?: number
    aiDecisions?: number
    coaches?: number
    demoRequests?: number // NEW
  }
}
```

**Usage in admin layout**:
```typescript
<AdminNav pendingCounts={{ demoRequests: 5 }} />
```

**Hook to fetch pending count**:
```typescript
// hooks/useAdminDemoStats.ts (TODO: Create this)
useEffect(() => {
  const q = query(
    collection(db, 'demo_requests'),
    where('status', '==', 'pending')
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    setPendingCount(snapshot.size)
  })

  return () => unsubscribe()
}, [])
```

---

## File Structure

```
weightlossprojectlab/
├── app/
│   ├── admin/
│   │   └── demo-requests/
│   │       └── page.tsx                    # Admin dashboard
│   ├── api/
│   │   ├── demo-requests/
│   │   │   └── route.ts                   # POST endpoint
│   │   └── admin/
│   │       └── demo-requests/
│   │           └── [id]/
│   │               └── route.ts            # PATCH/DELETE endpoint
│   └── blog/
│       ├── patients/
│       │   └── page.tsx                   # Updated with DemoRequestButton
│       └── dashboard/
│           └── page.tsx                   # Updated with DemoRequestButton
├── components/
│   ├── admin/
│   │   └── AdminNav.tsx                   # Updated with Demo Requests link
│   ├── DemoRequestModal.tsx               # Multi-step wizard modal
│   └── DemoRequestButton.tsx              # Client wrapper component
├── lib/
│   └── auth-helpers.ts                     # Admin verification utilities
├── types/
│   └── demo-requests.ts                   # TypeScript interfaces
└── firestore.rules                         # Updated with demo_requests rules
```

---

## Testing Checklist

### Frontend Testing

- [ ] Modal opens when "View Demo" button is clicked
- [ ] Step 1 validation (name and email required)
- [ ] Email format validation (rejects invalid emails)
- [ ] Multi-step navigation (Next, Back buttons work)
- [ ] Form submission creates demo request
- [ ] Success screen shows after submission
- [ ] Modal resets after closing
- [ ] Mobile responsive design
- [ ] Keyboard navigation (Tab, Enter, Esc)
- [ ] UTM parameters captured from URL

### Admin Dashboard Testing

- [ ] Admin can access `/admin/demo-requests`
- [ ] Non-admins redirected to `/dashboard`
- [ ] Demo requests list displays correctly
- [ ] Real-time updates when new request submitted
- [ ] Status filters work (all, pending, scheduled, completed, cancelled)
- [ ] Search functionality works
- [ ] Status update buttons change request status
- [ ] Stats dashboard counts are accurate
- [ ] Expandable details show technical info
- [ ] Badge count shown in admin sidebar

### API Testing

- [ ] POST /api/demo-requests creates new request
- [ ] POST validates required fields (name, email)
- [ ] POST rejects invalid email formats
- [ ] POST captures IP address and user agent
- [ ] PATCH /api/admin/demo-requests/[id] updates status
- [ ] PATCH requires admin authentication
- [ ] PATCH validates allowed fields only
- [ ] DELETE requires admin authentication
- [ ] DELETE removes request from Firestore

### Security Testing

- [ ] Firestore rules prevent non-admin reads
- [ ] Firestore rules validate create payload
- [ ] Firestore rules prevent contact info changes on update
- [ ] Admin API routes verify Firebase Auth token
- [ ] Email addresses are lowercased and trimmed
- [ ] Name length limit enforced (max 100 chars)
- [ ] Future timestamps rejected

---

## Phase 2 Enhancements (TODO)

### Email Notifications

1. **User Confirmation Email**
   - Sent immediately after request submission
   - Contains: demo details, what to expect, contact info
   - Template: Transactional email (SendGrid, Mailgun, Resend)

2. **Admin Notification Email**
   - Sent to sales team when new request submitted
   - Contains: full request details, quick action links
   - Daily digest option (batch notifications)

### Calendar Integration

1. **Google Calendar API**
   - Admin can schedule demo directly from dashboard
   - Creates calendar event with Zoom link
   - Sends calendar invite to customer

2. **Zoom Integration**
   - Auto-generate Zoom meeting links
   - Include in calendar invite and confirmation email

### Rate Limiting

1. **IP-based Rate Limiting**
   - Max 3 requests per IP per 24 hours
   - Prevents spam abuse
   - Implementation: Vercel KV or Firebase rate limiting

2. **Email Verification**
   - Send confirmation link to email before admin notification
   - Only verified requests shown in admin dashboard
   - Reduces spam

### Analytics

1. **Conversion Tracking**
   - Track demo request conversion rate by source
   - UTM parameter analysis
   - Funnel visualization (page view → button click → form submit)

2. **Admin Dashboard**
   - Charts: requests over time, conversion rates, source breakdown
   - Export to CSV for further analysis

### CRM Integration

1. **HubSpot / Salesforce**
   - Auto-create lead in CRM when demo requested
   - Sync status updates (scheduled, completed)
   - Track demo → customer conversion

---

## Troubleshooting

### Issue: Modal doesn't open

**Cause**: DemoRequestButton not rendered (server component issue)

**Solution**: Ensure parent component imports DemoRequestButton from client component

---

### Issue: Admin can't access dashboard

**Cause**: Missing admin custom claim or hardcoded UID

**Solution**:
1. Check Firebase custom claims: `firebase auth:custom-claims:get <uid>`
2. Add UID to hardcoded list in `firestore.rules` (line 22-24)
3. Verify admin middleware in API routes

---

### Issue: Real-time updates not working

**Cause**: onSnapshot listener not properly configured

**Solution**:
1. Check Firestore rules allow admin list queries
2. Ensure cleanup function returns unsubscribe
3. Verify Firebase SDK version compatibility

---

### Issue: Form submission fails

**Cause**: Email validation or Firestore rules rejection

**Solution**:
1. Check browser console for error messages
2. Verify email format (must match regex)
3. Check Firestore rules (submittedAt timestamp validation)
4. Ensure name length <= 100 characters

---

## Performance Considerations

### Client-Side

- **Lazy load modal**: Only import when user clicks button (React.lazy)
- **Debounce search**: Wait 300ms after user stops typing
- **Optimize bundle size**: Tree-shake unused Heroicons

### Server-Side

- **Index Firestore queries**: Create composite index for `status + submittedAt`
- **Limit list queries**: Max 100 results per query
- **Cache admin auth checks**: Use short-lived cache (5 minutes)

### Real-Time Updates

- **Scope listeners**: Only subscribe to pending/scheduled (not completed/cancelled)
- **Pagination**: Load 50 requests at a time
- **Cleanup listeners**: Properly unsubscribe on unmount

---

## Deployment

### Environment Variables

Ensure these are set in production:

```bash
# Firebase Admin SDK
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@project-id.iam.gserviceaccount.com"

# Public Firebase Config
NEXT_PUBLIC_FIREBASE_PROJECT_ID="project-id"
NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
```

### Firestore Indexes

Create composite index for admin queries:

```
Collection: demo_requests
Fields: status (Ascending), submittedAt (Descending)
```

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

---

## Support & Maintenance

### Monitoring

- **Error tracking**: Sentry or similar
- **Performance monitoring**: Firebase Performance Monitoring
- **Uptime monitoring**: Pingdom or UptimeRobot

### Regular Tasks

- **Weekly**: Review pending demo requests, follow up on overdue
- **Monthly**: Archive completed/cancelled requests older than 90 days
- **Quarterly**: Analyze conversion metrics, optimize form fields

---

## Contact

For questions or issues with the demo request system:

- **Engineering**: [dev@weightlossproglab.com](mailto:dev@weightlossproglab.com)
- **Sales/Demos**: [sales@weightlossproglab.com](mailto:sales@weightlossproglab.com)
- **Support**: [support@weightlossproglab.com](mailto:support@weightlossproglab.com)

---

**Last Updated**: December 28, 2025
**Version**: 1.0.0
**Status**: Production Ready (Phase 1 Complete)
