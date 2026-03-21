/**
 * Email Document API
 *
 * POST: Send document via email
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { sendEmail } from '@/lib/email-service'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { errorResponse, validationError, notFoundResponse } from '@/lib/api-response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; documentId: string }> }
) {
  try {
    const { patientId, documentId } = await params
    const body = await request.json()
    const { email } = body

    if (!email) {
      return validationError('Email address is required', { email: 'Required' })
    }

    // Authenticate user and verify patient access
    const authResult = await assertPatientAccess(request, patientId)
    if (authResult instanceof Response) return authResult
    const { ownerUserId } = authResult

    // Get document from Firestore
    const docSnap = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('documents')
      .doc(documentId)
      .get()

    if (!docSnap.exists) {
      return notFoundResponse('Document')
    }

    const documentData = docSnap.data()

    if (!documentData) {
      return notFoundResponse('Document data')
    }

    // Get patient info
    const patientSnap = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .get()

    const patientData = patientSnap.data()

    // Send email with document
    await sendEmail({
      to: email,
      subject: `Document: ${documentData.name || documentData.fileName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Medical Document</h2>
          <p>You have received a medical document from Weight Loss Projection Lab.</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Document Details</h3>
            <p><strong>Document Name:</strong> ${documentData.name || documentData.fileName}</p>
            ${patientData ? `<p><strong>Patient:</strong> ${patientData.name}</p>` : ''}
            <p><strong>Category:</strong> ${documentData.category || 'N/A'}</p>
            ${documentData.uploadedAt ? `<p><strong>Uploaded:</strong> ${new Date(documentData.uploadedAt).toLocaleDateString()}</p>` : ''}
          </div>

          ${documentData.originalUrl ? `
            <div style="margin: 20px 0;">
              <a href="${documentData.originalUrl}"
                 style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px;">
                View Document
              </a>
            </div>
          ` : ''}

          ${documentData.extractedText ? `
            <div style="margin: 20px 0;">
              <h4>Extracted Text:</h4>
              <p style="background: #fff; padding: 15px; border-left: 3px solid #4f46e5;">${documentData.extractedText.substring(0, 500)}${documentData.extractedText.length > 500 ? '...' : ''}</p>
            </div>
          ` : ''}

          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This email was sent from Weight Loss Projection Lab. Please do not reply to this email.
          </p>
        </div>
      `
    })

    return NextResponse.json({
      success: true,
      message: 'Document sent successfully'
    })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/documents/[documentId]/email',
      operation: 'send'
    })
  }
}
