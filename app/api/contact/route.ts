import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create contact submission
    const contactData = {
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      subject: body.subject,
      message: body.message,
      status: 'new', // 'new', 'in_progress', 'resolved'
      submittedAt: new Date().toISOString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      resolvedAt: null,
      resolvedBy: null,
      internalNotes: null,
    }

    const docRef = await adminDb.collection('contact_submissions').add(contactData)

    // TODO: Send email notification to appropriate department
    // Based on subject, route to: support@, sales@, privacy@, etc.

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        message: 'Thank you for contacting us! We will respond within 24 hours.'
      }
    })
  } catch (error: any) {
    console.error('Error submitting contact form:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit contact form', details: error?.message },
      { status: 500 }
    )
  }
}
