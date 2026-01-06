# Developer Security Guidelines

**Version**: 1.0
**Last Updated**: 2025-12-01
**Audience**: All developers contributing to WPL
**Compliance**: OWASP Top 10 2021, WCAG 2.1 AA

---

## Table of Contents

1. [Secure Coding Practices](#secure-coding-practices)
2. [Security Review Checklist](#security-review-checklist)
3. [Common Vulnerabilities to Avoid](#common-vulnerabilities-to-avoid)
4. [Code Examples](#code-examples)
5. [Testing Security Features](#testing-security-features)
6. [CI/CD Security Integration](#cicd-security-integration)

---

## Secure Coding Practices

### 1. Input Validation

**Always validate all user input** - never trust client-supplied data.

#### URL Validation (SSRF Protection)

**Use**: `lib/validation.ts` for all input validation
**DO NOT**: Fetch user-provided URLs without validation

**Example**:
```typescript
import { validateRequestBody, validationErrorResponse } from '@/lib/validation'
import { z } from 'zod'

const schema = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(100)
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const validation = validateRequestBody(schema, body)

  if (!validation.success) {
    return validationErrorResponse(validation.errors)
  }

  // validation.data is now type-safe and validated
  const { url, name } = validation.data
}
```

**For External URL Fetching** (CRITICAL):
```typescript
// WRONG - Vulnerable to SSRF
const response = await fetch(userProvidedUrl)

// CORRECT - Protected with domain whitelist
import { validateURL } from '@/lib/url-validation'

try {
  const validatedUrl = await validateURL(userProvidedUrl)
  const response = await fetch(validatedUrl)
} catch (error) {
  return NextResponse.json(
    { error: 'Invalid or disallowed URL' },
    { status: 403 }
  )
}
```

**Domain Whitelist** (in `lib/url-validation.ts`):
- Only whitelisted domains can be fetched
- Blocks private IP ranges (127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16)
- Blocks cloud metadata endpoints (169.254.169.254)
- Performs DNS resolution to prevent rebinding attacks

---

### 2. Error Handling

**Use**: `lib/api-response.ts` for all API error responses
**DO NOT**: Return raw error objects or stack traces

#### Standardized Error Responses

**Import**:
```typescript
import {
  errorResponse,
  successResponse,
  validationError,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse
} from '@/lib/api-response'
```

**Usage**:
```typescript
// WRONG - Leaks stack trace in production
export async function POST(request: NextRequest) {
  try {
    // ... logic
  } catch (error: any) {
    console.error(error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}

// CORRECT - Sanitized in production, detailed in dev
export async function POST(request: NextRequest) {
  try {
    // ... logic
    return successResponse({ userId: '123' }, 201)
  } catch (error) {
    return errorResponse(error, {
      route: '/api/users',
      operation: 'create'
    })
  }
}
```

**Environment-Aware Sanitization**:
- **Production**: Returns generic `"Internal server error"` with error code
- **Development**: Returns full error message and stack trace
- **Always logs full details server-side** via `logger.error()`

---

### 3. Authentication Checks

**Verify Firebase Auth on all protected endpoints**

#### Basic Authentication

```typescript
import { getAuth } from 'firebase-admin/auth'
import { unauthorizedResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  // Get Authorization header
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorizedResponse('Missing or invalid token')
  }

  const token = authHeader.substring(7)

  try {
    // Verify token with Firebase
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Use userId for authorization
    // ...
  } catch (error) {
    return unauthorizedResponse('Invalid token')
  }
}
```

#### Super Admin Checks (Custom Claims)

```typescript
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorizedResponse()
  }

  const token = authHeader.substring(7)
  const decodedToken = await getAuth().verifyIdToken(token)

  // Check custom claims (preferred over hardcoded emails)
  if (!decodedToken.superAdmin) {
    return forbiddenResponse('Super admin access required')
  }

  // Proceed with admin action
}
```

**Migration Note**: Super admin emails moved to Firebase Custom Claims (SEC-002)
- **Old**: Hardcoded email array
- **New**: Check `decodedToken.superAdmin === true`
- **Set via**: `scripts/migrate-super-admins.ts`

---

### 4. Rate Limiting Application

**Use**: `lib/rate-limit.ts` for all expensive operations
**Apply to**: AI calls, email sending, external API calls, admin actions

#### Rate Limit Integration

```typescript
import { rateLimit } from '@/lib/rate-limit'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  // Apply rate limiting BEFORE expensive operations
  const rateLimitResult = await rateLimit(request, 'ai:gemini')
  if (rateLimitResult) {
    // Returns 429 with Retry-After header
    return rateLimitResult
  }

  // Proceed with AI call
  const aiResponse = await callGeminiAPI(...)
  return successResponse(aiResponse)
}
```

**Available Limiters**:
```typescript
'fetch-url'          // 10 requests per minute
'ai:gemini'          // 20 requests per minute
'admin:grant-role'   // 5 requests per hour
'email'              // 10 requests per hour
```

**Custom Identifier** (optional):
```typescript
// Rate limit by user ID instead of IP
const userId = decodedToken.uid
await rateLimit(request, 'ai:gemini', userId)
```

---

### 5. CSRF Token Handling

**Status**: Client-side implemented, server-side middleware pending (SEC-005)

#### Client-Side CSRF (Current Implementation)

**DO NOT** manually implement CSRF - use the pending middleware when available.

**Current Client Pattern**:
```typescript
// In client components (when middleware is deployed)
import { getCSRFToken } from '@/lib/csrf'

async function submitForm(data: FormData) {
  const response = await fetch('/api/example', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCSRFToken()  // Automatically included
    },
    body: JSON.stringify(data)
  })
}
```

**Pending Server-Side Middleware**:
```typescript
// Will be in middleware.ts (not yet deployed)
export function middleware(request: NextRequest) {
  // Validate CSRF token on unsafe methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const cookieToken = request.cookies.get('csrf-token')?.value
    const headerToken = request.headers.get('X-CSRF-Token')

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 }
      )
    }
  }

  return NextResponse.next()
}
```

---

### 6. CORS Configuration

**Use**: Environment-based origin whitelist
**DO NOT**: Use wildcard (`*`) CORS in production

#### Origin Validation Pattern

```typescript
export async function GET(request: NextRequest) {
  const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)
  const origin = request.headers.get('origin') ?? ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Vary'] = 'Origin'
  } else if (origin) {
    return NextResponse.json(
      { error: 'Origin not allowed' },
      { status: 403 }
    )
  }

  return NextResponse.json(data, { headers })
}
```

**Environment Variable**:
```bash
# .env.local (development)
ALLOWED_ORIGINS=http://localhost:3000

# Production
ALLOWED_ORIGINS=https://app.wpl.com,https://admin.wpl.com
```

---

### 7. Debug Endpoint Guards

**Always guard debug/fix endpoints** with production checks

#### Production Guard Pattern

```typescript
// In /api/debug-* or /api/fix-* routes
export async function GET(request: NextRequest) {
  // CRITICAL: Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  // Debug logic only runs in dev/test
  const debugData = await getDebugInfo()
  return successResponse(debugData)
}
```

**Affected Endpoints** (SEC-000/010):
- `/api/debug-profile`
- `/api/fix-start-weight`
- `/api/fix-onboarding`
- Any endpoint with `/debug-*` or `/fix-*` prefix

---

### 8. Firestore Security Rules

**Always enforce user ownership** in Firestore security rules

#### User-Scoped Data Pattern

```javascript
// In firestore.rules
match /users/{userId}/patients/{patientId} {
  // Only allow users to access their own patients
  allow read: if isOwner(userId);
  allow create: if isOwner(userId) && request.resource.data.userId == userId;
  allow update: if isOwner(userId) && resource.data.userId == userId;
  allow delete: if isOwner(userId) && resource.data.userId == userId;
}

function isOwner(userId) {
  return request.auth != null && request.auth.uid == userId;
}
```

**Always include `userId` in document data**:
```typescript
// WRONG - No user ownership
await addDoc(collection(db, 'patients'), {
  name: 'John Doe',
  birthDate: '1990-01-01'
})

// CORRECT - User-scoped
await addDoc(collection(db, 'patients'), {
  userId: currentUser.uid,  // CRITICAL: Include userId
  name: 'John Doe',
  birthDate: '1990-01-01'
})
```

---

### 9. Storage Security Rules

**Always use user-scoped paths** for file uploads

#### User-Scoped Storage Paths

```typescript
// WRONG - No user scoping (SEC-003 vulnerability)
const path = `documents/${patientId}/${documentId}`

// CORRECT - User-scoped path
const path = `documents/${userId}/${patientId}/${documentId}`
```

**Storage Rules** (in `storage.rules`):
```javascript
match /documents/{userId}/{patientId}/{documentId} {
  allow read: if isOwner(userId);
  allow write: if isOwner(userId) && request.resource.size < 20 * 1024 * 1024;
  allow delete: if isOwner(userId);
}
```

**File Upload Pattern**:
```typescript
import { getStorage, ref, uploadBytes } from 'firebase/storage'

async function uploadDocument(file: File, userId: string, patientId: string) {
  const documentId = crypto.randomUUID()
  const path = `documents/${userId}/${patientId}/${documentId}`

  const storageRef = ref(getStorage(), path)
  await uploadBytes(storageRef, file)

  return { path, documentId }
}
```

---

### 10. Logging Best Practices

**Use**: `lib/logger.ts` for all logging
**DO NOT**: Use `console.log()` in production code

#### Logger Usage

```typescript
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    logger.debug('Processing request', { userId, action: 'create' })

    const result = await performOperation()

    logger.info('Operation completed', { userId, resultId: result.id })

    return successResponse(result)
  } catch (error) {
    logger.error('Operation failed', error as Error, { userId, operation: 'create' })
    return errorResponse(error, { route: '/api/example' })
  }
}
```

**Log Levels**:
- `logger.debug()` - Detailed troubleshooting (dev only)
- `logger.info()` - Important events (dev only)
- `logger.warn()` - Potential issues (all environments)
- `logger.error()` - Failures (all environments)

**Never log sensitive data**:
```typescript
// WRONG - Logs passwords
logger.info('User login', { email, password })

// CORRECT - Only logs non-sensitive data
logger.info('User login', { email })
```

---

## Security Review Checklist

**Use this checklist for all pull requests touching security-sensitive code**

### Pre-Commit Checklist

- [ ] **Input Validation**
  - [ ] All user input validated with Zod schemas
  - [ ] External URLs validated with `validateURL()` from `lib/url-validation.ts`
  - [ ] No direct `fetch()` calls with user-provided URLs

- [ ] **Error Handling**
  - [ ] All catch blocks use `errorResponse()` from `lib/api-response.ts`
  - [ ] No raw error objects or stack traces returned to client
  - [ ] All errors logged server-side with `logger.error()`

- [ ] **Authentication**
  - [ ] All protected endpoints verify Firebase Auth token
  - [ ] Admin endpoints check `decodedToken.superAdmin` custom claim
  - [ ] No hardcoded super admin emails (use Custom Claims)

- [ ] **Rate Limiting**
  - [ ] Expensive operations (AI, email, external API) rate limited
  - [ ] Correct limiter type used (`fetch-url`, `ai:gemini`, `email`, `admin:grant-role`)
  - [ ] Custom identifier used if needed (e.g., userId instead of IP)

- [ ] **CSRF Protection**
  - [ ] State-changing endpoints require CSRF tokens (when middleware deployed)
  - [ ] CSRF tokens included in unsafe methods (POST/PUT/PATCH/DELETE)
  - [ ] Webhook endpoints exempt from CSRF validation

- [ ] **CORS Configuration**
  - [ ] No wildcard (`*`) CORS in production
  - [ ] Origin whitelist configured via `ALLOWED_ORIGINS` environment variable
  - [ ] `Vary: Origin` header included for caching

- [ ] **Debug Endpoints**
  - [ ] All `/api/debug-*` and `/api/fix-*` routes have production guards
  - [ ] Returns 403 with clear message in production
  - [ ] Tests verify production blocking

- [ ] **Firestore Security**
  - [ ] All documents include `userId` field
  - [ ] Security rules enforce `isOwner(userId)` checks
  - [ ] No cross-user data access possible
  - [ ] Rules tested in Firebase emulator

- [ ] **Storage Security**
  - [ ] All file paths include `userId` component
  - [ ] Storage rules enforce user ownership
  - [ ] File size limits enforced (10MB images, 20MB documents)
  - [ ] No sensitive files committed (`.env.local`, `service_account_key.json`)

- [ ] **Logging**
  - [ ] All logging uses `logger` from `lib/logger.ts`
  - [ ] No sensitive data logged (passwords, tokens, PHI)
  - [ ] Appropriate log level used (debug, info, warn, error)

- [ ] **Dependencies**
  - [ ] No new dependencies with known vulnerabilities
  - [ ] `npm audit` shows no high/critical issues
  - [ ] Dependency versions pinned (not using `^` or `~`)

---

### Code Review Checklist

**For reviewers evaluating security-sensitive PRs**

- [ ] **Input Validation Review**
  - [ ] Zod schemas are strict and validate all required fields
  - [ ] Min/max length constraints applied
  - [ ] Email/URL format validation used
  - [ ] Enum validation for fixed value sets

- [ ] **Authentication Review**
  - [ ] Token verification happens before business logic
  - [ ] User ID from token used for authorization (not from request body)
  - [ ] No privilege escalation possible

- [ ] **Authorization Review**
  - [ ] Users can only access their own data
  - [ ] Admin checks use Custom Claims (not hardcoded emails)
  - [ ] No path traversal vulnerabilities (e.g., `../../sensitive-file`)

- [ ] **Data Sanitization Review**
  - [ ] No unsanitized user input in error messages
  - [ ] No SQL/NoSQL injection vulnerabilities
  - [ ] No XSS vulnerabilities (escaped HTML output)

- [ ] **Rate Limiting Review**
  - [ ] Appropriate limits for endpoint type
  - [ ] Correct identifier used (IP vs user ID)
  - [ ] Graceful degradation if Redis unavailable

- [ ] **Testing Review**
  - [ ] Security tests included for new features
  - [ ] Attack vectors tested (SSRF, XSS, CSRF, etc.)
  - [ ] Edge cases covered (empty input, null, undefined)

---

## Common Vulnerabilities to Avoid

### 1. SSRF (Server-Side Request Forgery)

**Risk**: Attacker can make server fetch internal resources

**Vulnerable Code**:
```typescript
// CRITICAL VULNERABILITY - Do not use
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const response = await fetch(url!)  // DANGEROUS
  return new NextResponse(await response.text())
}
```

**Attack Examples**:
```
GET /api/fetch-url?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/
GET /api/fetch-url?url=http://localhost:8080/admin
GET /api/fetch-url?url=file:///etc/passwd
```

**Secure Code**:
```typescript
import { validateURL } from '@/lib/url-validation'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  try {
    const validatedUrl = await validateURL(url)
    const response = await fetch(validatedUrl)
    return new NextResponse(await response.text())
  } catch (error) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 403 })
  }
}
```

**Reference**: `lib/url-validation.ts`, SEC-001

---

### 2. Cross-User Data Access

**Risk**: Users can access other users' data by manipulating IDs

**Vulnerable Code**:
```typescript
// CRITICAL VULNERABILITY - Do not use
export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  const patient = await getDoc(doc(db, 'patients', params.patientId))
  return successResponse(patient.data())  // No ownership check!
}
```

**Attack Example**:
```
GET /api/patients/another-users-patient-id
```

**Secure Code**:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  const token = await verifyAuth(request)
  const userId = token.uid

  const patientRef = doc(db, `users/${userId}/patients/${params.patientId}`)
  const patient = await getDoc(patientRef)

  if (!patient.exists()) {
    return notFoundResponse('Patient')
  }

  // Additional check: verify userId matches
  if (patient.data().userId !== userId) {
    return forbiddenResponse()
  }

  return successResponse(patient.data())
}
```

**Reference**: Firestore rules, SEC-003

---

### 3. Stack Trace Leakage

**Risk**: Stack traces reveal internal implementation details

**Vulnerable Code**:
```typescript
// HIGH VULNERABILITY - Do not use
export async function POST(request: NextRequest) {
  try {
    await riskyOperation()
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,  // DANGEROUS: Leaks implementation details
      fileName: error.fileName,
      lineNumber: error.lineNumber
    }, { status: 500 })
  }
}
```

**Attack Impact**:
- Reveals file paths: `/app/node_modules/firebase-admin/lib/auth.js`
- Exposes function names and logic flow
- Helps attackers understand system architecture

**Secure Code**:
```typescript
import { errorResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    await riskyOperation()
  } catch (error) {
    // Automatically sanitized in production
    return errorResponse(error, { route: '/api/example' })
  }
}
```

**Reference**: `lib/api-response.ts`, SEC-008

---

### 4. Missing Rate Limits

**Risk**: Abuse of expensive operations (AI, email, SMS)

**Vulnerable Code**:
```typescript
// HIGH VULNERABILITY - Do not use
export async function POST(request: NextRequest) {
  const { prompt } = await request.json()

  // No rate limiting - attacker can drain API quota
  const response = await callGeminiAPI(prompt)

  return successResponse(response)
}
```

**Attack Impact**:
- Drain Gemini API free tier (500 req/day)
- Send spam emails
- Perform expensive database queries
- Cause service degradation

**Secure Code**:
```typescript
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Apply rate limiting first
  const rateLimitResult = await rateLimit(request, 'ai:gemini')
  if (rateLimitResult) {
    return rateLimitResult  // 429 Too Many Requests
  }

  const { prompt } = await request.json()
  const response = await callGeminiAPI(prompt)

  return successResponse(response)
}
```

**Reference**: `lib/rate-limit.ts`, SEC-006

---

### 5. Hardcoded Secrets

**Risk**: Credentials exposed in source code

**Vulnerable Code**:
```typescript
// CRITICAL VULNERABILITY - Do not use
const ADMIN_EMAILS = [
  'admin@example.com',
  'superadmin@example.com'
]

const FIREBASE_API_KEY = 'AIzaSyD...'  // DANGEROUS
const DATABASE_PASSWORD = 'mypassword123'  // DANGEROUS
```

**Attack Impact**:
- Credentials in git history forever
- Easy to discover via GitHub search
- No way to rotate without code change

**Secure Code**:
```typescript
// Use environment variables
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? '').split(',')
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

// Use Firebase Custom Claims for roles
const decodedToken = await getAuth().verifyIdToken(token)
if (decodedToken.superAdmin) {
  // User is super admin
}
```

**Reference**: `.env.local`, SEC-002

---

### 6. Debug Endpoints in Production

**Risk**: Sensitive debug tools accessible to attackers

**Vulnerable Code**:
```typescript
// CRITICAL VULNERABILITY - Do not use
export async function GET(request: NextRequest) {
  // Always available - even in production!
  const users = await getAllUsers()
  const sensitiveData = await getInternalConfig()

  return successResponse({ users, sensitiveData })
}
```

**Attack Impact**:
- Access to internal configuration
- User enumeration
- Database dump
- System information disclosure

**Secure Code**:
```typescript
export async function GET(request: NextRequest) {
  // Production guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  const debugInfo = await getDebugInfo()
  return successResponse(debugInfo)
}
```

**Reference**: Debug endpoint guards, SEC-000/010

---

### 7. Wildcard CORS

**Risk**: Any website can make requests to your API

**Vulnerable Code**:
```typescript
// HIGH VULNERABILITY - Do not use
export async function GET(request: NextRequest) {
  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',  // DANGEROUS
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*'
    }
  })
}
```

**Attack Impact**:
- Malicious sites can call your API
- CSRF attacks easier to execute
- No origin validation

**Secure Code**:
```typescript
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',')
const origin = request.headers.get('origin') ?? ''

const headers: Record<string, string> = {}

if (ALLOWED_ORIGINS.includes(origin)) {
  headers['Access-Control-Allow-Origin'] = origin
  headers['Vary'] = 'Origin'
} else if (origin) {
  return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
}

return NextResponse.json(data, { headers })
```

**Reference**: CORS hardening, SEC-004

---

### 8. Missing CSRF Protection

**Risk**: Attacker can perform actions on behalf of authenticated users

**Vulnerable Code**:
```typescript
// CRITICAL VULNERABILITY (when server middleware deployed)
export async function POST(request: NextRequest) {
  // No CSRF token validation
  const { action } = await request.json()

  await performStateChangingAction(action)

  return successResponse({ success: true })
}
```

**Attack Example**:
```html
<!-- Attacker's website -->
<form action="https://yourapp.com/api/delete-account" method="POST">
  <input type="hidden" name="confirm" value="true">
</form>
<script>document.forms[0].submit()</script>
```

**Secure Code** (when middleware deployed):
```typescript
// Middleware will validate CSRF token automatically
// No additional code needed in route handlers

export async function POST(request: NextRequest) {
  // CSRF token already validated by middleware
  const { action } = await request.json()

  await performStateChangingAction(action)

  return successResponse({ success: true })
}
```

**Reference**: `lib/csrf.ts`, SEC-005 (pending server middleware)

---

## Code Examples

### Complete Secure API Route

**File**: `app/api/patients/[patientId]/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationError
} from '@/lib/api-response'
import { validateRequestBody } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

const db = getFirestore()

// Input validation schema
const UpdatePatientSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weight: z.number().positive().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    // 1. Authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorizedResponse('Missing or invalid token')
    }

    const token = authHeader.substring(7)
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    logger.debug('Patient retrieval request', { userId, patientId: params.patientId })

    // 2. Authorization - fetch user-scoped data
    const patientRef = db.doc(`users/${userId}/patients/${params.patientId}`)
    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      logger.warn('Patient not found or access denied', { userId, patientId: params.patientId })
      return notFoundResponse('Patient')
    }

    const patientData = patientDoc.data()!

    // 3. Additional ownership check
    if (patientData.userId !== userId) {
      logger.error('Cross-user access attempt', { userId, ownerId: patientData.userId })
      return forbiddenResponse()
    }

    // 4. Return sanitized data
    return successResponse({
      id: patientDoc.id,
      ...patientData,
      createdAt: patientData.createdAt?.toDate().toISOString(),
      updatedAt: patientData.updatedAt?.toDate().toISOString()
    })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]',
      operation: 'get',
      patientId: params.patientId
    })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    // 1. Rate limiting (prevent abuse)
    const rateLimitResult = await rateLimit(request, 'admin:grant-role')
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 2. Authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorizedResponse()
    }

    const token = authHeader.substring(7)
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // 3. Input validation
    const body = await request.json()
    const validation = validateRequestBody(UpdatePatientSchema, body)

    if (!validation.success) {
      return validationError('Invalid patient data', validation.errors)
    }

    const updates = validation.data

    // 4. Authorization
    const patientRef = db.doc(`users/${userId}/patients/${params.patientId}`)
    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      return notFoundResponse('Patient')
    }

    if (patientDoc.data()!.userId !== userId) {
      return forbiddenResponse()
    }

    // 5. Update with timestamp
    await patientRef.update({
      ...updates,
      updatedAt: new Date()
    })

    logger.info('Patient updated', { userId, patientId: params.patientId })

    // 6. Return updated data
    const updatedDoc = await patientRef.get()
    return successResponse({
      id: updatedDoc.id,
      ...updatedDoc.data()
    })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]',
      operation: 'update',
      patientId: params.patientId
    })
  }
}
```

---

### Secure File Upload Handler

**File**: `app/api/upload-document/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  validationError
} from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, 'admin:grant-role')
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 2. Authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorizedResponse()
    }

    const token = authHeader.substring(7)
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // 3. Parse multipart form
    const formData = await request.formData()
    const file = formData.get('file') as File
    const patientId = formData.get('patientId') as string
    const documentType = formData.get('documentType') as string

    // 4. Validation
    if (!file || !patientId || !documentType) {
      return validationError('Missing required fields')
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return validationError('Invalid file type. Allowed: PDF, JPEG, PNG')
    }

    if (file.size > MAX_FILE_SIZE) {
      return validationError('File too large. Maximum size: 20MB')
    }

    // 5. Generate user-scoped path (CRITICAL for security)
    const documentId = crypto.randomUUID()
    const path = `documents/${userId}/${patientId}/${documentId}`

    // 6. Upload to Firebase Storage
    const bucket = getStorage().bucket()
    const fileRef = bucket.file(path)

    const buffer = await file.arrayBuffer()
    await fileRef.save(Buffer.from(buffer), {
      metadata: {
        contentType: file.type,
        metadata: {
          userId,
          patientId,
          documentType,
          uploadedAt: new Date().toISOString()
        }
      }
    })

    logger.info('Document uploaded', { userId, patientId, documentId, fileSize: file.size })

    // 7. Return success
    return successResponse({
      documentId,
      path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    }, 201)

  } catch (error) {
    return errorResponse(error, {
      route: '/api/upload-document',
      operation: 'upload'
    })
  }
}
```

---

## Testing Security Features

### Unit Tests for Security Features

**File**: `__tests__/api/secure-endpoint.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals'
import { GET, POST } from '@/app/api/patients/[patientId]/route'
import { NextRequest } from 'next/server'

describe('Patient API Security', () => {
  describe('Authentication', () => {
    it('returns 401 when Authorization header missing', async () => {
      const request = new NextRequest('http://localhost/api/patients/123')
      const response = await GET(request, { params: { patientId: '123' } })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toContain('Missing or invalid token')
    })

    it('returns 401 when token is invalid', async () => {
      const request = new NextRequest('http://localhost/api/patients/123', {
        headers: { Authorization: 'Bearer invalid-token' }
      })
      const response = await GET(request, { params: { patientId: '123' } })

      expect(response.status).toBe(401)
    })
  })

  describe('Authorization', () => {
    it('prevents cross-user access', async () => {
      const request = new NextRequest('http://localhost/api/patients/another-users-patient', {
        headers: { Authorization: 'Bearer valid-token-for-user-a' }
      })
      const response = await GET(request, { params: { patientId: 'another-users-patient' } })

      expect(response.status).toBe(404) // Or 403
    })
  })

  describe('Input Validation', () => {
    it('rejects invalid patient data', async () => {
      const request = new NextRequest('http://localhost/api/patients/123', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({
          name: '', // Invalid: too short
          weight: -50 // Invalid: negative
        })
      })
      const response = await POST(request, { params: { patientId: '123' } })

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.validationErrors).toBeDefined()
    })
  })

  describe('Rate Limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const request = new NextRequest('http://localhost/api/patients/123', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer valid-token' }
      })

      // Make multiple requests to trigger rate limit
      for (let i = 0; i < 10; i++) {
        await POST(request, { params: { patientId: '123' } })
      }

      const response = await POST(request, { params: { patientId: '123' } })
      expect(response.status).toBe(429)
      expect(response.headers.get('Retry-After')).toBeDefined()
    })
  })
})
```

---

### Integration Tests for Attack Vectors

**File**: `__tests__/security/attack-vectors.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals'
import { validateURL } from '@/lib/url-validation'

describe('SSRF Protection', () => {
  it('blocks cloud metadata endpoint', async () => {
    await expect(
      validateURL('http://169.254.169.254/latest/meta-data/')
    ).rejects.toThrow('blocked')
  })

  it('blocks private IP ranges', async () => {
    await expect(validateURL('http://192.168.1.1')).rejects.toThrow()
    await expect(validateURL('http://10.0.0.1')).rejects.toThrow()
    await expect(validateURL('http://127.0.0.1')).rejects.toThrow()
  })

  it('blocks localhost variations', async () => {
    await expect(validateURL('http://localhost')).rejects.toThrow()
    await expect(validateURL('http://127.0.0.1')).rejects.toThrow()
    await expect(validateURL('http://[::1]')).rejects.toThrow()
  })

  it('allows whitelisted domains', async () => {
    const url = await validateURL('https://openfoodfacts.org/api')
    expect(url).toBe('https://openfoodfacts.org/api')
  })
})

describe('Debug Endpoint Production Guards', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production'
  })

  it('blocks debug endpoints in production', async () => {
    const { GET } = await import('@/app/api/debug-profile/route')
    const request = new NextRequest('http://localhost/api/debug-profile')
    const response = await GET(request)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('Not available in production')
  })
})
```

---

## CI/CD Security Integration

### GitHub Actions Workflow

**File**: `.github/workflows/sec-pr-checks.yml`

```yaml
name: Security PR Checks

on:
  pull_request:
    branches:
      - main
      - 'sec-*'

jobs:
  security-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run security audit
        run: npm audit --audit-level=high

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npx tsc --noEmit

      - name: Run security tests
        run: npm test -- __tests__/security/

      - name: Check for hardcoded secrets
        run: |
          if grep -r "AIzaSy" app/ lib/ --exclude-dir=node_modules; then
            echo "Found hardcoded API key"
            exit 1
          fi

      - name: Validate environment variables
        run: |
          required_vars="SUPER_ADMIN_EMAILS ALLOWED_ORIGINS UPSTASH_REDIS_REST_URL"
          for var in $required_vars; do
            if ! grep -q "$var" .env.local.example; then
              echo "Missing $var in .env.local.example"
              exit 1
            fi
          done
```

---

### Pre-Commit Hooks

**File**: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linter
npm run lint

# Check for hardcoded secrets
if git diff --cached | grep -E "(password|secret|api_key|token)\s*=\s*['\"]"; then
  echo "ERROR: Potential hardcoded secret detected"
  exit 1
fi

# Check for .env.local
if git diff --cached --name-only | grep -q ".env.local"; then
  echo "ERROR: Do not commit .env.local"
  exit 1
fi

# Run security tests
npm test -- __tests__/security/ --passWithNoTests
```

---

## Additional Resources

### Security Documentation
- [SECURITY_RUNBOOK.md](./SECURITY_RUNBOOK.md) - Incident response procedures
- [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) - Architecture diagrams
- [SECURITY_CONFIGURATION.md](./SECURITY_CONFIGURATION.md) - Environment setup
- [SECURITY_AUDIT_LOG.md](./SECURITY_AUDIT_LOG.md) - Security changes history

### External References
- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Firebase Security Rules Guide](https://firebase.google.com/docs/rules)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/security)

---

**Document Version**: 1.0
**Next Review Date**: 2025-12-15
**Owner**: Security Team
