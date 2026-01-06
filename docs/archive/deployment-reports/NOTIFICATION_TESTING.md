# Notification System Testing Guide

This guide provides comprehensive instructions for testing the notification system using the provided test scripts.

## Table of Contents

- [Overview](#overview)
- [Test Scripts](#test-scripts)
- [Setup](#setup)
- [Usage Examples](#usage-examples)
- [Test Coverage](#test-coverage)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Overview

The notification system test suite provides comprehensive testing capabilities for:

- **Notification Creation**: Test all 17 notification types
- **Email Delivery**: Verify SendGrid integration
- **Push Notifications**: Test FCM integration
- **Family Distribution**: Verify multi-recipient delivery
- **Preferences**: Test user preference settings and quiet hours
- **Performance**: Measure batch operation performance
- **Cleanup**: Automated test data cleanup

## Test Scripts

### 1. Comprehensive Test Suite

**File**: `scripts/test-notifications.ts`

**Purpose**: Runs a complete test suite covering all notification system features.

**Usage**:
```bash
npx tsx scripts/test-notifications.ts
```

**Features**:
- Tests all 17 notification types
- Validates email sending
- Tests family member distribution
- Verifies preference handling
- Performance benchmarking
- Automated cleanup

### 2. Quick Test Creator

**File**: `scripts/create-test-notification.ts`

**Purpose**: Quickly create a single test notification for manual testing.

**Usage**:

Interactive mode (with prompts):
```bash
npx tsx scripts/create-test-notification.ts
```

Command-line mode:
```bash
npx tsx scripts/create-test-notification.ts [type] [userId] [patientId]
```

**Examples**:
```bash
# Interactive mode
npx tsx scripts/create-test-notification.ts

# Create medication notification
npx tsx scripts/create-test-notification.ts medication_added user123 patient456

# Create vital alert
npx tsx scripts/create-test-notification.ts vital_alert user123 patient456

# Create appointment reminder
npx tsx scripts/create-test-notification.ts appointment_reminder user123 patient456
```

## Setup

### Prerequisites

1. **Firebase Configuration**
   - Ensure `.env.local` has all Firebase credentials
   - Both client and admin SDK must be configured

2. **SendGrid Configuration** (for email tests)
   - Set `SENDGRID_API_KEY` in `.env.local`
   - Set `SENDGRID_FROM_EMAIL` (verified sender)
   - Set `SENDGRID_FROM_NAME` (optional)

3. **Test User Data**
   - Have at least one test user account
   - Have at least one test patient profile
   - Know the user and patient IDs

### Environment Variables

Create or update `.env.local` with test configuration:

```bash
# Firebase Configuration (required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (required)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY="your_private_key"

# SendGrid Configuration (optional, for email tests)
SENDGRID_API_KEY=SG.your_sendgrid_key
SENDGRID_FROM_EMAIL=verified@yourdomain.com
SENDGRID_FROM_NAME="WPL Family Health"

# Test Configuration (optional)
TEST_USER_ID=your_test_user_id
TEST_PATIENT_ID=your_test_patient_id
TEST_EMAIL=your_test_email@example.com
TEST_USER_NAME="Test User"
TEST_PATIENT_NAME="Test Patient"

# Test Flags (optional)
SKIP_EMAIL_TESTS=false
SKIP_PUSH_TESTS=true
SKIP_CLEANUP=false
BATCH_SIZE=10
```

## Usage Examples

### Running the Comprehensive Test Suite

```bash
# Run all tests with default configuration
npx tsx scripts/test-notifications.ts

# Skip email tests
SKIP_EMAIL_TESTS=true npx tsx scripts/test-notifications.ts

# Skip cleanup (keep test data)
SKIP_CLEANUP=true npx tsx scripts/test-notifications.ts

# Custom batch size for performance tests
BATCH_SIZE=50 npx tsx scripts/test-notifications.ts

# Run with custom test user
TEST_USER_ID=user123 TEST_PATIENT_ID=patient456 npx tsx scripts/test-notifications.ts
```

### Creating Quick Test Notifications

```bash
# Interactive mode with prompts
npx tsx scripts/create-test-notification.ts

# Create specific notification types
npx tsx scripts/create-test-notification.ts medication_added myuser123 mypatient456
npx tsx scripts/create-test-notification.ts vital_alert myuser123 mypatient456
npx tsx scripts/create-test-notification.ts weight_logged myuser123 mypatient456
npx tsx scripts/create-test-notification.ts appointment_scheduled myuser123 mypatient456
npx tsx scripts/create-test-notification.ts health_report_generated myuser123 mypatient456
```

### Testing Specific Features

#### Test Email Delivery

```bash
# Ensure SendGrid is configured
# Set your test email
TEST_EMAIL=yourname@example.com npx tsx scripts/test-notifications.ts
```

#### Test Family Distribution

```bash
# The comprehensive test creates temporary family members
# and tests distribution to all members
npx tsx scripts/test-notifications.ts
```

#### Test Performance

```bash
# Test with larger batch size
BATCH_SIZE=100 npx tsx scripts/test-notifications.ts
```

#### Test Without Cleanup

```bash
# Keep test data for manual inspection
SKIP_CLEANUP=true npx tsx scripts/test-notifications.ts

# Then manually inspect in Firebase Console
# Collections: notifications, notification_preferences, family_members
```

## Test Coverage

### 1. Notification Creation Tests

Tests creation of all notification types:

- ✅ `medication_added` - New medication added
- ✅ `medication_updated` - Medication information updated
- ✅ `medication_deleted` - Medication removed
- ✅ `vital_logged` - Vital sign recorded
- ✅ `meal_logged` - Meal tracked
- ✅ `weight_logged` - Weight updated
- ✅ `document_uploaded` - New document added
- ✅ `appointment_scheduled` - New appointment
- ✅ `appointment_updated` - Appointment modified
- ✅ `appointment_cancelled` - Appointment cancelled
- ✅ `health_report_generated` - Report created
- ✅ `family_member_invited` - Family invitation sent
- ✅ `family_member_joined` - Family member accepted
- ✅ `patient_added` - New patient added
- ✅ `vital_alert` - Abnormal vital detected
- ✅ `medication_reminder` - Medication reminder
- ✅ `appointment_reminder` - Appointment reminder

### 2. Email Notification Tests

- ✅ SendGrid integration
- ✅ Email template rendering
- ✅ HTML and text versions
- ✅ Delivery tracking
- ✅ Error handling

### 3. Push Notification Tests

- ✅ FCM integration framework
- ⚠️ Requires device tokens (manual setup)

### 4. Family Distribution Tests

- ✅ Create test family members
- ✅ Distribute to all family members
- ✅ Exclude sender logic
- ✅ Batch delivery results
- ✅ Success/failure tracking

### 5. Preference Tests

- ✅ Default preferences retrieval
- ✅ Preference updates
- ✅ Channel-specific settings
- ✅ Quiet hours configuration
- ✅ Preference validation

### 6. Performance Tests

- ✅ Batch notification creation
- ✅ Query performance measurement
- ✅ Stats calculation performance
- ✅ Average operation time tracking

### 7. Cleanup Tests

- ✅ Batch deletion
- ✅ Test data removal
- ✅ Cleanup verification

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `myapp-12345` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | `AIza...` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account email | `firebase-adminsdk@myapp.iam...` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service account private key | `"-----BEGIN PRIVATE KEY-----\n..."` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_USER_ID` | Test user ID | `test_user_001` |
| `TEST_PATIENT_ID` | Test patient ID | `test_patient_001` |
| `TEST_EMAIL` | Test email address | `test@example.com` |
| `TEST_USER_NAME` | Test user name | `Test User` |
| `TEST_PATIENT_NAME` | Test patient name | `Test Patient` |
| `SKIP_EMAIL_TESTS` | Skip email tests | `false` |
| `SKIP_PUSH_TESTS` | Skip push tests | `false` |
| `SKIP_CLEANUP` | Skip cleanup | `false` |
| `BATCH_SIZE` | Performance test batch size | `10` |

### SendGrid Variables (Optional)

| Variable | Description | Required For |
|----------|-------------|--------------|
| `SENDGRID_API_KEY` | SendGrid API key | Email tests |
| `SENDGRID_FROM_EMAIL` | Verified sender email | Email tests |
| `SENDGRID_FROM_NAME` | Sender name | Email tests |

## Troubleshooting

### Common Issues

#### Firebase Connection Errors

**Problem**: `Firebase initialization failed`

**Solution**:
1. Verify Firebase credentials in `.env.local`
2. Check Firebase console for project status
3. Ensure service account has necessary permissions

```bash
# Test Firebase connection separately
npx tsx scripts/debug-patient.ts
```

#### SendGrid Errors

**Problem**: Email tests failing with SendGrid errors

**Solutions**:
1. Verify SendGrid API key is valid
2. Check sender email is verified in SendGrid
3. Review SendGrid dashboard for quota/delivery issues
4. Skip email tests if not configured:

```bash
SKIP_EMAIL_TESTS=true npx tsx scripts/test-notifications.ts
```

#### Permission Errors

**Problem**: `Permission denied` errors when creating notifications

**Solution**:
1. Check Firestore security rules
2. Verify service account has `editor` or `owner` role
3. Ensure test user IDs exist in database

#### Test User Not Found

**Problem**: Test notifications fail because user/patient not found

**Solution**:
1. Create test users in Firebase Authentication
2. Create test patient profiles in Firestore
3. Update `.env.local` with correct IDs:

```bash
# Get real user/patient IDs from your database
TEST_USER_ID=actual_user_id TEST_PATIENT_ID=actual_patient_id npx tsx scripts/test-notifications.ts
```

#### Cleanup Failures

**Problem**: Cleanup leaving test data behind

**Solution**:
1. Check Firestore permissions
2. Manually delete from Firebase Console:
   - Collection: `notifications`
   - Collection: `notification_preferences`
   - Collection: `family_members`
3. Filter by test IDs or timestamps

### Debug Mode

For additional debugging information:

```bash
# Set Node debug level
NODE_DEBUG=* npx tsx scripts/test-notifications.ts

# Or check Firebase logs
# Visit Firebase Console > Firestore > Usage tab
```

### Manual Verification

After running tests, verify in Firebase Console:

1. **Notifications Collection**
   - Check document structure
   - Verify metadata is correct
   - Check timestamps

2. **Notification Preferences Collection**
   - Verify preference updates
   - Check quiet hours settings

3. **Email Inbox**
   - Check test email delivery
   - Verify email formatting
   - Check links work correctly

## Best Practices

### Before Running Tests

1. ✅ Backup production data (if testing in production)
2. ✅ Use test/staging environment when possible
3. ✅ Verify all environment variables are set
4. ✅ Check SendGrid quota (email tests)
5. ✅ Create test users with known IDs

### During Tests

1. 📊 Monitor Firebase Console for real-time updates
2. 📧 Check email inbox for delivery
3. 🔍 Review test output for errors
4. ⏱️ Note performance metrics

### After Tests

1. 🧹 Run cleanup (default behavior)
2. ✅ Verify test data removed
3. 📝 Document any issues found
4. 🔄 Update test configuration if needed

## Support

For issues or questions:

1. Check this documentation
2. Review notification system documentation: `docs/NOTIFICATION_SYSTEM_USAGE.md`
3. Check Firebase Console logs
4. Review SendGrid dashboard
5. Contact development team

## Related Documentation

- [Notification System Usage Guide](./NOTIFICATION_SYSTEM_USAGE.md)
- [SendGrid Setup Guide](./SENDGRID_SETUP.md)
- [Firebase Configuration](../README.md#firebase-setup)
- [API Documentation](../API.md#notifications)
