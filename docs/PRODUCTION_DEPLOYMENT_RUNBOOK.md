# Production Deployment Runbook

**Version**: 1.0
**Last Updated**: 2025-12-01
**Target**: Security Sprint 1 & 2 Merge (16 branches)
**Estimated Time**: 4-6 hours (includes monitoring)

---

## Overview

This comprehensive runbook guides you through deploying 16 security branches to production safely. It covers pre-deployment preparation, the deployment process, post-deployment validation, and 24-hour monitoring procedures.

## Table of Contents

1. [Pre-Deployment Phase](#pre-deployment-phase) (2-3 hours)
2. [Deployment Phase](#deployment-phase) (1-2 hours)
3. [Post-Deployment Phase](#post-deployment-phase) (24 hours)
4. [Emergency Contacts](#emergency-contacts)

---

## Pre-Deployment Phase

**Duration**: 2-3 hours before deployment

### 1. Create Backups (30 minutes)

#### Firestore Database Backup
- Navigate to: Firebase Console > Firestore Database > Backups
- Create backup: production-pre-security-merge-$(date +%Y%m%d)
- Wait for completion (~15-20 minutes)
- Verify backup status shows "Completed"

#### Firebase Storage Backup
- Document current storage structure
- Screenshot key directories
- Note file counts for verification

#### Environment Variable Snapshot
```bash
# Netlify
netlify env:list > pre-deploy-env-snapshot.txt

# Vercel  
vercel env ls > pre-deploy-env-snapshot.txt
```

#### Git State Recording
```bash
git rev-parse HEAD > pre-deploy-commit.txt
date > pre-deploy-timestamp.txt
git tag pre-security-merge-$(date +%Y%m%d)
git push origin pre-security-merge-$(date +%Y%m%d)
```

#### Firebase Rules Backup
```bash
cp firestore.rules firestore.rules.backup-$(date +%Y%m%d)
cp storage.rules storage.rules.backup-$(date +%Y%m%d)
firebase firestore:rules get > firestore.rules.deployed-$(date +%Y%m%d)
```

---

### 2. Run Pre-Deployment Validation (45 minutes)

```bash
# Install dependencies
npm ci

# Run all tests
npm test

# Build application
npm run build

# Run pre-deploy validation script
bash scripts/pre-deploy-validation.sh

# Dry-run migration scripts
npx tsx scripts/migrate-super-admins.ts
npx tsx scripts/migrate-document-paths.ts
```

---

### 3. Notify Stakeholders (15 minutes)

Send notifications to:
- Development team
- QA team  
- DevOps team
- Support team (brief on expected issues)

---

### 4. Review Deployment Plan (30 minutes)

Review these documents:
- Merge order and dependencies (16 branches)
- Rollback procedures (docs/ROLLBACK_PROCEDURES.md)
- Environment variables (docs/ENVIRONMENT_SETUP.md)
- Migration scripts execution plan

---

## Deployment Phase

**Duration**: 1-2 hours

### Step 1: Merge Security Branches (30-60 minutes)

Merge in this exact order:

#### Phase 1: Critical Infrastructure
1. `sec-000-010-emergency-kill-switches`
2. `sec-001-ssrf-fix`
3. `sec-002-super-admin-env`
4. `sec-003-storage-rules-migration`

#### Phase 2: Middleware & Request Security
5. `sec-004-005-cors-csrf`
6. `sec-005-complete-csrf-middleware`
7. `sec-006-rate-limiting`
8. `sec-006-complete-rate-limiting`

#### Phase 3: Application Security
9. `sec-007-recipe-rules`
10. `sec-008-error-sanitization`
11. `sec-008-complete-error-sanitization`
12. `sec-009-security-headers`

#### Phase 4: Testing & Documentation
13. `sec-010-debug-enforcement-tests`
14. `sec-sprint3-documentation`
15. `sec-sprint3-regression-tests`
16. `sec-sprint3-security-tests`

```bash
# For each branch:
git merge <branch-name> --no-ff -m "Merge <SEC-ID>: <description>"

# After all merges:
npm ci
npm test
npm run build
```

---

### Step 2: Deploy Firebase Security Rules (10 minutes)

```bash
# Validate first
firebase deploy --only firestore:rules --dry-run

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage

# Verify
firebase firestore:rules get
```

---

### Step 3: Configure Environment Variables (15 minutes)

Set these production environment variables:

```bash
SUPER_ADMIN_EMAILS="admin1@example.com,admin2@example.com"
ALLOWED_ORIGINS="https://app.weightlossprojectionlab.com"
UPSTASH_REDIS_REST_URL="https://your-redis-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
NODE_ENV="production"
```

See `docs/ENVIRONMENT_SETUP.md` for complete list.

---

### Step 4: Run Database Migrations (30 minutes)

```bash
# Super admin migration
npx tsx scripts/migrate-super-admins.ts  # Final dry-run
npx tsx scripts/migrate-super-admins.ts --apply

# Document path migration
npx tsx scripts/migrate-document-paths.ts  # Final dry-run
npx tsx scripts/migrate-document-paths.ts --apply
```

---

### Step 5: Deploy Application (15 minutes)

```bash
# Push to main
git push origin main

# Trigger deployment
netlify deploy --prod
# or
vercel --prod
```

---

### Step 6: Verify Deployment (15 minutes)

```bash
# Run post-deploy validation
bash scripts/post-deploy-validation.sh https://your-app.com

# Manual checks:
# - Application loads
# - Login works
# - Security headers present
# - Debug endpoints blocked
# - CSRF protection active
# - Rate limiting active
```

---

## Post-Deployment Phase

**Duration**: 24 hours monitoring

### Immediate Validation (First 15 minutes)

- [ ] Application accessible
- [ ] Health checks passing
- [ ] Security headers present
- [ ] CSRF protection working
- [ ] Rate limiting active
- [ ] Debug endpoints blocked
- [ ] Critical user flows work

### Short-Term Monitoring (First 2 hours)

Monitor:
- Error logs (should be < 1% error rate)
- Performance metrics
- User reports
- Security events

Checkpoints:
- 30 minutes
- 1 hour
- 2 hours

### Long-Term Monitoring (24 hours)

Checkpoints:
- 6 hours
- 12 hours
- 24 hours (final validation)

At 24 hours, run full security audit:
```bash
npm test -- __tests__/security/
bash scripts/post-deploy-validation.sh https://your-app.com
```

---

## Emergency Contacts

### Internal Team
- Deployment Lead: [NAME] - [EMAIL] - [PHONE]
- Rollback Engineer: [NAME] - [EMAIL] - [PHONE]
- On-Call Engineer: [NAME] - [EMAIL] - [PHONE]

### Super Admins
See `SUPER_ADMIN_EMAILS` environment variable

### External Services
- Firebase Support: https://firebase.google.com/support
- Upstash Support: https://upstash.com/
- Platform Support: [Netlify/Vercel]

---

## Emergency Rollback

If critical issues occur, immediately execute:

```bash
# 1. Code rollback
git revert HEAD --no-commit
git push origin main

# 2. Firebase rules rollback
cp firestore.rules.backup-DATE firestore.rules
firebase deploy --only firestore:rules

# 3. Migration rollback (if needed)
npx tsx scripts/rollback-super-admins.ts --apply
npx tsx scripts/rollback-document-paths.ts --apply

# 4. Redeploy
netlify deploy --prod
```

See `docs/ROLLBACK_PROCEDURES.md` for complete rollback guide.

---

## Success Criteria

- [ ] All 16 branches merged successfully
- [ ] All tests passing (200+)
- [ ] Migrations successful (super admins + document paths)
- [ ] Application stable for 24 hours
- [ ] No critical user complaints
- [ ] Security audit passes
- [ ] Error rate normal (< 1%)

---

**Deployment completed by**: ________________________
**Date**: ________________________
**Status**: ________________________
