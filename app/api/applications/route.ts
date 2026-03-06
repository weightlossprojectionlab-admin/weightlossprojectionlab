/**
 * Job Application Submission API
 * POST /api/applications - Submit job application with resume
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (5 requests per hour)
    const rateLimitResponse = await rateLimit(request, 'public-forms')
    if (rateLimitResponse) return rateLimitResponse

    const formData = await request.formData()

    // Extract form fields
    const jobId = formData.get('jobId') as string
    const jobTitle = formData.get('jobTitle') as string
    const jobSlug = formData.get('jobSlug') as string
    const applicantName = formData.get('applicantName') as string
    const applicantEmail = formData.get('applicantEmail') as string
    const applicantPhone = formData.get('applicantPhone') as string | null
    const applicantLinkedIn = formData.get('applicantLinkedIn') as string | null
    const applicantWebsite = formData.get('applicantWebsite') as string | null
    const coverLetter = formData.get('coverLetter') as string | null
    const whyExcited = formData.get('whyExcited') as string | null
    const resumeFile = formData.get('resume') as File | null

    // File upload validation constants
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.oasis.opendocument.text', // .odt
    ]
    const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.odt']

    // Validate resume file if provided
    if (resumeFile) {
      // Check file size
      if (resumeFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: 'Resume file is too large. Maximum size is 10MB.' },
          { status: 400 }
        )
      }

      // Check MIME type
      if (!ALLOWED_MIME_TYPES.includes(resumeFile.type)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid file type. Please upload a PDF or Word document (.pdf, .doc, .docx).'
          },
          { status: 400 }
        )
      }

      // Check file extension as additional validation
      const fileExtension = resumeFile.name.toLowerCase().match(/\.[^.]+$/)?.[0]
      if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid file extension. Please upload a PDF or Word document.'
          },
          { status: 400 }
        )
      }

      // Check filename length
      if (resumeFile.name.length > 255) {
        return NextResponse.json(
          { success: false, error: 'Filename is too long. Maximum 255 characters.' },
          { status: 400 }
        )
      }
    }

    // Validate required fields
    if (!jobId || !jobTitle || !applicantName || !applicantEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(applicantEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Create application document
    const applicationData = {
      jobId,
      jobTitle,
      jobSlug,
      applicantName,
      applicantEmail,
      applicantPhone: applicantPhone || null,
      applicantLinkedIn: applicantLinkedIn || null,
      applicantWebsite: applicantWebsite || null,
      coverLetter: coverLetter || null,
      whyExcited: whyExcited || null,
      resumeUrl: null as string | null,
      resumeFileName: null as string | null,
      status: 'pending',
      aiAnalysisStatus: resumeFile ? 'pending' : null,
      appliedAt: new Date(),
      statusUpdatedAt: new Date(),
    }

    // Save to Firestore
    const applicationRef = await adminDb.collection('job_applications').add(applicationData)

    // If resume provided, handle file upload
    let resumeUrl = null
    if (resumeFile) {
      try {
        // Get Firebase Storage admin
        const { getStorage } = await import('firebase-admin/storage')
        const bucket = getStorage().bucket()

        // Create file path
        const fileName = `${Date.now()}_${resumeFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = `resumes/${applicationRef.id}/${fileName}`

        // Convert File to Buffer
        const arrayBuffer = await resumeFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Firebase Storage
        const file = bucket.file(filePath)
        await file.save(buffer, {
          metadata: {
            contentType: resumeFile.type,
            metadata: {
              applicationId: applicationRef.id,
              applicantEmail,
            },
          },
        })

        // DON'T make public immediately - admin should review first
        // await file.makePublic() // REMOVED for security

        // Generate signed URL that expires in 7 days (for admin review)
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        })
        resumeUrl = signedUrl

        // Update application with resume URL
        await applicationRef.update({
          resumeUrl,
          resumeFileName: fileName,
        })

        logger.info(`Resume uploaded for application ${applicationRef.id}: ${resumeUrl}`)
      } catch (uploadError: any) {
        logger.error('Error uploading resume:', uploadError as Error)
        // Don't fail the application if upload fails
        await applicationRef.update({
          aiAnalysisStatus: 'failed',
          aiAnalysisError: 'Resume upload failed',
        })
      }
    }

    logger.info(`New application submitted: ${applicationRef.id} for job ${jobTitle}`)

    // TODO: Trigger AI analysis in background (Cloud Function or queue)
    // For now, we'll handle it manually in admin panel

    return NextResponse.json({
      success: true,
      data: {
        id: applicationRef.id,
        ...applicationData,
        resumeUrl,
      },
      message: 'Application submitted successfully! We will review your application and get back to you soon.',
    })
  } catch (error: any) {
    logger.error('Error submitting application:', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit application. Please try again.',
      },
      { status: 500 }
    )
  }
}
