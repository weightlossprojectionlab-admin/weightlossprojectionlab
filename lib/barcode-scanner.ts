/**
 * Barcode Scanner Utilities
 *
 * Functions for scanning barcodes from images
 */

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { logger } from '@/lib/logger'

/**
 * Scan a barcode from an uploaded image file
 * Supports NDC barcodes (CODE_128, CODE_39, UPC, EAN)
 */
export async function scanBarcodeFromImage(imageFile: File): Promise<string | null> {
  let scannerId = 'temp-barcode-scanner'
  let tempElement: HTMLElement | null = null

  try {
    logger.info('[Barcode Scanner] Scanning image for barcode', {
      fileName: imageFile.name,
      fileSize: imageFile.size
    })

    // Create temporary div for scanner if it doesn't exist
    tempElement = document.getElementById(scannerId)
    if (!tempElement) {
      tempElement = document.createElement('div')
      tempElement.id = scannerId
      tempElement.style.display = 'none'
      document.body.appendChild(tempElement)
    }

    // Create a temporary scanner instance
    const scanner = new Html5Qrcode(scannerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE
      ],
      verbose: false
    })

    // Scan the image file (showImage = true for better compatibility)
    const result = await scanner.scanFile(imageFile, true)

    logger.info('[Barcode Scanner] Barcode detected', { barcode: result })

    // Clean up: Remove the temporary scanner element
    if (tempElement && tempElement.parentNode) {
      tempElement.parentNode.removeChild(tempElement)
    }

    return result

  } catch (error: any) {
    logger.error('[Barcode Scanner] Failed to scan barcode from image', error)

    // Clean up on error
    if (tempElement && tempElement.parentNode) {
      try {
        tempElement.parentNode.removeChild(tempElement)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    // Check various error conditions
    const errorMsg = error.message?.toLowerCase() || ''
    if (errorMsg.includes('no') && (errorMsg.includes('barcode') || errorMsg.includes('code') || errorMsg.includes('found'))) {
      logger.warn('[Barcode Scanner] No barcode found in image')
      return null
    }

    if (errorMsg.includes('unable') || errorMsg.includes('not found')) {
      logger.warn('[Barcode Scanner] Unable to decode barcode from image')
      return null
    }

    // Return null for any decoding errors rather than throwing
    logger.warn('[Barcode Scanner] Barcode detection failed, returning null')
    return null
  }
}

/**
 * Convert image URL or File to NDC format
 * NDC barcodes are typically 11 digits with hyphens removed
 */
export function formatNDC(rawBarcode: string): string {
  // Remove any hyphens or spaces
  const cleaned = rawBarcode.replace(/[-\s]/g, '')

  // NDC codes are typically 10-11 digits
  if (cleaned.length >= 10 && cleaned.length <= 11 && /^\d+$/.test(cleaned)) {
    return cleaned
  }

  return rawBarcode
}

/**
 * Validate if a string looks like an NDC barcode
 */
export function isValidNDC(barcode: string): boolean {
  const cleaned = barcode.replace(/[-\s]/g, '')
  return cleaned.length >= 10 && cleaned.length <= 11 && /^\d+$/.test(cleaned)
}
