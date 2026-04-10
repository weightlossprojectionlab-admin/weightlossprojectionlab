/**
 * POST /api/tenant/[tenantId]/managed-families
 *
 * Phase B slice 2: a franchise owner attaches an existing WPL consumer
 * family to their practice by email. This is the manual seeding path that
 * lets owners populate their dashboard before the family-side request flow
 * (slices 6-7) ships.
 *
 * Body: { email: string }
 *
 * Behavior:
 *  - Look up the consumer by email via Firebase Admin Auth
 *  - Verify a Firestore user doc exists for them (auth-only users can't be
 *    managed yet — they need to have completed account setup)
 *  - If user.managedBy already contains this tenantId → 200 (idempotent)
 *  - If user.managedBy contains a DIFFERENT tenantId → 409 (per the PRD
 *    "single tenantId in user.managedBy" decision; relax later if needed)
 *  - Otherwise append tenantId via Firestore arrayUnion + audit-log
 *
 * Auth: verifyTenantStaffOrAdminAuth — accepts the franchise admin OR staff
 * for THIS tenant, or any super admin. Other tenants are rejected. Staff
 * are allowed because day-to-day family management is exactly what staff
 * are hired to do; only branding and staff invitations are admin-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import { logAdminAction } from '@/lib/admin/audit'
import { getPlanLimits } from '@/lib/franchise-plans'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ tenantId: string }>
}

/**
 * Sentinel error thrown inside the attach transaction so the outer catch
 * can convert structured failures into HTTP responses without leaking the
 * transaction abstraction. The status field maps directly to the HTTP code.
 */
class SeatError extends Error {
  constructor(public status: number, public code: string) {
    super(code)
    this.name = 'SeatError'
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId } = await context.params
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const verification = await verifyTenantStaffOrAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error || 'Forbidden' }, { status: 403 })
    }
    if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden — wrong tenant' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!rawEmail) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }
    if (rawEmail.length > 254 || !EMAIL_RE.test(rawEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check the tenant exists. The dashboard already 404s on missing tenant,
    // but the API is reachable independently and must defend itself.
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get()
    if (!tenantSnap.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get-or-create the Firebase Auth user. If the family doesn't have a
    // WPL account yet, we create one on the spot so the franchise owner can
    // onboard their own clients without making them sign up first. The next
    // time the family visits the platform, their account is already waiting.
    let userRecord
    let authUserCreated = false
    try {
      userRecord = await adminAuth.getUserByEmail(rawEmail)
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({
          email: rawEmail,
          emailVerified: false,
          displayName: rawEmail.split('@')[0],
        })
        authUserCreated = true
        logger.info('[managed-families] auto-created Firebase Auth user for new family', {
          uid: userRecord.uid,
          email: rawEmail,
          tenantId,
        })
      } else {
        throw err
      }
    }

    // Block self-attachment: a franchise owner cannot add themselves as a managed family.
    if (userRecord.uid === verification.uid) {
      return NextResponse.json(
        { error: 'You cannot add yourself as a managed family.' },
        { status: 400 }
      )
    }

    // Atomic seat-limit check + counter increment + managedBy update.
    // Wraps three concerns into a single Firestore transaction so two
    // concurrent attaches at the seat cap can't both succeed.
    //
    // The transaction reads two docs (user + tenant), validates, then
    // writes both. Throws typed sentinel errors that the outer catch
    // converts into HTTP responses.
    const userRef = adminDb.collection('users').doc(userRecord.uid)
    const tenantRef = adminDb.collection('tenants').doc(tenantId)

    type AttachResult =
      | { kind: 'attached' }
      | { kind: 'alreadyManaged' }
    let result: AttachResult
    try {
      result = await adminDb.runTransaction<AttachResult>(async tx => {
        const userSnap = await tx.get(userRef)
        const tenantTxSnap = await tx.get(tenantRef)
        if (!tenantTxSnap.exists) {
          throw new SeatError(404, 'TENANT_GONE')
        }
        const tenantData = tenantTxSnap.data() as any

        // If the user doc doesn't exist yet (new family auto-created above,
        // or auth-only user who never completed onboarding), create a minimal
        // user doc so the family appears in the dashboard immediately.
        if (!userSnap.exists) {
          const nowIso = new Date().toISOString()

          // Seat limit check before creating
          const currentFamilies: number = tenantData?.billing?.currentFamilies || 0
          const snapshotMax: number | undefined = tenantData?.billing?.maxFamilies
          const limit =
            typeof snapshotMax === 'number' && snapshotMax >= 0
              ? snapshotMax
              : getPlanLimits(tenantData?.billing?.plan).maxFamilies
          if (limit !== -1 && currentFamilies >= limit) {
            throw new SeatError(402, 'FAMILY_LIMIT')
          }

          tx.set(userRef, {
            email: rawEmail,
            name: rawEmail.split('@')[0],
            preferences: { units: 'imperial', notifications: true, biometricEnabled: false, themePreference: 'system' },
            managedBy: [tenantId],
            managedByUpdatedAt: nowIso,
            createdAt: new Date(),
            lastActiveAt: new Date(),
          })
          tx.update(tenantRef, {
            'billing.currentFamilies': FieldValue.increment(1),
          })
          return { kind: 'attached' }
        }

        const userData = userSnap.data() as any
        const existingManagedBy: string[] = Array.isArray(userData?.managedBy)
          ? userData.managedBy
          : []

        if (existingManagedBy.includes(tenantId)) {
          return { kind: 'alreadyManaged' }
        }
        if (existingManagedBy.length > 0) {
          throw new SeatError(409, 'OTHER_TENANT')
        }

        // Seat limit check
        const currentFamilies: number = tenantData?.billing?.currentFamilies || 0
        const snapshotMax: number | undefined = tenantData?.billing?.maxFamilies
        const limit =
          typeof snapshotMax === 'number' && snapshotMax >= 0
            ? snapshotMax
            : getPlanLimits(tenantData?.billing?.plan).maxFamilies
        if (limit !== -1 && currentFamilies >= limit) {
          throw new SeatError(402, 'FAMILY_LIMIT')
        }

        tx.update(userRef, {
          managedBy: FieldValue.arrayUnion(tenantId),
          managedByUpdatedAt: new Date().toISOString(),
        })
        tx.update(tenantRef, {
          'billing.currentFamilies': FieldValue.increment(1),
        })

        return { kind: 'attached' }
      })
    } catch (err) {
      if (err instanceof SeatError) {
        const messages: Record<string, string> = {
          TENANT_GONE: 'Tenant not found',
          OTHER_TENANT:
            'This family is already managed by another practice. Ask them to be removed from the other practice first.',
          FAMILY_LIMIT:
            'Your family seat limit is reached. Upgrade your plan to add more families.',
        }
        return NextResponse.json(
          { error: messages[err.code] || 'Attach blocked' },
          { status: err.status }
        )
      }
      throw err
    }

    if (result.kind === 'alreadyManaged') {
      return NextResponse.json({
        success: true,
        alreadyManaged: true,
        userId: userRecord.uid,
      })
    }

    await logAdminAction({
      adminUid: verification.uid,
      adminEmail: verification.email,
      action: 'tenant_family_attached',
      targetType: 'user',
      targetId: userRecord.uid,
      tenantId,
      changes: { email: rawEmail, attachedTenantId: tenantId },
      reason: verification.isSuperAdmin
        ? 'super-admin manual attach'
        : verification.isFranchiseAdmin
        ? 'franchise owner manual attach'
        : 'franchise staff manual attach',
    })

    // Re-render the families list so the new row appears immediately.
    revalidatePath('/tenant-shell/dashboard/families')

    logger.info('[managed-families] family attached', {
      tenantId,
      adminUid: verification.uid,
      familyUid: userRecord.uid,
    })

    return NextResponse.json({
      success: true,
      alreadyManaged: false,
      userId: userRecord.uid,
    })
  } catch (err) {
    logger.error('[managed-families] POST failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
