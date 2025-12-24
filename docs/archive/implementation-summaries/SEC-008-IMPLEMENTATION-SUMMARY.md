# SEC-008: Error Sanitization Implementation Summary

## Branch: sec-008-error-sanitization

## Goal
Replace all instances of `error.stack` or raw error exposure in API routes with the centralized `errorResponse()` helper to prevent stack traces from being exposed in production.

## Implementation Status

### ✅ Completed

1. **Created centralized error response handler**
   - File: `lib/api-response.ts`
   - Exports: `errorResponse()`, `successResponse()`, `validationError()`, `unauthorizedResponse()`, `forbiddenResponse()`, `notFoundResponse()`
   - Production behavior: Returns generic "Internal server error" with error code
   - Development behavior: Returns full error details including stack trace
   - All errors logged server-side with full context

2. **Added errorResponse import to 31 API route files**
   - Used automated script: `tools/bulk-fix-errors.sh`
   - Files affected:
     - admin routes (ai-decisions, recipes, users)
     - ai routes (analyze-meal, health-profile, meal-safety)
     - appointment routes
     - caregiver routes
     - patient routes (medications, documents, family, etc.)
     - provider routes
     - user-profile routes
     - utility routes (fix-start-weight, fix-onboarding, debug-profile)

### ⏳ In Progress

**Manual catch block replacements**
   - Import statements added to all 31 files
   - Catch blocks need manual replacement due to varying patterns:
     - Different route context parameters
     - Different error handling logic
     - Some validation errors vs runtime errors
     - Async param extraction patterns

### 📋 Remaining Work

1. **Replace catch block implementations** (31 files)
   - Pattern to replace:
     ```typescript
     } catch (error: any) {
       logger.error('...', error)
       return NextResponse.json(
         { success: false, error: '...', details: error.message },
         { status: 500 }
       )
     }
     ```
   - Replace with:
     ```typescript
     } catch (error: any) {
       return errorResponse(error, {
         route: '/api/path',
         method: 'GET',  // or POST, PUT, DELETE, PATCH
         ...relevantIds  // patientId, userId, etc.
       })
     }
     ```

2. **Verification steps**
   ```bash
   # Should return 0 results
   grep -r "error\.stack" app/api/ --include="*.ts"
   grep -r "details: error" app/api/ --include="*.ts"

   # Build and lint
   npm run lint
   npm run build
   ```

3. **Testing**
   - Test error responses in development (should show stack traces)
   - Test error responses in production mode (should hide stack traces)
   - Verify server-side logging still captures full error details

## Files Requiring Manual Fixes

### High Priority (commonly accessed)
- `app/api/user-profile/route.ts` (GET, PUT, PATCH - 4 catch blocks)
- `app/api/patients/[patientId]/route.ts` (GET, PUT, DELETE - 3 catch blocks)
- `app/api/patients/[patientId]/medications/route.ts` (GET, POST - 2 catch blocks)
- `app/api/appointments/route.ts` (GET, POST - 2 catch blocks)

### Medium Priority
- `app/api/ai/analyze-meal/route.ts` (1 catch block)
- `app/api/recipes/generate-from-inventory/route.ts` (1 catch block)
- `app/api/appointments/recommendations/route.ts` (GET, POST - 2 catch blocks)
- All patient medication/document routes (6 files)

### Low Priority (debug/admin only)
- `app/api/fix-start-weight/route.ts`
- `app/api/fix-onboarding/route.ts`
- `app/api/debug-profile/route.ts`
- Admin routes (recipes, users, ai-decisions)

## Tools Created

1. `tools/bulk-fix-errors.sh` - Adds errorResponse imports
2. `tools/fix-api-errors.py` - Python script for import management
3. `tools/fix-catch-blocks.py` - Python script for catch block replacement (partially implemented)
4. `tools/check-ownership.sh` - Ownership verification for SEC tasks

## Current Metrics

- **Files with `error.stack`**: 6 remaining (mostly in logging context)
- **Files with `details: error`**: 43 instances across 31 files
- **Files with errorResponse import**: 31 files
- **Files fully migrated**: 0 (imports added, catch blocks pending)

## Next Steps

1. Manually fix catch blocks in high-priority files
2. Run verification greps
3. Test in development and production modes
4. Run `npm run lint` and `npm run build`
5. Commit with message: "SEC-008: Sanitize error responses in production"
6. Create internal documentation (no GitHub PR per instructions)

## Notes

- **DO NOT** remove error.stack from logger calls - those are server-side only
- **DO** ensure all catch blocks use errorResponse() for API responses
- **VERIFY** production mode hides stack traces before deploying
- **TEST** that server-side logs still contain full error details

## Acceptance Criteria

- [ ] No `error.stack` in production API responses
- [ ] All API routes use `errorResponse()` helper
- [x] Dev mode shows detailed errors
- [x] Production shows generic "Internal server error" message
- [x] All errors logged server-side with full details
- [ ] Grep searches return 0 results for problematic patterns
- [ ] Build succeeds with no errors
- [ ] Lint passes with no errors

Status: **In Progress** - Imports added, catch blocks need manual completion
