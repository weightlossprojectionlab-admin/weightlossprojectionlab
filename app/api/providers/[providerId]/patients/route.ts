/**
 * Provider-Patient Linking API
 *
 * POST /api/providers/[providerId]/patients - Link provider to patient
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { Provider } from '@/types/medical'
import { z } from 'zod'

const linkPatientSchema = z.object({
  patientId: z.string().uuid()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params

    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Validate body
    const body = await request.json()
    const { patientId } = linkPatientSchema.parse(body)

    // Verify patient exists and user owns it
    const patientRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Patient not found or access denied' },
        { status: 404 }
      )
    }

    // Get provider
    const providerRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('providers')
      .doc(providerId)

    const providerDoc = await providerRef.get()

    if (!providerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      )
    }

    const provider = { id: providerDoc.id, ...providerDoc.data() } as Provider

    // Check if already linked
    if (provider.patientsServed.includes(patientId)) {
      return NextResponse.json(
        { success: false, error: 'Provider already linked to this patient' },
        { status: 400 }
      )
    }

    // Add patient to provider's patientsServed array
    await providerRef.update({
      patientsServed: [...provider.patientsServed, patientId]
    })

    const updatedDoc = await providerRef.get()
    const updatedProvider: Provider = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Provider

    console.log(`Provider ${providerId} linked to patient ${patientId}`)

    return NextResponse.json({
      success: true,
      data: updatedProvider,
      message: 'Provider linked to patient successfully'
    })
  } catch (error: any) {
    console.error('Error linking provider to patient:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to link provider to patient' },
      { status: 500 }
    )
  }
}
