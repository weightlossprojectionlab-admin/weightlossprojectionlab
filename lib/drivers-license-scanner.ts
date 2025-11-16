/**
 * Driver's License Scanner
 *
 * Scans PDF417 barcodes on US driver's licenses using Dynamsoft Barcode Reader
 */

import { parseAAMVA, type AAMVAData } from './aamva-parser'
import { logger } from './logger'

// Use type-only imports for Dynamsoft types (loaded via CDN)
type CaptureVisionRouter = any
type DecodedBarcodesResult = any

// Dynamsoft license key - using public trial key
// Get your own at: https://www.dynamsoft.com/customer/license/trialLicense
const DYNAMSOFT_LICENSE = 'DLS2eyJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSJ9'

let isInitialized = false

/**
 * Initialize Dynamsoft Barcode Reader
 * Note: This requires the Dynamsoft SDK to be loaded via CDN in the app
 */
export async function initializeScanner(): Promise<void> {
  if (isInitialized) {
    return
  }

  try {
    logger.info('[DL Scanner] Initializing Dynamsoft Barcode Reader')

    // Check if Dynamsoft is loaded
    if (typeof window === 'undefined' || !(window as any).Dynamsoft) {
      throw new Error('Dynamsoft SDK not loaded. Please add the CDN script to your HTML.')
    }

    const Dynamsoft = (window as any).Dynamsoft

    // Initialize license
    Dynamsoft.License.LicenseManager.initLicense(DYNAMSOFT_LICENSE)

    // Preload WASM files
    await Dynamsoft.Core.CoreModule.loadWasm(['dbr'])

    isInitialized = true
    logger.info('[DL Scanner] Initialization complete')
  } catch (error) {
    logger.error('[DL Scanner] Failed to initialize', error as Error)
    throw error
  }
}

/**
 * Scan driver's license from image file
 * Returns parsed AAMVA data
 */
export async function scanDriverLicense(imageFile: File): Promise<AAMVAData | null> {
  try {
    logger.info('[DL Scanner] Scanning driver license', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type
    })

    // Ensure scanner is initialized
    await initializeScanner()

    const Dynamsoft = (window as any).Dynamsoft

    // Create CaptureVisionRouter instance
    const cvRouter = await Dynamsoft.CVR.CaptureVisionRouter.createInstance()

    // Update settings to only scan PDF417 barcodes
    const settings = await cvRouter.getSimplifiedSettings('ReadSingleBarcode')
    settings.barcodeSettings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_PDF417
    settings.barcodeSettings.expectedBarcodesCount = 1
    await cvRouter.updateSettings('ReadSingleBarcode', settings)

    // Capture from image
    const result = await cvRouter.capture(imageFile, 'ReadSingleBarcode')

    logger.info('[DL Scanner] Scan complete', {
      resultsFound: result.items?.length || 0
    })

    // Dispose router
    cvRouter.dispose()

    if (!result.items || result.items.length === 0) {
      logger.warn('[DL Scanner] No PDF417 barcode found in image')
      return null
    }

    // Get the first barcode result
    const barcodeText = result.items[0].text

    logger.info('[DL Scanner] Barcode detected', {
      textLength: barcodeText.length,
      format: result.items[0].formatString
    })

    // Parse AAMVA data from barcode
    const aamvaData = parseAAMVA(barcodeText)

    if (!aamvaData) {
      logger.warn('[DL Scanner] Failed to parse AAMVA data from barcode')
      return null
    }

    return aamvaData

  } catch (error) {
    logger.error('[DL Scanner] Failed to scan driver license', error as Error)
    return null
  }
}

/**
 * Scan driver's license from camera (for future mobile support)
 */
export async function scanDriverLicenseFromCamera(): Promise<AAMVAData | null> {
  // TODO: Implement camera-based scanning
  // This would use Dynamsoft's camera capture features
  throw new Error('Camera scanning not yet implemented')
}

/**
 * Check if PDF417 scanning is supported in current environment
 */
export function isScanningSupported(): boolean {
  // PDF417 scanning works in all modern browsers
  // Just need to check for File API support
  return typeof File !== 'undefined' && typeof FileReader !== 'undefined'
}
