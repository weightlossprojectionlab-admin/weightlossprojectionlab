import { NextRequest, NextResponse } from 'next/server'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { extractTextFromImageWithGemini } from '@/lib/ocr-gemini'

export const maxDuration = 60 // Allow up to 60 seconds for OCR processing

/**
 * POST /api/ocr/document
 *
 * Server-side document OCR using Gemini Vision API
 * Extracts text from medical documents and updates Firestore
 *
 * Request body:
 * {
 *   "imageData": "data:image/jpeg;base64,...",
 *   "patientId": "patient-id",
 *   "documentId": "document-id"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "extractedText": "text...",
 *   "textLength": 1234
 * }
 */
export async function POST(request: NextRequest) {
  console.log('[Document OCR] ========== NEW REQUEST ==========')
  try {
    const body = await request.json()
    const { imageData, patientId, documentId } = body

    console.log('[Document OCR] Request received:', {
      hasImageData: !!imageData,
      imageDataLength: imageData?.length || 0,
      patientId,
      documentId,
      hasAllFields: !!(imageData && patientId && documentId)
    })

    // Validate required fields
    if (!imageData || !patientId || !documentId) {
      console.error('[Document OCR] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: imageData, patientId, documentId' },
        { status: 400 }
      )
    }

    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Please provide a valid base64 image.' },
        { status: 400 }
      )
    }

    // Check authorization
    const authResult = await assertPatientAccess(request, patientId, 'uploadDocuments')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { ownerUserId } = authResult as AssertPatientAccessResult

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      logger.error('[Document OCR] GEMINI_API_KEY not configured')
      return NextResponse.json(
        { error: 'OCR service not configured' },
        { status: 500 }
      )
    }

    logger.info('[Document OCR] Processing document image with Gemini Vision', { patientId, documentId })

    // Get current document to preserve existing metadata
    const docRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('documents')
      .doc(documentId)

    const docSnap = await docRef.get()
    const existingMetadata = docSnap.data()?.metadata || {}

    // Update document status to 'processing'
    await docRef.update({
      ocrStatus: 'processing',
      metadata: {
        ...existingMetadata,
        ocrStartedAt: new Date().toISOString()
      }
    })

    // Extract text using Gemini Vision
    const result = await extractTextFromImageWithGemini(imageData)

    console.log('[Document OCR] Text extracted:', {
      textLength: result.text?.length || 0,
      confidence: result.confidence,
      preview: result.text?.substring(0, 200)
    })

    // Check if any text was extracted
    if (!result.text || result.text.trim().length < 10) {
      console.warn('[Document OCR] Insufficient text extracted')

      // Update document with failed status
      await docRef.update({
        ocrStatus: 'failed',
        metadata: {
          ...existingMetadata,
          ocrProcessedAt: new Date().toISOString(),
          ocrError: 'No text found in image (might be too blurry or low quality)'
        }
      })

      return NextResponse.json({
        success: false,
        error: 'Could not extract text from image - might be too blurry or low quality'
      })
    }

    // Update document record with extracted text
    await docRef.update({
      extractedText: result.text,
      ocrStatus: 'completed',
      metadata: {
        ...existingMetadata,
        ocrProcessedAt: new Date().toISOString(),
        ocrMethod: 'gemini-vision',
        textLength: result.text.length,
        confidence: result.confidence
      }
    })

    logger.info('[Document OCR] Successfully processed document', {
      patientId,
      documentId,
      textLength: result.text.length,
      confidence: result.confidence
    })

    return NextResponse.json({
      success: true,
      extractedText: result.text,
      textLength: result.text.length,
      confidence: result.confidence
    })

  } catch (error) {
    console.error('[Document OCR] Error:', error)
    logger.error('[Document OCR] Processing failed', error as Error)

    return NextResponse.json(
      {
        error: 'Failed to process document image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
