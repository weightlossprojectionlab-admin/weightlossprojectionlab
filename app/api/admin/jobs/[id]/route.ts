/**
 * Admin API endpoint for individual job management
 * GET /api/admin/jobs/[id] - Get single job
 * PUT /api/admin/jobs/[id] - Update job
 * DELETE /api/admin/jobs/[id] - Delete job
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'
import type { JobPosting, JobPostingForm } from '@/types/jobs'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(request)
    const { id } = await params

    const docSnap = await adminDb.collection('job_postings').doc(id).get()

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    const data = docSnap.data()!
    const job: JobPosting = {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as JobPosting

    return NextResponse.json({
      success: true,
      data: job,
    })
  } catch (error: any) {
    logger.error('Error fetching job (admin):', error)

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request)
    const { id } = await params
    const body: Partial<JobPostingForm> = await request.json()

    const docSnap = await adminDb.collection('job_postings').doc(id).get()

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // Update job
    const updateData = {
      ...body,
      updatedBy: admin.uid,
      updatedAt: FieldValue.serverTimestamp(),
    }

    await adminDb.collection('job_postings').doc(id).update(updateData)

    logger.info(`Admin updated job: ${id}`)

    return NextResponse.json({
      success: true,
      data: { id, ...updateData },
    })
  } catch (error: any) {
    logger.error('Error updating job (admin):', error)

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(request)
    const { id } = await params

    const docSnap = await adminDb.collection('job_postings').doc(id).get()

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    await adminDb.collection('job_postings').doc(id).delete()

    logger.info(`Admin deleted job: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully',
    })
  } catch (error: any) {
    logger.error('Error deleting job (admin):', error)

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete job' },
      { status: 500 }
    )
  }
}
