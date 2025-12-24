# Merge Rollback Plan

**Created**: 2025-12-01
**Purpose**: Emergency procedures for rolling back security branch merges
**Scope**: Rollback procedures for all 6 merge phases
**Risk Level**: HIGH (use with extreme caution)

---

## Overview

This document provides step-by-step rollback procedures for each phase of the security branch merge. Use these procedures if:

- Merge introduces critical bugs
- Build failures cannot be resolved quickly
- Security vulnerabilities are introduced
- Production issues require immediate revert
- Team consensus is to rollback

---

## Rollback Decision Matrix

### When to Rollback

| Scenario | Severity | Rollback? | Procedure |
|----------|----------|-----------|-----------|
| Build fails during merge | CRITICAL | YES | Abort merge |
| Tests fail during merge | HIGH | MAYBE | Fix or abort |
| Merge conflicts too complex | MEDIUM | MAYBE | Abort and plan |
| Post-merge build fails | CRITICAL | YES | Revert commit |
| Production errors spike | CRITICAL | YES | Revert deployment |
| Security vulnerability introduced | CRITICAL | YES | Immediate revert |
| Performance degradation | MEDIUM | MAYBE | Rollback or hotfix |
| Minor bugs | LOW | NO | Hotfix |

---

## Rollback Procedures

### Procedure 1: Abort Merge (Before Commit)

**When**: During active merge with conflicts

**Steps**:

```bash
# 1. Check current status
git status

# Should show: "You are in the middle of a merge"

# 2. Abort the merge
git merge --abort

# 3. Verify clean state
git status

# Should show: "nothing to commit, working tree clean"

# 4. Document the abort
echo "Merge aborted at $(date): [reason]" >> merge-execution.log
```

**Result**: Returns to pre-merge state, no changes committed

**Risk**: NONE

---

### Procedure 2: Revert Last Merge Commit

**When**: Merge completed but issues discovered before pushing

**Steps**:

```bash
# 1. Check recent commits
git log --oneline -5

# Example output:
# abc1234 (HEAD -> main) Merge sec-008-complete-error-sanitization
# def5678 Previous commit
# ...

# 2. Revert the merge commit
git revert -m 1 HEAD

# -m 1 means "keep parent 1" (the main branch side)

# 3. Verify revert
git log --oneline -3

# Should show revert commit on top

# 4. Test that revert worked
npm run build
npm test

# 5. Commit message will be auto-generated:
# "Revert 'Merge sec-008-complete-error-sanitization'"
```

**Result**: Creates new commit that undoes the merge

**Risk**: LOW (safe, preserves history)

---

### Procedure 3: Reset to Backup Branch

**When**: Multiple merges need to be undone

**Steps**:

```bash
# 1. Identify backup branch
git branch | grep "main-backup"

# Example: main-backup-20251201-103045

# 2. Create safety branch (just in case)
git branch rollback-safety-$(date +%Y%m%d-%H%M%S)

# 3. Verify backup branch content
git log --oneline main-backup-20251201-103045 -5

# 4. Confirm this is the correct restore point
confirm "Reset to main-backup-20251201-103045?"

# 5. Reset to backup
git reset --hard main-backup-20251201-103045

# 6. Verify state
git log --oneline -5
git status

# 7. Force push (⚠️ DANGEROUS - coordinate with team)
# DO NOT DO THIS if others have pulled recent commits!
# git push origin main --force

# SAFER: Push to new branch and coordinate
git push origin HEAD:main-rollback-proposal
```

**Result**: Local main reset to backup, remote unchanged until force push

**Risk**: HIGH (can lose work, coordinate with team)

---

### Procedure 4: Selective Revert (Specific Branch)

**When**: One merge in a series needs to be undone

**Steps**:

```bash
# 1. Identify the merge commit to revert
git log --oneline --merges -10

# Example output:
# abc1234 Merge sec-008-complete-error-sanitization
# def5678 Merge sec-007-recipe-rules
# ghi9012 Merge sec-001-ssrf-fix

# 2. Revert specific merge
git revert -m 1 abc1234

# 3. Resolve any conflicts
# If conflicts occur, you may need to:
git status
# Edit conflicted files
git add <resolved-files>
git revert --continue

# 4. Verify the revert
npm run build
npm test
```

**Result**: One specific merge undone, later merges preserved

**Risk**: MEDIUM (may cause conflicts with later merges)

---

## Phase-by-Phase Rollback

### Phase 1 Rollback: Infrastructure & Documentation

**Branches**: sec-002, sec-009, production-deployment-runbook, production-migration-plan

**Impact**: LOW (mostly docs and configs)

**Rollback Procedure**:

```bash
# Identify phase 1 merge commits
git log --oneline --merges | grep -E "(sec-002|sec-009|production-deployment|production-migration)"

# Revert each in reverse order (most recent first)
git revert -m 1 <commit-4>
git revert -m 1 <commit-3>
git revert -m 1 <commit-2>
git revert -m 1 <commit-1>

# Test
npm run build
npm test
```

**Files Affected**: ~20 files (docs, scripts, configs)

**Risk**: LOW

---

### Phase 2 Rollback: Core Security Libraries

**Branches**: sec-001-ssrf-fix, sec-007-recipe-rules

**Impact**: MEDIUM (security features removed)

**Rollback Procedure**:

```bash
# Revert both merges
git log --oneline --merges | grep -E "(sec-001|sec-007)"

git revert -m 1 <sec-007-commit>
git revert -m 1 <sec-001-commit>

# Test
npm run build
npm test
```

**Files Affected**: ~25 files

**Risk**: MEDIUM (removes SSRF protection, recipe rules)

**Warning**: SSRF vulnerability returns after rollback

---

### Phase 3 Rollback: Error Handling (BASE LAYER)

**Branches**: sec-008-complete-error-sanitization

**Impact**: CRITICAL (affects 132 files)

**Rollback Procedure**:

```bash
# ⚠️ CRITICAL: Phases 4-6 depend on this
# Rolling back Phase 3 requires rolling back Phases 4-6 first!

# 1. Check dependencies
git log --oneline --merges -10

# 2. Revert dependent phases first (6 → 5 → 4)
# See Phase 4-6 rollback procedures

# 3. Then revert Phase 3
git revert -m 1 <sec-008-commit>

# 4. Conflicts expected!
# Resolve conflicts in:
# - API route files (100+ files)
# - Test files
# - lib/api-response.ts references
```

**Files Affected**: 132 files

**Risk**: CRITICAL

**Dependencies**: Phases 4, 5, 6 must be reverted first

**Warning**: Error sanitization removed, stack traces will leak in production

---

### Phase 4 Rollback: Rate Limiting (MIDDLE LAYER)

**Branches**: sec-006-complete-rate-limiting

**Impact**: CRITICAL (affects 178 files, most of any phase)

**Rollback Procedure**:

```bash
# ⚠️ CRITICAL: Phase 5 may depend on this
# Check if CSRF middleware references rate limiting

# 1. Revert Phase 5 first if needed
# See Phase 5 rollback

# 2. Revert Phase 4
git revert -m 1 <sec-006-commit>

# 3. Remove Upstash dependencies
npm uninstall @upstash/ratelimit @upstash/redis

# 4. Rebuild
npm install
npm run build
```

**Files Affected**: 178 files (includes new features)

**Risk**: CRITICAL

**Dependencies**: Phase 5 may depend on this

**Warning**: Rate limiting removed, endpoints vulnerable to abuse

**Note**: New features added in sec-006 will also be removed:
- Delivery PIN system
- Support portal
- Healthcare provider features
- Additional shopping features

---

### Phase 5 Rollback: CSRF Protection (TOP LAYER)

**Branches**: sec-005-complete-csrf-middleware

**Impact**: CRITICAL (middleware layer, 134 files)

**Rollback Procedure**:

```bash
# 1. Revert Phase 5
git revert -m 1 <sec-005-commit>

# 2. Critical: Check middleware.ts
# If middleware.ts was combined with sec-003, you may need to:

# Option A: Keep combined middleware, remove only CSRF
code middleware.ts
# Manually remove CSRF protection code
# Keep family/subscription logic (if any)

# Option B: Restore pre-merge middleware
git show main-backup:middleware.ts > middleware.ts
git add middleware.ts
git commit -m "Restore middleware.ts without CSRF"

# 3. Test
npm run build
npm test

# 4. Test API endpoints work without CSRF
```

**Files Affected**: 134 files + middleware.ts

**Risk**: CRITICAL

**Dependencies**: None (top layer)

**Warning**: CSRF protection removed, vulnerable to cross-site attacks

---

### Phase 6 Rollback: Testing & Validation

**Branches**: sec-sprint3-regression-tests, sec-sprint3-migration-validation

**Impact**: LOW (test/migration files only)

**Rollback Procedure**:

```bash
# Revert both branches
git log --oneline --merges | grep "sprint3"

git revert -m 1 <sprint3-migration-commit>
git revert -m 1 <sprint3-regression-commit>

# Test (existing tests only)
npm test
```

**Files Affected**: ~50 files (tests, scripts, docs)

**Risk**: LOW

**Dependencies**: None

**Note**: Removes security test suite, but doesn't affect application functionality

---

## Complete Rollback (All Phases)

**When**: Entire merge needs to be undone

**Procedure**:

```bash
# 1. Identify the backup branch
BACKUP_BRANCH=$(git branch | grep "main-backup" | tail -1 | tr -d ' ')

echo "Restoring from: $BACKUP_BRANCH"

# 2. Create safety snapshot
git branch rollback-safety-$(date +%Y%m%d-%H%M%S)

# 3. Reset to backup
git reset --hard $BACKUP_BRANCH

# 4. Verify state
git log --oneline -10
git diff origin/main  # Show what will be removed

# 5. Force push (⚠️ COORDINATE WITH TEAM FIRST)
# DO NOT run this without team approval!
# git push origin main --force
```

**Risk**: CRITICAL

**Impact**: All security work removed

**Requires**: Team coordination, approval from lead

---

## Production Rollback

### Scenario: Production Deployment Failed

**When**: Application deployed to production but critical issues discovered

**Procedure**:

#### Option 1: Revert Deployment (Recommended)

```bash
# 1. Identify last working deployment
LAST_WORKING_TAG="v1.0.0-pre-security"

# 2. Deploy previous version
# (Specific steps depend on deployment platform)

# Vercel example:
vercel --prod --yes --force

# Or rollback via dashboard:
# - Go to deployments
# - Find last working deployment
# - Click "Promote to Production"
```

**Recovery Time**: 5-15 minutes

**Risk**: LOW

---

#### Option 2: Hotfix Critical Issues

**When**: Issues are minor and can be fixed quickly

```bash
# 1. Create hotfix branch
git checkout -b hotfix/security-merge-issues

# 2. Fix critical issues
# Edit affected files

# 3. Test locally
npm run build
npm test

# 4. Commit and push
git add .
git commit -m "hotfix: Resolve critical security merge issues"
git push origin hotfix/security-merge-issues

# 5. Deploy hotfix
# Fast-track through CI/CD

# 6. Merge hotfix to main after validation
git checkout main
git merge hotfix/security-merge-issues
git push origin main
```

**Recovery Time**: 30-60 minutes

**Risk**: MEDIUM

---

#### Option 3: Emergency Rollback Script

```bash
#!/bin/bash
# emergency-rollback.sh

set -e

echo "🚨 EMERGENCY PRODUCTION ROLLBACK 🚨"

# Get last working commit
LAST_WORKING=$(git log --oneline | grep "pre-security" | head -1 | awk '{print $1}')

echo "Rolling back to: $LAST_WORKING"

# Reset main to last working state
git checkout main
git reset --hard $LAST_WORKING

# Force push (⚠️ EMERGENCY ONLY)
git push origin main --force

echo "✅ Rollback complete. Redeploy immediately."
```

**Recovery Time**: 5 minutes + deployment time

**Risk**: HIGH (force push)

---

## Rollback Validation

After any rollback, validate:

### Checklist

- [ ] Application builds successfully
- [ ] All tests pass
- [ ] No git conflicts remain
- [ ] Git history is clean
- [ ] Production deployment works
- [ ] No security vulnerabilities introduced by rollback
- [ ] Team notified of rollback
- [ ] Post-mortem scheduled

### Validation Commands

```bash
# Build check
npm run build
# Exit code should be 0

# Test check
npm test
# All tests should pass

# Lint check
npm run lint
# No errors

# Git state
git status
# Should be clean

# Verify commit
git log --oneline -5
# Should show expected history
```

---

## Communication Protocol

### Rollback Notification Template

**Slack/Teams/Email**:

```
🚨 SECURITY MERGE ROLLBACK INITIATED 🚨

Status: [In Progress / Complete]
Phase Rolled Back: [Phase 1-6 or Complete]
Reason: [Brief description]
Impact: [User-facing impact, if any]
Recovery Time: [Estimated]

Actions Taken:
- [List steps performed]

Next Steps:
- [What happens next]

Team: Please hold all merges to main until further notice.

Contact: [Your name/contact info]
```

---

### Post-Rollback Actions

**Immediate** (Within 1 hour):
1. Notify team of rollback
2. Document reason in incident log
3. Verify production is stable
4. Review rollback was successful

**Short-term** (Within 24 hours):
1. Investigate root cause
2. Plan fix strategy
3. Update merge procedures if needed
4. Schedule post-mortem meeting

**Long-term** (Within 1 week):
1. Conduct post-mortem
2. Document lessons learned
3. Update merge plan
4. Plan re-merge strategy

---

## Rollback Risk Matrix

| Rollback Type | Data Loss Risk | Downtime | Complexity | Recovery Time |
|---------------|----------------|----------|------------|---------------|
| Abort merge | None | 0 min | Low | < 1 min |
| Revert commit | None | 0 min | Low | 5-15 min |
| Reset to backup | Low | 0 min | Medium | 15-30 min |
| Selective revert | Low | 0 min | High | 30-60 min |
| Production rollback | None | 5-15 min | Medium | 15-30 min |
| Complete rollback | Medium | 0-30 min | High | 1-2 hours |

---

## Emergency Contacts

### Escalation Path

1. **On-Call Engineer** (respond within 15 min)
   - Execute rollback procedures
   - Notify team

2. **DevOps Lead** (respond within 30 min)
   - Approve production rollback
   - Coordinate deployment

3. **Security Lead** (respond within 1 hour)
   - Assess security impact
   - Plan re-merge strategy

4. **CTO** (critical incidents only)
   - Final decision on major rollbacks
   - Business impact assessment

---

## Post-Mortem Template

After rollback, conduct post-mortem:

### Questions to Answer

1. **What happened?**
   - What triggered the rollback?
   - When was issue discovered?
   - What was the impact?

2. **Why did it happen?**
   - Root cause analysis
   - What was missed in validation?
   - Process gaps identified?

3. **How was it resolved?**
   - Rollback procedure used
   - Time to resolution
   - Team response effectiveness

4. **How do we prevent recurrence?**
   - Process improvements
   - Additional validation needed
   - Training requirements

5. **Action items**
   - Assign owners
   - Set deadlines
   - Track completion

---

## Appendix: Git Commands Reference

### Useful Rollback Commands

```bash
# Show merge commits only
git log --merges --oneline

# Show what a revert would do (dry-run)
git revert -n <commit>
git diff --cached
git reset --hard  # undo dry-run

# Find commit that introduced a file
git log --diff-filter=A -- path/to/file

# Show branches containing a commit
git branch --contains <commit>

# Interactive rebase (advanced)
git rebase -i HEAD~10

# Cherry-pick specific commit
git cherry-pick <commit>

# Show file from specific commit
git show <commit>:path/to/file

# Compare two commits
git diff <commit1>..<commit2>

# Restore single file from backup
git checkout main-backup -- path/to/file
```

---

## Testing Rollback Procedures

### Dry-Run Rollback Test

```bash
# Create test environment
git checkout -b test-rollback main

# Perform test merge
git merge --no-ff sec-008-complete-error-sanitization

# Test rollback procedure
git revert -m 1 HEAD

# Verify
npm run build
npm test

# Clean up
git checkout main
git branch -D test-rollback
```

---

## Success Criteria

Rollback is successful when:

- [ ] Application builds successfully
- [ ] All tests pass
- [ ] Production is stable
- [ ] No data loss
- [ ] Team notified
- [ ] Documentation updated
- [ ] Post-mortem scheduled

---

**Document Version**: 1.0
**Last Updated**: 2025-12-01
**Owner**: Production Deployment Agent 1
**Review Schedule**: After each rollback incident
