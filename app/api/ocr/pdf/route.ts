import { NextRequest, NextResponse } from 'next/server'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { adminDb } from '@/lib/firebase-admin'

// Route segment config: Force dynamic rendering to skip build-time analysis
// This prevents Next.js from trying to load pdf-parse (which has native dependencies)
// during the build process on Netlify
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-side PDF text extraction endpoint
 *
 * Uses pdf-parse - industry standard for PDF text extraction
 * Much simpler and more reliable than OCR-based approaches
 */
export async function POST(request: NextRequest) {
  // Dynamic import to avoid loading native dependencies at build time
  const pdfParse = await import('pdf-parse')
  const pdf = pdfParse.PDFParse || pdfParse
  console.log('[PDF OCR] ========== NEW REQUEST ==========')
  try {
    const body = await request.json()
    const { pdfUrl, patientId, documentId } = body

    console.log('[PDF OCR] Request received:', {
      pdfUrl: pdfUrl?.substring(0, 100) + '...',
      patientId,
      documentId,
      hasAllFields: !!(pdfUrl && patientId && documentId)
    })

    if (!pdfUrl || !patientId || !documentId) {
      console.error('[PDF OCR] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: pdfUrl, patientId, documentId' },
        { status: 400 }
      )
    }

    // Check authorization
    const authResult = await assertPatientAccess(request, patientId, 'uploadDocuments')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { ownerUserId } = authResult as AssertPatientAccessResult

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

    // Download PDF from Firebase Storage
    console.log('[PDF Extract] Fetching PDF from URL:', pdfUrl.substring(0, 100) + '...')
    const pdfResponse = await fetch(pdfUrl)

    console.log('[PDF Extract] PDF fetch response:', {
      ok: pdfResponse.ok,
      status: pdfResponse.status,
      statusText: pdfResponse.statusText,
      headers: Object.fromEntries(pdfResponse.headers.entries())
    })

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text()
      console.error('[PDF Extract] Failed to fetch PDF:', {
        status: pdfResponse.status,
        statusText: pdfResponse.statusText,
        errorText
      })
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText} - ${errorText}`)
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    console.log('[PDF Extract] Extracting text with pdf-parse...', {
      size: pdfBuffer.length
    })

    // Extract text using pdf-parse (industry standard)
    const data = await (pdf as any)(pdfBuffer)
    const extractedText = data.text.trim()

    console.log('[PDF Extract] Text extracted successfully:', {
      textLength: extractedText.length,
      numPages: data.numpages,
      preview: extractedText.substring(0, 200)
    })

    if (!extractedText || extractedText.length < 10) {
      console.warn('[PDF Extract] Insufficient text extracted')

      // Update document with failed status
      await docRef.update({
        ocrStatus: 'failed',
        metadata: {
          ...existingMetadata,
          ocrProcessedAt: new Date().toISOString(),
          ocrError: 'No text found in PDF (might be scanned images)'
        }
      })

      return NextResponse.json({
        success: false,
        error: 'PDF contains no extractable text - might be scanned images'
      })
    }

    // Update document record with extracted text
    await docRef.update({
      extractedText,
      ocrStatus: 'completed',
      metadata: {
        ...existingMetadata,
        ocrProcessedAt: new Date().toISOString(),
        ocrMethod: 'pdf-parse',
        textLength: extractedText.length,
        numPages: data.numpages
      }
    })

    return NextResponse.json({
      success: true,
      extractedText,
      textLength: extractedText.length
    })

  } catch (error) {
    console.error('[PDF OCR] Error:', error)

    // Error already logged - don't try to update document status here
    // as we may not have ownerUserId in error cases

    return NextResponse.json(
      {
        error: 'Failed to process PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
