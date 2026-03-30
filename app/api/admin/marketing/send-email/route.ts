/**
 * POST /api/admin/marketing/send-email
 * Send acquisition email via Resend (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { sendEmail } from '@/lib/email-service'
import { getAcquisitionTemplate } from '@/lib/email-templates/acquisition-emails'
import { logger } from '@/lib/logger'
import { errorResponse, forbiddenResponse, unauthorizedResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '')
    if (!idToken) return unauthorizedResponse()

    const decoded = await adminAuth.verifyIdToken(idToken)
    const adminDoc = await adminDb.collection('users').doc(decoded.uid).get()
    const adminData = adminDoc.data()
    if (!isSuperAdmin(decoded.email || '') && adminData?.role !== 'admin') {
      return forbiddenResponse('Admin access required')
    }

    const body = await request.json()
    const { templateId, to, variables } = body

    if (!templateId || !to) {
      return NextResponse.json({ error: 'templateId and to are required' }, { status: 400 })
    }

    const template = getAcquisitionTemplate(templateId)
    if (!template) {
      return NextResponse.json({ error: `Template "${templateId}" not found` }, { status: 404 })
    }

    // Replace variables in subject line
    let subject = template.subject
    for (const [key, value] of Object.entries(variables || {})) {
      subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value as string)
    }

    const html = template.generateHtml(variables || {})

    await sendEmail({ to, subject, html })

    logger.info('[Marketing] Acquisition email sent', {
      templateId,
      to,
      subject,
      sentBy: decoded.email,
    })

    return NextResponse.json({ success: true, message: `Email sent to ${to}` })
  } catch (error) {
    logger.error('[Marketing] Send email failed', error as Error)
    return errorResponse(error, { route: '/api/admin/marketing/send-email', operation: 'send' })
  }
}
