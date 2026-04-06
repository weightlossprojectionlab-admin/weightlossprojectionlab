/**
 * POST /api/franchise/apply
 * Public endpoint — franchise application submission
 * Saves application to Firestore for admin review
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { sendEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessName, contactName, email, phone, website, practiceType, staffCount, familyCount, plan, subdomain } = body

    if (!businessName || !contactName || !email || !practiceType || !plan || !subdomain) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check slug availability
    const existing = await adminDb.collection('tenants').where('slug', '==', subdomain).limit(1).get()
    if (!existing.empty) {
      return NextResponse.json({ error: 'This subdomain is already taken' }, { status: 409 })
    }

    // Save application
    const application = {
      businessName,
      contactName,
      email,
      phone: phone || '',
      website: website || '',
      practiceType,
      staffCount,
      familyCount: familyCount || 0,
      plan,
      subdomain,
      status: 'pending', // pending → reviewed → approved → paid → active
      createdAt: new Date().toISOString(),
    }

    const docRef = await adminDb.collection('franchise_applications').add(application)

    // Notify admin
    try {
      const adminEmail = process.env.SUPER_ADMIN_EMAILS?.split(',')[0]?.trim()
      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: `New Franchise Application: ${businessName}`,
          html: `
            <h2>New Franchise Application</h2>
            <p><strong>${contactName}</strong> from <strong>${businessName}</strong> has applied for a franchise.</p>
            <ul>
              <li>Email: ${email}</li>
              <li>Phone: ${phone || 'N/A'}</li>
              <li>Practice: ${practiceType}</li>
              <li>Staff: ${staffCount}</li>
              <li>Families: ${familyCount || 'N/A'}</li>
              <li>Plan: ${plan}</li>
              <li>Subdomain: ${subdomain}.wellnessprojectionlab.com</li>
            </ul>
            <p><a href="https://www.wellnessprojectionlab.com/admin/tenants">Review in Admin Panel</a></p>
          `,
        })
      }
    } catch {
      // Don't fail the application if notification fails
    }

    logger.info('[Franchise] Application received', { businessName, email, subdomain })

    return NextResponse.json({
      success: true,
      applicationId: docRef.id,
      message: 'Application submitted successfully',
    }, { status: 201 })
  } catch (error) {
    logger.error('[Franchise] Application failed', error as Error)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
