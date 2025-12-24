# Conflict Resolution Guide

**Created**: 2025-12-01
**Purpose**: Step-by-step instructions for resolving merge conflicts during security branch consolidation
**Target Audience**: DevOps Engineers, Senior Developers

---

## Overview

This guide provides detailed instructions for resolving the expected conflicts when merging 20 security branches. The primary conflict is a **128-file three-way overlap** between:

- `sec-005-complete-csrf-middleware` (134 files)
- `sec-006-complete-rate-limiting` (178 files)
- `sec-008-complete-error-sanitization` (132 files)

---

## Conflict Types & Resolution Strategies

### Conflict Type 1: Three-Way API Route Overlap (100+ files)

**Scenario**: Same API route file modified by all three branches for different security features

**Example**: `app/api/admin/grant-role/route.ts`

**What Each Branch Changes**:
- **SEC-008**: Adds `import { errorResponse } from '@/lib/api-response'` and migrates catch blocks
- **SEC-006**: Adds `import { rateLimit } from '@/lib/rate-limit'` and adds rate limiting check
- **SEC-005**: May add CSRF token handling in request processing

**Resolution Strategy**: **COMBINE ALL CHANGES**

#### Step-by-Step Resolution

**1. Identify the conflict markers**:
```typescript
<<<<<<< HEAD
// Code from first merged branch
=======
// Code from second merged branch
>>>>>>> branch-name
```

**2. Combine imports** (top of file):
```typescript
// CORRECT: Combine all imports
import { errorResponse, unauthorizedResponse } from '@/lib/api-response' // from SEC-008
import { rateLimit } from '@/lib/rate-limit' // from SEC-006
import { verifyCsrfToken } from '@/lib/csrf' // from SEC-005 (if present)
```

**3. Combine security checks** (in handler function):
```typescript
export async function POST(request: NextRequest) {
  try {
    // SEC-006: Rate limiting (should be FIRST)
    const rateLimitResult = await rateLimit(request, {
      limit: 5,
      window: '1h',
      identifier: 'grant-role'
    })
    if (!rateLimitResult.success) {
      return rateLimitResult.response
    }

    // SEC-005: CSRF validation (if applicable)
    // Note: Usually handled by middleware, not in route

    // Existing authentication/authorization
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return unauthorizedResponse('Not authenticated')
    }

    // ... rest of handler logic ...

  } catch (error: any) {
    // SEC-008: Error sanitization
    return errorResponse(error, {
      route: '/api/admin/grant-role',
      method: 'POST',
      userId: session?.user?.id
    })
  }
}
```

**4. Verify the merge**:
- All imports present
- Rate limit check is FIRST (before expensive operations)
- Authentication checks follow
- Catch block uses `errorResponse()` (not raw error)
- No duplicate code
- No syntax errors (missing braces, semicolons)

---

### Conflict Type 2: Library File Creation (3-4 files)

**Scenario**: Multiple branches create the same library file

**Affected Files**:
- `lib/api-response.ts` (created in SEC-008)
- `lib/rate-limit.ts` (created in SEC-006)
- `lib/csrf.ts` (created in SEC-005)
- `lib/url-validation.ts` (created in SEC-001)

**Resolution Strategy**: **ACCEPT THE BRANCH CREATING IT**

These files are typically created in only ONE branch, so conflicts are rare. If conflict occurs:

#### Resolution Steps

**1. Check which branch owns the file**:
```bash
# Check if file exists in branch
git show sec-008-complete-error-sanitization:lib/api-response.ts
git show sec-006-complete-rate-limiting:lib/api-response.ts
```

**2. Accept the owning branch's version**:
```bash
# If SEC-008 creates lib/api-response.ts:
git checkout --theirs lib/api-response.ts

# If SEC-006 creates lib/rate-limit.ts:
git checkout --theirs lib/rate-limit.ts
```

**3. Verify no functionality is lost**:
- Compare both versions (if both branches have it)
- Ensure all exported functions are present
- Check for any branch-specific enhancements

---

### Conflict Type 3: Middleware.ts Creation (CRITICAL)

**Scenario**: Two different middleware.ts files created

**Conflict Between**:
- `sec-003-storage-rules-migration`: Creates middleware.ts with family/subscription logic
- `sec-005-complete-csrf-middleware`: Creates middleware.ts with CSRF protection

**Resolution Strategy**: **MANUAL MERGE - COMBINE BOTH**

#### Resolution Steps

**1. Extract both versions**:
```bash
# Get SEC-003 version
git show sec-003-storage-rules-migration:middleware.ts > /tmp/middleware-sec003.ts

# Get SEC-005 version
git show sec-005-complete-csrf-middleware:middleware.ts > /tmp/middleware-sec005.ts
```

**2. Analyze differences**:
```bash
# Compare the two files
diff /tmp/middleware-sec003.ts /tmp/middleware-sec005.ts
```

**3. Create combined middleware**:

**SEC-003 version** (family/subscription features):
```typescript
// Family plan and subscription logic
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Subscription checks
  // Family plan validation
  // ... family-specific logic ...
}
```

**SEC-005 version** (CSRF protection):
```typescript
// CSRF protection
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
const BYPASS_PATTERNS = [/^\/_next\//, /^\/api\/webhooks\//]

export function middleware(request: NextRequest) {
  // CSRF token validation
  // ... security logic ...
}
```

**COMBINED version** (correct):
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

// CSRF Protection (SEC-005)
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
const BYPASS_PATTERNS = [
  /^\/_next\//,
  /^\/api\/webhooks\//,
  /^\/api\/auth\/webhook$/,
]

const isDevelopmentBypass = process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CSRF Protection Logic (SEC-005) - RUNS FIRST FOR SECURITY
  if (!isDevelopmentBypass && pathname.startsWith('/api')) {
    let shouldCheckCsrf = true

    // Check bypass patterns
    for (const pattern of BYPASS_PATTERNS) {
      if (pattern.test(pathname)) {
        shouldCheckCsrf = false
        break
      }
    }

    // Check if unsafe method
    if (shouldCheckCsrf && UNSAFE_METHODS.includes(request.method)) {
      const cookieToken = request.cookies.get('csrf-token')?.value
      const headerToken = request.headers.get('x-csrf-token')

      if (!cookieToken || !headerToken) {
        logger.warn('[CSRF] Token missing:', {
          path: pathname,
          method: request.method,
          hasCookie: !!cookieToken,
          hasHeader: !!headerToken,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        })

        return NextResponse.json(
          {
            error: 'CSRF token missing',
            code: 'CSRF_TOKEN_MISSING',
            message: 'Cross-Site Request Forgery token is required',
          },
          { status: 403 }
        )
      }

      if (cookieToken !== headerToken) {
        logger.warn('[CSRF] Token mismatch:', {
          path: pathname,
          method: request.method,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        })

        return NextResponse.json(
          {
            error: 'Invalid CSRF token',
            code: 'CSRF_TOKEN_INVALID',
            message: 'Cross-Site Request Forgery token validation failed',
          },
          { status: 403 }
        )
      }
    }
  }

  // Family/Subscription Logic (SEC-003) - RUNS SECOND
  // Add family plan validation logic here if needed
  // Example:
  // const subscription = await checkUserSubscription(request)
  // if (!subscription.isValid) {
  //   return NextResponse.redirect('/upgrade')
  // }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

**4. Test the combined middleware**:
- CSRF protection works for API routes
- Family/subscription logic still functions
- No infinite redirects
- Bypass patterns work correctly

---

### Conflict Type 4: Test Files (5-10 files)

**Scenario**: Multiple branches add tests to same test file

**Example**: `__tests__/lib/rate-limit.test.ts` might be created/modified by multiple branches

**Resolution Strategy**: **COMBINE ALL TEST SUITES**

#### Resolution Steps

**1. Identify conflicting test suites**:
```typescript
<<<<<<< HEAD
describe('Rate Limit - Basic', () => {
  test('should limit after threshold', async () => {
    // Test from first branch
  })
})
=======
describe('Rate Limit - Integration', () => {
  test('should work with Redis', async () => {
    // Test from second branch
  })
})
>>>>>>> branch-name
```

**2. Combine test suites**:
```typescript
// CORRECT: Keep all tests
describe('Rate Limit', () => {
  describe('Basic Functionality', () => {
    test('should limit after threshold', async () => {
      // Test from first branch
    })
  })

  describe('Integration Tests', () => {
    test('should work with Redis', async () => {
      // Test from second branch
    })
  })

  describe('Edge Cases', () => {
    test('should handle missing Redis gracefully', async () => {
      // Additional test from third branch
    })
  })
})
```

**3. Ensure unique test names**:
- No duplicate test descriptions
- Use nested `describe` blocks for organization
- Keep all test coverage

**4. Verify tests pass**:
```bash
npm test -- __tests__/lib/rate-limit.test.ts
```

---

### Conflict Type 5: Documentation Files (10+ files)

**Scenario**: Multiple branches modify same documentation file

**Example**: `docs/SECURITY_ARCHITECTURE.md`, `README.md`

**Resolution Strategy**: **COMBINE ALL SECTIONS, REMOVE DUPLICATES**

#### Resolution Steps

**1. Accept all new content**:
```markdown
<<<<<<< HEAD
## Security Features

- SSRF Protection
- Rate Limiting
=======
## Security Features

- Error Sanitization
- CSRF Protection
>>>>>>> branch-name
```

**2. Combine and deduplicate**:
```markdown
## Security Features

- SSRF Protection (SEC-001)
- CSRF Protection (SEC-005)
- Rate Limiting (SEC-006)
- Error Sanitization (SEC-008)
- Security Headers (SEC-009)
```

**3. Maintain logical order**:
- Group related features
- Use consistent formatting
- Add references to implementation

---

### Conflict Type 6: Package Dependencies

**Scenario**: Multiple branches add dependencies to package.json

**Example**:
```json
<<<<<<< HEAD
{
  "dependencies": {
    "existing-dep": "1.0.0",
    "@upstash/redis": "^1.25.0"
  }
}
=======
{
  "dependencies": {
    "existing-dep": "1.0.0",
    "@upstash/ratelimit": "^1.2.0"
  }
}
>>>>>>> branch-name
```

**Resolution Strategy**: **COMBINE ALL DEPENDENCIES**

#### Resolution Steps

**1. Merge all dependencies**:
```json
{
  "dependencies": {
    "existing-dep": "1.0.0",
    "@upstash/redis": "^1.25.0",
    "@upstash/ratelimit": "^1.2.0"
  }
}
```

**2. Sort alphabetically** (optional but recommended):
```json
{
  "dependencies": {
    "@upstash/ratelimit": "^1.2.0",
    "@upstash/redis": "^1.25.0",
    "existing-dep": "1.0.0"
  }
}
```

**3. Regenerate package-lock.json**:
```bash
rm package-lock.json
npm install
```

**4. Verify no dependency conflicts**:
```bash
npm ls
# Should show no conflicts
```

---

## Sequential Merge Order (CRITICAL)

To minimize conflicts, merge branches in this **exact order**:

### Phase 1: Infrastructure (No conflicts expected)
1. `sec-002-super-admin-env`
2. `sec-009-security-headers`
3. `production-deployment-runbook`
4. `production-migration-plan`

### Phase 2: Base Libraries (Low conflicts)
5. `sec-001-ssrf-fix` (creates lib/url-validation.ts)
6. `sec-007-recipe-rules` (firestore.rules)

### Phase 3: Error Handling - BASE LAYER
7. `sec-008-complete-error-sanitization` (creates lib/api-response.ts)
   - **STOP AND TEST** after this merge
   - Run: `npm run build && npm test`
   - This is the foundation for layers above

### Phase 4: Rate Limiting - MIDDLE LAYER
8. `sec-006-complete-rate-limiting` (creates lib/rate-limit.ts, modifies API routes)
   - **EXPECT CONFLICTS**: ~128 files with sec-008
   - **Resolution**: Follow "Conflict Type 1" above
   - **STOP AND TEST** after this merge

### Phase 5: CSRF Protection - TOP LAYER
9. `sec-005-complete-csrf-middleware` (creates middleware.ts, modifies API routes)
   - **EXPECT CONFLICTS**: ~128 files with sec-008 and sec-006
   - **Resolution**: Follow "Conflict Type 1" and "Conflict Type 3"
   - **STOP AND TEST** after this merge

### Phase 6: Testing & Validation
10. `sec-sprint3-regression-tests` (adds test suites)
11. `sec-sprint3-migration-validation` (adds migration scripts)

**RATIONALE**:
- Each layer builds on the previous
- Error handlers must exist before rate limiters reference them
- Rate limiters must exist before CSRF middleware uses them
- Testing comes last to validate the complete stack

---

## Conflict Resolution Workflow

### Pre-Merge Checklist

Before attempting any merge:

```bash
# 1. Ensure clean working directory
git status
# Should show: "nothing to commit, working tree clean"

# 2. Ensure on main branch
git branch --show-current
# Should show: "main"

# 3. Ensure main is up to date
git pull origin main

# 4. Create backup
git branch main-backup-$(date +%Y%m%d-%H%M%S)
```

---

### During Merge

**1. Attempt the merge**:
```bash
git merge --no-ff sec-008-complete-error-sanitization -m "Merge SEC-008: Error sanitization"
```

**2. If conflicts occur**:
```bash
# Git will show:
# Auto-merging app/api/admin/grant-role/route.ts
# CONFLICT (content): Merge conflict in app/api/admin/grant-role/route.ts
# Automatic merge failed; fix conflicts and then commit the result.
```

**3. List conflicted files**:
```bash
git status | grep "both modified"
```

**4. Resolve each file**:
```bash
# Open in editor
code app/api/admin/grant-role/route.ts

# Or use merge tool
git mergetool
```

**5. Follow appropriate conflict type resolution** (see above)

**6. Mark as resolved**:
```bash
git add app/api/admin/grant-role/route.ts
```

**7. Repeat for all conflicted files**

**8. Verify resolution**:
```bash
# Check no conflicts remain
git status
# Should show: "All conflicts fixed but you are still merging"

# Verify build works
npm run build
```

**9. Complete the merge**:
```bash
git commit --no-edit
```

---

### Post-Merge Validation

After each merge phase:

```bash
# 1. Build succeeds
npm run build
# Exit code should be 0

# 2. Tests pass
npm test
# All tests should pass

# 3. Lint passes
npm run lint
# No errors

# 4. Type check passes
npx tsc --noEmit
# No errors

# 5. Manual smoke test
# Start dev server and test affected endpoints
npm run dev
```

**If any validation fails**:
1. DO NOT proceed to next merge
2. Fix the issues in the current merge
3. Commit fixes
4. Re-run validation
5. Only proceed when all checks pass

---

## Common Pitfalls & Solutions

### Pitfall 1: Duplicate Imports

**Problem**:
```typescript
import { errorResponse } from '@/lib/api-response'
import { errorResponse } from '@/lib/api-response' // Duplicate!
```

**Solution**:
```typescript
// Combine into single import
import { errorResponse, validationError } from '@/lib/api-response'
```

---

### Pitfall 2: Incorrect Merge Order

**Problem**: Merging sec-006 (rate limiting) before sec-008 (error handlers)

**Symptom**:
```typescript
// In route file
const result = await rateLimit(...)
if (!result.success) {
  return result.response // Uses errorResponse internally
}
// But errorResponse doesn't exist yet!
```

**Solution**: Follow the sequential merge order exactly (Phase 3 → Phase 4 → Phase 5)

---

### Pitfall 3: Missing Security Checks After Merge

**Problem**: Accidentally removing security check during conflict resolution

**Example**:
```typescript
// Before merge: Has rate limit check
const rateLimitResult = await rateLimit(request, { ... })

// After merge: Accidentally removed
// (no rate limit check)
```

**Solution**:
- Always verify BOTH sides of conflict are merged
- Use checklist: rate limit + error handler + auth
- Test each endpoint manually after merge

---

### Pitfall 4: Syntax Errors from Manual Editing

**Problem**: Introducing syntax errors during manual conflict resolution

**Symptoms**:
- Missing semicolons
- Unclosed braces
- Missing commas in objects

**Solution**:
```bash
# Run linter immediately after resolving each file
npm run lint -- --fix

# Or use TypeScript compiler
npx tsc --noEmit
```

---

### Pitfall 5: Git Markers Left in Code

**Problem**: Forgetting to remove conflict markers

**Example**:
```typescript
<<<<<<< HEAD
const result = await rateLimit(request)
=======
const result = await checkRate(request)
>>>>>>> branch-name
```

**Solution**:
```bash
# Search for any remaining markers
grep -r "<<<<<<< HEAD" .
grep -r ">>>>>>> " .

# Should return no results before committing
```

---

## Emergency Rollback

If merge goes wrong:

### Option 1: Abort Merge (Before Commit)

```bash
git merge --abort
# Returns to pre-merge state
```

### Option 2: Revert Merge (After Commit)

```bash
# Find merge commit
git log --oneline -5

# Revert the merge
git revert -m 1 <merge-commit-sha>
git push origin main
```

### Option 3: Reset to Backup (Nuclear Option)

```bash
# ⚠️ DANGEROUS - Coordinate with team first
git reset --hard main-backup-20251201-103045
git push origin main --force
```

---

## Validation Checklist

After completing ALL merges, verify:

### Functionality
- [ ] All security features work independently
- [ ] SSRF protection blocks private IPs
- [ ] Rate limiting returns 429 after threshold
- [ ] CSRF protection blocks invalid tokens
- [ ] Error sanitization hides stack traces in production

### Integration
- [ ] All security features work together
- [ ] No feature interferes with another
- [ ] Middleware runs in correct order (CSRF → rate limit → handler)

### Code Quality
- [ ] No conflict markers remain (`<<<<<<<`)
- [ ] No duplicate imports
- [ ] No syntax errors
- [ ] Build succeeds: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] Lint passes: `npm run lint`

### Git Hygiene
- [ ] Git history is clean (no weird merge commits)
- [ ] Commit messages are descriptive
- [ ] No uncommitted changes
- [ ] Tags created for major milestones

---

## Tools & Commands Reference

### Git Commands

```bash
# Show files changed between branches
git diff --name-only main...sec-005-complete-csrf-middleware

# Show content of file from specific branch
git show sec-008-complete-error-sanitization:lib/api-response.ts

# Compare two branches
git diff sec-005-complete-csrf-middleware..sec-006-complete-rate-limiting

# List all merge conflicts
git diff --name-only --diff-filter=U

# Accept "theirs" version (incoming branch)
git checkout --theirs path/to/file

# Accept "ours" version (current branch)
git checkout --ours path/to/file

# Show merge commit history
git log --merges --oneline

# Find commit that introduced file
git log --diff-filter=A -- path/to/file
```

### NPM Commands

```bash
# Fast build check
npm run build

# Run specific test file
npm test -- __tests__/lib/rate-limit.test.ts

# Run linter with auto-fix
npm run lint -- --fix

# Type check only (no emit)
npx tsc --noEmit

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Search Commands

```bash
# Find files with conflict markers
grep -r "<<<<<<< HEAD" app/

# Find old error patterns (should be 0 after SEC-008)
grep -r "details: error" app/api/

# Find missing imports
grep -l "errorResponse" app/api/**/*.ts | xargs grep -L "from '@/lib/api-response'"

# Count API routes with rate limiting
grep -r "rateLimit(" app/api/ | wc -l
```

---

## Success Metrics

**Merge is successful when**:

1. **All conflicts resolved**: 0 files with conflict markers
2. **Build succeeds**: `npm run build` exits with code 0
3. **Tests pass**: 100% pass rate on `npm test`
4. **No errors**: `npm run lint` shows 0 errors
5. **Security works**: Manual testing confirms all features functional
6. **Performance**: No degradation in response times
7. **Team confidence**: Code review approved by 2+ senior engineers

**Estimated Conflict Resolution Time**:
- Phase 1-2: 30 minutes (no conflicts expected)
- Phase 3: 2-3 hours (SEC-008 conflicts)
- Phase 4: 3-4 hours (SEC-006 conflicts with SEC-008)
- Phase 5: 2-3 hours (SEC-005 conflicts with SEC-006 and SEC-008)
- Phase 6: 30 minutes (test conflicts)
- **Total**: 8-11 hours for complete merge

---

## Contact & Escalation

**If you encounter issues**:

1. **Unclear conflict**: Consult this guide and security branch documentation
2. **Code question**: Review original PR or commit message for context
3. **Stuck on conflict**: Reach out to:
   - Security Lead (SEC-* branches)
   - Backend Lead (API route conflicts)
   - DevOps Lead (deployment/infrastructure)

**Escalation path**:
1. Self-resolve using this guide (15-30 min)
2. Slack/Teams channel help (30 min)
3. Video call with senior engineer (1 hour)
4. Abort merge and schedule team session (2+ hours)

---

**Guide Version**: 1.0
**Last Updated**: 2025-12-01
**Maintained By**: Production Deployment Agent 1
