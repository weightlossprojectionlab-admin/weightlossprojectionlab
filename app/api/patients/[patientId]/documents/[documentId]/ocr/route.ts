/**
 * Document OCR API
 *
 * POST: Trigger OCR processing for an already-uploaded document
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export const maxDuration = 60 // Allow up to 60 seconds for OCR processing

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; documentId: string }> }
) {
  try {
    const { patientId, documentId } = await params

    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get document from Firestore
    const docRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .collection('documents')
      .doc(documentId)

    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    const documentData = docSnap.data()

    // Check if document is already processing or completed
    if (documentData?.ocrStatus === 'processing') {
      return NextResponse.json(
        { success: false, error: 'OCR is already being processed for this document' },
        { status: 409 }
      )
    }

    if (documentData?.ocrStatus === 'completed') {
      return NextResponse.json(
        { success: true, message: 'OCR already completed', extractedText: documentData.extractedText }
      )
    }

    // Check if document has a URL
    if (!documentData?.originalUrl) {
      return NextResponse.json(
        { success: false, error: 'Document URL not available' },
        { status: 400 }
      )
    }

    // Update status to processing
    await docRef.update({
      ocrStatus: 'processing',
      'metadata.ocrStartedAt': new Date().toISOString()
    })

    // Fetch the document from storage
    logger.info('[Document OCR] Fetching document from URL', { documentId, url: documentData.originalUrl })

    const response = await fetch(documentData.originalUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch document from storage')
    }

    const blob = await response.blob()

    // Convert blob to base64
    const buffer = await blob.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = blob.type || 'application/octet-stream'
    const imageData = `data:${mimeType};base64,${base64}`

    // Call the existing OCR endpoint internally
    const ocrResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ocr/document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        imageData,
        patientId,
        documentId
      })
    })

    const ocrResult = await ocrResponse.json()

    if (!ocrResponse.ok || !ocrResult.success) {
      // Update status to failed
      await docRef.update({
        ocrStatus: 'failed',
        'metadata.ocrProcessedAt': new Date().toISOString(),
        'metadata.ocrError': ocrResult.error || 'OCR processing failed'
      })

      return NextResponse.json(
        { success: false, error: ocrResult.error || 'Failed to process OCR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'OCR processing completed',
      extractedText: ocrResult.extractedText,
      textLength: ocrResult.textLength,
      confidence: ocrResult.confidence
    })

  } catch (error: any) {
    logger.error('[Document OCR] Processing failed', error)
    console.error('Error processing OCR:', error)

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process OCR' },
      { status: 500 }
    )
  }
}
