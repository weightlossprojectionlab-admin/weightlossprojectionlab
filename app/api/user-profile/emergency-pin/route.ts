import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { hashPin, verifyPin, isValidPinFormat, type PinAttemptState } from '@/lib/emergency-pin'
import { normalizeAfterExpiry, isLocked } from '@/lib/emergency-pin'
import { logger } from '@/lib/logger'

// Node runtime: scrypt (lib/emergency-pin) is a Node built-in, not available on Edge.
export const runtime = 'nodejs'

async function requireUser(request: NextRequest): Promise<{ uid: string } | NextResponse> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
  }
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    return { uid: decoded.uid }
  } catch (error: any) {
    const status = error?.code === 'auth/id-token-expired' ? 401 : 401
    return NextResponse.json({ error: 'Authentication failed' }, { status })
  }
}

function currentState(pin: any): PinAttemptState {
  return {
    failedAttempts: typeof pin?.failedAttempts === 'number' ? pin.failedAttempts : 0,
    lockedUntil: pin?.lockedUntil?.toMillis ? pin.lockedUntil.toMillis() : null,
  }
}

// GET: does the caller have an emergency PIN set? (never returns the hash) — the gate
// uses this to decide enforce-vs-fail-open, the setup UI to decide set-vs-change.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth
  try {
    const snap = await adminDb.collection('users').doc(auth.uid).get()
    const pin = snap.data()?.emergencyPin
    return NextResponse.json({ isSet: !!pin?.hash })
  } catch (error) {
    logger.error('[emergency-pin] GET failed', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to read emergency PIN status' }, { status: 500 })
  }
}

// POST: set or change the caller's own PIN. If one already exists, the current PIN is
// required to change it (defense against someone using an unlocked, logged-in session
// to silently swap the unlock secret).
export async function POST(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { pin, currentPin } = await request.json()

    if (!isValidPinFormat(pin)) {
      return NextResponse.json({ error: 'PIN must be 4 to 6 digits.' }, { status: 400 })
    }

    const userRef = adminDb.collection('users').doc(auth.uid)
    const snap = await userRef.get()
    const existing = snap.data()?.emergencyPin

    if (existing?.hash) {
      // Changing an existing PIN — must prove knowledge of the current one, and not while
      // locked out (a lockout must not be bypassable by "changing" the PIN).
      const state = normalizeAfterExpiry(currentState(existing), Date.now())
      if (isLocked(state, Date.now())) {
        return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
      }
      if (!isValidPinFormat(currentPin) || !verifyPin(currentPin, existing.hash, existing.salt)) {
        return NextResponse.json({ error: 'Current PIN is incorrect.' }, { status: 403 })
      }
    }

    const { hash, salt } = hashPin(pin)
    await userRef.update({
      emergencyPin: {
        hash,
        salt,
        updatedAt: Timestamp.now(),
        failedAttempts: 0,
        lockedUntil: null,
      },
    })
    return NextResponse.json({ success: true, isSet: true })
  } catch (error) {
    logger.error('[emergency-pin] POST failed', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to save emergency PIN' }, { status: 500 })
  }
}

// DELETE: remove the caller's PIN. Requires the current PIN so a hijacked session can't
// silently strip the unlock.
export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { currentPin } = await request.json().catch(() => ({}))
    const userRef = adminDb.collection('users').doc(auth.uid)
    const snap = await userRef.get()
    const existing = snap.data()?.emergencyPin

    if (existing?.hash) {
      const state = normalizeAfterExpiry(currentState(existing), Date.now())
      if (isLocked(state, Date.now())) {
        return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
      }
      if (!isValidPinFormat(currentPin) || !verifyPin(currentPin, existing.hash, existing.salt)) {
        return NextResponse.json({ error: 'Current PIN is incorrect.' }, { status: 403 })
      }
    }

    await userRef.update({ emergencyPin: FieldValue.delete() })
    return NextResponse.json({ success: true, isSet: false })
  } catch (error) {
    logger.error('[emergency-pin] DELETE failed', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to remove emergency PIN' }, { status: 500 })
  }
}
