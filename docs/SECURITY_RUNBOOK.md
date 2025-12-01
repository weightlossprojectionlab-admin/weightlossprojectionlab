# Security Incident Response Runbook

**Version**: 1.0
**Last Updated**: 2025-12-01
**Scope**: Weight Loss Projection Lab (WLPL) Platform
**Severity Levels**: CRITICAL, HIGH, MEDIUM, LOW

---

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [Incident Detection](#incident-detection)
3. [Response Procedures](#response-procedures)
4. [Security Monitoring](#security-monitoring)
5. [Emergency Procedures](#emergency-procedures)
6. [Post-Incident Review](#post-incident-review)

---

## Emergency Contacts

**Security Team**:
- Super Admins: Check `SUPER_ADMIN_EMAILS` environment variable
- Primary Contact: perriceconsulting@gmail.com
- Platform Contact: weightlossprojectionlab@gmail.com

**External Services**:
- Firebase Support: https://firebase.google.com/support
- Upstash Redis: https://upstash.com/
- Netlify/Hosting: Check deployment platform dashboard

---

## Incident Detection

### Log Patterns to Watch For

#### 1. SSRF Attack Attempts
**Location**: Server logs, `/api/fetch-url` endpoint

**Indicators**:
```log
[WARN] URL validation failed - blocked domain
[WARN] Private IP address detected: 127.0.0.1
[WARN] Cloud metadata endpoint access attempt: 169.254.169.254
[ERROR] DNS resolution blocked private IP
```

**Detection Query** (if using log aggregation):
```
source:/api/fetch-url AND (status:403 OR message:"blocked domain" OR message:"private IP")
```

#### 2. Rate Limit Abuse
**Location**: `lib/rate-limit.ts` logs

**Indicators**:
```log
[WARN] Rate limit exceeded - limiterType: fetch-url, identifier: 192.168.1.100
[WARN] Rate limit exceeded - limiterType: ai:gemini, retryAfter: 600
```

**Detection Query**:
```
message:"Rate limit exceeded" AND count > 10 in 5m
```

#### 3. Authentication Failures
**Location**: Firebase Auth logs, API route logs

**Indicators**:
```log
[ERROR] Unauthorized access attempt - missing Firebase token
[WARN] Super admin check failed
[ERROR] Invalid custom claims
```

**Detection Query**:
```
status:401 OR status:403 AND count > 20 in 5m from same IP
```

#### 4. Cross-User Data Access Attempts
**Location**: Firestore security rules logs, API logs

**Indicators**:
```log
[ERROR] Firestore permission denied: users/{userId}/patients/{patientId}
[ERROR] Storage access denied: documents/{userId}/{patientId}/{docId}
[WARN] User attempting to access patient data not owned by them
```

**Detection Query**:
```
(message:"permission denied" OR status:403) AND path contains "patients" OR "documents"
```

#### 5. Debug Endpoint Access in Production
**Location**: Debug endpoint logs

**Indicators**:
```log
[WARN] Debug endpoint access blocked in production: /api/debug-profile
[WARN] Debug endpoint access blocked in production: /api/fix-onboarding
```

**Detection Query**:
```
path:/api/debug-* OR path:/api/fix-* AND NODE_ENV:production AND status:403
```

---

## Response Procedures

### SSRF Attack Response

**Severity**: CRITICAL
**Response Time**: < 15 minutes

#### Incident Response Checklist

- [ ] **Step 1: Identify Attack Pattern** (2 min)
  - Check `/api/fetch-url` logs for suspicious URLs
  - Look for metadata endpoint access attempts (169.254.169.254)
  - Identify attacker IP addresses

- [ ] **Step 2: Verify Domain Whitelist** (2 min)
  - Confirm `lib/url-validation.ts` whitelist is active
  - Check if any unexpected domains are allowed
  - Review recent code changes to URL validation

- [ ] **Step 3: Block Attacker IPs** (5 min)
  - Add IPs to rate limiter block list (see [IP Blocking](#ip-blocking))
  - Update CORS allowed origins if needed
  - Consider firewall rules at hosting level (Netlify/Vercel)

- [ ] **Step 4: Review All External Integrations** (5 min)
  - Check for unauthorized API calls
  - Verify no internal services were accessed
  - Review cloud provider audit logs for metadata access

- [ ] **Step 5: Document Incident** (ongoing)
  - Record attack patterns, IPs, timestamps
  - Save log samples for analysis
  - Update [Post-Incident Review](#post-incident-review)

**Escalation**: If internal services were accessed, escalate to CRITICAL data breach protocol

---

### Rate Limit Abuse Response

**Severity**: HIGH
**Response Time**: < 30 minutes

#### Incident Response Checklist

- [ ] **Step 1: Identify Abuse Pattern** (5 min)
  - Check which endpoint is being abused (fetch-url, ai:gemini, email, admin)
  - Identify user/IP performing abuse
  - Determine if it's a bot or legitimate user

- [ ] **Step 2: Review Current Limits** (2 min)
  - Check `lib/rate-limit.ts` for current limits
  - Verify Upstash Redis is functioning (not degraded to in-memory)
  - Confirm rate limit headers are being sent

- [ ] **Step 3: Tighten Rate Limits** (10 min)
  - Temporarily reduce limits for affected endpoint
  - Example: Reduce `geminiLimiter` from 20/min to 10/min
  ```typescript
  // In lib/rate-limit.ts
  export const geminiLimiter = createRateLimiter(10, 1, 'm', 'ai:gemini')
  ```
  - Redeploy immediately

- [ ] **Step 4: Block Abusive Identifiers** (5 min)
  - Add user ID or IP to block list
  - Consider temporary ban for repeat offenders

- [ ] **Step 5: Monitor Recovery** (ongoing)
  - Watch Upstash Redis dashboard for request patterns
  - Monitor Gemini API usage (stay under 500 req/day free tier)
  - Verify legitimate users are not affected

**Prevention**: Consider implementing Firebase App Check for client attestation

---

### CSRF Attack Response

**Severity**: CRITICAL
**Response Time**: < 15 minutes

#### Indicators of CSRF Attack

```log
[WARN] CSRF token missing on POST request
[WARN] CSRF token mismatch: cookie vs header
[ERROR] State-changing request without CSRF protection
```

#### Incident Response Checklist

- [ ] **Step 1: Identify Affected Endpoints** (5 min)
  - Check which endpoints received requests without CSRF tokens
  - Review logs for suspicious referer headers
  - Identify user accounts affected

- [ ] **Step 2: Verify CSRF Implementation** (5 min)
  - Confirm `lib/csrf.ts` is being used on client-side
  - Check if server-side middleware is validating tokens (pending)
  - Review `X-CSRF-Token` headers in recent requests

- [ ] **Step 3: Revoke Compromised Sessions** (3 min)
  - Force logout of affected users via Firebase Auth
  - Rotate CSRF tokens for all active sessions
  - Clear suspicious cookies

- [ ] **Step 4: Review Recent State Changes** (ongoing)
  - Check Firestore audit logs for unauthorized writes
  - Verify no data was modified maliciously
  - Rollback unauthorized changes if needed

**Immediate Action**: Deploy server-side CSRF middleware (currently pending - see SEC-004/005)

---

### Unauthorized Access Attempts

**Severity**: HIGH
**Response Time**: < 30 minutes

#### Super Admin Unauthorized Access

- [ ] **Step 1: Review Super Admin Custom Claims** (5 min)
  - Check Firebase Auth console for users with `superAdmin` claim
  - Verify against `SUPER_ADMIN_EMAILS` environment variable
  - Look for unauthorized claim additions

- [ ] **Step 2: Revoke Compromised Access** (5 min)
  ```bash
  # Use Firebase Admin SDK to revoke custom claims
  npx tsx scripts/revoke-super-admin.ts <user-email>
  ```

- [ ] **Step 3: Audit Recent Admin Actions** (10 min)
  - Check `admin_audit_logs` Firestore collection
  - Review recent role grants via `/api/admin/grant-role`
  - Verify no unauthorized users were granted privileges

- [ ] **Step 4: Rotate Environment Variables** (10 min)
  - Update `SUPER_ADMIN_EMAILS` if compromised
  - Redeploy to production
  - Verify only authorized admins remain

#### Cross-User Data Access

- [ ] **Step 1: Identify Affected Users** (5 min)
  - Check Firestore security rules logs
  - Identify which patient data was accessed
  - Determine if breach occurred

- [ ] **Step 2: Verify Security Rules** (5 min)
  - Confirm `firestore.rules` enforces `isOwner(userId)`
  - Check `storage.rules` for user-scoped paths
  - Test rules in Firebase emulator

- [ ] **Step 3: Notify Affected Users** (if breach confirmed)
  - Send security notification email
  - Recommend password change
  - Document in security audit log

---

### Data Breach Protocol

**Severity**: CRITICAL
**Response Time**: IMMEDIATE

#### Data Breach Response

- [ ] **Step 1: Contain Breach** (IMMEDIATE)
  - Identify compromised data scope (PII, PHI, credentials)
  - Disable affected API endpoints if needed
  - Block attacker access (IP, account)

- [ ] **Step 2: Preserve Evidence** (5 min)
  - Export all relevant logs
  - Take database snapshots
  - Document attack timeline

- [ ] **Step 3: Assess Impact** (15 min)
  - Identify affected users and data types
  - Determine if PHI (medical records) was accessed
  - Evaluate compliance implications (HIPAA if applicable)

- [ ] **Step 4: Notification** (24-48 hours)
  - Notify affected users via email
  - Provide incident details and remediation steps
  - Offer credit monitoring if PII compromised

- [ ] **Step 5: Regulatory Reporting** (if required)
  - File breach report if PHI involved (HIPAA)
  - Contact legal counsel
  - Coordinate with compliance team

**Critical Contacts**:
- Legal: [TBD]
- Compliance: [TBD]
- PR/Communications: [TBD]

---

## Security Monitoring

### Firebase Audit Log Review

**Frequency**: Daily (automated), Weekly (manual review)

#### Firestore Audit

**Check These Collections**:
1. `admin_audit_logs` - All admin actions
2. `analytics_events` - User behavior patterns
3. `dispute_cases` - Trust & safety issues

**Key Queries**:
```javascript
// Check for suspicious admin actions
db.collection('admin_audit_logs')
  .where('action', '==', 'grant_role')
  .where('timestamp', '>', lastWeek)
  .get()

// Check for unusual data access patterns
db.collection('analytics_events')
  .where('event_type', '==', 'data_access_denied')
  .where('count', '>', 10)
  .get()
```

#### Storage Audit

**Check These Paths**:
1. `documents/{userId}/{patientId}/` - Medical documents
2. `users/{userId}/meals/` - Meal images
3. `medications/{userId}/` - Medication images

**Manual Review**:
- Check for unexpected file uploads (size, type, frequency)
- Verify storage rules are enforcing user ownership
- Review access logs for 403 errors (blocked access)

---

### Rate Limit Metrics Monitoring

**Upstash Redis Dashboard**: https://console.upstash.com/

**Key Metrics**:
- Request count per endpoint (fetch-url, ai:gemini, email, admin)
- Blocked request count (429 responses)
- Request patterns (time of day, user distribution)

**Alerts to Configure**:
1. **High 429 Rate**: > 100 rate limit blocks in 5 minutes
2. **Redis Downtime**: In-memory fallback activated
3. **Gemini API Limit**: > 450 requests in 24 hours (90% of free tier)

**Query Examples** (Upstash CLI):
```bash
# Check rate limit for specific user
redis-cli GET ratelimit:fetch-url:user_abc123

# Check blocked requests count
redis-cli GET ratelimit:blocks:count
```

---

### Error Rate Spike Detection

**Normal Error Rate**: < 1% of requests
**Alert Threshold**: > 5% errors in 5 minutes

#### Potential Attack Indicators

**Pattern 1: Sudden 500 Errors**
- Possible DDoS or resource exhaustion
- Check server logs for error details
- Verify third-party API availability (Firebase, Gemini)

**Pattern 2: Sudden 403 Errors**
- Possible brute force or unauthorized access attempts
- Check authentication logs
- Verify CORS/CSRF protection is active

**Pattern 3: Sudden 429 Errors**
- Possible rate limit abuse
- Follow [Rate Limit Abuse Response](#rate-limit-abuse-response)

**Monitoring Query** (example for log aggregation):
```
status:500 OR status:403 OR status:429
| timechart span=5m count by status
| where count > threshold
```

---

## Emergency Procedures

### Kill Switch Activation (Debug Endpoints)

**Already Active**: Production guards are deployed (SEC-000/010)

**Affected Endpoints**:
- `/api/debug-profile`
- `/api/fix-start-weight`
- `/api/fix-onboarding`

**Current Implementation**:
```typescript
// In each debug endpoint route.ts
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
}
```

**Emergency Disable** (if needed):
1. Set environment variable: `DISABLE_DEBUG_ENDPOINTS=true`
2. Redeploy immediately
3. Monitor for continued access attempts

---

### Rate Limit Emergency Tightening

**When to Use**: During active abuse or attack

**Procedure**:

1. **Identify Target Endpoint** (1 min)
   ```typescript
   // In lib/rate-limit.ts
   // Current limits:
   export const fetchUrlLimiter = createRateLimiter(10, 1, 'm', 'fetch-url')
   export const geminiLimiter = createRateLimiter(20, 1, 'm', 'ai:gemini')
   export const adminGrantRoleLimiter = createRateLimiter(5, 1, 'h', 'admin:grant-role')
   export const emailLimiter = createRateLimiter(10, 1, 'h', 'email')
   ```

2. **Tighten Limits** (2 min)
   ```typescript
   // Emergency: Reduce to minimum viable limits
   export const fetchUrlLimiter = createRateLimiter(5, 1, 'm', 'fetch-url') // 10 → 5
   export const geminiLimiter = createRateLimiter(10, 1, 'm', 'ai:gemini')   // 20 → 10
   ```

3. **Deploy** (5 min)
   ```bash
   git add lib/rate-limit.ts
   git commit -m "EMERGENCY: Tighten rate limits during attack"
   git push
   ```

4. **Monitor** (ongoing)
   - Watch Upstash dashboard for request patterns
   - Verify legitimate users are not significantly impacted
   - Prepare to revert once attack subsides

---

### IP Blocking (CORS/Rate Limiter)

**Method 1: Rate Limiter Block List** (Preferred)

Currently not implemented - requires enhancement to `lib/rate-limit.ts`:
```typescript
// Add to lib/rate-limit.ts
const IP_BLOCK_LIST = new Set([
  '192.168.1.100',
  '10.0.0.50',
  // Add malicious IPs here
])

export async function rateLimit(request: NextRequest, limiterType: string, identifier?: string) {
  const id = identifier || request.ip || request.headers.get('x-forwarded-for') || 'anonymous'

  // Check block list first
  if (IP_BLOCK_LIST.has(id)) {
    return NextResponse.json(
      { error: 'Access Denied', message: 'Your IP has been blocked' },
      { status: 403 }
    )
  }
  // ... rest of rate limiting logic
}
```

**Method 2: CORS Block List**

Modify `ALLOWED_ORIGINS` environment variable to exclude malicious origins:
```bash
# In production environment
ALLOWED_ORIGINS=https://app.wlpl.com,https://admin.wlpl.com
# Do NOT include attacker origins
```

**Method 3: Hosting Platform Firewall**

**Netlify**:
```bash
# Add to netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Access-Control-Allow-Origin = "https://app.wlpl.com"

[[redirects]]
  from = "/*"
  to = "/blocked"
  status = 403
  conditions = {IP = ["192.168.1.100", "10.0.0.50"]}
```

**Vercel**:
```json
// In vercel.json
{
  "firewall": {
    "rules": [
      {
        "action": "deny",
        "ip": ["192.168.1.100", "10.0.0.50"]
      }
    ]
  }
}
```

---

### Revoking Compromised Super Admin Access

**Severity**: CRITICAL
**Response Time**: < 5 minutes

**Procedure**:

1. **Identify Compromised Account** (1 min)
   - Check Firebase Auth console
   - Identify user email

2. **Revoke Custom Claims** (2 min)
   ```bash
   # Create script: scripts/revoke-super-admin.ts
   import { getAuth } from 'firebase-admin/auth'

   const email = process.argv[2]
   const user = await getAuth().getUserByEmail(email)
   await getAuth().setCustomUserClaims(user.uid, { superAdmin: false })
   console.log(`Revoked super admin access for ${email}`)
   ```

   ```bash
   # Execute
   npx tsx scripts/revoke-super-admin.ts compromised@example.com
   ```

3. **Force Logout** (1 min)
   ```bash
   # In Firebase Console:
   # Authentication > Users > [User] > Disable Account (temporary)
   # Then re-enable without admin claim
   ```

4. **Update Environment Variable** (2 min)
   ```bash
   # Remove from SUPER_ADMIN_EMAILS
   SUPER_ADMIN_EMAILS=admin1@example.com,admin2@example.com
   # (exclude compromised email)
   ```

5. **Audit Recent Actions** (ongoing)
   - Check `admin_audit_logs` collection
   - Review role grants, deletions, config changes
   - Rollback unauthorized changes

---

### Storage Access Revocation

**When to Use**: Unauthorized file access or upload detected

**Procedure**:

1. **Identify Affected Path** (2 min)
   ```
   documents/{userId}/{patientId}/{documentId}
   users/{userId}/meals/{mealId}
   medications/{userId}/{imageId}
   ```

2. **Verify Storage Rules** (3 min)
   ```bash
   # In storage.rules
   match /documents/{userId}/{patientId}/{documentId} {
     allow read: if isOwner(userId);
     allow write: if isOwner(userId) && request.resource.size < 20 * 1024 * 1024;
     allow delete: if isOwner(userId);
   }
   ```

3. **Delete Unauthorized Files** (5 min)
   ```typescript
   // In Firebase Console: Storage > [Bucket] > Select Files > Delete
   // Or use Admin SDK:
   import { getStorage } from 'firebase-admin/storage'

   const bucket = getStorage().bucket()
   await bucket.file('documents/malicious-file.pdf').delete()
   ```

4. **Redeploy Storage Rules** (2 min)
   ```bash
   firebase deploy --only storage:rules
   ```

5. **Monitor for Continued Attempts** (ongoing)
   - Watch storage logs for 403 errors
   - Set up alerts for unauthorized access patterns

---

## Post-Incident Review

**Conduct Within**: 48 hours of incident resolution

### Incident Report Template

```markdown
# Security Incident Report

**Incident ID**: SEC-INC-YYYY-MM-DD-NNN
**Date/Time**: YYYY-MM-DD HH:MM UTC
**Severity**: CRITICAL / HIGH / MEDIUM / LOW
**Status**: RESOLVED / ONGOING / MITIGATED

## Incident Summary
[Brief description of what happened]

## Timeline
- **HH:MM UTC**: Incident detected
- **HH:MM UTC**: Response initiated
- **HH:MM UTC**: Attack contained
- **HH:MM UTC**: Incident resolved

## Attack Vector
[How the attack was executed]

## Impact
- **Users Affected**: N users
- **Data Compromised**: [Type and scope]
- **Service Downtime**: N minutes
- **Financial Impact**: $N

## Response Actions Taken
1. [Action 1]
2. [Action 2]
3. [Action 3]

## Root Cause Analysis
[Why the vulnerability existed]

## Remediation Steps
- [x] Immediate fix applied
- [ ] Long-term fix planned
- [ ] Monitoring enhanced

## Lessons Learned
[What we learned and how to prevent recurrence]

## Follow-up Actions
- [ ] Update security documentation
- [ ] Add new monitoring alerts
- [ ] Conduct security training
- [ ] Schedule penetration test
```

---

### Continuous Improvement

**After Each Incident**:
1. Update this runbook with new procedures
2. Add detection patterns to monitoring
3. Enhance security tests to prevent recurrence
4. Schedule security training for team

**Quarterly Security Review**:
- Review all incidents from quarter
- Update threat model
- Enhance security monitoring
- Conduct tabletop exercises

---

## Appendix: Quick Reference

### Common Commands

**Check Firebase Auth Custom Claims**:
```bash
firebase auth:export users.json
grep "customClaims" users.json
```

**Check Upstash Redis Rate Limits**:
```bash
redis-cli -u $UPSTASH_REDIS_REST_URL --pass $UPSTASH_REDIS_REST_TOKEN
> KEYS ratelimit:*
> GET ratelimit:fetch-url:192.168.1.100
```

**Deploy Security Rules**:
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

**Check Production Environment Variables**:
```bash
# Netlify
netlify env:list

# Vercel
vercel env ls
```

---

**Document Version**: 1.0
**Next Review Date**: 2025-12-15
**Owner**: Security Team (SUPER_ADMIN_EMAILS)
