/**
 * Client-side OCR using Tesseract.js
 * Runs entirely in the browser - no server required
 */

import Tesseract from 'tesseract.js'
import { logger } from '@/lib/logger'

export interface OCRProgress {
  status: 'loading' | 'recognizing' | 'completed' | 'error'
  progress: number // 0-100
  message?: string
}

export interface OCRResult {
  text: string
  confidence: number
  blocks?: Array<{
    text: string
    confidence: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
  }>
}

/**
 * Extract text from an image using Tesseract.js
 */
export async function extractTextFromImage(
  imageUrl: string,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  try {
    logger.info('[OCR Client] Starting text extraction', { imageUrl })

    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress) {
          const progress: OCRProgress = {
            status: m.status as any,
            progress: Math.round(m.progress * 100),
            message: m.status
          }
          onProgress(progress)
        }
      }
    })

    const { data } = await worker.recognize(imageUrl)

    await worker.terminate()

    logger.info('[OCR Client] Text extraction completed', {
      textLength: data.text.length,
      confidence: data.confidence
    })

    return {
      text: data.text,
      confidence: data.confidence,
      blocks: data.blocks?.map(block => ({
        text: block.text,
        confidence: block.confidence,
        bbox: block.bbox
      }))
    }
  } catch (error) {
    logger.error('[OCR Client] Text extraction failed', error as Error)
    throw error
  }
}

/**
 * Try to extract native text from PDF (for digital/text-based PDFs)
 */
async function tryExtractNativeTextFromPDF(pdfUrl: string): Promise<{ text: string; hasText: boolean }> {
  try {
    const pdfjsLib = await import('pdfjs-dist')

    // Set worker - use unpkg CDN with HTTPS
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      // Enable CORS for Firebase Storage URLs
      withCredentials: false
    })
    const pdf = await loadingTask.promise

    let fullText = ''

    // Try to extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')

      if (pageText.trim()) {
        fullText += `--- Page ${pageNum} ---\n${pageText}\n\n`
      }
    }

    const hasText = fullText.trim().length > 50 // Has meaningful text if more than 50 chars

    return { text: fullText, hasText }
  } catch (error) {
    logger.warn('[OCR Client] Failed to extract native text from PDF', error as Error)
    return { text: '', hasText: false }
  }
}

/**
 * Extract text from a PDF - tries native text extraction first, falls back to OCR
 */
export async function extractTextFromPDF(
  pdfUrl: string,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult[]> {
  try {
    logger.info('[OCR Client] Starting PDF text extraction', { pdfUrl })

    // Dynamically import PDF.js to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist')

    // Set worker - use unpkg CDN with HTTPS
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

    // First, try to extract native text (for digital PDFs)
    if (onProgress) {
      onProgress({
        status: 'loading',
        progress: 10,
        message: 'Checking for native text...'
      })
    }

    const nativeTextResult = await tryExtractNativeTextFromPDF(pdfUrl)

    // If we found native text, return it immediately (much faster!)
    if (nativeTextResult.hasText) {
      logger.info('[OCR Client] Found native text in PDF, skipping OCR')

      if (onProgress) {
        onProgress({
          status: 'completed',
          progress: 100,
          message: 'Text extracted from PDF'
        })
      }

      return [{
        text: nativeTextResult.text,
        confidence: 100, // Native text is 100% accurate
        blocks: []
      }]
    }

    // No native text found, fall back to OCR (for scanned PDFs)
    logger.info('[OCR Client] No native text found, using OCR')

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      withCredentials: false
    })
    const pdf = await loadingTask.promise

    const numPages = pdf.numPages
    const results: OCRResult[] = []

    logger.info('[OCR Client] PDF loaded, starting OCR', { numPages })

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (onProgress) {
        onProgress({
          status: 'recognizing',
          progress: Math.round(((pageNum - 1) / numPages) * 100),
          message: `Processing page ${pageNum} of ${numPages}...`
        })
      }

      // Get page
      const page = await pdf.getPage(pageNum)

      // Set scale for better quality (2 = 200% zoom)
      const scale = 2.0
      const viewport = page.getViewport({ scale })

      // Create canvas
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      canvas.width = viewport.width
      canvas.height = viewport.height

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise

      // Convert canvas to data URL
      const imageDataUrl = canvas.toDataURL('image/png')

      // Run OCR on the page image
      const result = await extractTextFromImage(imageDataUrl, (progress) => {
        if (onProgress) {
          onProgress({
            ...progress,
            message: `OCR on page ${pageNum} of ${numPages}: ${progress.message || ''}`
          })
        }
      })

      results.push(result)

      logger.info('[OCR Client] Page processed', { pageNum, textLength: result.text.length })
    }

    if (onProgress) {
      onProgress({
        status: 'completed',
        progress: 100,
        message: 'PDF text extraction completed'
      })
    }

    logger.info('[OCR Client] PDF text extraction completed', {
      numPages,
      totalTextLength: results.reduce((sum, r) => sum + r.text.length, 0)
    })

    return results
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error('[OCR Client] PDF text extraction failed', error as Error, {
      errorMessage,
      errorStack,
      pdfUrl
    })

    console.error('[OCR Client] Full error details:', {
      error,
      message: errorMessage,
      stack: errorStack,
      type: typeof error,
      keys: error ? Object.keys(error) : []
    })

    throw error
  }
}

/**
 * Batch process multiple images
 */
export async function extractTextFromMultipleImages(
  imageUrls: string[],
  onProgress?: (imageIndex: number, progress: OCRProgress) => void
): Promise<OCRResult[]> {
  const results: OCRResult[] = []

  for (let i = 0; i < imageUrls.length; i++) {
    const result = await extractTextFromImage(imageUrls[i], (progress) => {
      if (onProgress) {
        onProgress(i, progress)
      }
    })
    results.push(result)
  }

  return results
}
