import { NextRequest, NextResponse } from 'next/server'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { communicationOperations, healthReportOperations } from '@/lib/provider-operations'
import { sendEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'
import { adminDb } from '@/lib/firebase-admin'
import { errorResponse, validationError, notFoundResponse } from '@/lib/api-response'
import { EMAIL_TEMPLATES } from '@/types/providers'
import type { ProviderCommunication } from '@/types/providers'

interface SendReportRequestBody {
  recipientEmail: string
  providerId?: string | null
  providerName?: string
  providerTitle?: string
  reportDate: string // YYYY-MM-DD format
  template: 'health_summary' | 'records_request' | 'follow_up'
  customMessage?: string
  attachments?: Array<'health_report' | 'medication_list' | 'documents' | 'vitals_chart'>
  patientName: string
  senderName: string
}

/**
 * POST /api/patients/[patientId]/send-report
 * Send health report via email to healthcare provider
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check patient access - requires viewMedicalRecords permission
    const accessInfo = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (accessInfo instanceof Response) {
      return accessInfo
    }

    const { userId, ownerUserId } = accessInfo

    // Parse and validate request body
    const requestBody: SendReportRequestBody = await request.json()
    const {
      recipientEmail,
      providerId,
      providerName,
      providerTitle,
      reportDate,
      template,
      customMessage,
      attachments = ['health_report'],
      patientName,
      senderName
    } = requestBody

    // Validate required fields
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return validationError('Valid recipient email is required', { recipientEmail: 'Invalid email format' })
    }

    if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      return validationError('Valid report date is required', { reportDate: 'Must be in YYYY-MM-DD format' })
    }

    if (!template || !['health_summary', 'records_request', 'follow_up'].includes(template)) {
      return validationError('Valid template is required', { template: 'Must be health_summary, records_request, or follow_up' })
    }

    if (!patientName || !senderName) {
      const errors: Record<string, string> = {}
      if (!patientName) errors.patientName = 'Required'
      if (!senderName) errors.senderName = 'Required'
      return validationError('Patient name and sender name are required', errors)
    }

    logger.info('[Send Report] Processing email request', {
      patientId,
      reportDate,
      template,
      recipientEmail,
      attachments,
      userId
    })

    // Fetch the health report for the specified date
    const reportsRef = adminDb.collection('healthReports')
    const reportSnapshot = await reportsRef
      .where('patientId', '==', patientId)
      .where('reportDate', '==', reportDate)
      .limit(1)
      .get()

    if (reportSnapshot.empty) {
      return notFoundResponse(`Health report for date ${reportDate}`)
    }

    const reportDoc = reportSnapshot.docs[0]
    const healthReportData = reportDoc.data()
    const healthReport = {
      id: reportDoc.id,
      ...healthReportData
    }

    // Prepare attachment data
    const attachmentData: Array<{
      type: 'health_report' | 'medication_list' | 'document' | 'vitals_chart'
      id?: string
      name: string
      content?: string
    }> = []

    // Always include the health report if requested
    if (attachments.includes('health_report')) {
      attachmentData.push({
        type: 'health_report',
        id: healthReport.id,
        name: `Health Report - ${reportDate}.md`,
        content: (healthReportData as any)?.report || ''
      })
    }

    // Fetch medications if requested
    if (attachments.includes('medication_list')) {
      const medicationsSnapshot = await adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
        .collection('medications')
        .where('status', '==', 'active')
        .get()

      const medications = medicationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Create medication list as markdown
      let medicationContent = `# Current Medications for ${patientName}\n\n`
      medicationContent += `**As of:** ${new Date().toLocaleDateString()}\n\n`

      if (medications.length > 0) {
        medications.forEach((med: any, index: number) => {
          medicationContent += `## ${index + 1}. ${med.name}\n`
          if (med.strength) medicationContent += `- **Strength:** ${med.strength}\n`
          if (med.dosageForm) medicationContent += `- **Form:** ${med.dosageForm}\n`
          if (med.frequency) medicationContent += `- **Frequency:** ${med.frequency}\n`
          if (med.prescribedFor) medicationContent += `- **Prescribed For:** ${med.prescribedFor}\n`
          if (med.prescribedBy) medicationContent += `- **Prescribed By:** ${med.prescribedBy}\n`
          medicationContent += `\n`
        })
      } else {
        medicationContent += `No active medications recorded.\n`
      }

      attachmentData.push({
        type: 'medication_list',
        name: `Medications - ${patientName}.md`,
        content: medicationContent
      })
    }

    // Fetch recent documents if requested
    if (attachments.includes('documents')) {
      const documentsSnapshot = await adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
        .collection('documents')
        .orderBy('uploadedAt', 'desc')
        .limit(10)
        .get()

      const documents = documentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Create document list
      let documentContent = `# Recent Medical Documents for ${patientName}\n\n`
      documentContent += `**Total Documents:** ${documents.length}\n\n`

      if (documents.length > 0) {
        documents.forEach((doc: any, index: number) => {
          documentContent += `## ${index + 1}. ${doc.name || 'Untitled Document'}\n`
          if (doc.type) documentContent += `- **Type:** ${doc.type}\n`
          if (doc.uploadedAt) {
            const uploadDate = doc.uploadedAt.toDate?.()?.toLocaleDateString() || 'Unknown'
            documentContent += `- **Uploaded:** ${uploadDate}\n`
          }
          if (doc.notes) documentContent += `- **Notes:** ${doc.notes}\n`
          documentContent += `\n`
        })
      } else {
        documentContent += `No recent documents found.\n`
      }

      attachmentData.push({
        type: 'document',
        name: `Recent Documents - ${patientName}.md`,
        content: documentContent
      })
    }

    // Fetch vitals chart data if requested
    if (attachments.includes('vitals_chart')) {
      const vitalsSnapshot = await adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
        .collection('vitals')
        .orderBy('recordedAt', 'desc')
        .limit(30)
        .get()

      const vitals = vitalsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Create vitals summary
      let vitalsContent = `# Vital Signs Summary for ${patientName}\n\n`
      vitalsContent += `**Recent Readings (Last 30):**\n\n`
      vitalsContent += `| Date | Type | Value |\n`
      vitalsContent += `|------|------|-------|\n`

      if (vitals.length > 0) {
        vitals.forEach((vital: any) => {
          const date = vital.recordedAt?.toDate?.()?.toLocaleDateString() || 'N/A'
          const type = vital.type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'
          const value = formatVitalValue(vital)
          vitalsContent += `| ${date} | ${type} | ${value} |\n`
        })
      } else {
        vitalsContent += `| - | No vitals recorded | - |\n`
      }

      attachmentData.push({
        type: 'vitals_chart',
        name: `Vitals Summary - ${patientName}.md`,
        content: vitalsContent
      })
    }

    // Get email template
    const templateKey = template.toUpperCase() as 'HEALTH_SUMMARY' | 'RECORDS_REQUEST' | 'FOLLOW_UP'
    const emailTemplate = EMAIL_TEMPLATES[templateKey]

    if (!emailTemplate) {
      return validationError('Invalid email template', { template: 'Template not found' })
    }

    // Prepare template variables
    const variables: Record<string, string> = {
      providerName: providerName || 'Healthcare Provider',
      providerTitle: providerTitle || 'Dr.',
      patientName,
      reportDate,
      senderName,
      customMessage: customMessage || ''
    }

    // Replace variables in subject and body
    let subject: string = emailTemplate.subject
    let emailBody: string = emailTemplate.body

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      subject = subject.replace(new RegExp(placeholder, 'g'), value)
      emailBody = emailBody.replace(new RegExp(placeholder, 'g'), value)
    })

    // Build email HTML with attachments
    let emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: #667eea; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Health Report</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Weight Loss Projection Lab</p>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
${emailBody}
          </div>

          ${attachmentData.length > 0 ? `
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <h3 style="color: #667eea; margin-bottom: 15px;">Attached Information:</h3>
          <ul style="list-style: none; padding: 0;">
            ${attachmentData.map(att => `
              <li style="background: #f9fafb; padding: 10px 15px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #667eea;">
                <strong>${att.name}</strong>
              </li>
            `).join('')}
          </ul>

          ${attachmentData.map(att => {
            if (att.content) {
              // Convert markdown to basic HTML formatting
              const formattedContent = att.content
                .replace(/^# (.*$)/gim, '<h2 style="color: #1f2937; margin-top: 20px;">$1</h2>')
                .replace(/^## (.*$)/gim, '<h3 style="color: #374151; margin-top: 15px;">$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>')

              return `
              <div style="margin-top: 30px; padding: 20px; background: #fafbfc; border-radius: 8px; border: 1px solid #e5e7eb;">
                <h4 style="margin-top: 0; color: #667eea;">${att.name}</h4>
                <div style="font-size: 13px; line-height: 1.6;">
                  ${formattedContent}
                </div>
              </div>
              `
            }
            return ''
          }).join('')}
          ` : ''}
        </div>

        <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #991b1b; font-size: 13px;">
            <strong>DISCLAIMER:</strong> This health information is provided for professional medical use only.
            It should not be used as a substitute for professional medical advice, diagnosis, or treatment.
            This information is confidential and protected under HIPAA. Please handle accordingly.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;">
            © ${new Date().getFullYear()} Weight Loss Projection Lab. All rights reserved.
          </p>
          <p style="margin: 10px 0 0 0;">
            This email contains confidential health information.
          </p>
        </div>
      </body>
      </html>
    `

    // Create plain text version
    let emailText = emailBody + '\n\n'
    emailText += '---\n\n'

    if (attachmentData.length > 0) {
      emailText += 'Attached Information:\n'
      attachmentData.forEach(att => {
        emailText += `- ${att.name}\n`
        if (att.content) {
          emailText += `\n${att.content}\n\n`
        }
      })
    }

    emailText += '\n---\n'
    emailText += 'DISCLAIMER: This health information is provided for professional medical use only. '
    emailText += 'It should not be used as a substitute for professional medical advice, diagnosis, or treatment. '
    emailText += 'This information is confidential and protected under HIPAA. Please handle accordingly.\n'

    // Send email using SendGrid
    logger.info('[Send Report] Sending email', {
      patientId,
      recipientEmail,
      subject,
      attachmentCount: attachmentData.length
    })

    try {
      await sendEmail({
        to: recipientEmail,
        subject,
        html: emailHtml,
        text: emailText
      })

      logger.info('[Send Report] Email sent successfully', {
        patientId,
        recipientEmail,
        reportId: healthReport.id
      })

    } catch (emailError: any) {
      logger.error('[Send Report] Email send failed', emailError)
      return NextResponse.json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 500 }
      )
    }

    // Log communication to providerCommunications collection
    try {
      // If providerId is not provided but we have an email, try to find or create a provider entry
      let finalProviderId = providerId

      // Only log communication if we have a providerId
      if (finalProviderId) {
        const communicationData: Omit<ProviderCommunication, 'id'> = {
          patientId,
          providerId: finalProviderId,
          providerName: providerName || 'Healthcare Provider',
          type: 'email',
          sentBy: userId,
          sentByName: senderName,
          sentAt: new Date(),
          subject,
          message: emailBody,
          attachments: attachmentData.map(att => ({
            type: att.type,
            id: att.id,
            name: att.name
          })),
          status: 'sent'
        }

        // This will also update the provider's lastContactDate
        await communicationOperations.logCommunication(communicationData)

        logger.info('[Send Report] Communication logged', {
          patientId,
          providerId: finalProviderId
        })
      } else {
        logger.info('[Send Report] Skipping communication log - no providerId provided', {
          patientId,
          recipientEmail
        })
      }
    } catch (commError: any) {
      // Don't fail the request if communication logging fails
      logger.error('[Send Report] Failed to log communication', commError, {
        patientId,
        providerId
      })
    }

    // Increment email count for the health report
    try {
      const reportRef = adminDb.collection('healthReports').doc(healthReport.id)
      const currentCount = (healthReportData as any)?.emailedCount || 0
      await reportRef.update({
        emailedCount: currentCount + 1
      })

      logger.info('[Send Report] Updated email count', {
        reportId: healthReport.id,
        newCount: currentCount + 1
      })
    } catch (countError: any) {
      // Don't fail the request if count update fails
      logger.error('[Send Report] Failed to update email count', countError, {
        reportId: healthReport.id
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Health report sent successfully',
      data: {
        recipientEmail,
        reportDate,
        subject,
        attachmentCount: attachmentData.length,
        sentAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/send-report',
      operation: 'send',
      patientId: (await params).patientId
    })
  }
}

/**
 * Helper function to format vital sign values for display
 */
function formatVitalValue(vital: any): string {
  if (vital.type === 'blood_pressure') {
    const systolic = vital.systolic || vital.value?.systolic || 'N/A'
    const diastolic = vital.diastolic || vital.value?.diastolic || 'N/A'
    return `${systolic}/${diastolic} mmHg`
  } else if (vital.type === 'blood_sugar') {
    return `${vital.value} mg/dL`
  } else if (vital.type === 'pulse_oximeter') {
    return `${vital.value}%`
  } else if (vital.type === 'temperature') {
    return `${vital.value}°${vital.unit === 'celsius' ? 'C' : 'F'}`
  } else if (vital.type === 'weight') {
    return `${vital.value} ${vital.unit || 'lbs'}`
  } else if (vital.type === 'heart_rate') {
    return `${vital.value} bpm`
  }
  return `${vital.value || 'N/A'}`
}
