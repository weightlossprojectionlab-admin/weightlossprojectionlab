/**
 * Client-side Gemini Vision OCR
 * Uses Gemini API for superior image and document text extraction
 */

import { logger } from '@/lib/logger'
import { getCSRFToken } from '@/lib/csrf'
import { getAuth } from 'firebase/auth'

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
 * Get Firebase auth token
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const auth = getAuth()
    const user = auth.currentUser

    if (!user) {
      // Wait briefly for auth to initialize
      await new Promise(resolve => setTimeout(resolve, 200))
      const retryUser = auth.currentUser
      if (!retryUser) return null
      return await retryUser.getIdToken()
    }

    return await user.getIdToken()
  } catch (error) {
    logger.error('[Gemini OCR Client] Failed to get auth token', error as Error)
    return null
  }
}

/**
 * Extract text from an image using Gemini Vision API
 * Sends image URL to server to avoid CORS issues
 */
export async function extractTextFromImage(
  imageUrl: string,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  try {
    logger.info('[Gemini OCR Client] Starting text extraction', { imageUrl })

    if (onProgress) {
      onProgress({
        status: 'loading',
        progress: 10,
        message: 'Preparing image...'
      })
    }

    // Get auth token (which bypasses CSRF in middleware)
    const authToken = await getAuthToken()

    logger.info('[Gemini OCR Client] Auth token obtained', {
      hasToken: !!authToken,
      tokenLength: authToken?.length
    })

    if (onProgress) {
      onProgress({
        status: 'recognizing',
        progress: 30,
        message: 'Analyzing with Gemini Vision...'
      })
    }

    // Build headers with auth token (CSRF not needed when auth token present)
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    } else {
      // Fallback to CSRF if no auth token
      const csrfToken = getCSRFToken()
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken
      } else {
        throw new Error('No authentication method available (neither auth token nor CSRF token)')
      }
    }

    // Call server API endpoint for Gemini OCR
    // Server will handle fetching the image to avoid CORS issues
    const response = await fetch('/api/ocr/gemini-vision', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageUrl: imageUrl // Send URL instead of base64 data
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `OCR request failed: ${response.status}`)
    }

    if (onProgress) {
      onProgress({
        status: 'recognizing',
        progress: 80,
        message: 'Processing results...'
      })
    }

    const result = await response.json()

    if (onProgress) {
      onProgress({
        status: 'completed',
        progress: 100,
        message: 'Text extraction completed'
      })
    }

    logger.info('[Gemini OCR Client] Text extraction completed', {
      textLength: result.text.length,
      confidence: result.confidence
    })

    return {
      text: result.text,
      confidence: result.confidence,
      blocks: [] // Gemini doesn't provide block-level data
    }
  } catch (error) {
    logger.error('[Gemini OCR Client] Text extraction failed', error as Error)

    if (onProgress) {
      onProgress({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    throw error
  }
}

/**
 * Extract text from PDF using Gemini Vision API
 * Converts PDF pages to images and processes with Gemini
 */
export async function extractTextFromPDF(
  pdfUrl: string,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult[]> {
  try {
    logger.info('[Gemini OCR Client] Starting PDF text extraction', { pdfUrl })

    if (onProgress) {
      onProgress({
        status: 'loading',
        progress: 5,
        message: 'Loading PDF...'
      })
    }

    // Dynamically import PDF.js to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist')

    // Set worker - use jsdelivr CDN (more reliable than unpkg)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      withCredentials: false
    })
    const pdf = await loadingTask.promise

    const numPages = pdf.numPages
    const results: OCRResult[] = []

    logger.info('[Gemini OCR Client] PDF loaded, starting OCR', { numPages })

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (onProgress) {
        onProgress({
          status: 'recognizing',
          progress: Math.round(((pageNum - 1) / numPages) * 85) + 10,
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

      // Process with Gemini Vision
      const result = await extractTextFromImage(imageDataUrl, (progress) => {
        if (onProgress) {
          onProgress({
            ...progress,
            progress: Math.round(((pageNum - 1) / numPages) * 85) + 10 + (progress.progress * 0.15),
            message: `Page ${pageNum}/${numPages}: ${progress.message || ''}`
          })
        }
      })

      results.push(result)

      logger.info('[Gemini OCR Client] Page processed', { pageNum, textLength: result.text.length })
    }

    if (onProgress) {
      onProgress({
        status: 'completed',
        progress: 100,
        message: 'PDF text extraction completed'
      })
    }

    logger.info('[Gemini OCR Client] PDF text extraction completed', {
      numPages,
      totalTextLength: results.reduce((sum, r) => sum + r.text.length, 0)
    })

    return results
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error('[Gemini OCR Client] PDF text extraction failed', error as Error, {
      errorMessage,
      errorStack,
      pdfUrl
    })

    if (onProgress) {
      onProgress({
        status: 'error',
        progress: 0,
        message: errorMessage
      })
    }

    throw error
  }
}

/**
 * Batch process multiple images with Gemini Vision
 */
export async function extractTextFromMultipleImages(
  imageUrls: string[],
  onProgress?: (imageIndex: number, progress: OCRProgress) => void
): Promise<OCRResult[]> {
  const results: OCRResult[] = []

  for (let i = 0; i < imageUrls.length; i++) {
    const result = await extractTextFromImage(imageUrls[i], (progress) => {
      if (onProgress) {
        onProgress(i, {
          ...progress,
          message: `Image ${i + 1}/${imageUrls.length}: ${progress.message || ''}`
        })
      }
    })
    results.push(result)
  }

  return results
}
