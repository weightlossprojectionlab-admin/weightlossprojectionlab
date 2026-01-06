# Notification Testing - Usage Examples

## Getting Started

### First Time Setup

1. **Configure Environment Variables**

Create or update `.env.local`:

```bash
# Firebase (Required)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=wlpl-dev
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@wlpl-dev.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Test Configuration (Optional but recommended)
TEST_USER_ID=your_actual_user_id
TEST_PATIENT_ID=your_actual_patient_id
TEST_EMAIL=your.email@example.com
TEST_USER_NAME="John Doe"
TEST_PATIENT_NAME="Jane Doe"

# SendGrid (Optional - for email tests)
SENDGRID_API_KEY=SG.your_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME="WPL Family Health"
```

2. **Create Test Users** (if needed)

```bash
# Option 1: Through Firebase Console
# - Go to Authentication
# - Create a test user
# - Note the UID

# Option 2: Through your app
# - Sign up with a test account
# - Find the UID in Firestore > users collection
```

3. **Create Test Patient** (if needed)

```bash
# Through your app:
# - Log in with test account
# - Create a patient profile
# - Note the patient ID from URL or Firestore
```

## Example 1: Quick Smoke Test

Test that everything is working:

```bash
# Run the quick test creator interactively
npm run test:notifications:quick
```

When prompted:
```
Select notification type: 1 (medication_added)
Enter user ID: [press Enter to use default]
Enter patient ID: [press Enter to use default]
Send to all family members? n
```

Expected result:
```
✅ Notification created successfully!
Notification ID: notif_1234567890_abc123
```

## Example 2: Test All Notification Types

Run the comprehensive test suite:

```bash
npm run test:notifications
```

This will:
- Create 10 different notification types
- Test email sending (if configured)
- Test family distribution
- Test preferences
- Measure performance
- Clean up automatically

Expected output:
```
╔════════════════════════════════════════════════════════════════════════════╗
║                   NOTIFICATION SYSTEM TEST SUITE                           ║
╚════════════════════════════════════════════════════════════════════════════╝

✓ Notification creation: 10 passed, 0 failed
✓ Email test: 1 passed
✓ Family distribution: 3 recipients, 3 successful
✓ Preferences test: All checks passed
✓ Performance test: Created 10 notifications in 2.5s

✅ All tests passed!
```

## Example 3: Test Email Delivery

Test email functionality with your actual email:

```bash
# Set your email and run tests
TEST_EMAIL=your.real.email@gmail.com npm run test:notifications
```

Check your inbox for:
- Subject: Test notification email
- From: Your configured SendGrid sender
- Content: HTML formatted notification

## Example 4: Test Specific Notification Type

### Medication Alert

```bash
npx tsx scripts/create-test-notification.ts medication_added user_abc123 patient_xyz789
```

Creates:
- Type: medication_added
- Priority: normal
- Metadata: Sample medication (Aspirin 500mg)
- Action: View medications for patient

### Vital Alert (Urgent)

```bash
npx tsx scripts/create-test-notification.ts vital_alert user_abc123 patient_xyz789
```

Creates:
- Type: vital_alert
- Priority: urgent
- Metadata: Abnormal blood pressure (180/110)
- Alert: High blood pressure detected

### Appointment Reminder

```bash
npx tsx scripts/create-test-notification.ts appointment_reminder user_abc123 patient_xyz789
```

Creates:
- Type: appointment_reminder
- Priority: high
- Metadata: Upcoming appointment in 7 days
- Reminder: Dr. Johnson appointment

## Example 5: Test Family Distribution

Test notification delivery to multiple family members:

```bash
# Run comprehensive test (includes family distribution)
npm run test:notifications
```

Or create a single notification with family distribution:

```bash
# Interactive mode
npm run test:notifications:quick

# When prompted:
# "Send to all family members? (y/n):" → type 'y'
```

Expected output:
```
📤 Sending to family members...

✅ Family notification sent!
  Total recipients: 4
  Successful: 4
  Failed: 0

Recipient Details:
  ✓ John Doe (Owner)
  ✓ Mary Smith (Spouse)
  ✓ Bob Johnson (Son)
  ✓ Alice Johnson (Daughter)
```

## Example 6: Test Notification Preferences

Test different preference scenarios:

```bash
# Run full test suite (includes preference tests)
npm run test:notifications
```

The test will:
1. Get default preferences
2. Update preferences (disable some channels)
3. Verify updates
4. Test quiet hours logic

To manually test preferences:

```javascript
// In your app or a separate script
import { updateNotificationPreferences } from '@/lib/notification-service'

// Disable push for meal_logged
await updateNotificationPreferences('user123', {
  meal_logged: { email: false, push: false, inApp: true }
})

// Enable quiet hours
await updateNotificationPreferences('user123', {
  quietHours: {
    enabled: true,
    startHour: 22,  // 10 PM
    endHour: 7      // 7 AM
  }
})
```

## Example 7: Performance Testing

Test system performance with large batches:

```bash
# Test with 100 notifications
BATCH_SIZE=100 npm run test:notifications
```

Expected output:
```
================================================================================
  TEST 6: Performance Testing
================================================================================

ℹ Creating 100 notifications...
✓ Created 100 notifications in 8500ms
  Average: 85.00ms per notification

✓ Retrieved 100 notifications in 150ms
✓ Calculated stats in 50ms
```

## Example 8: Test Without Cleanup

Create test data and keep it for manual inspection:

```bash
# Run tests but skip cleanup
npm run test:notifications:no-cleanup
```

Then inspect in Firebase Console:
```
Firestore Console > notifications collection
- Filter by userId: test_user_001
- View metadata structure
- Check timestamps
```

To manually clean up later:

```javascript
// In a script or console
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore'

const q = query(collection(db, 'notifications'), where('userId', '==', 'test_user_001'))
const snapshot = await getDocs(q)
snapshot.forEach(doc => deleteDoc(doc.ref))
```

## Example 9: Test Multiple Users

Test notifications for different users:

```bash
# User 1
TEST_USER_ID=user_001 TEST_PATIENT_ID=patient_001 \
  npx tsx scripts/create-test-notification.ts medication_added user_001 patient_001

# User 2
TEST_USER_ID=user_002 TEST_PATIENT_ID=patient_002 \
  npx tsx scripts/create-test-notification.ts vital_logged user_002 patient_002

# User 3
TEST_USER_ID=user_003 TEST_PATIENT_ID=patient_003 \
  npx tsx scripts/create-test-notification.ts weight_logged user_003 patient_003
```

## Example 10: Test All Notification Types (One-by-One)

Create test notifications for each type:

```bash
#!/bin/bash
# save as test-all-types.sh

USER="user_abc123"
PATIENT="patient_xyz789"

echo "Testing all notification types..."

# Medication notifications
npx tsx scripts/create-test-notification.ts medication_added $USER $PATIENT
npx tsx scripts/create-test-notification.ts medication_updated $USER $PATIENT
npx tsx scripts/create-test-notification.ts medication_deleted $USER $PATIENT

# Health tracking
npx tsx scripts/create-test-notification.ts vital_logged $USER $PATIENT
npx tsx scripts/create-test-notification.ts meal_logged $USER $PATIENT
npx tsx scripts/create-test-notification.ts weight_logged $USER $PATIENT

# Documents
npx tsx scripts/create-test-notification.ts document_uploaded $USER $PATIENT

# Appointments
npx tsx scripts/create-test-notification.ts appointment_scheduled $USER $PATIENT
npx tsx scripts/create-test-notification.ts appointment_updated $USER $PATIENT
npx tsx scripts/create-test-notification.ts appointment_cancelled $USER $PATIENT

# Reports
npx tsx scripts/create-test-notification.ts health_report_generated $USER $PATIENT

# Family
npx tsx scripts/create-test-notification.ts family_member_invited $USER $PATIENT
npx tsx scripts/create-test-notification.ts family_member_joined $USER $PATIENT

# Alerts
npx tsx scripts/create-test-notification.ts vital_alert $USER $PATIENT
npx tsx scripts/create-test-notification.ts medication_reminder $USER $PATIENT
npx tsx scripts/create-test-notification.ts appointment_reminder $USER $PATIENT

echo "All notification types tested!"
```

Run with:
```bash
chmod +x test-all-types.sh
./test-all-types.sh
```

## Example 11: Test Error Scenarios

### Invalid Notification Type

```bash
npx tsx scripts/create-test-notification.ts invalid_type user123 patient456
```

Expected:
```
❌ Invalid notification type: invalid_type
Valid types: medication_added, vital_logged, ...
```

### Missing User

```bash
TEST_USER_ID=nonexistent_user npm run test:notifications
```

Expected:
```
⚠️  User not found: nonexistent_user
✓ Using default name: Test User
```

### SendGrid Not Configured

```bash
# Remove SendGrid key
SENDGRID_API_KEY="" npm run test:notifications
```

Expected:
```
⚠️  Skipping email tests (SENDGRID_API_KEY not configured)
```

## Example 12: Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Test Notifications

on: [push, pull_request]

jobs:
  test-notifications:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2

      - name: Install dependencies
        run: npm ci

      - name: Test Notifications
        env:
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_ADMIN_PRIVATE_KEY: ${{ secrets.FIREBASE_ADMIN_KEY }}
          SKIP_EMAIL_TESTS: true
          SKIP_PUSH_TESTS: true
        run: npm run test:notifications
```

## Troubleshooting Examples

### Problem: "Firebase initialization failed"

```bash
# Check Firebase config
node -e "console.log(require('dotenv').config({path:'.env.local'}))"
```

### Problem: Email not received

```bash
# Test SendGrid separately
npx tsx scripts/test-sendgrid.ts

# Check SendGrid dashboard
# - Activity feed
# - Email activity
# - Sender authentication
```

### Problem: Slow performance

```bash
# Test with smaller batch
BATCH_SIZE=5 npm run test:notifications

# Check Firebase Console
# - Firestore usage
# - Query performance
```

## Best Practices

### 1. Use Test Environment

```bash
# Use separate Firebase project for testing
NEXT_PUBLIC_FIREBASE_PROJECT_ID=wlpl-test npm run test:notifications
```

### 2. Regular Testing

```bash
# Add to package.json scripts
"test:all": "npm run test && npm run test:notifications && npm run test:e2e"
```

### 3. Monitor Results

```bash
# Pipe output to file for review
npm run test:notifications > test-results.log 2>&1
```

### 4. Clean Up Regularly

```bash
# Run with cleanup enabled (default)
npm run test:notifications

# Or manually clean up
npx tsx scripts/cleanup-test-notifications.ts
```

## Next Steps

After running these examples:

1. ✅ Review test results
2. ✅ Check Firebase Console for created data
3. ✅ Verify email delivery (if configured)
4. ✅ Test in your application UI
5. ✅ Document any issues found
6. ✅ Update environment variables as needed

## Support

For more information:
- Full documentation: `docs/NOTIFICATION_TESTING.md`
- Quick reference: `scripts/README_NOTIFICATION_TESTS.md`
- Usage guide: `docs/NOTIFICATION_SYSTEM_USAGE.md`
