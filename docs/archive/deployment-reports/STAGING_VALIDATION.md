# Staging Environment Validation

## Purpose
Validate all security fixes in staging before production deployment.

## Prerequisites
- [ ] All branches merged to main
- [ ] Build succeeds
- [ ] Tests pass
- [ ] Staging environment available

## Timeline: ~3.5 hours total

---

## Stage 1: Deploy to Staging (15 min)

### Commands
```bash
bash scripts/deploy-production.sh staging true
firebase use staging
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### Validation
- [ ] Deployment completes without errors
- [ ] Application accessible at staging URL
- [ ] Health check endpoint returns 200
- [ ] No console errors

---

## Stage 2: Run Migrations (30 min)

### Commands
```bash
npx tsx scripts/migrate-super-admins.ts --apply
npx tsx scripts/migrate-document-paths.ts --apply
npx tsx scripts/post-migration-validation.sh
```

### Validation
- [ ] Super admin migration completes
- [ ] Document paths migrated correctly
- [ ] No data loss
- [ ] Migration logs show success

---

## Stage 3: Security Feature Testing (1 hour)

### SEC-001: SSRF Protection
```bash
# Test internal IP blocking
curl -X POST https://staging/api/proxy \
  -d '{"url": "http://169.254.169.254/latest/meta-data/"}'
# Expected: 400 Bad Request

# Test allowed domain
curl -X POST https://staging/api/proxy \
  -d '{"url": "https://api.edamam.com/api/recipes"}'
# Expected: 200 OK
```

**Checklist**:
- [ ] Internal IP blocked (169.254.169.254)
- [ ] Localhost blocked
- [ ] Allowed domains work
- [ ] No internal detail leakage

---

### SEC-005: CSRF Protection
```bash
# Test without token
curl -X POST https://staging/api/meals
# Expected: 403 Forbidden

# Get token and test
curl -X GET https://staging/api/auth/csrf
curl -X POST https://staging/api/meals -H "X-CSRF-Token: [TOKEN]"
# Expected: Success
```

**Checklist**:
- [ ] POST without token returns 403
- [ ] POST with token works
- [ ] Token validation on mutations
- [ ] Token rotation works

---

### SEC-006: Rate Limiting
```bash
# Test rate limits
for i in {1..50}; do curl https://staging/api/recipes; done
# Expected: 429 after ~40 requests
```

**Checklist**:
- [ ] Rapid requests rate limited
- [ ] X-RateLimit-* headers present
- [ ] Different endpoint limits work
- [ ] Rate limit window resets

---

### SEC-009: Security Headers
```bash
curl -I https://staging
```

**Required Headers**:
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Strict-Transport-Security: max-age=31536000
- [ ] Content-Security-Policy: [present]
- [ ] Referrer-Policy: strict-origin-when-cross-origin

---

### SEC-000/010: Debug Endpoints
```bash
curl https://staging/api/debug-profile
# Expected: 403 or 404

curl https://staging/api/admin/debug
# Expected: 403
```

**Checklist**:
- [ ] /api/debug-profile blocked
- [ ] /api/admin/debug blocked
- [ ] No debug info exposed
- [ ] Stack traces not visible

---

### SEC-007: Recipe Authentication
```bash
# Without auth
curl https://staging/api/recipes
# Expected: 401 Unauthorized

# With auth
curl https://staging/api/recipes -H "Authorization: Bearer [TOKEN]"
# Expected: 200 with pagination
```

**Checklist**:
- [ ] Recipes require authentication
- [ ] Pagination works
- [ ] Search requires auth
- [ ] Details require auth

---

### SEC-003: Storage Access Control
**Manual Testing**:
- [ ] Upload document goes to correct path (users/userId/patients/patientId/...)
- [ ] Verify path in Firebase Console
- [ ] Cannot access other user's documents
- [ ] Upload requires authentication
- [ ] Storage rules enforce user scoping

---

## Stage 4: Functional Testing (1 hour)

### Authentication
- [ ] User registration
- [ ] User login
- [ ] Email verification
- [ ] Password reset
- [ ] Session persistence
- [ ] Logout

### Core Features
- [ ] Create patient profile
- [ ] Update patient
- [ ] Create meal plan
- [ ] Add meals
- [ ] Upload document
- [ ] View documents
- [ ] Download document

### Family Features
- [ ] Add family member
- [ ] Access shared patient
- [ ] Remove family member

### Admin Functions
- [ ] Access admin panel
- [ ] View users
- [ ] Manage roles
- [ ] Super admin functions

---

## Stage 5: Performance Testing (30 min)

### Response Times
```bash
for endpoint in "/" "/api/meals" "/api/recipes"; do
  curl -w "\nTime: %{time_total}s\n" -o /dev/null -s https://staging$endpoint
done
```

**Targets**:
- [ ] Homepage < 2 seconds
- [ ] API endpoints < 1 second
- [ ] Database queries optimized
- [ ] No N+1 queries

### Load Testing
- [ ] 10-20 concurrent users
- [ ] Rate limiting doesn't block legitimate users
- [ ] No memory leaks
- [ ] Connection pools adequate

---

## Stage 6: Error Handling (30 min)

### Error Responses
- [ ] 400 errors have clear messages
- [ ] 401 errors don't leak details
- [ ] 403 errors don't leak logic
- [ ] 404 errors generic
- [ ] 500 errors no stack traces

### Logging
- [ ] Errors logged to monitoring
- [ ] Security events logged
- [ ] Audit trail for sensitive ops
- [ ] No PII in logs

### Monitoring
- [ ] Error tracking working
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Alerts configured

---

## Final Sign-Off

### Critical Requirements
- [ ] All security features validated
- [ ] All functional tests passed
- [ ] Performance acceptable
- [ ] Error handling appropriate
- [ ] Monitoring functional

### Ready for Production?
- [ ] YES - All checks passed
- [ ] YES WITH CONDITIONS - (list below)
- [ ] NO - Blockers found (list below)

**Conditions/Blockers**:
_______________________________________

**Validated By**: _______________
**Date**: _______________
**Time Spent**: _______________ hours
