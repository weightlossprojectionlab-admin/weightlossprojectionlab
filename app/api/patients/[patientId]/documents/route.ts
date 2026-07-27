import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { removeUndefinedValues } from '@/lib/firestore-helpers'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { errorResponse, notFoundResponse } from '@/lib/api-response'
import type { PatientDocument } from '@/types/medical'
import { notifyCareTeamOfEvent } from '@/lib/notify-care-team'
import { processDocumentOCR } from '@/lib/document-ocr-pipeline'
import { logger } from '@/lib/logger'

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
      return notFoundResponse('Patient')
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
    return errorResponse(error, {
      route: '/api/patients/[patientId]/documents',
      operation: 'list'
    })
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
      return notFoundResponse('Patient')
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

    // Notify the care team a document was uploaded.
    await notifyCareTeamOfEvent({
      patientId,
      ownerUserId,
      actorUserId: userId,
      type: 'document_uploaded',
      title: 'Document uploaded',
      action: `uploaded ${body.name || body.fileName || 'a document'}`,
      actionUrl: `/patients/${patientId}?tab=documents`,
      metadata: {
        documentId: docRef.id,
        documentName: body.name || body.fileName || 'Document',
        documentCategory: body.category || 'other',
        fileType: body.fileType || 'other',
        fileSize: body.fileSize,
      },
    })

    // Auto-trigger OCR pipeline (fire-and-forget — don't block upload response)
    if (document.fileType === 'image' || document.originalUrl) {
      processDocumentOCR(ownerUserId, patientId, docRef.id).catch(ocrError => {
        logger.error('[Documents API] Auto-OCR failed (non-blocking)', ocrError as Error, {
          documentId: docRef.id,
          patientId
        })
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        ...document
      }
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/documents',
      operation: 'upload'
    })
  }
}
