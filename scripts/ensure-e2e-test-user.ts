/**
 * One-shot: ensure the e2e test user exists with a known password.
 *
 * The Playwright auth.setup.ts signs in as
 * `weightlossprojectionlab@gmail.com` with `Password123!`. If that
 * account doesn't exist OR the password drifted, sign-in silently
 * fails (Firebase doesn't surface the error to the dev server log)
 * and the suite times out waiting for a URL redirect. This script:
 *
 *   1. Looks up the user by email.
 *   2. If absent → createUser with that email + password.
 *   3. If present → updateUser to reset the password to the known value.
 *
 * Idempotent. Safe to re-run any time the e2e suite starts failing
 * at the auth.setup step.
 *
 * Run:  npx tsx scripts/ensure-e2e-test-user.ts
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const TARGET_EMAIL = 'weightlossprojectionlab@gmail.com'
const TARGET_PASSWORD = 'Password123!'
const TARGET_DISPLAY_NAME = 'E2E Test User'

async function main() {
  const { initializeApp, cert, getApps, getApp } = await import('firebase-admin/app')
  const { getAuth } = await import('firebase-admin/auth')
  const fs = await import('fs')

  function findServiceAccountPath(): string {
    let dir = process.cwd()
    for (let i = 0; i < 6; i++) {
      const c = path.join(dir, 'service_account_key.json')
      if (fs.existsSync(c)) return c
      const p = path.dirname(dir)
      if (p === dir) break
      dir = p
    }
    throw new Error('service_account_key.json not found')
  }
  if (getApps().length === 0) {
    initializeApp({ credential: cert(require(findServiceAccountPath())) })
  }

  const auth = getAuth(getApp())

  console.log(`\nTarget: ${TARGET_EMAIL}`)
  let existing
  try {
    existing = await auth.getUserByEmail(TARGET_EMAIL)
    console.log(`  ✓ Account exists  uid=${existing.uid}  createdAt=${existing.metadata.creationTime}`)
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'auth/user-not-found') {
      console.log('  ✗ Account does NOT exist — creating it...')
      const created = await auth.createUser({
        email: TARGET_EMAIL,
        password: TARGET_PASSWORD,
        displayName: TARGET_DISPLAY_NAME,
        emailVerified: true,
      })
      console.log(`  ✓ Created  uid=${created.uid}`)
      return
    }
    throw err
  }

  // Account exists — force-reset the password to the known value so
  // sign-in works regardless of any prior drift (password rotated,
  // user reset it manually, etc.).
  console.log('  → Resetting password to known value...')
  await auth.updateUser(existing.uid, { password: TARGET_PASSWORD })
  console.log('  ✓ Password reset done')
}

main().catch((err) => {
  console.error('\n[FAIL]', err)
  process.exit(1)
})
