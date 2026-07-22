import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import {
  verifyPin,
  isValidPinFormat,
  normalizeAfterExpiry,
  isLocked,
  nextAttemptState,
  remainingAttempts,
  type PinAttemptState,
} from '@/lib/emergency-pin'
import { logger } from '@/lib/logger'

// Node runtime: scrypt is a Node built-in, not available on Edge.
export const runtime = 'nodejs'

// POST: verify the caller's OWN emergency PIN (they're already signed in as themselves).
// Rate-limited with a lockout — the only real protection for a 4–6 digit secret.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
  }

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }

  try {
    const { pin } = await request.json()
    const userRef = adminDb.collection('users').doc(uid)
    const snap = await userRef.get()
    const existing = snap.data()?.emergencyPin

    if (!existing?.hash) {
      return NextResponse.json({ error: 'No emergency PIN is set.' }, { status: 404 })
    }

    const now = Date.now()
    const raw: PinAttemptState = {
      failedAttempts: typeof existing.failedAttempts === 'number' ? existing.failedAttempts : 0,
      lockedUntil: existing.lockedUntil?.toMillis ? existing.lockedUntil.toMillis() : null,
    }
    const state = normalizeAfterExpiry(raw, now)

    // Locked out — reject without even checking the PIN (don't let attempts burn the lock down).
    if (isLocked(state, now)) {
      return NextResponse.json(
        { success: false, locked: true, lockedUntil: state.lockedUntil, retryAfterMs: state.lockedUntil! - now },
        { status: 429 }
      )
    }

    const ok = isValidPinFormat(pin) && verifyPin(pin, existing.hash, existing.salt)
    const next = nextAttemptState(state, ok, now)

    // Persist the new attempt counters (constant-shape write; never echoes the PIN).
    await userRef.update({
      'emergencyPin.failedAttempts': next.failedAttempts,
      'emergencyPin.lockedUntil': next.lockedUntil != null ? Timestamp.fromMillis(next.lockedUntil) : null,
    })

    if (ok) {
      return NextResponse.json({ success: true })
    }
    const locked = isLocked(next, now)
    return NextResponse.json(
      {
        success: false,
        locked,
        remainingAttempts: remainingAttempts(next),
        lockedUntil: next.lockedUntil,
        retryAfterMs: locked ? next.lockedUntil! - now : undefined,
      },
      { status: locked ? 429 : 401 }
    )
  } catch (error) {
    logger.error('[emergency-pin/verify] failed', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to verify emergency PIN' }, { status: 500 })
  }
}
