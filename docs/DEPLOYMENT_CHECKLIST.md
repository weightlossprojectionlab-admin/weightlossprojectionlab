# Production Deployment Checklist

**Deployment Date**: _______________
**Deployed By**: _______________
**Start Time**: _______________

## Pre-Deployment

### Backups
- [ ] Firestore backup created
- [ ] Storage documented
- [ ] Environment variables snapshotted
- [ ] Git commit tagged
- [ ] Firebase rules backed up

### Validation
- [ ] Dependencies installed: `npm ci`
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Pre-deploy script passes
- [ ] Migration dry-runs successful

### Notification
- [ ] Team notified
- [ ] Support team briefed
- [ ] Deployment window confirmed

### Review
- [ ] Merge plan reviewed (16 branches)
- [ ] Rollback procedures understood
- [ ] Environment variables prepared

## Deployment

### Merge Branches
- [ ] Phase 1: Emergency kill switches, SSRF, super admin, storage (4 branches)
- [ ] Phase 2: CORS/CSRF, rate limiting (4 branches)
- [ ] Phase 3: Recipe rules, error sanitization, headers (4 branches)
- [ ] Phase 4: Tests and documentation (4 branches)
- [ ] All 16 branches merged
- [ ] Post-merge tests pass

### Firebase Rules
- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] Rules verified active

### Environment Variables
- [ ] SUPER_ADMIN_EMAILS set
- [ ] ALLOWED_ORIGINS set
- [ ] UPSTASH_REDIS_REST_URL set
- [ ] UPSTASH_REDIS_REST_TOKEN set
- [ ] NODE_ENV="production"

### Migrations
- [ ] Super admin migration: _____ users updated
- [ ] Document path migration: _____ files moved
- [ ] Migration logs saved

### Deploy Application
- [ ] Code pushed to main
- [ ] Production deployment triggered
- [ ] Build successful
- [ ] Application accessible

### Verify Deployment
- [ ] Post-deploy script passes
- [ ] Application loads
- [ ] Security headers present
- [ ] CSRF protection active
- [ ] Rate limiting active
- [ ] Debug endpoints blocked (403)
- [ ] Authentication working
- [ ] Critical flows tested

## Post-Deployment

### Immediate (15 min)
- [ ] Application accessible
- [ ] Health checks passing
- [ ] Security features active

### Short-Term (2 hours)
- [ ] 30-min check: No errors
- [ ] 1-hour check: Stable
- [ ] 2-hour check: No issues

### Long-Term (24 hours)
- [ ] 6-hour check: Stable
- [ ] 12-hour check: Healthy
- [ ] 24-hour check: Success

## Rollback Decision

**Issue**: ______________________________________

**Severity**: Critical / High / Medium / Low

**Rollback Required**: Yes / No

**If Yes**:
- [ ] Rollback executed
- [ ] Application restored
- [ ] Issue documented

## Sign-Off

**Deployed By**: _______________
**Verified By**: _______________
**Status**: Success / Rolled Back / Partial
