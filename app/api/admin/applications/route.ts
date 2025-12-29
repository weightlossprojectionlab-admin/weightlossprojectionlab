/**
 * Admin API endpoint for job applications
 * GET /api/admin/applications - List all applications
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type { JobApplication } from '@/types/jobs'

export const dynamic = 'force-dynamic'

// Helper to verify admin
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

  if (!idToken) {
    throw new Error('Unauthorized')
  }

  const decodedToken = await adminAuth.verifyIdToken(idToken)
  const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
  const adminData = adminDoc.data()
  const adminEmail = decodedToken.email || ''

  const isSuperAdmin = [
    'perriceconsulting@gmail.com',
    'weightlossprojectionlab@gmail.com',
  ].includes(adminEmail)

  if (!isSuperAdmin && adminData?.role !== 'admin') {
    throw new Error('Forbidden - Admin access required')
  }

  return { uid: decodedToken.uid, email: adminEmail }
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request)

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const status = searchParams.get('status')

    let query = adminDb.collection('job_applications').orderBy('appliedAt', 'desc')

    if (jobId) {
      query = query.where('jobId', '==', jobId) as any
    }

    if (status) {
      query = query.where('status', '==', status) as any
    }

    const snapshot = await query.get()
    const applications: JobApplication[] = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        appliedAt: data.appliedAt?.toDate?.() || new Date(),
        reviewedAt: data.reviewedAt?.toDate?.(),
        statusUpdatedAt: data.statusUpdatedAt?.toDate?.(),
        aiAnalysis: data.aiAnalysis
          ? {
              ...data.aiAnalysis,
              analyzedAt: data.aiAnalysis.analyzedAt?.toDate?.() || new Date(),
            }
          : undefined,
      } as JobApplication
    })

    logger.info(`Fetched ${applications.length} applications`)

    return NextResponse.json({
      success: true,
      data: applications,
      count: applications.length,
    })
  } catch (error: any) {
    logger.error('Error fetching applications (admin):', error)

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
