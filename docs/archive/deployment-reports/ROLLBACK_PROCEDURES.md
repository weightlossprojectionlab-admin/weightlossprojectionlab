# Emergency Rollback Procedures

**Version**: 1.0  
**Priority**: CRITICAL

## When to Rollback

Rollback immediately if:
- Application down or inaccessible
- Critical security vulnerability introduced
- Data loss or corruption
- Major functionality broken
- User authentication completely broken

## Emergency Rollback (15-30 minutes)

### 1. Code Rollback
```bash
# Option A: Revert (safest)
git revert HEAD --no-commit
git commit -m "ROLLBACK: Revert security deployment"
git push origin main

# Option B: Reset (nuclear)
PRE_DEPLOY_TAG="pre-security-merge-$(date +%Y%m%d)"
git reset --hard $PRE_DEPLOY_TAG
git push --force origin main  # Coordinate with team first!
```

### 2. Firebase Rules Rollback
```bash
cp firestore.rules.backup-DATE firestore.rules
firebase deploy --only firestore:rules

cp storage.rules.backup-DATE storage.rules
firebase deploy --only storage
```

### 3. Environment Variables Rollback
```bash
# Remove new variables if they cause issues
netlify env:unset UPSTASH_REDIS_REST_URL
netlify env:unset UPSTASH_REDIS_REST_TOKEN
# or restore from pre-deploy-env-snapshot.txt
```

### 4. Migration Rollback (if needed)
```bash
# Super admin claims rollback
npx tsx scripts/rollback-super-admins.ts --apply

# Document paths rollback
npx tsx scripts/rollback-document-paths.ts --apply
```

### 5. Redeploy
```bash
netlify deploy --prod
# or
vercel --prod
```

### 6. Verify Rollback
- [ ] Application accessible
- [ ] Users can login
- [ ] Core functionality works
- [ ] Error rate normalized

## Partial Rollback

### Disable CSRF Protection
```bash
netlify env:set DISABLE_CSRF true
netlify deploy --prod
```

### Disable Rate Limiting
```bash
netlify env:unset UPSTASH_REDIS_REST_URL
netlify env:unset UPSTASH_REDIS_REST_TOKEN
netlify deploy --prod
```

### Revert Specific Firebase Rules
```bash
# Edit firestore.rules or storage.rules
firebase deploy --only firestore:rules
```

## Post-Rollback Actions

1. **Document Incident** (create incident report)
2. **Notify Stakeholders** (within 15 minutes)
3. **Analyze Root Cause** (within 24 hours)
4. **Create Fix Plan** (within 48 hours)
5. **Schedule Remediation** (after fix validated)
6. **Post-Mortem Meeting** (within 1 week)

## Rollback Validation

After rollback, verify:
- [ ] Application accessible
- [ ] Users can login
- [ ] Data access works
- [ ] Core functionality restored
- [ ] Error rate normal
- [ ] No new issues

## Emergency Contacts

- Deployment Lead: [NAME]
- Rollback Engineer: [NAME]
- On-Call Engineer: [NAME]
- Super Admins: See SUPER_ADMIN_EMAILS

## Quick Commands

```bash
# Code rollback
git revert HEAD --no-commit && git push origin main

# Firebase rules rollback
cp firestore.rules.backup-DATE firestore.rules
firebase deploy --only firestore:rules

# Redeploy
netlify deploy --prod
```

---

**Review Before Deployment** 
**Next Review**: After any rollback incident
