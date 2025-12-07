# Notification System Setup & Deployment Guide

Complete step-by-step guide for setting up and deploying the comprehensive notification system (in-app, email, and push notifications).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Setup](#firebase-setup)
3. [SendGrid Email Setup](#sendgrid-email-setup)
4. [Firebase Cloud Messaging (FCM) Setup](#firebase-cloud-messaging-fcm-setup)
5. [Environment Variables](#environment-variables)
6. [API Route Configuration](#api-route-configuration)
7. [Testing Checklist](#testing-checklist)
8. [Deployment Steps](#deployment-steps)
9. [Troubleshooting](#troubleshooting)
10. [Monitoring](#monitoring)

---

## Prerequisites

Before starting, ensure you have:

- Firebase project created and configured
- SendGrid account (free tier available)
- Domain for email sender (or verified single sender)
- Node.js 18+ and npm/yarn installed
- Access to Firebase Console and SendGrid Dashboard
- Production hosting environment (Vercel, Netlify, etc.)

---

## Firebase Setup

### 1. Enable Firestore Database

1. Navigate to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to **Build** > **Firestore Database**
4. Click **Create database**
5. Choose **Production mode** for production or **Test mode** for development
6. Select your preferred region (closest to your users)
7. Click **Enable**

### 2. Deploy Firestore Indexes

The notification system requires specific composite indexes for optimal query performance.

**Step 1: Verify Index Configuration**

Open `firestore.indexes.json` and ensure these notification indexes exist:

```json
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "read", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "priority", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "patientId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Step 2: Deploy Indexes**

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy indexes
firebase deploy --only firestore:indexes

# Expected output:
# ✔ Deploy complete!
# Deployed indexes:
#   - notifications (multiple indexes)
```

**Step 3: Verify Indexes in Console**

1. Go to Firebase Console > Firestore Database > Indexes
2. Wait for indexes to build (status: Building → Enabled)
3. This can take 5-15 minutes depending on data size
4. All notification indexes should show status: **Enabled**

### 3. Configure Firestore Security Rules

Update your `firestore.rules` to include notification access rules:

```javascript
// Allow users to read their own notifications
match /notifications/{notificationId} {
  allow read: if request.auth != null &&
    resource.data.userId == request.auth.uid;

  allow update: if request.auth != null &&
    resource.data.userId == request.auth.uid &&
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['read', 'readAt', 'status', 'updatedAt']);
}

// Allow users to manage their notification preferences
match /notification_preferences/{userId} {
  allow read, write: if request.auth != null &&
    userId == request.auth.uid;
}

// Allow users to manage their notification tokens
match /notification_tokens/{userId} {
  allow read, write: if request.auth != null &&
    userId == request.auth.uid;
}
```

Deploy security rules:

```bash
firebase deploy --only firestore:rules
```

---

## SendGrid Email Setup

The notification system uses SendGrid for transactional email notifications.

### Option 1: Single Sender Verification (Quick - 5 minutes)

**Best for:** Testing, small projects, or if you don't own a domain

1. **Login to SendGrid Dashboard**
   - Go to: https://app.sendgrid.com/

2. **Navigate to Sender Authentication**
   - Settings → Sender Authentication → Single Sender Verification

3. **Create New Sender**
   - Click **Create New Sender**
   - Fill in sender details:
     - **From Name:** WLPL Family Health (or your app name)
     - **From Email:** Use a non-Gmail email you control
     - **Reply To:** (optional) Can be your support email
     - **Company Address:** Your business address
   - **Important:** Do NOT use @gmail.com addresses due to DMARC policies

4. **Verify Email**
   - SendGrid sends verification email to your From Email
   - Click the verification link
   - Wait for "Verified" status

5. **Update Environment Variables** (see [Environment Variables](#environment-variables) section)

### Option 2: Domain Authentication (Recommended - 15-30 minutes)

**Best for:** Production deployments, professional email sending

1. **Login to SendGrid Dashboard**
   - Go to: https://app.sendgrid.com/

2. **Navigate to Domain Authentication**
   - Settings → Sender Authentication → Domain Authentication

3. **Authenticate Your Domain**
   - Click **Authenticate Your Domain**
   - Enter your domain: `yourapp.com` (without www)
   - Select DNS host: GoDaddy, Namecheap, Cloudflare, etc.
   - Advanced Settings:
     - ✓ Use automated security (recommended)
     - ✓ Branded links for this domain (optional)

4. **Add DNS Records**

   SendGrid provides 3 CNAME records. Add them to your DNS provider:

   **Example DNS Records:**
   ```
   Type: CNAME
   Host: s1._domainkey
   Value: s1.domainkey.u12345.wl.sendgrid.net
   TTL: 3600

   Type: CNAME
   Host: s2._domainkey
   Value: s2.domainkey.u12345.wl.sendgrid.net
   TTL: 3600

   Type: CNAME
   Host: em1234
   Value: u12345.wl.sendgrid.net
   TTL: 3600
   ```

   **Popular DNS Providers:**
   - **Cloudflare:** Dashboard → DNS → Add Record
   - **GoDaddy:** My Products → DNS → Add
   - **Namecheap:** Dashboard → Advanced DNS → Add New Record
   - **Vercel:** Settings → Domains → DNS Records

5. **Verify Domain**
   - Return to SendGrid dashboard
   - Click **Verify** (may need to wait 24-48 hours for DNS propagation)
   - Once verified, you can use ANY email address @yourdomain.com

6. **Update Environment Variables**

### Get SendGrid API Key

1. Navigate to: Settings → API Keys
2. Click **Create API Key**
3. Name: "WLPL Notification System" (or descriptive name)
4. Permissions: **Full Access** (or **Restricted Access** with Mail Send enabled)
5. Click **Create & View**
6. **Copy the API key immediately** (shown only once!)
7. Save to your environment variables

### Why Gmail Addresses Don't Work

Gmail enforces strict DMARC policies (`p=quarantine` or `p=reject`):
- Only Gmail's servers can send emails from @gmail.com addresses
- Third-party services like SendGrid are blocked
- This prevents email spoofing and phishing attacks

**Solution:** Use a custom domain or verified non-Gmail email address.

---

## Firebase Cloud Messaging (FCM) Setup

Enable push notifications for web and mobile devices.

### 1. Enable Cloud Messaging

1. **Navigate to Firebase Console**
   - Select your project
   - Go to **Build** > **Cloud Messaging**

2. **Enable Cloud Messaging API**
   - Click **Get Started** if prompted
   - Enable the Cloud Messaging API

### 2. Generate Web Push Certificate (VAPID Key)

1. **Navigate to Project Settings**
   - Click gear icon → Project Settings
   - Select **Cloud Messaging** tab

2. **Generate Web Push Certificate**
   - Scroll to **Web configuration**
   - Under **Web Push certificates**, click **Generate Key Pair**
   - Copy the **Key pair** value (starts with `B...`)
   - This is your VAPID key

3. **Save VAPID Key**
   - Add to environment variables: `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

### 3. Configure Firebase Admin SDK

The notification system requires Firebase Admin SDK for server-side operations.

1. **Generate Service Account Key**
   - Firebase Console → Project Settings → Service Accounts
   - Click **Generate New Private Key**
   - Click **Generate Key** (downloads JSON file)
   - **Keep this file secure!** Do not commit to Git

2. **Extract Required Values from JSON**

   Open the downloaded JSON file and extract:
   ```json
   {
     "project_id": "your-project-id",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
   }
   ```

3. **Add to Environment Variables** (see next section)

### 4. Create Push Notification API Route

The system requires a server-side API route to send push notifications:

**File:** `app/api/notifications/send-push/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getMessaging } from 'firebase-admin/messaging'
import { getAdminApp } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorizedResponse()
    }

    const { token, notification, data } = await request.json()

    if (!token || !notification) {
      return NextResponse.json(
        { success: false, error: 'Missing token or notification' },
        { status: 400 }
      )
    }

    // Initialize Firebase Admin
    const app = getAdminApp()
    const messaging = getMessaging(app)

    // Send push notification
    const response = await messaging.send({
      token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: data || {},
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          requireInteraction: data?.priority === 'urgent'
        }
      }
    })

    logger.info('[API /notifications/send-push] Push notification sent', {
      messageId: response
    })

    return NextResponse.json({ success: true, messageId: response })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/notifications/send-push',
      operation: 'send'
    })
  }
}
```

Create this file before testing push notifications.

---

## Environment Variables

Complete list of required environment variables for the notification system.

### Development (.env.local)

```bash
# ============================================
# FIREBASE CLIENT (REQUIRED)
# ============================================
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# ============================================
# FIREBASE ADMIN SDK (REQUIRED)
# ============================================
# Get from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-content-here\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# ============================================
# FIREBASE PUSH NOTIFICATIONS (REQUIRED FOR PUSH)
# ============================================
# Get from: Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key-starting-with-B

# ============================================
# SENDGRID EMAIL (REQUIRED FOR EMAIL NOTIFICATIONS)
# ============================================
# Get API key from: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx

# Verified sender email (NOT @gmail.com)
SENDGRID_FROM_EMAIL=noreply@yourapp.com
SENDGRID_FROM_NAME=WLPL Family Health

# Optional: Allow users to reply to different email
SENDGRID_REPLY_TO_EMAIL=support@yourapp.com

# ============================================
# APP CONFIGURATION (REQUIRED)
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Production Environment Variables

For production deployments (Vercel, Netlify, etc.), set these in your hosting dashboard:

**Vercel:**
1. Project Settings → Environment Variables
2. Add each variable with appropriate value
3. Select environment: Production, Preview, Development

**Netlify:**
1. Site Settings → Build & Deploy → Environment
2. Add each variable
3. Redeploy site after adding variables

**Important Production Settings:**

```bash
# Update these for production
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NODE_ENV=production
SENDGRID_FROM_EMAIL=noreply@your-verified-domain.com
```

### Environment Variable Validation

Add validation to catch missing variables early:

**File:** `lib/env-validation.ts`

```typescript
export function validateNotificationEnv() {
  const required = [
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY',
  ]

  const emailRequired = [
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
  ]

  const pushRequired = [
    'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
  ]

  const missing: string[] = []

  required.forEach(key => {
    if (!process.env[key]) missing.push(key)
  })

  if (missing.length > 0) {
    throw new Error(`Missing required notification environment variables: ${missing.join(', ')}`)
  }

  // Warn about optional but recommended variables
  const warnings: string[] = []

  emailRequired.forEach(key => {
    if (!process.env[key]) warnings.push(`Email notifications disabled: ${key} not set`)
  })

  pushRequired.forEach(key => {
    if (!process.env[key]) warnings.push(`Push notifications disabled: ${key} not set`)
  })

  if (warnings.length > 0) {
    console.warn('[Notification System] Warnings:', warnings.join(', '))
  }
}
```

---

## API Route Configuration

Ensure all notification API routes are properly configured.

### Existing API Routes

The notification system includes these API routes:

1. **GET /api/notifications** - Fetch user's notifications with filters
2. **POST /api/notifications/send-push** - Send push notification (create if missing)
3. **PUT /api/notifications/[id]/read** - Mark notification as read
4. **PUT /api/notifications/mark-all-read** - Mark all notifications as read
5. **POST /api/notifications/test** - Test notification creation

### Verify API Routes Work

```bash
# Test notification creation (requires authentication)
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json"

# Test fetching notifications
curl -X GET "http://localhost:3000/api/notifications?limit=10" \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

---

## Testing Checklist

Complete this checklist before deploying to production.

### Pre-Deployment Testing

- [ ] **Firebase Firestore**
  - [ ] Database created and accessible
  - [ ] All indexes deployed and enabled
  - [ ] Security rules deployed and tested
  - [ ] Can read/write test notifications

- [ ] **SendGrid Email**
  - [ ] API key generated and saved
  - [ ] Sender email verified (or domain authenticated)
  - [ ] Environment variables set correctly
  - [ ] Test email sends successfully

- [ ] **Firebase Cloud Messaging**
  - [ ] Cloud Messaging enabled
  - [ ] VAPID key generated and saved
  - [ ] Service account key generated
  - [ ] Push notification API route created

- [ ] **Environment Variables**
  - [ ] All required variables set in .env.local
  - [ ] Private key formatted correctly (with \n newlines)
  - [ ] APP_URL points to correct domain
  - [ ] No variables contain placeholder values

### Functional Testing

#### 1. Create Test Notification Manually

```typescript
// In your development environment or API route
import { createNotification } from '@/lib/notification-service'

const notification = await createNotification({
  userId: 'your-test-user-id',
  patientId: 'test-patient-id',
  type: 'medication_added',
  priority: 'normal',
  title: 'Test Notification',
  message: 'This is a test notification',
  metadata: {
    medicationId: 'test-med',
    medicationName: 'Test Medication',
    patientName: 'Test Patient',
    actionBy: 'Test User',
    actionByUserId: 'test-user-id'
  },
  actionUrl: '/dashboard',
  actionLabel: 'View Dashboard'
})

console.log('Created notification:', notification.id)
```

**Expected:** Notification document created in Firestore `notifications` collection

#### 2. Verify Email Delivery

```typescript
import { sendEmailNotification } from '@/lib/notification-service'

await sendEmailNotification(
  notification,
  'your-test-email@example.com',
  'Test User'
)
```

**Expected:**
- Email received at test address
- Email displays correctly (check HTML and plain text)
- From address shows verified sender
- No DMARC errors in email headers

**Check:** Use https://mail-tester.com to verify email deliverability score

#### 3. Test Push Notification

```typescript
import { sendPushNotification } from '@/lib/notification-service'

await sendPushNotification(notification, 'your-test-user-id')
```

**Prerequisites:**
- User has granted notification permission
- FCM token saved in Firestore
- Service Worker registered

**Expected:**
- Push notification appears in browser
- Notification shows correct title and body
- Clicking notification navigates to actionUrl

#### 4. Check In-App Notification Display

- [ ] Login to your app
- [ ] Navigate to notifications page (`/notifications`)
- [ ] Verify notification appears in list
- [ ] Check unread count in header/bell icon
- [ ] Click notification to mark as read
- [ ] Verify read status updates in real-time

#### 5. Verify Real-Time Updates

- [ ] Open app in two browser windows
- [ ] Login as test user in both
- [ ] Create notification via API in one window
- [ ] Verify notification appears instantly in both windows
- [ ] Mark as read in one window
- [ ] Verify read status updates in other window

#### 6. Test Notification Preferences

```typescript
import { updateNotificationPreferences, getNotificationPreferences } from '@/lib/notification-service'

// Update preferences
await updateNotificationPreferences('test-user-id', {
  medication_added: {
    email: false,
    push: true,
    inApp: true
  },
  quietHours: {
    enabled: true,
    startHour: 22,
    endHour: 7
  }
})

// Verify preferences saved
const prefs = await getNotificationPreferences('test-user-id')
console.log('Preferences:', prefs)
```

**Expected:**
- Preferences saved to Firestore
- Email notifications disabled for medication_added
- Push notifications respect quiet hours

#### 7. Test Mark As Read Functionality

- [ ] Fetch unread notifications
- [ ] Mark single notification as read
- [ ] Verify readAt timestamp set
- [ ] Verify status changed to 'read'
- [ ] Mark all as read
- [ ] Verify unread count = 0

#### 8. Test Notification Filtering

```typescript
import { getUserNotifications } from '@/lib/notification-service'

// Test filters
const unread = await getUserNotifications(userId, { read: false })
const urgent = await getUserNotifications(userId, { priority: 'urgent' })
const medications = await getUserNotifications(userId, {
  type: ['medication_added', 'medication_updated']
})
const recent = await getUserNotifications(userId, { limit: 10 })

console.log('Filters working:', {
  unread: unread.length,
  urgent: urgent.length,
  medications: medications.length,
  recent: recent.length
})
```

**Expected:** Each filter returns appropriate subset of notifications

#### 9. Test Family Notification Distribution

```typescript
import { sendNotificationToFamilyMembers } from '@/lib/notification-service'

const result = await sendNotificationToFamilyMembers({
  patientId: 'test-patient-id',
  type: 'vital_logged',
  priority: 'normal',
  title: 'Vital Sign Logged',
  message: 'Blood pressure logged',
  metadata: {
    vitalId: 'test-vital',
    vitalType: 'blood_pressure',
    value: '120/80 mmHg',
    patientName: 'Test Patient',
    actionBy: 'Test User',
    actionByUserId: 'test-user-id'
  },
  excludeUserId: 'test-user-id'
})

console.log(`Sent to ${result.successCount}/${result.totalRecipients} family members`)
```

**Expected:**
- Notifications created for all family members with access
- Action performer excluded from recipients
- Each recipient receives based on their preferences

### Performance Testing

- [ ] Test with 100+ notifications
- [ ] Verify query performance with indexes
- [ ] Check real-time listener memory usage
- [ ] Test notification cleanup (old/expired)
- [ ] Verify rate limiting works (if implemented)

### Error Handling Testing

- [ ] Test with invalid FCM token
- [ ] Test with invalid email address
- [ ] Test with missing environment variables
- [ ] Test with Firebase offline
- [ ] Test with SendGrid API failure
- [ ] Verify graceful degradation

---

## Deployment Steps

Follow these steps for production deployment.

### 1. Pre-Deployment Preparation

```bash
# 1. Ensure all tests pass
npm run test

# 2. Build production bundle
npm run build

# 3. Verify no build errors
# Check console output for TypeScript errors

# 4. Commit all changes
git add .
git commit -m "Add notification system configuration"
git push origin main
```

### 2. Deploy Firestore Configuration

```bash
# Deploy indexes (required for production)
firebase deploy --only firestore:indexes

# Deploy security rules (recommended)
firebase deploy --only firestore:rules

# Verify deployment
firebase deploy --only firestore --dry-run
```

### 3. Configure Production Environment Variables

**Vercel Deployment:**

```bash
# Using Vercel CLI
vercel env add SENDGRID_API_KEY production
vercel env add FIREBASE_ADMIN_PRIVATE_KEY production
# ... add all other variables

# Or via Vercel Dashboard:
# 1. Go to Project Settings > Environment Variables
# 2. Add each variable
# 3. Set Environment: Production
```

**Netlify Deployment:**

```bash
# Using Netlify CLI
netlify env:set SENDGRID_API_KEY "your-value"
netlify env:set FIREBASE_ADMIN_PRIVATE_KEY "your-value"
# ... add all other variables

# Or via Netlify Dashboard:
# 1. Site Settings > Build & Deploy > Environment
# 2. Add each variable
```

### 4. Deploy Application

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod

# Or push to main branch if auto-deploy enabled
git push origin main
```

### 5. Post-Deployment Verification

Run through the [Testing Checklist](#testing-checklist) in production:

```bash
# Test production API endpoints
curl -X GET "https://your-domain.com/api/notifications?limit=5" \
  -H "Authorization: Bearer YOUR_PROD_ID_TOKEN"

# Test email sending
# Trigger a notification-generating action in production
```

### 6. Monitor Initial Traffic

- [ ] Check Vercel/Netlify deployment logs
- [ ] Monitor Firebase Firestore metrics
- [ ] Check SendGrid email activity
- [ ] Watch for error logs
- [ ] Verify real-time listeners working

### 7. Enable Production Monitoring

Set up monitoring tools:
- Firebase Console: Monitor Firestore operations
- SendGrid: Email activity and deliverability
- Sentry (optional): Error tracking
- Vercel/Netlify: Function logs and analytics

---

## Troubleshooting

Common issues and solutions.

### Email Issues

#### Emails Not Sending

**Symptom:** No emails received, no errors logged

**Possible Causes:**
1. SENDGRID_API_KEY not set or invalid
2. Sender email not verified
3. DMARC policy blocking emails (using @gmail.com)

**Solution:**
```bash
# Check environment variables
echo $SENDGRID_API_KEY  # Should output SG.xxx...

# Verify API key in SendGrid dashboard
# Settings > API Keys > Check status

# Check server logs
# Look for: "[Email Service] Email sent successfully"
# Or: "SENDGRID_API_KEY not configured"

# Test SendGrid API key
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@yourdomain.com"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

#### DMARC Errors

**Symptom:** Emails rejected, "DMARC policy prevents sending"

**Solution:**
- Do NOT use @gmail.com, @yahoo.com, or other consumer email providers
- Use domain authentication (Option 2 in SendGrid setup)
- Or use verified single sender with custom domain

#### Emails Going to Spam

**Symptom:** Emails delivered but land in spam folder

**Solution:**
1. Complete domain authentication (DKIM, SPF, DMARC)
2. Use consistent From address
3. Include unsubscribe link (for marketing emails)
4. Test email score: https://mail-tester.com
5. Warm up sending domain gradually (if new)

### Push Notification Issues

#### Push Notifications Not Working

**Symptom:** No push notifications appearing

**Possible Causes:**
1. VAPID key not set
2. User hasn't granted permission
3. Service worker not registered
4. FCM token not saved

**Solution:**
```typescript
// Check VAPID key
console.log('VAPID:', process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY)

// Check notification permission
console.log('Permission:', Notification.permission)

// Request permission if not granted
if (Notification.permission === 'default') {
  await Notification.requestPermission()
}

// Check FCM token
import { getToken } from 'firebase/messaging'
const messaging = await initializeMessaging()
const token = await getToken(messaging, {
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
})
console.log('FCM Token:', token)

// Verify token saved in Firestore
// Check: notification_tokens/{userId}
```

#### Service Worker Not Registered

**Symptom:** Console error: "Messaging: We are unable to register the default service worker"

**Solution:**
1. Create `public/firebase-messaging-sw.js`
2. Add service worker registration to app
3. Verify service worker file accessible at `/firebase-messaging-sw.js`

**File:** `public/firebase-messaging-sw.js`

```javascript
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload)

  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png'
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})
```

### Real-Time Update Issues

#### Notifications Not Appearing Instantly

**Symptom:** Delay in notification appearance, need to refresh page

**Possible Causes:**
1. Firestore real-time listener not set up
2. Firestore security rules blocking reads
3. Network connectivity issues

**Solution:**
```typescript
// Check if real-time listener active
import { useNotifications } from '@/hooks/useNotifications'

const { subscribeToNotifications, unreadCount } = useNotifications(userId)

useEffect(() => {
  if (!userId) return

  const unsubscribe = subscribeToNotifications(20)
  console.log('Real-time listener active')

  return () => {
    console.log('Unsubscribing from notifications')
    unsubscribe()
  }
}, [userId])

// Check Firestore security rules
// Ensure user can read their own notifications
```

### Performance Issues

#### Slow Notification Queries

**Symptom:** Loading spinner shows for 3+ seconds

**Possible Causes:**
1. Missing composite indexes
2. Fetching too many notifications
3. No pagination

**Solution:**
```bash
# Deploy missing indexes
firebase deploy --only firestore:indexes

# Check index status
# Firebase Console > Firestore > Indexes
# All should be "Enabled" not "Building"

# Add pagination to queries
const { getNotifications } = useNotifications(userId)
await getNotifications({ limit: 20 })  # Fetch 20 at a time

# Monitor query performance
# Firebase Console > Firestore > Usage tab
```

#### High Firebase Costs

**Symptom:** Unexpected Firebase bill

**Possible Causes:**
1. Too many real-time listeners
2. No notification cleanup
3. Inefficient queries (missing indexes)

**Solution:**
```typescript
// Limit real-time listeners
const { subscribeToNotifications } = useNotifications(userId)
useEffect(() => {
  // Only subscribe on active tab
  if (document.visibilityState === 'visible') {
    return subscribeToNotifications(10)  // Limit to 10 most recent
  }
}, [userId])

// Implement notification cleanup
// Delete notifications older than 90 days
const ninetyDaysAgo = new Date()
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

const oldNotifications = await getDocs(
  query(
    collection(db, 'notifications'),
    where('createdAt', '<', ninetyDaysAgo.toISOString())
  )
)

// Delete in batches
const batch = writeBatch(db)
oldNotifications.forEach(doc => batch.delete(doc.ref))
await batch.commit()
```

### Firebase Admin SDK Issues

#### Private Key Format Errors

**Symptom:** "Invalid private key format: Missing BEGIN or END markers"

**Solution:**
```bash
# Ensure private key has proper newlines
# Incorrect (escaped newlines):
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"

# Correct (actual newlines in quotes):
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7...
-----END PRIVATE KEY-----
"

# For Netlify/Vercel, use the escaped version:
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"

# Test private key loading
node -e "console.log(process.env.FIREBASE_ADMIN_PRIVATE_KEY.includes('BEGIN PRIVATE KEY'))"
# Should output: true
```

---

## Monitoring

Key metrics and monitoring strategies for production.

### 1. Firebase Console Monitoring

**Navigate to:** Firebase Console > Your Project

#### Firestore Metrics
- **Reads/Writes:** Monitor daily operations
- **Storage:** Track notification data size
- **Indexes:** Ensure all indexes enabled
- **Warning:** Spikes indicate potential issues

**Alerts to Set:**
- Reads > 100,000/day (adjust for your app)
- Failed operations > 1%
- Storage > 1 GB (adjust for your data)

#### Cloud Messaging Metrics
- **Messages Sent:** Track push notification volume
- **Delivery Rate:** Should be > 95%
- **Error Rate:** Should be < 1%

**Alerts to Set:**
- Delivery rate < 90%
- Error rate > 5%

### 2. SendGrid Monitoring

**Navigate to:** SendGrid Dashboard > Activity

#### Email Metrics to Track
- **Delivered:** Successful email deliveries
- **Bounced:** Invalid email addresses
- **Spam Reports:** Users marking as spam
- **Delivery Rate:** Should be > 98%

**Alerts to Set:**
- Bounce rate > 5%
- Spam report rate > 0.1%
- Delivery rate < 95%

**Email Deliverability Score:**
- Aim for: > 95%
- Check: SendGrid Dashboard > Email Activity

### 3. Application Logs

Monitor these log patterns in production:

**Success Patterns:**
```
[NotificationService] Notification created { notificationId, userId, type }
[NotificationService] Email notification sent { recipientEmail }
[NotificationService] Push notification sent { userId }
[NotificationService] Family notification batch complete { success: X, failure: Y }
```

**Error Patterns:**
```
[NotificationService] Error creating notification
[NotificationService] Error sending email notification
[NotificationService] Error sending push notification
[Email Service] Error sending email: { error }
```

**Performance Patterns:**
```
[NotificationService] Found family members with patient access { count }
[NotificationService] Sending notification to family members { recipientCount }
```

### 4. Key Metrics to Track

#### Notification Volume
- **Total notifications created/day:** Baseline your normal volume
- **By type:** Track which notification types are most common
- **By priority:** Monitor urgent vs normal distribution

#### Delivery Rates
- **Email success rate:** Target: > 95%
- **Push success rate:** Target: > 90%
- **In-app display rate:** Target: 100%

#### User Engagement
- **Read rate:** % of notifications marked as read
- **Time to read:** Average time between creation and read
- **Notification settings:** % of users with notifications enabled

#### Performance Metrics
- **Query time:** Average notification fetch time (target: < 500ms)
- **Real-time latency:** Time from creation to display (target: < 2s)
- **Error rate:** Failed notification operations (target: < 1%)

### 5. Monitoring Tools

**Recommended Tools:**

1. **Firebase Console** (built-in)
   - Real-time metrics
   - Usage quotas
   - Error logs

2. **SendGrid Dashboard** (built-in)
   - Email activity
   - Deliverability metrics
   - Spam reports

3. **Sentry** (optional, recommended)
   - Error tracking
   - Performance monitoring
   - User feedback

**Sentry Setup:**
```bash
npm install @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard@latest -i nextjs
```

4. **Custom Analytics** (optional)

**File:** `lib/notification-analytics.ts`

```typescript
import { adminDb } from '@/lib/firebase-admin'

export async function trackNotificationMetrics() {
  const today = new Date().toISOString().split('T')[0]

  // Count notifications by type
  const snapshot = await adminDb
    .collection('notifications')
    .where('createdAt', '>=', `${today}T00:00:00Z`)
    .get()

  const metrics = {
    total: snapshot.size,
    byType: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    emailSent: 0,
    pushSent: 0,
  }

  snapshot.forEach(doc => {
    const data = doc.data()
    metrics.byType[data.type] = (metrics.byType[data.type] || 0) + 1
    metrics.byPriority[data.priority] = (metrics.byPriority[data.priority] || 0) + 1
    if (data.emailSent) metrics.emailSent++
    if (data.pushSent) metrics.pushSent++
  })

  // Save daily metrics
  await adminDb
    .collection('notification_metrics')
    .doc(today)
    .set(metrics)

  return metrics
}

// Run daily via cron or scheduled function
```

### 6. Alert Thresholds

Set up alerts for these conditions:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Email bounce rate | > 5% | Check email validation |
| Push delivery rate | < 90% | Verify FCM configuration |
| Notification errors | > 1% | Review error logs |
| Firestore reads | > quota | Optimize queries |
| Response time | > 2s | Check indexes |
| Unread count | > 100 per user | Consider cleanup |

### 7. Health Check Endpoint

Create a health check endpoint to monitor system status:

**File:** `app/api/health/notifications/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import sgMail from '@sendgrid/mail'

export async function GET() {
  const health = {
    status: 'healthy',
    checks: {
      firestore: 'unknown',
      sendgrid: 'unknown',
      fcm: 'unknown',
    },
    timestamp: new Date().toISOString(),
  }

  try {
    // Check Firestore connectivity
    await adminDb.collection('notifications').limit(1).get()
    health.checks.firestore = 'healthy'
  } catch (error) {
    health.checks.firestore = 'unhealthy'
    health.status = 'degraded'
  }

  try {
    // Check SendGrid API key
    if (process.env.SENDGRID_API_KEY) {
      health.checks.sendgrid = 'healthy'
    } else {
      health.checks.sendgrid = 'not_configured'
    }
  } catch (error) {
    health.checks.sendgrid = 'unhealthy'
    health.status = 'degraded'
  }

  try {
    // Check FCM configuration
    if (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
      health.checks.fcm = 'healthy'
    } else {
      health.checks.fcm = 'not_configured'
    }
  } catch (error) {
    health.checks.fcm = 'unhealthy'
    health.status = 'degraded'
  }

  const statusCode = health.status === 'healthy' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}
```

**Monitor endpoint:**
```bash
curl https://your-app.com/api/health/notifications

# Expected response:
# {
#   "status": "healthy",
#   "checks": {
#     "firestore": "healthy",
#     "sendgrid": "healthy",
#     "fcm": "healthy"
#   },
#   "timestamp": "2025-12-05T10:30:00.000Z"
# }
```

### 8. Regular Maintenance Tasks

Schedule these maintenance tasks:

| Task | Frequency | Purpose |
|------|-----------|---------|
| Delete old notifications | Weekly | Reduce storage costs |
| Review error logs | Daily | Catch issues early |
| Check email deliverability | Weekly | Maintain sender reputation |
| Update FCM tokens | Monthly | Remove stale tokens |
| Review notification metrics | Monthly | Optimize system |
| Test notification flows | Monthly | Ensure functionality |

---

## Additional Resources

### Documentation References

- **Firebase:**
  - Firestore: https://firebase.google.com/docs/firestore
  - Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
  - Admin SDK: https://firebase.google.com/docs/admin/setup

- **SendGrid:**
  - API Reference: https://docs.sendgrid.com/api-reference
  - Domain Authentication: https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication
  - DMARC Guide: https://docs.sendgrid.com/ui/sending-email/dmarc

- **Web Push Notifications:**
  - MDN: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
  - Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

### Support

- **Firebase Support:** https://firebase.google.com/support
- **SendGrid Support:** https://support.sendgrid.com/
- **Community:** Stack Overflow (tags: firebase, sendgrid, push-notification)

### Related Documentation

- `docs/NOTIFICATION_SYSTEM_USAGE.md` - Usage guide and code examples
- `docs/SENDGRID_SETUP.md` - Detailed SendGrid configuration
- `types/notifications.ts` - TypeScript type definitions
- `lib/notification-service.ts` - Core notification functions

---

## Summary

You now have a comprehensive notification system with:

- **In-app notifications** with real-time updates
- **Email notifications** via SendGrid
- **Push notifications** via Firebase Cloud Messaging
- **User preferences** with quiet hours support
- **Context-aware messages** for family caregivers
- **Complete monitoring** and troubleshooting guides

**Next Steps:**
1. Complete the [Testing Checklist](#testing-checklist)
2. Follow [Deployment Steps](#deployment-steps)
3. Set up [Monitoring](#monitoring)
4. Refer to [Troubleshooting](#troubleshooting) as needed

For usage examples and code integration, see `docs/NOTIFICATION_SYSTEM_USAGE.md`.
