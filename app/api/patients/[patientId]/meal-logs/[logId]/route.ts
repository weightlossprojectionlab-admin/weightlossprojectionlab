import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { errorResponse } from '@/lib/api-response'

/**
 * DELETE /api/patients/[patientId]/meal-logs/[logId]
 * Delete a specific meal log for a patient
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; logId: string }> }
) {
  try {
    // Extract and verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { patientId, logId } = await params

    // Verify patient belongs to user
    const patientDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .get()

    if (!patientDoc.exists) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Delete the meal log
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .collection('meal-logs')
      .doc(logId)
      .delete()

    return NextResponse.json({
      success: true,
      message: 'Meal log deleted successfully',
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/meal-logs/[logId]',
      operation: 'delete'
    })
  }
}
