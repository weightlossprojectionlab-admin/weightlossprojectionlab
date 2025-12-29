/**
 * Demo Requests API Route
 *
 * POST /api/demo-requests - Create a new demo request
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { CreateDemoRequestInput } from '@/types/demo-requests'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateDemoRequestInput

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[\w\-.]+@[\w\-.]+\.[a-z]{2,}$/i
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Get IP address and user agent for audit trail
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Create demo request document
    const demoRequestData = {
      // Contact Info
      name: body.name.trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone?.trim() || null,
      company: body.company?.trim() || null,
      companySize: body.companySize || null,
      role: body.role?.trim() || null,

      // Scheduling
      preferredDate: body.preferredDate || null,
      preferredTime: body.preferredTime || null,
      timezone: body.timezone || null,

      // Context
      useCase: body.useCase?.trim() || null,
      currentSolution: body.currentSolution?.trim() || null,
      urgency: body.urgency || 'medium',

      // Status Tracking
      status: 'pending',
      submittedAt: new Date().toISOString(),
      scheduledAt: null,
      completedAt: null,
      cancelledAt: null,

      // Admin Tracking
      assignedTo: null,
      internalNotes: null,
      followUpDate: null,

      // Audit Trail
      ipAddress,
      userAgent,
      source: body.source || 'unknown',
      utmParams: body.utmParams || null,

      // Firestore server timestamp
      createdAt: FieldValue.serverTimestamp(),
    }

    const docRef = await adminDb.collection('demo_requests').add(demoRequestData)

    // TODO: Send confirmation email to user
    // TODO: Send notification email to admin/sales team
    // This will be implemented in Phase 2

    return NextResponse.json(
      {
        success: true,
        requestId: docRef.id,
        message: 'Demo request submitted successfully. We will contact you within 24 hours.'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating demo request:', error)
    return NextResponse.json(
      { error: 'Failed to submit demo request. Please try again.' },
      { status: 500 }
    )
  }
}
