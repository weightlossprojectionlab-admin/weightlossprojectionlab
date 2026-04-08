/**
 * GET  /api/admin/settings/inactivity   — return current setting (any admin)
 * PATCH /api/admin/settings/inactivity  — update (super admin only)
 *
 * The inactivity timeout is a HIPAA security control. The PATCH endpoint
 * enforces the compliance bounds defined in lib/platform-settings.ts and
 * audit-logs every change.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'
import { errorResponse, forbiddenResponse } from '@/lib/api-response'
import {
  PLATFORM_SETTINGS_DOC_PATH,
  DEFAULT_PLATFORM_SETTINGS,
  validateInactivityTimeoutMinutes,
  INACTIVITY_TIMEOUT_MIN_MINUTES,
  INACTIVITY_TIMEOUT_MAX_MINUTES,
} from '@/lib/platform-settings'

async function verifyAdmin(request: NextRequest, requireSuper = false) {
  const authHeader = request.headers.get('authorization')
  const idToken = authHeader?.replace('Bearer ', '')
  if (!idToken) return null
  const decodedToken = await adminAuth.verifyIdToken(idToken)
  const adminEmail = decodedToken.email || ''
  const isSuper = isSuperAdmin(adminEmail)
  if (requireSuper) {
    if (!isSuper) return null
  } else {
    const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const adminData = adminDoc.data()
    if (!isSuper && adminData?.role !== 'admin') return null
  }
  return { ...decodedToken, isSuperAdmin: isSuper }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyAdmin(request)
    if (!decoded) return forbiddenResponse('Admin access required')

    const docPath = PLATFORM_SETTINGS_DOC_PATH.split('/')
    const snap = await adminDb.collection(docPath[0]).doc(docPath[1]).get()

    if (!snap.exists) {
      return NextResponse.json({
        success: true,
        settings: DEFAULT_PLATFORM_SETTINGS,
        usingDefaults: true,
      })
    }

    return NextResponse.json({
      success: true,
      settings: snap.data(),
      usingDefaults: false,
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/settings/inactivity', operation: 'get' })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const decoded = await verifyAdmin(request, /* requireSuper */ true)
    if (!decoded) return forbiddenResponse('Super admin access required')

    const body = await request.json().catch(() => ({}))
    const validated = validateInactivityTimeoutMinutes(body.inactivityTimeoutMinutes)

    if (validated === null) {
      return NextResponse.json(
        {
          error: `inactivityTimeoutMinutes must be a number between ${INACTIVITY_TIMEOUT_MIN_MINUTES} and ${INACTIVITY_TIMEOUT_MAX_MINUTES}`,
          code: 'INVALID_TIMEOUT',
        },
        { status: 400 }
      )
    }

    // Read current value for audit-log diff
    const docPath = PLATFORM_SETTINGS_DOC_PATH.split('/')
    const ref = adminDb.collection(docPath[0]).doc(docPath[1])
    const snap = await ref.get()
    const previous = snap.exists ? (snap.data() as any).inactivityTimeoutMinutes : null

    const now = new Date().toISOString()
    await ref.set(
      {
        inactivityTimeoutMinutes: validated,
        updatedAt: now,
        updatedBy: decoded.email || 'unknown',
      },
      { merge: true }
    )

    await logAdminAction({
      adminUid: decoded.uid,
      adminEmail: decoded.email || 'unknown',
      action: 'platform_setting_updated',
      targetType: 'system',
      targetId: 'inactivity_timeout',
      changes: {
        before: previous,
        after: validated,
      },
      reason: `Inactivity timeout set to ${validated} minutes`,
    })

    logger.info('[Platform Settings] Inactivity timeout updated', {
      previous,
      new: validated,
      by: decoded.email,
    })

    return NextResponse.json({
      success: true,
      settings: {
        inactivityTimeoutMinutes: validated,
        updatedAt: now,
        updatedBy: decoded.email,
      },
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/settings/inactivity', operation: 'patch' })
  }
}
