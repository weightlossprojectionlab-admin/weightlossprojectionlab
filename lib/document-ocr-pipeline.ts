/**
 * Document OCR Pipeline
 *
 * Auto-trigger layer: Orchestrates the full OCR → extraction → storage pipeline.
 * Called after document upload to process documents without blocking the upload response.
 *
 * Pipeline:
 *   1. Fetch document image from Firebase Storage
 *   2. Run OCR via Gemini Vision (reuses ocr-gemini.ts — DRY)
 *   3. Extract structured data (reuses document-data-extractor.ts — separation of concerns)
 *   4. Update Firestore document with results
 */

import { adminDb } from '@/lib/firebase-admin'
import { extractTextFromImageWithGemini } from '@/lib/ocr-gemini'
import { extractStructuredData } from '@/lib/document-data-extractor'
import { removeUndefinedValues } from '@/lib/firestore-helpers'
import { logger } from '@/lib/logger'

/**
 * Process a document through the full OCR pipeline.
 * Designed to run fire-and-forget after document upload.
 *
 * @param ownerUserId - The account owner's user ID (Firestore path)
 * @param patientId - Patient ID
 * @param documentId - Document ID to process
 */
export async function processDocumentOCR(
  ownerUserId: string,
  patientId: string,
  documentId: string
): Promise<void> {
  const docRef = adminDb
    .collection('users')
    .doc(ownerUserId)
    .collection('patients')
    .doc(patientId)
    .collection('documents')
    .doc(documentId)

  try {
    // Get document data
    const docSnap = await docRef.get()
    if (!docSnap.exists) {
      logger.warn('[OCR Pipeline] Document not found', { documentId })
      return
    }

    const docData = docSnap.data()

    // Skip if already processed or processing
    if (docData?.ocrStatus === 'completed' || docData?.ocrStatus === 'processing') {
      logger.info('[OCR Pipeline] Skipping — already processed/processing', {
        documentId,
        status: docData.ocrStatus
      })
      return
    }

    // Must have a URL to process
    const imageUrl = docData?.originalUrl || docData?.images?.[0]?.url
    if (!imageUrl) {
      logger.warn('[OCR Pipeline] No image URL available', { documentId })
      await docRef.update({ ocrStatus: 'failed', 'metadata.ocrError': 'No image URL' })
      return
    }

    // Mark as processing
    await docRef.update({
      ocrStatus: 'processing',
      'metadata.ocrStartedAt': new Date().toISOString()
    })

    logger.info('[OCR Pipeline] Starting OCR', { documentId, patientId })

    // Step 1: Fetch image and convert to base64
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const blob = await response.blob()
    const buffer = await blob.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = blob.type || 'image/jpeg'

    // Only process images (not PDFs on server — those need client-side conversion)
    if (!mimeType.startsWith('image/')) {
      logger.info('[OCR Pipeline] Non-image file, marking for manual processing', {
        documentId,
        mimeType
      })
      await docRef.update({
        ocrStatus: 'pending',
        'metadata.ocrNote': 'PDF requires manual OCR trigger from client'
      })
      return
    }

    const imageData = `data:${mimeType};base64,${base64}`

    // Step 2: OCR — reuse existing Gemini OCR (DRY)
    const ocrResult = await extractTextFromImageWithGemini(imageData)

    if (!ocrResult.text || ocrResult.text.trim().length < 5) {
      await docRef.update(removeUndefinedValues({
        ocrStatus: 'completed',
        extractedText: '',
        'metadata.ocrProcessedAt': new Date().toISOString(),
        'metadata.ocrMethod': 'gemini-vision',
        'metadata.confidence': ocrResult.confidence,
        'metadata.textLength': 0
      }))
      logger.info('[OCR Pipeline] No text extracted', { documentId })
      return
    }

    // Step 3: Structured extraction (separation of concerns)
    const structuredData = await extractStructuredData(
      ocrResult.text,
      docData?.category
    )

    // Step 4: Update document with all results
    const updateData = removeUndefinedValues({
      ocrStatus: 'completed',
      extractedText: ocrResult.text,
      structuredData: structuredData || undefined,
      'metadata.ocrProcessedAt': new Date().toISOString(),
      'metadata.ocrMethod': 'gemini-vision-auto',
      'metadata.confidence': ocrResult.confidence,
      'metadata.textLength': ocrResult.text.length
    })

    await docRef.update(updateData)

    // Auto-classify category if it was 'other' and we detected a better match
    if (docData?.category === 'other' && structuredData?.documentType) {
      const categoryMap: Record<string, string> = {
        lab_result: 'lab-results',
        prescription: 'prescriptions',
        imaging_report: 'imaging',
        insurance: 'insurance',
        discharge_summary: 'medical-records',
        vaccination: 'medical-records'
      }
      const betterCategory = categoryMap[structuredData.documentType]
      if (betterCategory) {
        await docRef.update({ category: betterCategory })
        logger.info('[OCR Pipeline] Auto-classified document category', {
          documentId,
          from: 'other',
          to: betterCategory
        })
      }
    }

    logger.info('[OCR Pipeline] Processing complete', {
      documentId,
      textLength: ocrResult.text.length,
      confidence: ocrResult.confidence,
      hasStructuredData: !!structuredData,
      documentType: structuredData?.documentType
    })

  } catch (error) {
    logger.error('[OCR Pipeline] Processing failed', error as Error, {
      documentId,
      patientId
    })

    // Mark as failed
    try {
      await docRef.update({
        ocrStatus: 'failed',
        'metadata.ocrProcessedAt': new Date().toISOString(),
        'metadata.ocrError': error instanceof Error ? error.message : 'Unknown error'
      })
    } catch (updateError) {
      logger.error('[OCR Pipeline] Failed to update status', updateError as Error)
    }
  }
}
