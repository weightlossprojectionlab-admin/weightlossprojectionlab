/**
 * Admin Single Affiliate API
 * GET — Affiliate detail + conversions
 * PUT — Mark conversion as paid
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { errorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { getConversions, markConversionPaid } from '@/lib/referral-service'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId } = await params

    // Get user data
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    const referral = userData?.referral || {}

    // Get their conversions
    const conversions = await getConversions(userId)

    return NextResponse.json({
      affiliate: {
        userId,
        email: userData?.email || '',
        name: userData?.name || '',
        code: referral.code || '',
        totalClicks: referral.totalClicks || 0,
        totalConversions: referral.totalConversions || 0,
        totalEarningsCents: referral.totalEarningsCents || 0,
      },
      conversions,
    })
  } catch (error) {
    logger.error('[API] GET /api/admin/referrals/[userId] error', error as Error)
    return errorResponse(error as Error, { route: '/api/admin/referrals/[userId]', operation: 'GET' })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { conversionId, action } = body

    if (action === 'mark_paid' && conversionId) {
      await markConversionPaid(conversionId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    logger.error('[API] PUT /api/admin/referrals/[userId] error', error as Error)
    return errorResponse(error as Error, { route: '/api/admin/referrals/[userId]', operation: 'PUT' })
  }
}
