# Security Branch Merge Plan

**Created**: 2025-12-01
**Agent**: Claude Code Production Deployment Review Agent A
**Target**: Merge Sprint 1-3 security hardening to main branch

---

## Overview

This plan outlines the safe merging of 3 sprints of security work (16+ branches) into the main branch. Due to the sequential/stacked nature of the branches, we will use a **single comprehensive merge** rather than merging each branch individually.

---

## Pre-Merge Requirements

### 🔴 BLOCKING Issues (Must Fix First)

#### 1. Complete SEC-008 Error Sanitization Migration

**Current State**:
- ✅ `lib/api-response.ts` created with error handlers
- ✅ Imports added to 31 API route files
- ⚠️ **Catch blocks NOT migrated** (only 50% complete)
- ❌ Syntax errors in several files

**Files Requiring Manual Fixes** (High Priority):
1. `app/api/admin/grant-role/route.ts` - Syntax error in catch block
2. `app/api/admin/products/fetch-nutrition-bulk/route.ts` - Missing semicolons
3. `app/api/admin/recipes/[id]/media/route.ts` - Incomplete error handling
4. `app/api/admin/ai-decisions/[id]/review/route.ts` - Syntax issues
5. Plus 27 more files (see SEC-008-IMPLEMENTATION-SUMMARY.md)

**Pattern to Apply**:
```typescript
// BEFORE (Current - BROKEN):
} catch (error: any) {
  logger.error('...', error)
  return NextResponse.json(
    { success: false, error: '...', details: error.message },
    { status: 500 }
  )
}

// AFTER (Target - CORRECT):
} catch (error: any) {
  return errorResponse(error, {
    route: '/api/exact/path',
    method: 'GET', // or POST, PUT, DELETE, PATCH
    userId, // any relevant IDs for logging
    patientId
  })
}
```

**Verification Commands**:
```bash
# Should return 0 results after fix:
grep -r "error\.stack" app/api/ --include="*.ts"
grep -r "details: error" app/api/ --include="*.ts"

# Build should succeed:
npm run build

# Lint should pass:
npm run lint
```

**Estimated Time**: 4-6 hours
**Owner**: Backend Developer

---

#### 2. Fix Build Errors

**Current Issues**:
- TypeScript compilation fails due to syntax errors
- Missing semicolons in catch blocks
- Incomplete error handler calls

**Action Items**:
- [ ] Fix all syntax errors from SEC-008 migration
- [ ] Run `npm run lint` and fix all issues
- [ ] Run `npm run build` and ensure success
- [ ] Run `npm test` and ensure all tests pass

**Acceptance Criteria**:
```bash
npm run lint   # Exit code 0
npm run build  # Exit code 0, no errors
npm test       # All tests pass
```

---

### 🟡 RECOMMENDED (Before Merge)

#### 3. Review Firestore Rules Security Trade-off

**Issue**: SEC-007 recipe rules allow public listing:
```javascript
allow list: if true; // Allow anyone to query recipes collection
```

**Risk**: Potential for scraping, DDoS, or data harvesting

**Mitigation Options**:
1. **Enable Firebase App Check** (Recommended)
   - Prevents unauthorized clients
   - Allows legitimate web/mobile apps
   - Blocks bots and scrapers

2. **Add CDN Rate Limiting**
   - CloudFlare or similar
   - Limit requests per IP
   - DDoS protection

3. **Hybrid Approach** (Best)
   - App Check for client verification
   - CDN for DDoS protection
   - Upstash rate limiting for API endpoints

**Decision Required**: Accept current risk or implement mitigation before merge?

---

## Merge Strategy

### Option A: Single Comprehensive Merge (RECOMMENDED)

**Branch to Merge**: `sec-005-complete-csrf-middleware`

**Rationale**:
- Contains ALL security work (SEC-001 through SEC-010)
- Branches are stacked sequentially, not parallel features
- Single merge creates cleaner history
- Avoids duplicate commits from merging each branch

**Process**:
```bash
# 1. Ensure working directory is clean
git status

# 2. Checkout main and ensure it's up to date
git checkout main
git pull origin main

# 3. Create backup branch (safety)
git branch main-backup-pre-security-merge
git push origin main-backup-pre-security-merge

# 4. Merge security branch
git merge --no-ff sec-005-complete-csrf-middleware \
  -m "SECURITY: Merge Sprint 1-3 security hardening (SEC-001 through SEC-010)

Includes:
- SEC-001: SSRF protection with URL validation
- SEC-002: Super admin env migration
- SEC-004/005: CORS lockdown and CSRF protection
- SEC-006: Distributed rate limiting with Upstash Redis
- SEC-007: Recipe auth and pagination rules
- SEC-008: Centralized error response handler
- SEC-009: Security headers (CSP, XFO, XCTO, Referrer-Policy)
- SEC-010: Debug endpoint enforcement
- Sprint 3: Documentation, migration validation, regression tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 5. Resolve any conflicts (unlikely, as main hasn't changed)
# If conflicts occur, prefer security branch changes

# 6. Verify merge
npm install
npm run lint
npm run build
npm test

# 7. Push to main (after validation)
git push origin main

# 8. Tag the release
git tag -a v1.0.0-security-hardening -m "Sprint 1-3 Security Hardening Release"
git push origin v1.0.0-security-hardening
```

---

### Option B: Individual Branch Merges (NOT RECOMMENDED)

**Why Not Recommended**:
- Branches share commits (sequential development)
- Would create duplicate commits in history
- More complex with potential for errors
- No benefit over single merge

**If Required** (for audit trail), use this order:
1. sec-001-ssrf-fix
2. sec-002-super-admin-env
3. sec-004-005-cors-csrf
4. sec-006-rate-limiting
5. sec-007-recipe-rules
6. sec-008-error-sanitization
7. sec-009-security-headers
8. sec-010-debug-enforcement-tests
9. sec-sprint3-documentation
10. sec-sprint3-regression-tests
11. sec-sprint3-migration-validation

**Note**: Still requires fixing SEC-008 first.

---

## Post-Merge Validation

### 1. Immediate Checks (Within 5 minutes)

```bash
# Build succeeds
npm run build
# Exit code: 0

# Tests pass
npm test
# All tests: PASS

# Lint passes
npm run lint
# No errors

# Type check passes
npx tsc --noEmit
# No errors
```

### 2. Manual Testing (Within 1 hour)

**Test Security Features**:
- [ ] SSRF Protection
  - Try fetching from disallowed domain → Should be blocked
  - Try fetching from private IP → Should be blocked
  - Fetch from openfoodfacts.org → Should succeed

- [ ] Rate Limiting
  - Make 11 requests to `/api/fetch-url` quickly → Should get 429
  - Check `X-RateLimit-*` headers are present
  - Verify `Retry-After` header in 429 response

- [ ] Error Sanitization
  - Trigger an error in production mode → Should see generic message
  - Check server logs → Should have full error details
  - Trigger same error in dev mode → Should see stack trace

- [ ] CSRF Protection
  - Test protected endpoints require valid CSRF token
  - Test token validation works

### 3. Integration Testing (Within 4 hours)

- [ ] Deploy to staging environment
- [ ] Run full regression test suite
- [ ] Perform security scan (if available)
- [ ] Check monitoring/logging systems
- [ ] Verify all environment variables set correctly

---

## Environment Configuration

### Required Environment Variables

```bash
# Production .env
NODE_ENV=production

# Upstash Redis (for distributed rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Super Admin Emails (comma-separated)
ADMIN_EMAILS=admin@weightlossprojectionlab.com,admin@example.com

# Existing variables (ensure present)
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
```

**Fallback Behavior**:
- If Upstash Redis not configured → Uses in-memory rate limiting (dev/test mode)
- If ADMIN_EMAILS not set → Uses hardcoded defaults (not recommended)

---

## Rollback Plan

### If Issues Occur Post-Merge

#### Scenario 1: Build Fails After Merge

```bash
# Abort merge (if not yet pushed)
git merge --abort

# Or revert merge (if already pushed)
git revert -m 1 HEAD
git push origin main
```

#### Scenario 2: Production Issues After Deployment

```bash
# Option A: Revert to backup branch
git checkout main
git reset --hard main-backup-pre-security-merge
git push origin main --force  # ⚠️ Dangerous, coordinate with team

# Option B: Revert merge commit
git revert -m 1 <merge-commit-sha>
git push origin main
```

#### Scenario 3: Specific Feature Causing Issues

1. Identify problematic feature (e.g., rate limiting)
2. Create hotfix branch from main
3. Temporarily disable feature:
   ```typescript
   // Example: Disable rate limiting
   export async function rateLimit(...) {
     return null  // Allow all requests temporarily
   }
   ```
4. Deploy hotfix
5. Fix root cause in separate PR
6. Re-enable feature

---

## Branch Cleanup (Post-Merge)

### After Successful Merge and Production Deployment

```bash
# Keep security branches for audit trail, but mark as merged
# Option 1: Archive branches (recommended)
git branch -d sec-001-ssrf-fix  # Local delete
git push origin --delete sec-001-ssrf-fix  # Remote delete

# Repeat for all security branches:
# sec-002-super-admin-env
# sec-003-storage-rules-migration
# sec-004-005-cors-csrf
# sec-005-complete-csrf-middleware
# sec-006-rate-limiting
# sec-006-complete-rate-limiting
# sec-007-recipe-rules
# sec-008-error-sanitization
# sec-008-complete-error-sanitization
# sec-009-security-headers
# sec-010-debug-enforcement-tests
# sec-sprint3-documentation
# sec-sprint3-regression-tests
# sec-sprint3-migration-validation
# sec-sprint3-security-tests

# Option 2: Tag branches before deletion (for reference)
git tag -a archive/sec-001-ssrf-fix -m "Archived after merge" sec-001-ssrf-fix
git push origin archive/sec-001-ssrf-fix
git branch -D sec-001-ssrf-fix
git push origin --delete sec-001-ssrf-fix
```

---

## Timeline

### Phase 1: Pre-Merge Fixes (CURRENT PHASE)

**Duration**: 1-2 days
**Owner**: Backend Development Team

**Tasks**:
- [ ] Complete SEC-008 catch block migration (4-6 hours)
- [ ] Fix all syntax errors (1-2 hours)
- [ ] Verify build/lint/test success (1 hour)
- [ ] Code review of fixes (2 hours)

**Blockers**: None (ready to start)

---

### Phase 2: Merge to Main

**Duration**: 4 hours
**Owner**: DevOps + Lead Developer

**Tasks**:
- [ ] Create backup branch (5 min)
- [ ] Execute merge (10 min)
- [ ] Resolve conflicts if any (30 min)
- [ ] Post-merge validation (1 hour)
- [ ] Manual security testing (2 hours)
- [ ] Push to main (5 min)

**Blockers**: Phase 1 completion

---

### Phase 3: Staging Deployment

**Duration**: 4 hours
**Owner**: DevOps Team

**Tasks**:
- [ ] Configure staging environment variables (30 min)
- [ ] Deploy to staging (15 min)
- [ ] Run regression tests (1 hour)
- [ ] Security testing (1 hour)
- [ ] Performance testing (1 hour)
- [ ] Sign-off from QA (30 min)

**Blockers**: Phase 2 completion

---

### Phase 4: Production Deployment

**Duration**: 1 day (including monitoring)
**Owner**: DevOps + On-Call Team

**Tasks**:
- [ ] Configure production environment variables (30 min)
- [ ] Enable Firebase App Check (30 min)
- [ ] Deploy to production (30 min)
- [ ] Smoke tests (30 min)
- [ ] Monitor for 24 hours (continuous)
- [ ] Retrospective (1 hour)

**Blockers**: Phase 3 completion + Business approval

---

## Success Criteria

### Merge Success

- [ ] Main branch includes all security work
- [ ] Build succeeds with no errors
- [ ] All tests pass
- [ ] No merge conflicts or resolution errors
- [ ] Git history is clean and understandable

### Deployment Success

- [ ] Staging environment fully functional
- [ ] All regression tests pass
- [ ] Security features work as expected
- [ ] No performance degradation
- [ ] Error rates within normal bounds

### Production Success (24-hour window)

- [ ] Error rate < 1%
- [ ] Response times within SLA
- [ ] Rate limiting working correctly
- [ ] No security incidents
- [ ] Monitoring shows healthy metrics

---

## Communication Plan

### Pre-Merge

**Notify**:
- Development team (1 day before)
- QA team (1 day before)
- Product team (2 days before)

**Message**:
> "Security hardening merge scheduled for [DATE]. This includes SSRF protection, rate limiting, error sanitization, and CORS/CSRF fixes. Please complete any WIP branches by [DATE - 1 day]."

### During Merge

**Status Updates**:
- Slack/Teams channel: Real-time updates during merge
- Email: Summary after merge complete

### Post-Deployment

**Announcement**:
> "✅ Security Sprint 1-3 successfully deployed to production. New features: SSRF protection, distributed rate limiting, error sanitization, enhanced CORS/CSRF. Monitor for next 24 hours. Report any issues immediately to #security-deploy channel."

---

## Risk Mitigation

### Risk 1: Rate Limiting Too Strict

**Symptom**: Legitimate users getting 429 errors

**Mitigation**:
1. Monitor rate limit hit rates
2. Adjust limits in `lib/rate-limit.ts` if needed
3. Add whitelist for known good IPs
4. Increase limits temporarily during high traffic

### Risk 2: Error Sanitization Breaks Debugging

**Symptom**: Can't debug production errors

**Mitigation**:
1. Ensure server-side logging captures full errors
2. Use error codes for correlation
3. Add debugging tools for admins
4. Temporarily enable detailed errors for specific users

### Risk 3: CSRF Blocks Legitimate Requests

**Symptom**: API calls failing with CSRF errors

**Mitigation**:
1. Check CSRF token generation/validation
2. Verify cookie settings (SameSite, Secure)
3. Add token refresh mechanism
4. Provide clear error messages

---

## Monitoring

### Metrics to Watch (24 hours post-deploy)

1. **Error Rates**
   - Target: < 1% of requests
   - Alert: > 5% sustained for 5 minutes

2. **Rate Limit Hit Rate**
   - Target: < 0.5% of requests get 429
   - Alert: > 2% sustained for 10 minutes

3. **Response Times**
   - Target: P95 < 500ms
   - Alert: P95 > 1000ms for 5 minutes

4. **Security Incidents**
   - Target: 0
   - Alert: Any SSRF attempt, unauthorized access

### Dashboards to Monitor

- Application Performance Monitoring (APM)
- Error tracking (Sentry/similar)
- Upstash Redis metrics
- Firebase usage metrics
- Server logs

---

## Contacts

### Emergency Contacts (Production Issues)

- **On-Call Engineer**: [Contact Info]
- **Security Lead**: [Contact Info]
- **DevOps Lead**: [Contact Info]
- **Product Owner**: [Contact Info]

### Escalation Path

1. On-call engineer (respond within 15 min)
2. DevOps lead (respond within 30 min)
3. Security lead (respond within 1 hour)
4. CTO (critical incidents only)

---

## Appendix

### A. Commit Message Template

```
SECURITY: Merge Sprint 1-3 security hardening (SEC-001 through SEC-010)

Includes:
- SEC-001: SSRF protection with URL validation
- SEC-002: Super admin env migration
- SEC-004/005: CORS lockdown and CSRF protection
- SEC-006: Distributed rate limiting with Upstash Redis
- SEC-007: Recipe auth and pagination rules
- SEC-008: Centralized error response handler
- SEC-009: Security headers (CSP, XFO, XCTO, Referrer-Policy)
- SEC-010: Debug endpoint enforcement
- Sprint 3: Documentation, migration validation, regression tests

Security improvements:
- Prevents SSRF attacks via strict URL validation
- Rate limits all sensitive API endpoints
- Sanitizes errors in production (no stack traces)
- Enforces CORS and CSRF protection
- Adds comprehensive security headers
- Migrates super admin config to environment variables

Testing:
- All unit tests passing
- Integration tests passing
- Manual security testing completed
- Staging deployment validated

Deployment notes:
- Requires Upstash Redis env vars (falls back to in-memory)
- Requires ADMIN_EMAILS env var
- Consider enabling Firebase App Check for recipe endpoint
- Monitor error rates and rate limit hits for 24 hours

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### B. Testing Checklist

**SSRF Protection**:
- [ ] Test allowed domains (openfoodfacts.org) → Success
- [ ] Test disallowed domain (evil.com) → Blocked
- [ ] Test private IP (192.168.1.1) → Blocked
- [ ] Test loopback (127.0.0.1) → Blocked
- [ ] Test DNS rebinding attempt → Blocked

**Rate Limiting**:
- [ ] 10 requests to /api/fetch-url → Success
- [ ] 11th request → 429 with Retry-After
- [ ] Headers present: X-RateLimit-Limit/Remaining/Reset
- [ ] Wait for reset window → New requests succeed
- [ ] Different endpoint has different limits

**Error Sanitization**:
- [ ] Production mode: Generic error message
- [ ] Production mode: Error code present
- [ ] Production mode: No stack trace in response
- [ ] Dev mode: Full error details
- [ ] Server logs: Full error details in both modes

**CORS/CSRF**:
- [ ] OPTIONS request → Proper CORS headers
- [ ] Cross-origin request from allowed origin → Success
- [ ] Cross-origin request from disallowed origin → Blocked
- [ ] CSRF token required for mutating endpoints
- [ ] Invalid CSRF token → 403

### C. Rollback Scenarios

| Scenario | Detection Time | Action | Recovery Time |
|----------|----------------|--------|---------------|
| Build fails | Immediate | Abort merge | < 5 min |
| Tests fail post-merge | 10 min | Revert commit | < 15 min |
| Staging issues | 4 hours | Fix or revert | < 1 hour |
| Production errors spike | 15 min | Rollback deployment | < 30 min |
| Rate limiting too strict | 1 hour | Adjust limits | < 15 min |

---

**Plan Version**: 1.0
**Last Updated**: 2025-12-01
**Approved By**: [Pending]
**Status**: ⏳ Awaiting Phase 1 completion (SEC-008 fixes)
