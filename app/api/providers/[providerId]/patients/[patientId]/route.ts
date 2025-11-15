/**
 * Provider-Patient Unlinking API
 *
 * DELETE /api/providers/[providerId]/patients/[patientId] - Unlink provider from patient
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { Provider } from '@/types/medical'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; patientId: string }> }
) {
  try {
    const { providerId, patientId } = await params

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

    // Check if linked
    if (!provider.patientsServed.includes(patientId)) {
      return NextResponse.json(
        { success: false, error: 'Provider is not linked to this patient' },
        { status: 400 }
      )
    }

    // Remove patient from provider's patientsServed array
    const updatedPatientsServed = provider.patientsServed.filter(id => id !== patientId)

    await providerRef.update({
      patientsServed: updatedPatientsServed
    })

    const updatedDoc = await providerRef.get()
    const updatedProvider: Provider = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Provider

    console.log(`Provider ${providerId} unlinked from patient ${patientId}`)

    return NextResponse.json({
      success: true,
      data: updatedProvider,
      message: 'Provider unlinked from patient successfully'
    })
  } catch (error: any) {
    console.error('Error unlinking provider from patient:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to unlink provider from patient' },
      { status: 500 }
    )
  }
}
