/**
 * Admin API endpoint for job management
 * GET /api/admin/jobs - List all jobs (including drafts)
 * POST /api/admin/jobs - Create new job posting
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

// Helper to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request)

    // Use Firebase Admin SDK to bypass Firestore rules
    const snapshot = await adminDb.collection('job_postings')
      .orderBy('createdAt', 'desc')
      .get()

    const jobs: JobPosting[] = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      }
    }) as JobPosting[]

    logger.info(`Admin fetched ${jobs.length} jobs`)

    return NextResponse.json({
      success: true,
      data: jobs,
      count: jobs.length,
    })
  } catch (error: any) {
    logger.error('Error fetching jobs (admin):', error)

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    const body: JobPostingForm = await request.json()

    // Validate required fields
    if (!body.title || !body.department || !body.location) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate slug
    const slug = generateSlug(body.title)

    // Create job posting
    const jobData = {
      slug,
      title: body.title,
      department: body.department,
      location: body.location,
      locationType: body.locationType,
      salaryMin: body.salaryMin,
      salaryMax: body.salaryMax,
      equity: body.equity,
      reportsTo: body.reportsTo,
      about: body.about,
      whyCritical: body.whyCritical,
      responsibilities: body.responsibilities,
      requiredQualifications: body.requiredQualifications,
      niceToHave: body.niceToHave,
      successMetrics: body.successMetrics,
      whyJoin: body.whyJoin,
      status: body.status,
      metaDescription: body.metaDescription,
      keywords: body.keywords,
      createdBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    const docRef = await adminDb.collection('job_postings').add(jobData)

    logger.info(`Admin created job: ${body.title} (${docRef.id})`)

    return NextResponse.json({
      success: true,
      data: { id: docRef.id, ...jobData },
    })
  } catch (error: any) {
    logger.error('Error creating job (admin):', error)

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create job' },
      { status: 500 }
    )
  }
}
