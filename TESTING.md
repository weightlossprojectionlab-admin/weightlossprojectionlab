# Testing & Pre-Deploy Validation Guide

This document explains how to test and validate the Weight Loss Project Lab application before deploying to Netlify.

## Quick Start

### For Windows (PowerShell):
```powershell
.\scripts\pre-deploy-check.ps1
```

### For Linux/Mac (Bash):
```bash
chmod +x scripts/pre-deploy-check.sh
./scripts/pre-deploy-check.sh
```

## Manual Testing Steps

If you prefer manual validation or need to troubleshoot specific issues:

### 1. Check Git Status
```bash
git status
```
**Expected:** No uncommitted changes (except local config files)

**Fix if needed:**
```bash
git add .
git commit -m "Your commit message"
```

---

### 2. Validate TypeScript Types

**Quick check:**
```bash
npm run build
```
This runs full type checking as part of the build.

**Deep check (slower):**
```bash
npx tsc --noEmit
```

**Common errors to fix:**
- Next.js 15 params: Change `params: { id: string }` to `params: Promise<{ id: string }>`
- Component props: Ensure prop types match usage
- Import/export: Check all imports resolve correctly

---

### 3. Verify Dynamic Routes

**Check for old-style params:**
```bash
grep -r "params: {" app --include="*.tsx" --include="*.ts" | grep -v "Promise" | grep -v "useParams"
```

**Expected:** No results (or only client components using useParams)

**Fix pattern:**
```typescript
// ❌ Old (Next.js 14):
export default function Page({ params }: { params: { id: string } }) {
  const id = params.id
}

// ✅ New (Next.js 15):
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

---

### 4. Clean Build

**Remove cached artifacts:**
```bash
rm -rf .next
rm -rf node_modules/.cache
```

**Run production build:**
```bash
npm run build
```

**Expected output:**
- ✓ Compiled successfully
- ✓ Checking validity of types ...
- ✓ Collecting page data ...
- Build completed without errors

---

### 5. Manual Smoke Tests

**Start development server:**
```bash
npm run dev
```

**Test these key routes:**

| Route | Expected Behavior |
|-------|-------------------|
| `/` | Landing page loads |
| `/auth` | Auth page loads, shows sign in/up |
| `/dashboard` | Protected route, requires auth |
| `/recipes` | Recipe list displays |
| `/recipes/[id]` | Individual recipe loads |
| `/log-meal` | Meal logging interface |
| `/progress` | Charts and stats display |
| `/admin` | Admin panel (for admins only) |

**Test interactions:**
- Click navigation links
- Toggle dark mode (check all pages)
- Open modals and forms
- Check browser console for errors

---

## Common Build Errors & Fixes

### Error: Type 'params' is not assignable

**Problem:** Using old Next.js 14 params syntax

**Fix:**
```typescript
// Change this:
{ params }: { params: { id: string } }

// To this:
{ params }: { params: Promise<{ id: string }> }

// And await it:
const { id } = await params
```

---

### Error: Module not found

**Problem:** File exists locally but not tracked by git

**Fix:**
```bash
git status  # Check untracked files
git add path/to/missing/file
git commit -m "Add missing file"
```

---

### Error: Type '"large"' is not assignable to type 'SpinnerSize'

**Problem:** Invalid prop value

**Fix:** Check component definition for valid values
```typescript
// Valid Spinner sizes: 'sm' | 'md' | 'lg'
<Spinner size="lg" />  // ✓ Correct
<Spinner size="large" />  // ✗ Wrong
```

---

### Error: Cannot read property of undefined

**Problem:** Missing null/undefined checks

**Fix:** Add optional chaining
```typescript
// Change this:
const value = user.profile.name

// To this:
const value = user?.profile?.name
```

---

## Automated Testing (Future)

### Unit Tests
```bash
npm run test
```
*(To be implemented)*

### E2E Tests
```bash
npm run test:e2e
```
*(To be implemented with Playwright/Cypress)*

---

## Pre-Push Checklist

Before running `git push origin main`:

- [ ] All files committed (`git status` shows clean)
- [ ] TypeScript validates (`npm run build` succeeds)
- [ ] Dynamic routes use Next.js 15 syntax
- [ ] Manual smoke tests pass
- [ ] No console errors in dev mode
- [ ] Dark mode works on all pages

---

## Netlify Build Monitoring

After pushing:

1. Go to https://app.netlify.com/sites/YOUR_SITE/deploys
2. Watch the build log in real-time
3. If build fails:
   - Read error message carefully
   - Fix locally
   - Run validation scripts again
   - Push fix

---

## Rollback Procedure

If a deploy breaks production:

```bash
# Find last working commit
git log --oneline

# Revert to it
git revert HEAD
git push origin main

# Or force push previous commit (use with caution)
git reset --hard <commit-hash>
git push --force origin main
```

---

## Performance Monitoring

### Build Time Baseline
- Clean build: ~2-3 minutes
- Incremental build: ~30-60 seconds

### Bundle Size Targets
- First Load JS: < 200 KB per page
- Total Size: < 5 MB

Check with:
```bash
npm run build
# Review "First Load JS" column in output
```

---

## Contact & Support

For build issues or questions:
- Check [Next.js 15 migration guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- Review recent commits: `git log --oneline -10`
- Check Netlify deploy logs

---

## Version History

| Date | Change | Impact |
|------|--------|--------|
| 2025-10-22 | Added pre-deploy scripts | Catch errors before push |
| 2025-10-22 | Next.js 15 migration | All dynamic routes updated |
| 2025-10-22 | Dark mode implementation | All components support dark mode |

---

**Last Updated:** 2025-10-22
**Maintainer:** Development Team
