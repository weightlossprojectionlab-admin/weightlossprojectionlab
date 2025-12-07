# Notification Test Scripts - Quick Reference

## Available Scripts

### 1. Comprehensive Test Suite

```bash
npx tsx scripts/test-notifications.ts
```

**What it does:**
- Tests all 17 notification types
- Validates email sending (if configured)
- Tests family member distribution
- Verifies notification preferences
- Runs performance benchmarks
- Automatically cleans up test data

**Options:**
```bash
# Skip email tests
SKIP_EMAIL_TESTS=true npx tsx scripts/test-notifications.ts

# Skip cleanup (keep test data for inspection)
SKIP_CLEANUP=true npx tsx scripts/test-notifications.ts

# Custom batch size for performance tests
BATCH_SIZE=50 npx tsx scripts/test-notifications.ts

# Use specific test user/patient
TEST_USER_ID=user123 TEST_PATIENT_ID=patient456 npx tsx scripts/test-notifications.ts
```

### 2. Quick Test Notification Creator

```bash
npx tsx scripts/create-test-notification.ts
```

**What it does:**
- Creates a single test notification
- Interactive mode with prompts
- Optional family distribution
- Real-time feedback

**Usage:**

Interactive mode:
```bash
npx tsx scripts/create-test-notification.ts
```

Command-line mode:
```bash
npx tsx scripts/create-test-notification.ts [type] [userId] [patientId]
```

**Examples:**
```bash
# Medication notification
npx tsx scripts/create-test-notification.ts medication_added user123 patient456

# Vital alert
npx tsx scripts/create-test-notification.ts vital_alert user123 patient456

# Weight logged
npx tsx scripts/create-test-notification.ts weight_logged user123 patient456

# Appointment reminder
npx tsx scripts/create-test-notification.ts appointment_reminder user123 patient456
```

## Notification Types

All 17 supported types:

| Type | Priority | Description |
|------|----------|-------------|
| `medication_added` | normal | New medication added |
| `medication_updated` | normal | Medication information updated |
| `medication_deleted` | normal | Medication removed |
| `vital_logged` | normal | Vital sign recorded |
| `meal_logged` | normal | Meal tracked |
| `weight_logged` | normal | Weight updated |
| `document_uploaded` | normal | New document uploaded |
| `appointment_scheduled` | normal | Appointment scheduled |
| `appointment_updated` | high | Appointment modified |
| `appointment_cancelled` | high | Appointment cancelled |
| `health_report_generated` | normal | Health report ready |
| `family_member_invited` | normal | Family invitation sent |
| `family_member_joined` | normal | Family member accepted |
| `patient_added` | normal | New patient added |
| `vital_alert` | urgent | Abnormal vital detected |
| `medication_reminder` | high | Medication reminder |
| `appointment_reminder` | high | Appointment reminder |

## Quick Setup

### 1. Environment Variables

Add to `.env.local`:

```bash
# Required: Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY="your_private_key"

# Optional: Test Configuration
TEST_USER_ID=your_test_user_id
TEST_PATIENT_ID=your_test_patient_id
TEST_EMAIL=your_test_email@example.com

# Optional: SendGrid (for email tests)
SENDGRID_API_KEY=SG.your_key
SENDGRID_FROM_EMAIL=verified@yourdomain.com
```

### 2. Test Data Preparation

Ensure you have:
- ✅ At least one test user in Firebase Authentication
- ✅ At least one test patient profile in Firestore
- ✅ User and patient IDs noted

### 3. Run Tests

```bash
# Full test suite
npx tsx scripts/test-notifications.ts

# Quick single notification
npx tsx scripts/create-test-notification.ts
```

## Common Use Cases

### Test New Notification Type

```bash
# Create a test notification of specific type
npx tsx scripts/create-test-notification.ts medication_added myuser mypatient
```

### Test Email Delivery

```bash
# Ensure SendGrid is configured, then run
TEST_EMAIL=your@email.com npx tsx scripts/test-notifications.ts
```

### Test Family Distribution

```bash
# The comprehensive test automatically tests family distribution
npx tsx scripts/test-notifications.ts
```

### Performance Testing

```bash
# Test with larger batch
BATCH_SIZE=100 npx tsx scripts/test-notifications.ts
```

### Manual Testing (Keep Data)

```bash
# Skip cleanup to inspect data in Firebase Console
SKIP_CLEANUP=true npx tsx scripts/test-notifications.ts
```

## Test Output

### Comprehensive Test Suite Output:

```
╔════════════════════════════════════════════════════════════════════════════╗
║                   NOTIFICATION SYSTEM TEST SUITE                           ║
╚════════════════════════════════════════════════════════════════════════════╝

================================================================================
  TEST 1: Notification Creation
================================================================================

ℹ Testing: Medication Added...
✓   ✓ Created notification ID: notif_1234567890_abc123
✓   ✓ Type: medication_added, Priority: normal
...

================================================================================
  TEST SUMMARY
================================================================================

✓ All tests completed in 12.45s
✓ Test Coverage:
✓   ✓ Notification creation for all types
✓   ✓ Email notification sending
✓   ✓ Push notification framework
✓   ✓ Family member distribution
✓   ✓ Notification preferences
✓   ✓ Performance and batch operations
✓   ✓ Cleanup operations

✅ All tests passed!
```

### Quick Test Creator Output:

```
╔═══════════════════════════════════════════════════════════════════════╗
║          Quick Test Notification Creator                             ║
╚═══════════════════════════════════════════════════════════════════════╝

Configuration:
  Type: medication_added
  User ID: user123
  Patient ID: patient456
  User Name: John Doe
  Patient Name: Jane Doe

📝 Creating notification...

✅ Notification created successfully!

Notification ID: notif_1234567890_xyz789
Priority: normal
Status: pending
Title: Medication Added for Jane Doe
Message: A new medication has been added to Jane Doe's profile.

Send to all family members? (y/n): y

📤 Sending to family members...

✅ Family notification sent!
  Total recipients: 3
  Successful: 3
  Failed: 0

Recipient Details:
  ✓ John Doe
  ✓ Mary Smith
  ✓ Bob Johnson

✨ Done!
```

## Troubleshooting

### Firebase Errors

```bash
# Check Firebase connection
npx tsx scripts/debug-patient.ts
```

### SendGrid Errors

```bash
# Test SendGrid separately
npx tsx scripts/test-sendgrid.ts

# Or skip email tests
SKIP_EMAIL_TESTS=true npx tsx scripts/test-notifications.ts
```

### Missing Test Users

```bash
# Use existing user/patient IDs
TEST_USER_ID=real_user_id TEST_PATIENT_ID=real_patient_id \
  npx tsx scripts/test-notifications.ts
```

## Next Steps

After successful testing:

1. ✅ Review test output for any warnings
2. ✅ Check Firebase Console for created data
3. ✅ Verify email delivery (if tested)
4. ✅ Review notification preferences behavior
5. ✅ Check performance metrics

For detailed documentation, see: `docs/NOTIFICATION_TESTING.md`

## Support

- 📚 Full Documentation: `docs/NOTIFICATION_TESTING.md`
- 📖 Usage Guide: `docs/NOTIFICATION_SYSTEM_USAGE.md`
- 🔧 SendGrid Setup: `docs/SENDGRID_SETUP.md`
