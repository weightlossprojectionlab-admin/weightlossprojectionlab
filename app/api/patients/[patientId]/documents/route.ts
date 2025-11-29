import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { removeUndefinedValues } from '@/lib/firestore-helpers'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import type { PatientDocument } from '@/types/medical'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
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

    // Fetch documents for this patient
    const documentsSnapshot = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('documents')
      .orderBy('uploadedAt', 'desc')
      .get()

    const documents: PatientDocument[] = documentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PatientDocument))

    return NextResponse.json({ success: true, data: documents })
  } catch (error) {
    console.error('Error fetching patient documents:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'uploadDocuments')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

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

    const body = await request.json()

    // Build document object - removeUndefinedValues will filter out undefined fields
    const documentData = {
      patientId,
      userId: ownerUserId,
      name: body.name,
      fileName: body.fileName || body.name,
      category: body.category,
      fileType: body.fileType,
      fileSize: body.fileSize || 0,
      originalUrl: body.originalUrl,
      images: body.images,
      metadata: body.metadata,
      extractedText: body.extractedText,
      ocrStatus: body.ocrStatus || 'pending',
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId,
      tags: body.tags || [],
      notes: body.notes || ''
    }

    // Remove undefined values (Firestore doesn't accept undefined)
    const document = removeUndefinedValues(documentData)

    const docRef = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('documents')
      .add(document)

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        ...document
      }
    })
  } catch (error: any) {
    console.error('Error uploading document:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code
    })
    return NextResponse.json(
      { success: false, error: 'Failed to upload document', details: error?.message },
      { status: 500 }
    )
  }
}
