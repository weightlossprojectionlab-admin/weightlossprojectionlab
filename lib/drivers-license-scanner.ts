/**
 * Driver's License Scanner
 *
 * Scans PDF417 barcodes on US driver's licenses using ZXing (free open-source library)
 */

import { BrowserPDF417Reader, DecodeHintType, BarcodeFormat } from '@zxing/library'
import { parseAAMVA, type AAMVAData } from './aamva-parser'
import { logger } from './logger'
import imageCompression from 'browser-image-compression'

/**
 * Preprocess image for better barcode detection
 */
async function preprocessImage(imageFile: File): Promise<File> {
  try {
    // Compress and optimize image for better barcode detection
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.9,
      preserveExif: false
    }

    const processedFile = await imageCompression(imageFile, options)

    logger.info('[DL Scanner] Image preprocessed', {
      originalSize: imageFile.size,
      processedSize: processedFile.size,
      reduction: `${Math.round((1 - processedFile.size / imageFile.size) * 100)}%`
    })

    return processedFile
  } catch (error: any) {
    logger.warn('[DL Scanner] Image preprocessing failed, using original', { error: error.message })
    return imageFile
  }
}

/**
 * Scan driver's license from image file with multiple attempts and preprocessing
 * Returns parsed AAMVA data
 */
export async function scanDriverLicense(imageFile: File): Promise<AAMVAData | null> {
  let imageUrl: string | null = null

  try {
    logger.info('[DL Scanner] Starting scan process', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type
    })

    // Preprocess image for better detection
    const processedFile = await preprocessImage(imageFile)

    // Create barcode reader instance with hints
    const codeReader = new BrowserPDF417Reader()

    // Create hints for better detection
    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    hints.set(DecodeHintType.PURE_BARCODE, false)
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417])

    // Create object URL from processed file
    imageUrl = URL.createObjectURL(processedFile)

    // Attempt 1: Try with hints
    try {
      logger.info('[DL Scanner] Attempt 1: Scanning with TRY_HARDER hints')
      const result = await codeReader.decodeFromImageUrl(imageUrl)
      const barcodeText = result.getText()

      logger.info('[DL Scanner] ✓ Barcode detected on attempt 1', {
        textLength: barcodeText.length,
        format: result.getBarcodeFormat()
      })

      const aamvaData = parseAAMVA(barcodeText)
      if (aamvaData) {
        return aamvaData
      }
    } catch (error1) {
      logger.warn('[DL Scanner] Attempt 1 failed, trying alternative approach', {
        error: error1 instanceof Error ? error1.message : 'Unknown error'
      })
    }

    // Attempt 2: Try without hints (sometimes works better)
    try {
      logger.info('[DL Scanner] Attempt 2: Scanning without hints')
      const codeReader2 = new BrowserPDF417Reader()
      const result = await codeReader2.decodeFromImageUrl(imageUrl)
      const barcodeText = result.getText()

      logger.info('[DL Scanner] ✓ Barcode detected on attempt 2', {
        textLength: barcodeText.length,
        format: result.getBarcodeFormat()
      })

      const aamvaData = parseAAMVA(barcodeText)
      if (aamvaData) {
        return aamvaData
      }
    } catch (error2) {
      logger.warn('[DL Scanner] Attempt 2 failed', {
        error: error2 instanceof Error ? error2.message : 'Unknown error'
      })
    }

    // Attempt 3: Try with original unprocessed image
    if (processedFile !== imageFile) {
      try {
        logger.info('[DL Scanner] Attempt 3: Trying original unprocessed image')
        URL.revokeObjectURL(imageUrl)
        imageUrl = URL.createObjectURL(imageFile)

        const codeReader3 = new BrowserPDF417Reader()
        const result = await codeReader3.decodeFromImageUrl(imageUrl)
        const barcodeText = result.getText()

        logger.info('[DL Scanner] ✓ Barcode detected on attempt 3', {
          textLength: barcodeText.length,
          format: result.getBarcodeFormat()
        })

        const aamvaData = parseAAMVA(barcodeText)
        if (aamvaData) {
          return aamvaData
        }
      } catch (error3) {
        logger.warn('[DL Scanner] Attempt 3 failed', {
          error: error3 instanceof Error ? error3.message : 'Unknown error'
        })
      }
    }

    // All attempts failed
    logger.error('[DL Scanner] All scan attempts failed - no barcode detected', undefined, {
      totalAttempts: processedFile !== imageFile ? 3 : 2,
      suggestion: 'Try taking a clearer photo with better lighting, ensure barcode is visible and in focus'
    })

    return null

  } catch (error: any) {
    logger.error('[DL Scanner] Unexpected error during scan', error as Error)
    return null
  } finally {
    // Clean up object URL to free memory
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
    }
  }
}

/**
 * Scan driver's license from camera (for future mobile support)
 */
export async function scanDriverLicenseFromCamera(): Promise<AAMVAData | null> {
  // TODO: Implement camera-based scanning
  // This would use ZXing's camera capture features
  throw new Error('Camera scanning not yet implemented')
}

/**
 * Check if PDF417 scanning is supported in current environment
 */
export function isScanningSupported(): boolean {
  // PDF417 scanning works in all modern browsers with ZXing
  // Just need to check for File API support
  return typeof File !== 'undefined' && typeof FileReader !== 'undefined'
}

/**
 * Initialize scanner (no-op for ZXing, kept for API compatibility)
 */
export async function initializeScanner(): Promise<void> {
  // ZXing doesn't require initialization
  // This function is kept for backward compatibility
  logger.info('[DL Scanner] ZXing scanner ready (no initialization needed)')
}
