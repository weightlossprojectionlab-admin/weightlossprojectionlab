# Firestore Security Rules for Health Vitals

## ⚠️ HIPAA COMPLIANCE NOTICE

These collections contain **Protected Health Information (PHI)** and must be handled according to HIPAA regulations:
- Blood sugar levels
- Blood pressure readings
- Exercise logs (in medical context)
- Linked to identifiable users

**Before production deployment:**
1. ✅ Ensure Firebase BAA (Business Associate Agreement) is in place
2. ⏳ Implement audit logging for all PHI access
3. ⏳ Get legal review for HIPAA compliance
4. ⏳ Document data retention policies
5. ⏳ Implement user data export/deletion

---

## Firestore Security Rules

Add these rules to your `firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    // Check if user owns the resource
    function belongsToUser(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    // Check if user is admin
    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)/profile).data.isAdmin == true;
    }

    // Validate blood sugar log data
    function validateBloodSugarLog() {
      let data = request.resource.data;
      return data.glucoseLevel is number &&
             data.glucoseLevel > 0 &&
             data.glucoseLevel < 600 && // Physiological limit
             data.measurementType in ['fasting', 'before-meal', 'after-meal', 'bedtime', 'random'] &&
             data.dataSource in ['manual', 'bluetooth-meter'];
    }

    // Validate blood pressure log data
    function validateBloodPressureLog() {
      let data = request.resource.data;
      return data.systolic is number &&
             data.diastolic is number &&
             data.systolic > 0 &&
             data.systolic < 300 && // Physiological limit
             data.diastolic > 0 &&
             data.diastolic < 200 && // Physiological limit
             data.measurementContext in ['morning', 'afternoon', 'evening', 'post-exercise', 'other'] &&
             data.dataSource in ['manual', 'bluetooth-monitor'];
    }

    // Validate exercise log data
    function validateExerciseLog() {
      let data = request.resource.data;
      return data.activityType is string &&
             data.duration is number &&
             data.duration > 0 &&
             data.duration <= 1440 && // Max 24 hours
             data.intensity in ['low', 'moderate', 'high'] &&
             data.dataSource in ['manual', 'bluetooth-tracker'];
    }

    // ========================================================================
    // BLOOD SUGAR LOGS (HIPAA-sensitive)
    // ========================================================================

    match /blood-sugar-logs/{logId} {
      // Users can read their own logs
      allow read: if belongsToUser(resource.data.userId);

      // Users can create logs for themselves with validation
      allow create: if belongsToUser(request.resource.data.userId)
                    && validateBloodSugarLog();

      // Users can update/delete their own logs
      allow update, delete: if belongsToUser(resource.data.userId);

      // Admins can read all logs (for analytics)
      // NOTE: Log all admin access for HIPAA audit trail
      allow read: if isAdmin();
    }

    // ========================================================================
    // BLOOD PRESSURE LOGS (HIPAA-sensitive)
    // ========================================================================

    match /blood-pressure-logs/{logId} {
      // Users can read their own logs
      allow read: if belongsToUser(resource.data.userId);

      // Users can create logs for themselves with validation
      allow create: if belongsToUser(request.resource.data.userId)
                    && validateBloodPressureLog();

      // Users can update/delete their own logs
      allow update, delete: if belongsToUser(resource.data.userId);

      // Admins can read all logs (for analytics)
      // NOTE: Log all admin access for HIPAA audit trail
      allow read: if isAdmin();
    }

    // ========================================================================
    // EXERCISE LOGS (HIPAA-sensitive in medical context)
    // ========================================================================

    match /exercise-logs/{logId} {
      // Users can read their own logs
      allow read: if belongsToUser(resource.data.userId);

      // Users can create logs for themselves with validation
      allow create: if belongsToUser(request.resource.data.userId)
                    && validateExerciseLog();

      // Users can update/delete their own logs
      allow update, delete: if belongsToUser(resource.data.userId);

      // Admins can read all logs (for analytics)
      // NOTE: Log all admin access for HIPAA audit trail
      allow read: if isAdmin();
    }
  }
}
```

---

## Required Firestore Indexes

### Blood Sugar Logs

**Index 1: User's logs ordered by date**
- Collection: `blood-sugar-logs`
- Fields:
  - `userId` (Ascending)
  - `loggedAt` (Descending)

**Index 2: User's logs filtered by date range**
- Collection: `blood-sugar-logs`
- Fields:
  - `userId` (Ascending)
  - `loggedAt` (Ascending)
  - `loggedAt` (Descending)

### Blood Pressure Logs

**Index 1: User's logs ordered by date**
- Collection: `blood-pressure-logs`
- Fields:
  - `userId` (Ascending)
  - `loggedAt` (Descending)

**Index 2: User's logs filtered by date range**
- Collection: `blood-pressure-logs`
- Fields:
  - `userId` (Ascending)
  - `loggedAt` (Ascending)
  - `loggedAt` (Descending)

### Exercise Logs

**Index 1: User's logs ordered by date**
- Collection: `exercise-logs`
- Fields:
  - `userId` (Ascending)
  - `loggedAt` (Descending)

**Index 2: User's logs filtered by date range**
- Collection: `exercise-logs`
- Fields:
  - `userId` (Ascending)
  - `loggedAt` (Ascending)
  - `loggedAt` (Descending)

---

## Data Retention Policy (TODO)

**Recommended retention:**
- Active users: Retain all health vitals indefinitely (for trend analysis)
- Inactive users (>2 years): Anonymize or archive after 7 years (HIPAA minimum)
- Deleted accounts: Purge all PHI within 30 days

**Implementation:**
- Cloud Function to auto-anonymize old data
- User-initiated data export (JSON/CSV)
- User-initiated account deletion (hard delete all PHI)

---

## Audit Logging Requirements (TODO)

**All PHI access MUST be logged with:**
- Who accessed (user UID or admin UID)
- What data (collection + document ID)
- When (timestamp)
- Why (operation type: read/write/delete)
- Result (success/failure)

**Implementation:**
```typescript
// Example audit log entry
{
  adminId: 'abc123',
  operation: 'READ',
  collection: 'blood-sugar-logs',
  documentId: 'log-xyz',
  userId: 'user-789', // The patient whose data was accessed
  timestamp: Timestamp.now(),
  success: true
}
```

Store audit logs in separate collection: `phi-access-logs/{logId}`
- Retention: 7 years minimum (HIPAA requirement)
- Read-only (never delete)
- Admin-only access

---

## Testing Checklist

### Security Rules

- [ ] User can create their own blood sugar log
- [ ] User can read their own blood sugar logs
- [ ] User CANNOT read another user's blood sugar logs
- [ ] User CANNOT create log with invalid glucose level (e.g., -50 or 1000)
- [ ] User CANNOT create log with invalid measurement type
- [ ] Admin can read any user's logs (for analytics)
- [ ] Same tests for blood pressure logs
- [ ] Same tests for exercise logs

### Data Validation

- [ ] Blood sugar: Rejects glucoseLevel < 0
- [ ] Blood sugar: Rejects glucoseLevel > 600
- [ ] Blood pressure: Rejects systolic < 0 or > 300
- [ ] Blood pressure: Rejects diastolic < 0 or > 200
- [ ] Exercise: Rejects duration < 0 or > 1440 minutes

### Admin Access

- [ ] Admin can view user's health vitals in analytics
- [ ] Non-admin cannot access other users' vitals
- [ ] Admin access is logged (TODO: implement audit logging)

---

## Deployment Instructions

1. **Update `firestore.rules`:**
   - Copy rules from above into your rules file
   - Test rules in Firebase Console Rules Playground
   - Deploy: `firebase deploy --only firestore:rules`

2. **Create indexes:**
   - Firebase will prompt you to create indexes on first query
   - OR manually create in Firebase Console > Firestore > Indexes
   - OR add to `firestore.indexes.json` and deploy

3. **Verify deployment:**
   - Test user can log blood sugar
   - Test user cannot access other user's data
   - Test admin can view all user data
   - Check Firebase Console for any rule errors

---

## HIPAA Compliance Checklist (Before Production)

- [ ] Firebase BAA signed and in place
- [ ] Encryption at rest enabled (Firebase default ✓)
- [ ] Encryption in transit (HTTPS enforced ✓)
- [ ] Firestore rules deployed and tested
- [ ] Audit logging implemented
- [ ] User data export functionality
- [ ] User data deletion functionality
- [ ] Privacy Policy updated (mention PHI handling)
- [ ] Terms of Service updated ("not medical advice" disclaimer)
- [ ] Legal review completed
- [ ] Staff HIPAA training completed
- [ ] Breach notification procedures documented
- [ ] Data retention policy documented
- [ ] Minimum necessary access principle enforced

---

## Additional Security Measures

### 1. Admin Role Segregation
Not all admins need access to PHI. Consider:
- **Analytics Admin**: Can view de-identified aggregates only
- **Support Admin**: Can view user profiles but not health vitals
- **Health Admin**: Full access to PHI (minimal staff)

### 2. Session Timeout
- Force re-authentication after 15 minutes of inactivity
- Require MFA for admin accounts accessing PHI

### 3. IP Whitelisting
- Restrict admin panel access to office IP addresses
- Log all access attempts from unknown IPs

### 4. Data Minimization
- Only collect PHI that is absolutely necessary
- De-identify data for AI analysis when possible
- Avoid storing identifiable photos with health data

---

## Emergency Procedures

### Data Breach Response
1. Identify scope of breach (which users, what data)
2. Notify affected users within 60 days (HIPAA requirement)
3. Notify HHS if >500 users affected
4. Document breach in incident log
5. Implement remediation measures

### User Data Export Request
1. Verify user identity (MFA required)
2. Export all user data (JSON/CSV)
3. Encrypt export file (password-protected)
4. Deliver via secure channel
5. Log export in audit trail

### User Account Deletion
1. Verify user identity (MFA required)
2. Confirm deletion request
3. Hard delete all PHI within 30 days
4. Anonymize historical analytics data
5. Log deletion in audit trail
6. Confirm deletion to user

---

## Resources

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [Firebase HIPAA Compliance](https://cloud.google.com/security/compliance/hipaa)
- [HIPAA Breach Notification Rule](https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html)
