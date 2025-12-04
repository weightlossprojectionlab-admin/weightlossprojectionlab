/**
 * Unified OCR Service
 *
 * DRY approach - single service for all OCR needs:
 * - Medical documents (insurance cards, lab results, prescriptions)
 * - Medication labels
 * - Provider cards
 * - PDFs (converts to images, then OCR)
 * - Any image-based text extraction
 */

import { extractTextFromImage } from './ocr-medication'
import { logger } from './logger'

// Lazy load PDF.js to avoid SSR issues
let pdfjsLib: any = null

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib

  try {
    // Dynamic import to avoid SSR issues - use legacy build path for v3
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf')

    // Configure worker
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
      logger.info('[OCR Service] PDF.js loaded successfully')
    }

    pdfjsLib = pdfjs
    return pdfjsLib
  } catch (error) {
    logger.error('[OCR Service] Failed to load PDF.js', error as Error, {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    })
    throw new Error('PDF processing library not available')
  }
}

export interface OcrResult {
  text: string
  confidence: number
  processedAt: string
}

export interface OcrOptions {
  onProgress?: (progress: number) => void
  useGeminiFallback?: boolean
  minConfidence?: number
  maxPdfPages?: number // Limit pages to process from PDFs
}

/**
 * Convert PDF pages to images for OCR processing
 *
 * @param pdfFile - PDF file to convert
 * @param maxPages - Maximum number of pages to process
 * @returns Array of image blobs
 */
async function convertPdfToImages(pdfFile: File | Blob, maxPages: number = 10): Promise<Blob[]> {
  try {
    logger.info('[OCR Service] Converting PDF to images', { maxPages })

    // Load PDF.js library
    const pdfjs = await loadPdfJs()

    // Load PDF
    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

    const numPages = Math.min(pdf.numPages, maxPages)
    const images: Blob[] = []

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2.0 }) // 2x scale for better OCR

      // Create canvas
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) continue

      canvas.width = viewport.width
      canvas.height = viewport.height

      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png')
      })

      if (blob) {
        images.push(blob)
        logger.debug('[OCR Service] Converted PDF page to image', { pageNum, size: blob.size })
      }
    }

    logger.info('[OCR Service] PDF conversion complete', { pagesConverted: images.length })
    return images

  } catch (error) {
    logger.error('[OCR Service] PDF conversion failed', error as Error, {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined
    })
    return []
  }
}

/**
 * Extract text from any image document
 * Reuses existing Tesseract OCR infrastructure
 *
 * @param imageFile - Image file to process
 * @param options - OCR options
 * @returns Extracted text and confidence score
 */
export async function extractTextFromDocument(
  imageFile: File | Blob,
  options: OcrOptions = {}
): Promise<OcrResult | null> {
  const {
    onProgress,
    minConfidence = 30
  } = options

  try {
    logger.info('[OCR Service] Starting text extraction', {
      fileSize: imageFile.size,
      fileType: imageFile instanceof File ? imageFile.type : 'blob'
    })

    // Use existing Tesseract implementation from ocr-medication.ts
    const { text, confidence } = await extractTextFromImage(imageFile, onProgress)

    if (!text || text.length < 5) {
      logger.warn('[OCR Service] Insufficient text extracted', {
        textLength: text?.length,
        confidence
      })
      return null
    }

    if (confidence < minConfidence) {
      logger.warn('[OCR Service] Low confidence result', {
        confidence,
        minConfidence,
        textPreview: text.substring(0, 100)
      })
    }

    const result: OcrResult = {
      text: text.trim(),
      confidence: Math.round(confidence),
      processedAt: new Date().toISOString()
    }

    logger.info('[OCR Service] Text extraction successful', {
      textLength: result.text.length,
      confidence: result.confidence
    })

    return result

  } catch (error) {
    logger.error('[OCR Service] Text extraction failed', error as Error)
    return null
  }
}

/**
 * Extract text from PDF by converting pages to images first
 *
 * @param pdfFile - PDF file to process
 * @param options - OCR options
 * @returns Combined OCR result from all pages
 */
export async function extractTextFromPdf(
  pdfFile: File | Blob,
  options: OcrOptions = {}
): Promise<OcrResult | null> {
  const { maxPdfPages = 10 } = options

  try {
    logger.info('[OCR Service] Starting PDF OCR processing')

    // Convert PDF pages to images
    const images = await convertPdfToImages(pdfFile, maxPdfPages)

    if (images.length === 0) {
      logger.warn('[OCR Service] No images extracted from PDF')
      return null
    }

    // Process each image with OCR
    const results = await extractTextFromMultipleImages(images, options)

    // Combine results
    return combineOcrResults(results)

  } catch (error) {
    logger.error('[OCR Service] PDF OCR failed', error as Error)
    return null
  }
}

/**
 * Process multiple images in batch
 * Useful for multi-page documents
 */
export async function extractTextFromMultipleImages(
  imageFiles: (File | Blob)[],
  options: OcrOptions = {}
): Promise<OcrResult[]> {
  const results: OcrResult[] = []

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i]
    logger.info('[OCR Service] Processing image', {
      index: i + 1,
      total: imageFiles.length
    })

    // Adjust progress callback to account for multiple files
    const adjustedOptions = {
      ...options,
      onProgress: options.onProgress
        ? (progress: number) => {
            const overallProgress = ((i + (progress / 100)) / imageFiles.length) * 100
            options.onProgress!(Math.round(overallProgress))
          }
        : undefined
    }

    const result = await extractTextFromDocument(file, adjustedOptions)
    if (result) {
      results.push(result)
    }
  }

  return results
}

/**
 * Combine multiple OCR results into a single document
 */
export function combineOcrResults(results: OcrResult[]): OcrResult | null {
  if (results.length === 0) return null

  // Combine all text with page separators
  const combinedText = results
    .map((r, i) => `--- Page ${i + 1} ---\n${r.text}`)
    .join('\n\n')

  // Average confidence across all pages
  const avgConfidence = Math.round(
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length
  )

  return {
    text: combinedText,
    confidence: avgConfidence,
    processedAt: new Date().toISOString()
  }
}

/**
 * Extract and classify document type based on content
 * Useful for auto-categorizing uploaded documents
 */
export function classifyDocumentType(text: string): {
  suggestedCategory: string
  confidence: number
  keywords: string[]
} {
  const lowerText = text.toLowerCase()
  const keywords: string[] = []

  // Insurance card patterns
  if (lowerText.match(/(?:member|policy|group)\s+(?:id|number)|insurance|coverage|subscriber/)) {
    keywords.push('insurance', 'member id', 'policy')
    return {
      suggestedCategory: 'insurance_card',
      confidence: 90,
      keywords
    }
  }

  // Lab results patterns
  if (lowerText.match(/(?:lab|laboratory|test)\s+results?|specimen|reference\s+range|normal\s+range/)) {
    keywords.push('lab', 'test results', 'specimen')
    return {
      suggestedCategory: 'lab_result',
      confidence: 85,
      keywords
    }
  }

  // Prescription patterns
  if (lowerText.match(/(?:rx|prescription)\s+(?:number|#)|refill|dosage|take.*(?:tablet|capsule)/)) {
    keywords.push('prescription', 'rx number', 'medication')
    return {
      suggestedCategory: 'prescription',
      confidence: 85,
      keywords
    }
  }

  // ID card patterns
  if (lowerText.match(/driver.?s?\s+license|state\s+id|date\s+of\s+birth|expires?/)) {
    keywords.push('id', 'license', 'dob')
    return {
      suggestedCategory: 'id_card',
      confidence: 80,
      keywords
    }
  }

  // Vaccination record patterns
  if (lowerText.match(/vaccin(?:e|ation)|immunization|dose|covid|flu\s+shot/)) {
    keywords.push('vaccination', 'immunization')
    return {
      suggestedCategory: 'vaccination_record',
      confidence: 80,
      keywords
    }
  }

  // Imaging/X-ray patterns
  if (lowerText.match(/x-ray|radiology|imaging|mri|ct\s+scan|ultrasound/)) {
    keywords.push('imaging', 'radiology')
    return {
      suggestedCategory: 'imaging',
      confidence: 80,
      keywords
    }
  }

  // Medical record patterns
  if (lowerText.match(/medical\s+record|patient\s+(?:name|chart)|diagnosis|treatment\s+plan/)) {
    keywords.push('medical record', 'patient chart')
    return {
      suggestedCategory: 'medical_record',
      confidence: 70,
      keywords
    }
  }

  return {
    suggestedCategory: 'other',
    confidence: 50,
    keywords
  }
}
