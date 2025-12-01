# Security Pull Request: [SEC-XXX] [Title]

## Security Fix Classification

**Security Sprint**: Sprint [1/2/3]
**Security ID**: SEC-XXX
**Priority**: [CRITICAL / HIGH / MEDIUM / LOW]
**Risk Level**: [HIGH / MEDIUM / LOW]

---

## Description

### What security issue does this fix?

<!-- Describe the vulnerability, weakness, or security improvement -->

### Attack Vector (if applicable)

<!-- How could this be exploited? What's the threat model? -->

### Impact if Not Fixed

<!-- What are the consequences of not addressing this? -->

---

## Changes Made

### Security Controls Implemented

- [ ] Input validation
- [ ] Output encoding/sanitization
- [ ] Authentication check
- [ ] Authorization check
- [ ] Rate limiting
- [ ] CORS/CSRF protection
- [ ] Error handling/sanitization
- [ ] Logging/monitoring
- [ ] Other: _________

### Files Modified

**Core Changes**:
- `path/to/file1.ts` - Description
- `path/to/file2.ts` - Description

**Tests Added**:
- `__tests__/path/to/test.test.ts` - Description

**Documentation Updated**:
- `docs/SECURITY_DOC.md` - Description

### Lines of Code

- Added: XXX lines
- Removed: XXX lines
- Modified: XXX files

---

## Testing

### Unit Tests

- [ ] Tests created for security feature
- [ ] Tests cover positive cases (feature works)
- [ ] Tests cover negative cases (attacks blocked)
- [ ] Tests are deterministic (no flaky tests)
- [ ] Test coverage > 80% for critical code

**Test Results**:
```
Test Suites: X passed, X total
Tests:       X passed, X total
Coverage:    XX.X%
```

### Integration Tests

- [ ] End-to-end security flow tested
- [ ] Integration with existing features verified
- [ ] No regressions introduced

### Manual Testing

- [ ] Manual security testing completed
- [ ] Attempted bypass/circumvention
- [ ] Verified in development environment
- [ ] Verified in staging environment

**Test Scenarios**:
1. Scenario 1: [Description] → [Expected Result] → [Actual Result]
2. Scenario 2: [Description] → [Expected Result] → [Actual Result]
3. Scenario 3: [Description] → [Expected Result] → [Actual Result]

---

## Security Checklist

### Code Security

- [ ] No hardcoded credentials (API keys, passwords, tokens)
- [ ] No sensitive data in logs (PII, credentials, tokens)
- [ ] Input validation on all user inputs
- [ ] Output encoding for all rendered content
- [ ] Parameterized queries (no SQL injection)
- [ ] Safe deserialization (no object injection)
- [ ] Proper error handling (no stack traces in prod)
- [ ] Security headers set correctly
- [ ] Authentication required for protected routes
- [ ] Authorization checks enforced
- [ ] Rate limiting applied where needed
- [ ] CORS policy restrictive (not allow-all)
- [ ] CSRF protection for state-changing operations

### Dependencies

- [ ] No new vulnerable dependencies introduced
- [ ] All dependencies up to date
- [ ] Ran `npm audit` and addressed issues
- [ ] Third-party libraries from trusted sources

### Configuration

- [ ] Environment variables documented
- [ ] Secrets not committed to repo
- [ ] `.env.example` updated if new vars added
- [ ] Default configuration is secure

### Documentation

- [ ] Security requirements documented
- [ ] Deployment notes added (if applicable)
- [ ] Environment setup documented
- [ ] Rollback procedure documented (if applicable)

---

## Deployment Notes

### Environment Variables Required

```bash
# Add to .env.production
NEW_VAR_NAME=value_here
ANOTHER_VAR=value_here
```

### Infrastructure Changes

<!-- Any changes to infrastructure, databases, external services -->

### Migration Required

- [ ] Yes - See migration script: `scripts/migrate-xxx.ts`
- [ ] No

**Migration Steps** (if applicable):
1. Step 1
2. Step 2
3. Validation

### Rollback Plan

**If this PR causes issues in production**:
1. Revert command: `git revert <commit-sha>`
2. Environment variables to restore: [List]
3. Database rollback (if needed): [Script or steps]
4. Estimated rollback time: [XX minutes]

---

## Performance Impact

### Expected Impact

- [ ] No performance impact
- [ ] Improves performance
- [ ] Minor performance cost (< 50ms)
- [ ] Moderate performance cost (< 200ms)
- [ ] Significant performance cost (> 200ms) - **requires optimization**

### Performance Testing

**Benchmark Results**:
```
Before: XXXms average response time
After:  XXXms average response time
Delta:  +/-XXms (XX% change)
```

### Monitoring

**Metrics to Watch Post-Deployment**:
- [ ] Error rate (target: < 1%)
- [ ] Response time (target: < 500ms P95)
- [ ] Rate limit hit rate (target: < 0.5%)
- [ ] Security incident rate (target: 0)

---

## Security Regression Tests

### Existing Security Controls

- [ ] SSRF protection still working
- [ ] Rate limiting still enforced
- [ ] CSRF protection still active
- [ ] Authentication still required
- [ ] Authorization still checked
- [ ] Error sanitization still working
- [ ] Other security controls verified

### Regression Test Results

```
All security regression tests: PASSED
```

---

## Review Checklist

### For Reviewers

**Code Review**:
- [ ] Security logic is correct
- [ ] No security vulnerabilities introduced
- [ ] Error handling is comprehensive
- [ ] Edge cases are covered
- [ ] Code follows security best practices
- [ ] No sensitive data exposed

**Testing Review**:
- [ ] Test coverage is adequate
- [ ] Tests actually test security feature
- [ ] Tests include attack scenarios
- [ ] Tests are maintainable

**Documentation Review**:
- [ ] Security implications clearly explained
- [ ] Deployment steps are clear
- [ ] Rollback plan is viable
- [ ] Environment vars documented

---

## Dependencies

### Related PRs

- Depends on: #XXX
- Blocks: #XXX
- Related to: #XXX

### Other Security Work

This PR is part of:
- [ ] Sprint 1: Critical Security Fixes (SEC-001 to SEC-003)
- [ ] Sprint 2: Security Hardening (SEC-004 to SEC-010)
- [ ] Sprint 3: Validation & Testing
- [ ] Standalone fix

---

## Additional Context

### References

- OWASP Reference: [Link]
- CVE (if applicable): [CVE-XXXX-XXXXX]
- Security Advisory: [Link]
- Internal Security Runbook: [Link to docs/SECURITY_RUNBOOK.md]

### Screenshots/Logs

<!-- If applicable, add screenshots showing the security feature working -->

### Questions for Reviewers

<!-- Any specific areas you want reviewers to focus on? -->

---

## Pre-Merge Checklist

**Before merging, ensure**:
- [ ] All CI checks passing
- [ ] Security tests passing
- [ ] Code review approved by 2+ reviewers
- [ ] No merge conflicts
- [ ] Branch is up to date with main
- [ ] Documentation is complete
- [ ] Environment variables documented
- [ ] Rollback plan is clear

---

## Post-Merge Actions

**After merging**:
- [ ] Deploy to staging
- [ ] Run full regression test suite
- [ ] Monitor for 24 hours in production
- [ ] Update security documentation
- [ ] Close related security tickets
- [ ] Notify security team

---

**PR Created**: [Date]
**Author**: @[github-username]
**Reviewers**: @[reviewer1], @[reviewer2]
**Labels**: `security`, `sprint-X`, `SEC-XXX`
