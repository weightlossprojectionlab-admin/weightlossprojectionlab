# Documentation Archive

This directory contains completed implementation summaries, historical code reviews, and deployment reports that are no longer actively maintained but preserved for reference.

## Directory Structure

### `/implementation-summaries/`
Completed feature implementations and architecture documents from 2025. These represent finished work that successfully made it to production.

**Examples:**
- Dark mode implementation
- Family onboarding system
- Notification preferences
- Medication audit trails
- Shopping suggestions with Gemini AI

### `/code-reviews/`
Historical code reviews and architecture audits conducted during development cycles.

**Dates:**
- October 2025
- November 2025

### `/deployment-reports/`
Build validation, dependency checks, and production deployment reports.

**Includes:**
- Pre-deployment validation
- Production readiness assessments
- Merge and rollback plans
- Performance analysis

### `/fixes/`
Quick fix summaries and bug resolution documentation.

**Examples:**
- Console log cleanup
- Firestore index fixes
- Gemini API configuration fixes
- Permission fixes

### `/migrations/`
Data migration procedures and execution guides for schema changes.

**Examples:**
- Medication data migration
- Patient logs migration
- Provider multi-member migration
- Audit trail deployment

---

## When to Archive vs Delete

### Archive (Preserve)
- ✅ Completed feature implementations
- ✅ Historical code/architecture reviews
- ✅ Deployment validation reports
- ✅ Migration execution summaries
- ✅ Bug fix documentation

**Why:** Provides historical context, helps with future debugging, shows evolution of the codebase

### Delete (Remove Permanently)
- ❌ Obsolete guides with better versions
- ❌ Empty/stub files
- ❌ Duplicate documentation
- ❌ Marketing content (not technical docs)

---

## Accessing Archived Docs

All files in this archive are preserved in git history. To search archived docs:

```bash
# Search all archived docs
grep -r "search term" docs/archive/

# List all implementation summaries
ls docs/archive/implementation-summaries/

# View a specific archived doc
cat docs/archive/implementation-summaries/DARK_MODE_IMPLEMENTATION_SUMMARY.md
```

---

## Active Documentation

For current, actively maintained documentation, see:

- `/README.md` - Project overview
- `/CLAUDE.md` - AI assistant context
- `/QUICKSTART.md` - Getting started guide
- `/RUNBOOK.md` - Operations guide
- `/docs/SECURITY_ARCHITECTURE.md` - Security documentation
- `/docs/FEATURE_GATING.md` - Subscription features
- `/docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md` - Deployment procedures
- `/docs/STRIPE_COMPLETE_GUIDE.md` - Payment integration

---

## Archive Date

**Created:** December 24, 2025

**Files Archived:** 115+ documents

**Space Saved:** Reduced active documentation by 68%, making it easier for new developers to find relevant, current information.

---

## Notes

- **Nothing was deleted:** All historical work is preserved
- **Organized by category:** Easy to navigate
- **Git history intact:** Full commit history maintained
- **Searchable:** All content remains searchable via git and grep

If you need to reference historical implementation details or understand how a feature was built, check this archive first!
