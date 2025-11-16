/**
 * Driver's License Scanner
 *
 * Scans PDF417 barcodes on US driver's licenses using ZXing (free open-source library)
 */

import { BrowserPDF417Reader } from '@zxing/library'
import { parseAAMVA, type AAMVAData } from './aamva-parser'
import { logger } from './logger'

/**
 * Scan driver's license from image file
 * Returns parsed AAMVA data
 */
export async function scanDriverLicense(imageFile: File): Promise<AAMVAData | null> {
  let imageUrl: string | null = null

  try {
    logger.info('[DL Scanner] Scanning driver license with ZXing', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type
    })

    // Create barcode reader instance
    const codeReader = new BrowserPDF417Reader()

    // Create object URL from file
    imageUrl = URL.createObjectURL(imageFile)

    // Decode PDF417 barcode from image
    const result = await codeReader.decodeFromImageUrl(imageUrl)

    const barcodeText = result.getText()

    logger.info('[DL Scanner] Barcode detected', {
      textLength: barcodeText.length,
      format: result.getBarcodeFormat()
    })

    // Parse AAMVA data from barcode
    const aamvaData = parseAAMVA(barcodeText)

    if (!aamvaData) {
      logger.warn('[DL Scanner] Failed to parse AAMVA data from barcode')
      return null
    }

    return aamvaData

  } catch (error: any) {
    // Check if it's a "not found" error (no barcode in image)
    if (error?.message?.includes('No MultiFormat Readers') || error?.message?.includes('NotFoundException')) {
      logger.warn('[DL Scanner] No PDF417 barcode found in image')
      return null
    }

    logger.error('[DL Scanner] Failed to scan driver license', error as Error)
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
