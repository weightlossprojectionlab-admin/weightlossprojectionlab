import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { errorResponse } from '@/lib/api-response'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; documentId: string }> }
) {
  try {
    const { patientId, documentId } = await params

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'deleteDocuments')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { ownerUserId } = authResult as AssertPatientAccessResult

    // Verify patient belongs to owner
    const patientDoc = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .get()

    if (!patientDoc.exists) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
    }

    // Delete the document
    await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('documents')
      .doc(documentId)
      .delete()

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/documents/[documentId]',
      operation: 'delete'
    })
  }
}
