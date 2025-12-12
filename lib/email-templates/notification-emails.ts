/**
 * Email Templates for Family Member Notifications
 *
 * Context-aware HTML email templates for medication changes, vitals,
 * documents, and health reports with consistent purple gradient styling.
 */

/**
 * Get the application URL for email links
 * Uses environment variable in production, falls back to production URL
 */
function getAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!appUrl) {
    if (process.env.NODE_ENV === 'production') {
      // Production fallback
      return 'https://weightlossprojectionlab.com'
    }
    // Development fallback
    console.warn('[Email Templates] NEXT_PUBLIC_APP_URL not set, using localhost (development only)')
    return 'http://localhost:3000'
  }

  return appUrl
}

// Base URL for linking to the app
const APP_URL = getAppUrl()

// Common email styles matching the family invitation template
const emailStyles = {
  body: "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;",
  header: "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;",
  headerTitle: "color: white; margin: 0; font-size: 28px;",
  headerSubtitle: "color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;",
  content: "background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;",
  contentTitle: "color: #667eea; margin-top: 0;",
  infoBox: "background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;",
  alertBox: "background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;",
  button: "display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;",
  footer: "text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;",
  divider: "border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;"
}

// Helper function to format date and time
function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Helper function to format date only
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// ============================================================================
// MEDICATION CHANGE EMAIL
// ============================================================================

export interface MedicationChangeEmailParams {
  recipientEmail: string
  recipientName: string
  patientName: string
  patientId: string
  medicationName: string
  strength?: string
  dosageForm?: string
  changeType: 'added' | 'updated' | 'deleted'
  changedBy: string
  prescribedFor?: string
  changeDate?: Date | string
}

export function generateMedicationChangeEmail(params: MedicationChangeEmailParams): { html: string; text: string; subject: string } {
  const {
    recipientName,
    patientName,
    medicationName,
    strength,
    dosageForm,
    changeType,
    changedBy,
    prescribedFor,
    changeDate,
    patientId
  } = params

  const actionVerb = changeType === 'added' ? 'Added' : changeType === 'updated' ? 'Updated' : 'Removed'
  const actionColor = changeType === 'deleted' ? '#ef4444' : '#667eea'
  const timestamp = changeDate ? formatDateTime(changeDate) : 'Just now'

  const medicationDetails = [
    `<strong>Medication:</strong> ${medicationName}`,
    strength ? `<strong>Strength:</strong> ${strength}` : '',
    dosageForm ? `<strong>Form:</strong> ${dosageForm}` : '',
    prescribedFor ? `<strong>Prescribed For:</strong> ${prescribedFor}` : ''
  ].filter(Boolean).join('<br>')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Medication ${actionVerb} - ${patientName}</title>
    </head>
    <body style="${emailStyles.body}">
      <div style="${emailStyles.header}">
        <h1 style="${emailStyles.headerTitle}">Medication ${actionVerb}</h1>
        <p style="${emailStyles.headerSubtitle}">Weight Loss Projection Lab</p>
      </div>

      <div style="${emailStyles.content}">
        <h2 style="${emailStyles.contentTitle}">Hello ${recipientName},</h2>

        <p>A medication has been <strong>${changeType}</strong> for <strong>${patientName}</strong>.</p>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid ${actionColor}; margin: 20px 0;">
          <p style="margin: 0 0 15px 0; font-size: 18px; color: ${actionColor}; font-weight: 600;">
            ${medicationName}
          </p>
          <div style="color: #4b5563; font-size: 14px; line-height: 1.8;">
            ${medicationDetails}
          </div>
        </div>

        <div style="${emailStyles.infoBox}">
          <p style="margin: 0; color: #4b5563;">
            <strong>Changed By:</strong> ${changedBy}<br>
            <strong>Changed On:</strong> ${timestamp}
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/patients/${patientId}?tab=medications"
             style="${emailStyles.button}">
            View All Medications
          </a>
        </div>

        <hr style="${emailStyles.divider}">

        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          You're receiving this notification because you're a family member with access to ${patientName}'s health records.
        </p>
      </div>

      <div style="${emailStyles.footer}">
        <p style="margin: 0;">
          © ${new Date().getFullYear()} Weight Loss Projection Lab. All rights reserved.
        </p>
        <p style="margin: 10px 0 0 0;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
Medication ${actionVerb} - ${patientName}

Hello ${recipientName},

A medication has been ${changeType} for ${patientName}.

Medication: ${medicationName}
${strength ? `Strength: ${strength}` : ''}
${dosageForm ? `Form: ${dosageForm}` : ''}
${prescribedFor ? `Prescribed For: ${prescribedFor}` : ''}

Changed By: ${changedBy}
Changed On: ${timestamp}

View all medications: ${APP_URL}/patients/${patientId}?tab=medications

---
You're receiving this notification because you're a family member with access to ${patientName}'s health records.

© ${new Date().getFullYear()} Weight Loss Projection Lab
  `.trim()

  const subject = `Medication ${actionVerb} for ${patientName} - ${medicationName}`

  return { html, text, subject }
}

// ============================================================================
// VITAL LOGGED EMAIL
// ============================================================================

export interface VitalLoggedEmailParams {
  recipientEmail: string
  recipientName: string
  patientName: string
  patientId: string
  vitalType: string
  vitalValue: string
  unit?: string
  loggedBy: string
  logDate?: Date | string
  notes?: string
}

export function generateVitalLoggedEmail(params: VitalLoggedEmailParams): { html: string; text: string; subject: string } {
  const {
    recipientName,
    patientName,
    vitalType,
    vitalValue,
    unit,
    loggedBy,
    logDate,
    notes,
    patientId
  } = params

  const timestamp = logDate ? formatDateTime(logDate) : 'Just now'
  const displayValue = unit ? `${vitalValue} ${unit}` : vitalValue

  // Determine vital icon and color based on type
  const vitalConfig: Record<string, { icon: string; color: string }> = {
    'weight': { icon: '⚖️', color: '#667eea' },
    'blood pressure': { icon: '❤️', color: '#ef4444' },
    'heart rate': { icon: '💓', color: '#ec4899' },
    'temperature': { icon: '🌡️', color: '#f59e0b' },
    'blood glucose': { icon: '🩸', color: '#dc2626' },
    'oxygen saturation': { icon: '🫁', color: '#3b82f6' }
  }

  const config = vitalConfig[vitalType.toLowerCase()] || { icon: '📊', color: '#667eea' }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Vital Logged - ${patientName}</title>
    </head>
    <body style="${emailStyles.body}">
      <div style="${emailStyles.header}">
        <h1 style="${emailStyles.headerTitle}">New Vital Logged</h1>
        <p style="${emailStyles.headerSubtitle}">Weight Loss Projection Lab</p>
      </div>

      <div style="${emailStyles.content}">
        <h2 style="${emailStyles.contentTitle}">Hello ${recipientName},</h2>

        <p>A new vital has been logged for <strong>${patientName}</strong>.</p>

        <div style="background: #f9fafb; padding: 25px; border-radius: 8px; border-left: 4px solid ${config.color}; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 48px;">${config.icon}</p>
          <p style="margin: 10px 0 5px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            ${vitalType}
          </p>
          <p style="margin: 0; font-size: 36px; font-weight: bold; color: ${config.color};">
            ${displayValue}
          </p>
        </div>

        ${notes ? `
          <div style="${emailStyles.alertBox}">
            <p style="margin: 0; color: #92400e;"><strong>Notes:</strong></p>
            <p style="margin: 10px 0 0 0; color: #78350f; font-style: italic;">"${notes}"</p>
          </div>
        ` : ''}

        <div style="${emailStyles.infoBox}">
          <p style="margin: 0; color: #4b5563;">
            <strong>Logged By:</strong> ${loggedBy}<br>
            <strong>Logged On:</strong> ${timestamp}
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/patients/${patientId}?tab=vitals"
             style="${emailStyles.button}">
            View All Vitals
          </a>
        </div>

        <hr style="${emailStyles.divider}">

        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          You're receiving this notification because you're a family member with access to ${patientName}'s health records.
        </p>
      </div>

      <div style="${emailStyles.footer}">
        <p style="margin: 0;">
          © ${new Date().getFullYear()} Weight Loss Projection Lab. All rights reserved.
        </p>
        <p style="margin: 10px 0 0 0;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
New Vital Logged - ${patientName}

Hello ${recipientName},

A new vital has been logged for ${patientName}.

${vitalType}: ${displayValue}
${notes ? `\nNotes: "${notes}"\n` : ''}

Logged By: ${loggedBy}
Logged On: ${timestamp}

View all vitals: ${APP_URL}/patients/${patientId}?tab=vitals

---
You're receiving this notification because you're a family member with access to ${patientName}'s health records.

© ${new Date().getFullYear()} Weight Loss Projection Lab
  `.trim()

  const subject = `New ${vitalType} Logged for ${patientName} - ${displayValue}`

  return { html, text, subject }
}

// ============================================================================
// DOCUMENT UPLOADED EMAIL
// ============================================================================

export interface DocumentUploadedEmailParams {
  recipientEmail: string
  recipientName: string
  patientName: string
  patientId: string
  documentName: string
  documentCategory: string
  uploadedBy: string
  uploadDate?: Date | string
  fileSize?: string
}

export function generateDocumentUploadedEmail(params: DocumentUploadedEmailParams): { html: string; text: string; subject: string } {
  const {
    recipientName,
    patientName,
    documentName,
    documentCategory,
    uploadedBy,
    uploadDate,
    fileSize,
    patientId
  } = params

  const timestamp = uploadDate ? formatDateTime(uploadDate) : 'Just now'

  // Category icons and colors
  const categoryConfig: Record<string, { icon: string; color: string }> = {
    'lab results': { icon: '🧪', color: '#3b82f6' },
    'imaging': { icon: '🔬', color: '#8b5cf6' },
    'prescription': { icon: '💊', color: '#667eea' },
    'insurance': { icon: '📋', color: '#10b981' },
    'medical history': { icon: '📝', color: '#f59e0b' },
    'other': { icon: '📄', color: '#6b7280' }
  }

  const config = categoryConfig[documentCategory.toLowerCase()] || categoryConfig['other']

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Document Uploaded - ${patientName}</title>
    </head>
    <body style="${emailStyles.body}">
      <div style="${emailStyles.header}">
        <h1 style="${emailStyles.headerTitle}">New Document Uploaded</h1>
        <p style="${emailStyles.headerSubtitle}">Weight Loss Projection Lab</p>
      </div>

      <div style="${emailStyles.content}">
        <h2 style="${emailStyles.contentTitle}">Hello ${recipientName},</h2>

        <p>A new document has been uploaded for <strong>${patientName}</strong>.</p>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid ${config.color}; margin: 20px 0;">
          <div style="display: table; width: 100%;">
            <div style="display: table-cell; vertical-align: top; padding-right: 15px; font-size: 36px;">
              ${config.icon}
            </div>
            <div style="display: table-cell; vertical-align: middle;">
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
                ${documentName}
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${documentCategory}
              </p>
              ${fileSize ? `
                <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 13px;">
                  ${fileSize}
                </p>
              ` : ''}
            </div>
          </div>
        </div>

        <div style="${emailStyles.infoBox}">
          <p style="margin: 0; color: #4b5563;">
            <strong>Uploaded By:</strong> ${uploadedBy}<br>
            <strong>Uploaded On:</strong> ${timestamp}
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/patients/${patientId}?tab=documents"
             style="${emailStyles.button}">
            View All Documents
          </a>
        </div>

        <hr style="${emailStyles.divider}">

        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          You're receiving this notification because you're a family member with access to ${patientName}'s health records.
        </p>
      </div>

      <div style="${emailStyles.footer}">
        <p style="margin: 0;">
          © ${new Date().getFullYear()} Weight Loss Projection Lab. All rights reserved.
        </p>
        <p style="margin: 10px 0 0 0;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
New Document Uploaded - ${patientName}

Hello ${recipientName},

A new document has been uploaded for ${patientName}.

Document: ${documentName}
Category: ${documentCategory}
${fileSize ? `Size: ${fileSize}` : ''}

Uploaded By: ${uploadedBy}
Uploaded On: ${timestamp}

View all documents: ${APP_URL}/patients/${patientId}?tab=documents

---
You're receiving this notification because you're a family member with access to ${patientName}'s health records.

© ${new Date().getFullYear()} Weight Loss Projection Lab
  `.trim()

  const subject = `New Document Uploaded for ${patientName} - ${documentName}`

  return { html, text, subject }
}

// ============================================================================
// HEALTH REPORT EMAIL
// ============================================================================

export interface HealthReportEmailParams {
  recipientEmail: string
  recipientName: string
  patientName: string
  patientId: string
  reportId: string
  reportType: string
  reportDate: Date | string
  generatedBy: string
  summary?: string
  keyFindings?: string[]
}

export function generateHealthReportEmail(params: HealthReportEmailParams): { html: string; text: string; subject: string } {
  const {
    recipientName,
    patientName,
    reportType,
    reportDate,
    generatedBy,
    summary,
    keyFindings,
    patientId,
    reportId
  } = params

  const reportDateFormatted = formatDate(reportDate)
  const keyFindingsList = keyFindings && keyFindings.length > 0
    ? keyFindings.map(finding => `<li style="margin: 5px 0;">${finding}</li>`).join('')
    : ''

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Health Report Generated - ${patientName}</title>
    </head>
    <body style="${emailStyles.body}">
      <div style="${emailStyles.header}">
        <h1 style="${emailStyles.headerTitle}">Health Report Generated</h1>
        <p style="${emailStyles.headerSubtitle}">Weight Loss Projection Lab</p>
      </div>

      <div style="${emailStyles.content}">
        <h2 style="${emailStyles.contentTitle}">Hello ${recipientName},</h2>

        <p>A new health report has been generated for <strong>${patientName}</strong>.</p>

        <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 25px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
          <p style="margin: 0; font-size: 36px; text-align: center;">📊</p>
          <p style="margin: 15px 0 5px 0; font-size: 20px; font-weight: 600; color: #1e40af; text-align: center;">
            ${reportType}
          </p>
          <p style="margin: 0; color: #3b82f6; font-size: 14px; text-align: center;">
            Report Date: ${reportDateFormatted}
          </p>
        </div>

        ${summary ? `
          <div style="${emailStyles.infoBox}">
            <p style="margin: 0 0 10px 0; color: #374151; font-weight: 600;">Summary:</p>
            <p style="margin: 0; color: #4b5563; line-height: 1.8;">
              ${summary}
            </p>
          </div>
        ` : ''}

        ${keyFindingsList ? `
          <div style="${emailStyles.alertBox}">
            <p style="margin: 0 0 10px 0; color: #92400e; font-weight: 600;">Key Findings:</p>
            <ul style="margin: 5px 0; padding-left: 20px; color: #78350f;">
              ${keyFindingsList}
            </ul>
          </div>
        ` : ''}

        <div style="${emailStyles.infoBox}">
          <p style="margin: 0; color: #4b5563;">
            <strong>Generated By:</strong> ${generatedBy}<br>
            <strong>Generated On:</strong> ${formatDateTime(new Date())}
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/patients/${patientId}/reports/${reportId}"
             style="${emailStyles.button}">
            View Full Report
          </a>
        </div>

        <hr style="${emailStyles.divider}">

        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          You're receiving this notification because you're a family member with access to ${patientName}'s health records.
        </p>
      </div>

      <div style="${emailStyles.footer}">
        <p style="margin: 0;">
          © ${new Date().getFullYear()} Weight Loss Projection Lab. All rights reserved.
        </p>
        <p style="margin: 10px 0 0 0;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
Health Report Generated - ${patientName}

Hello ${recipientName},

A new health report has been generated for ${patientName}.

Report Type: ${reportType}
Report Date: ${reportDateFormatted}

${summary ? `\nSummary:\n${summary}\n` : ''}

${keyFindingsList ? `\nKey Findings:\n${keyFindings?.map(f => `- ${f}`).join('\n')}\n` : ''}

Generated By: ${generatedBy}
Generated On: ${formatDateTime(new Date())}

View full report: ${APP_URL}/patients/${patientId}/reports/${reportId}

---
You're receiving this notification because you're a family member with access to ${patientName}'s health records.

© ${new Date().getFullYear()} Weight Loss Projection Lab
  `.trim()

  const subject = `Health Report Generated for ${patientName} - ${reportType}`

  return { html, text, subject }
}

// ============================================================================
// EXPORT ALL TEMPLATE GENERATORS
// ============================================================================

export const notificationEmailTemplates = {
  medicationChange: generateMedicationChangeEmail,
  vitalLogged: generateVitalLoggedEmail,
  documentUploaded: generateDocumentUploadedEmail,
  healthReport: generateHealthReportEmail
}
