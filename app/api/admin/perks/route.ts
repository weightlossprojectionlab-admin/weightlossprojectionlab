import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * GET /api/admin/perks
 * Get all perks
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get all perks
    const perksSnapshot = await adminDb.collection('perks').orderBy('createdAt', 'desc').get()

    const perks = perksSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        perkId: doc.id,
        partnerId: data.partnerId,
        partnerName: data.partnerName || data.sponsorName,
        title: data.title,
        description: data.description,
        value: data.value,
        xpRequired: data.xpRequired || 0,
        tier: data.tier || 'Bronze',
        redemptionType: data.redemptionType || 'code',
        redemptionUrl: data.redemptionUrl,
        discountCode: data.discountCode,
        maxRedemptionsPerUser: data.maxRedemptionsPerUser || 1,
        totalAvailable: data.totalAvailable || 100,
        remainingCount: data.remainingCount || data.totalAvailable || 100,
        enabled: data.enabled !== false,
        category: data.category || 'Fitness',
        expiresAt: data.expiresAt?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      }
    })

    return NextResponse.json({ perks })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/perks',
      operation: 'fetch'
    })
  }
}

/**
 * POST /api/admin/perks
 * Create a new perk
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      partnerName,
      title,
      description,
      value,
      xpRequired,
      tier,
      redemptionType,
      redemptionUrl,
      discountCode,
      maxRedemptionsPerUser,
      totalAvailable,
      enabled,
      category,
    } = body

    if (!partnerName || !title || !value) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create perk document
    const perkData = {
      partnerId: partnerName.toLowerCase().replace(/\s+/g, '-'),
      partnerName,
      sponsorName: partnerName,
      title,
      description: description || '',
      value,
      xpRequired: xpRequired || 0,
      tier: tier || 'Bronze',
      redemptionType: redemptionType || 'code',
      redemptionUrl: redemptionUrl || null,
      discountCode: discountCode || null,
      maxRedemptionsPerUser: maxRedemptionsPerUser || 1,
      totalAvailable: totalAvailable || 100,
      remainingCount: totalAvailable || 100,
      enabled: enabled !== false,
      category: category || 'Fitness',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    const perkRef = await adminDb.collection('perks').add(perkData)

    // Log action
    await logAdminAction({
      adminUid,
      adminEmail,
      action: 'perk_create',
      targetType: 'perk',
      targetId: perkRef.id,
      metadata: { title, partnerName },
      reason: 'Created new perk',
    })

    return NextResponse.json({ success: true, perkId: perkRef.id })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/perks',
      operation: 'create'
    })
  }
}

/**
 * PUT /api/admin/perks?id=<perkId>
 * Update a perk
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const perkId = searchParams.get('id')

    if (!perkId) {
      return NextResponse.json({ error: 'Perk ID required' }, { status: 400 })
    }

    const body = await request.json()

    // Update perk
    const updateData: any = {
      updatedAt: Timestamp.now(),
    }

    // Only update fields that are provided
    if (body.partnerName !== undefined) {
      updateData.partnerName = body.partnerName
      updateData.sponsorName = body.partnerName
      updateData.partnerId = body.partnerName.toLowerCase().replace(/\s+/g, '-')
    }
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.value !== undefined) updateData.value = body.value
    if (body.xpRequired !== undefined) updateData.xpRequired = body.xpRequired
    if (body.tier !== undefined) updateData.tier = body.tier
    if (body.redemptionType !== undefined) updateData.redemptionType = body.redemptionType
    if (body.redemptionUrl !== undefined) updateData.redemptionUrl = body.redemptionUrl
    if (body.discountCode !== undefined) updateData.discountCode = body.discountCode
    if (body.maxRedemptionsPerUser !== undefined) updateData.maxRedemptionsPerUser = body.maxRedemptionsPerUser
    if (body.totalAvailable !== undefined) updateData.totalAvailable = body.totalAvailable
    if (body.enabled !== undefined) updateData.enabled = body.enabled
    if (body.category !== undefined) updateData.category = body.category

    await adminDb.collection('perks').doc(perkId).update(updateData)

    // Log action
    await logAdminAction({
      adminUid,
      adminEmail,
      action: 'perk_edit',
      targetType: 'perk',
      targetId: perkId,
      changes: updateData,
      reason: 'Updated perk',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/perks',
      operation: 'update'
    })
  }
}

/**
 * DELETE /api/admin/perks?id=<perkId>
 * Delete a perk
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const perkId = searchParams.get('id')

    if (!perkId) {
      return NextResponse.json({ error: 'Perk ID required' }, { status: 400 })
    }

    // Get perk data before deletion
    const perkDoc = await adminDb.collection('perks').doc(perkId).get()
    const perkData = perkDoc.data()

    // Delete perk
    await adminDb.collection('perks').doc(perkId).delete()

    // Log action
    await logAdminAction({
      adminUid,
      adminEmail,
      action: 'perk_delete',
      targetType: 'perk',
      targetId: perkId,
      metadata: { title: perkData?.title, partnerName: perkData?.partnerName },
      reason: 'Deleted perk',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/perks',
      operation: 'delete'
    })
  }
}
