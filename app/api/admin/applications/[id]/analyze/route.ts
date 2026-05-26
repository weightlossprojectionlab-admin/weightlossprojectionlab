/**
 * Admin API endpoint to trigger AI resume analysis
 * POST /api/admin/applications/[id]/analyze - Analyze resume with AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { analyzeResume } from '@/lib/ai/resume-analyzer'
import { logger } from '@/lib/logger'
import type { JobPosting, JobApplication } from '@/types/jobs'
import { isSuperAdmin } from '@/lib/admin/permissions'

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

  const isSuper = isSuperAdmin(adminEmail)

  if (!isSuper && adminData?.role !== 'admin') {
    throw new Error('Forbidden - Admin access required')
  }

  return { uid: decodedToken.uid, email: adminEmail }
}

/**
 * Look up the stored resume file (PDF / DOCX) for an application and
 * return it as base64 plus mime type. Path matches what the submit
 * route writes: `resumes/<applicationId>/<resumeFileName>`.
 *
 * Returns null when no file is on record so the caller can fall back
 * to body-supplied resumeText.
 */
async function loadResumeFile(
  applicationId: string,
  resumeFileName: string | undefined,
): Promise<{ data: string; mimeType: string } | null> {
  if (!resumeFileName) return null
  const { getStorage } = await import('firebase-admin/storage')
  const bucket = getStorage().bucket()
  const file = bucket.file(`resumes/${applicationId}/${resumeFileName}`)
  const [exists] = await file.exists()
  if (!exists) return null
  const [meta] = await file.getMetadata()
  const [buffer] = await file.download()
  const lowerName = resumeFileName.toLowerCase()
  const inferredMime =
    meta.contentType
    || (lowerName.endsWith('.pdf')
      ? 'application/pdf'
      : lowerName.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : lowerName.endsWith('.doc')
          ? 'application/msword'
          : 'application/pdf')
  return { data: buffer.toString('base64'), mimeType: inferredMime }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(request)
    const { id: applicationId } = await params

    // Accept an optional resumeText override from the body — useful
    // when the applicant pasted into the form instead of uploading
    // a file. The primary path reads the uploaded file from Storage.
    let resumeText: string | undefined
    try {
      const body = await request.json()
      if (typeof body?.resumeText === 'string' && body.resumeText.trim().length >= 50) {
        resumeText = body.resumeText
      }
    } catch {
      // No JSON body — fine, we'll use the stored file.
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

    const jobPosting = { ...jobDoc.data(), id: jobDoc.id } as JobPosting

    // Resolve resume input: prefer uploaded file (multimodal); fall
    // back to body-supplied text; bail if neither is available.
    const resumeFile = await loadResumeFile(applicationId, application.resumeFileName)
    if (!resumeFile && !resumeText) {
      return NextResponse.json(
        {
          success: false,
          error: 'No resume on file and no resumeText provided',
        },
        { status: 400 },
      )
    }

    // Update status to processing
    await applicationDoc.ref.update({
      aiAnalysisStatus: 'processing',
      aiAnalysisError: null,
    })

    logger.info(`Starting AI analysis for application ${applicationId}`, {
      inputKind: resumeFile ? 'file' : 'text',
      mimeType: resumeFile?.mimeType,
    })

    // Run AI analysis
    try {
      const analysis = await analyzeResume({
        resumeText,
        resumeFile: resumeFile ?? undefined,
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
