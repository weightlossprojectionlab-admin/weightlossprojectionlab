# Hotfix PR 🚨

## 🔥 Critical Issue
<!-- What production issue are you fixing? -->

**Issue Description:**


**Severity:**
- [ ] 🔴 Critical - App is down/broken
- [ ] 🟡 High - Major feature broken
- [ ] 🟠 Medium - Minor feature broken
- [ ] 🟢 Low - Small bug

## 🐛 Bug Details

**What's Broken:**


**How to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Error Messages (if any):**
```
paste error here
```

## 🔧 Fix Description
<!-- Explain your fix -->

**Root Cause:**


**Solution:**


**Why this approach:**


## 📝 Files Changed
<!-- List files modified -->

-
-

## 🧪 Testing

### Verification Steps
<!-- How to verify the fix works -->

1.
2.
3.

### Test Results
- [ ] Bug no longer reproduces
- [ ] No new issues introduced
- [ ] All existing tests pass
- [ ] Tested in production environment (if possible)

## ⚠️ Risk Assessment

**Risk Level:**
- [ ] Low - Simple fix, well-tested
- [ ] Medium - Touches critical code
- [ ] High - Complex change needed

**Mitigation:**
<!-- How are you reducing risk? -->

-

## 🚀 Deployment Strategy

**Urgency:**
- [ ] Deploy immediately after merge
- [ ] Can wait for next deployment window
- [ ] Schedule for: __________

**Rollback Plan:**
<!-- How to rollback if this causes issues -->

```bash
# Rollback steps
```

## 📊 Impact

**Users Affected:**
- [ ] All users
- [ ] Specific user segment: __________
- [ ] Admin users only

**Downtime Required:**
- [ ] No downtime
- [ ] Brief downtime (< 1 min)
- [ ] Scheduled maintenance window

## 🔍 Related Issues
<!-- Link to GitHub issue, Sentry error, etc. -->

- Issue: #
- Sentry: [link]
- User Report: [link]

## ✅ Pre-Merge Checklist

- [ ] Fix verified locally
- [ ] Root cause identified and documented
- [ ] No other areas affected by this change
- [ ] Tests added to prevent regression
- [ ] Team notified of hotfix
- [ ] Monitoring plan in place

## 📈 Post-Deployment

**Monitoring:**
- [ ] Watch error logs
- [ ] Monitor specific metrics: __________
- [ ] User reports reviewed

**Follow-up:**
- [ ] Create tech debt ticket for proper fix (if this is a bandaid)
- [ ] Update documentation
- [ ] Conduct post-mortem (for critical issues)

---

## Reviewer Checklist

- [ ] Fix is minimal and focused
- [ ] Root cause is addressed (not just symptoms)
- [ ] No unnecessary changes included
- [ ] Rollback plan is clear
- [ ] Testing is adequate for urgency level
- [ ] Production deployment plan is clear

## Fast-Track Approval
<!-- For critical production issues -->

If this is a **CRITICAL** production issue:
- Approval from: ________________
- Deployment authorization: ________________
