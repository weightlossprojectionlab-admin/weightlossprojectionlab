import { test, expect } from '@playwright/test'

/**
 * Guards the CSRF fetch interceptor (components/CsrfBootstrap.tsx, inlined in <head>).
 *
 * MEANINGFUL ONLY with CSRF enforced (run the dev server with DISABLE_CSRF=false).
 * With CSRF disabled the server skips the check, so a header-less POST reaches the route
 * anyway and this still passes — it just isn't proving anything. CI should run this spec
 * against a CSRF-enforced server.
 *
 * The proof: a raw window.fetch POST to /api/ that sends NO manual X-CSRF-Token must get
 * PAST proxy.ts (not a 403 CSRF rejection). It fails auth with 401 — which is the point:
 * the request reached the route handler instead of being bounced by CSRF, so the
 * interceptor added the header. Reproduces the ~75 raw-fetch call sites in one assertion.
 */

test('a header-less same-origin /api POST is not rejected by CSRF', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)

  const result = await page.evaluate(async () => {
    const res = await fetch('/api/user-profile/emergency-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // deliberately no X-CSRF-Token
      body: JSON.stringify({ pin: '1234' }),
    })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, code: (body as { code?: string }).code, cookie: document.cookie.includes('csrf_token') }
  })

  expect(result.cookie).toBe(true) // bootstrap planted the cookie
  expect(result.status).not.toBe(403)
  expect(result.code).not.toBe('CSRF_TOKEN_MISSING')
  expect(result.code).not.toBe('CSRF_TOKEN_INVALID')
  expect(result.status).toBe(401) // reached the (unauthenticated) route handler
})
