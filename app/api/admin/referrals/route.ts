/**
 * Admin Referral Management API
 * GET  — All affiliates, aggregated stats, conversions
 * PUT  — Update program settings (commission %, discount %, enabled)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { errorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import {
  getAggregatedStats,
  getAllAffiliates,
  getConversions,
  getReferralSettings,
  updateReferralSettings,
} from '@/lib/referral-service'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

  if (!idToken) return null

  const decoded = await adminAuth.verifyIdToken(idToken)
  const adminDoc = await adminDb.collection('users').doc(decoded.uid).get()
  const adminData = adminDoc.data()
  const isSuper = isSuperAdmin(decoded.email || '')

  if (!isSuper && adminData?.role !== 'admin' && adminData?.role !== 'moderator') {
    return null
  }

  return { uid: decoded.uid, email: decoded.email || '' }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [settings, stats, affiliates, conversions] = await Promise.all([
      getReferralSettings(),
      getAggregatedStats(),
      getAllAffiliates(),
      getConversions(),
    ])

    return NextResponse.json({ settings, stats, affiliates, conversions })
  } catch (error) {
    logger.error('[API] GET /api/admin/referrals error', error as Error)
    return errorResponse(error as Error, { route: '/api/admin/referrals', operation: 'GET' })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { commissionPercent, discountPercent, enabled, stripeCouponId } = body

    const updates: Record<string, unknown> = {}
    if (commissionPercent !== undefined) updates.commissionPercent = Number(commissionPercent)
    if (discountPercent !== undefined) updates.discountPercent = Number(discountPercent)
    if (enabled !== undefined) updates.enabled = Boolean(enabled)
    if (stripeCouponId !== undefined) updates.stripeCouponId = stripeCouponId

    await updateReferralSettings(updates, admin.email)

    const settings = await getReferralSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    logger.error('[API] PUT /api/admin/referrals error', error as Error)
    return errorResponse(error as Error, { route: '/api/admin/referrals', operation: 'PUT' })
  }
}
