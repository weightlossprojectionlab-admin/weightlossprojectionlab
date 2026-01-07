/**
 * Admin API endpoint to trigger AI resume analysis
 * POST /api/admin/applications/[id]/analyze - Analyze resume with AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { analyzeResume } from '@/lib/ai/resume-analyzer'
import { logger } from '@/lib/logger'
import type { JobPosting, JobApplication } from '@/types/jobs'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(request)
    const { id: applicationId } = await params
    const body = await request.json()
    const resumeText = body.resumeText as string

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: 'Resume text too short or missing' },
        { status: 400 }
      )
    }

    // Get application
    const applicationDoc = await adminDb
      .collection('job_applications')
      .doc(applicationId)
      .get()

    if (!applicationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      )
    }

    const application = applicationDoc.data() as JobApplication

    // Get job posting
    const jobDoc = await adminDb.collection('job_postings').doc(application.jobId).get()

    if (!jobDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Job posting not found' },
        { status: 404 }
      )
    }

    const jobPosting = jobDoc.data() as JobPosting

    // Update status to processing
    await applicationDoc.ref.update({
      aiAnalysisStatus: 'processing',
      aiAnalysisError: null,
    })

    logger.info(`Starting AI analysis for application ${applicationId}`)

    // Run AI analysis
    try {
      const analysis = await analyzeResume({
        resumeText,
        jobPosting,
        model: 'gemini',
      })

      // Save analysis to Firestore
      await applicationDoc.ref.update({
        aiAnalysis: analysis,
        aiAnalysisStatus: 'completed',
        aiAnalysisError: null,
      })

      logger.info(
        `AI analysis completed for application ${applicationId}. Score: ${analysis.matchScore}, Recommendation: ${analysis.recommendation}`
      )

      return NextResponse.json({
        success: true,
        data: analysis,
        message: 'Resume analyzed successfully',
      })
    } catch (analysisError: any) {
      logger.error('AI analysis failed:', analysisError as Error)

      await applicationDoc.ref.update({
        aiAnalysisStatus: 'failed',
        aiAnalysisError: analysisError.message,
      })

      return NextResponse.json(
        {
          success: false,
          error: `AI analysis failed: ${analysisError.message}`,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    logger.error('Error in analyze endpoint:', error as Error)

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to analyze resume' },
      { status: 500 }
    )
  }
}
