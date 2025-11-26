/**
 * Driver's License OCR Scanner
 *
 * Uses Tesseract.js to extract text from the FRONT of US driver's licenses
 * Parses name, date of birth, address, and other information
 */

import Tesseract from 'tesseract.js'
import { logger } from './logger'

export interface LicenseData {
  firstName: string
  lastName: string
  middleName?: string
  dateOfBirth: string
  gender: string
  streetAddress?: string
  city?: string
  state?: string
  zipCode?: string
  licenseNumber?: string
  expirationDate?: string
}

/**
 * Preprocess image for better OCR accuracy
 * Optimizations:
 * - Scale up to minimum 1500px width for better text recognition
 * - Convert to grayscale to reduce noise
 * - Enhance contrast
 * - Apply adaptive thresholding
 * - Sharpen edges
 * - Denoise
 */
async function preprocessImageForOCR(imageFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.onload = () => {
        try {
          // Create canvas for preprocessing
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!

          // Calculate scale to get minimum 1500px width for better OCR
          const targetWidth = 1500
          const scale = Math.max(targetWidth / img.width, 2)
          canvas.width = img.width * scale
          canvas.height = img.height * scale

          logger.info('[DL OCR] Preprocessing image', {
            originalSize: `${img.width}x${img.height}`,
            scaledSize: `${canvas.width}x${canvas.height}`,
            scale: scale.toFixed(2)
          })

          // Draw image scaled up
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          // Get image data for processing
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // Step 1: Convert to grayscale with proper weights
          for (let i = 0; i < data.length; i += 4) {
            // Standard luminance formula
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
            data[i] = data[i + 1] = data[i + 2] = gray
          }

          // Step 2: Apply histogram equalization for better contrast
          const histogram = new Array(256).fill(0)
          for (let i = 0; i < data.length; i += 4) {
            histogram[data[i]]++
          }

          // Calculate cumulative distribution
          const cdf = [histogram[0]]
          for (let i = 1; i < 256; i++) {
            cdf[i] = cdf[i - 1] + histogram[i]
          }

          // Normalize CDF
          const cdfMin = cdf.find(v => v > 0) || 0
          const cdfMax = cdf[255]
          const cdfRange = cdfMax - cdfMin

          for (let i = 0; i < data.length; i += 4) {
            const oldValue = data[i]
            const newValue = Math.round(((cdf[oldValue] - cdfMin) / cdfRange) * 255)
            data[i] = data[i + 1] = data[i + 2] = newValue
          }

          // Step 3: Apply adaptive thresholding for better text separation
          // Calculate local mean for adaptive threshold
          const blockSize = 15
          const tempData = new Uint8ClampedArray(data.length)

          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const idx = (y * canvas.width + x) * 4

              // Calculate local average
              let sum = 0
              let count = 0
              for (let dy = -blockSize; dy <= blockSize; dy++) {
                for (let dx = -blockSize; dx <= blockSize; dx++) {
                  const nx = x + dx
                  const ny = y + dy
                  if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                    const nidx = (ny * canvas.width + nx) * 4
                    sum += data[nidx]
                    count++
                  }
                }
              }

              const localMean = sum / count
              const threshold = localMean - 10 // Subtract constant for better results

              // Apply threshold
              const value = data[idx] > threshold ? 255 : 0
              tempData[idx] = tempData[idx + 1] = tempData[idx + 2] = value
              tempData[idx + 3] = 255
            }
          }

          // Copy thresholded data back
          for (let i = 0; i < data.length; i++) {
            data[i] = tempData[i]
          }

          // Step 4: Apply light denoising (remove isolated pixels)
          const denoisedData = new Uint8ClampedArray(data.length)
          for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
              const idx = (y * canvas.width + x) * 4

              // Count surrounding pixels
              let whiteCount = 0
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const nidx = ((y + dy) * canvas.width + (x + dx)) * 4
                  if (data[nidx] === 255) whiteCount++
                }
              }

              // Keep pixel if it has at least 3 similar neighbors
              const value = whiteCount >= 3 ? data[idx] : 0
              denoisedData[idx] = denoisedData[idx + 1] = denoisedData[idx + 2] = value
              denoisedData[idx + 3] = 255
            }
          }

          // Apply denoised data
          for (let i = 0; i < data.length; i++) {
            data[i] = denoisedData[i]
          }

          ctx.putImageData(imageData, 0, 0)

          logger.info('[DL OCR] Image preprocessing complete')

          // Convert to data URL
          resolve(canvas.toDataURL('image/png'))
        } catch (error) {
          logger.error('[DL OCR] Preprocessing failed', error as Error)
          reject(error)
        }
      }

      img.onerror = reject
      img.src = e.target?.result as string
    }

    reader.onerror = reject
    reader.readAsDataURL(imageFile)
  })
}

/**
 * Extract text from driver's license image using OCR with preprocessing
 */
async function extractText(imageFile: File): Promise<string> {
  try {
    logger.info('[DL OCR] Starting text extraction', {
      fileName: imageFile.name,
      fileSize: imageFile.size
    })

    // Preprocess image for better OCR
    const preprocessedImage = await preprocessImageForOCR(imageFile)
    logger.debug('[DL OCR] Image preprocessed for OCR')

    const result = await Tesseract.recognize(
      preprocessedImage,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug('[DL OCR] Progress', { progress: Math.round(m.progress * 100) })
          }
        }
      }
    )

    const text = result.data.text
    logger.info('[DL OCR] Text extracted', {
      textLength: text.length,
      confidence: Math.round(result.data.confidence)
    })

    return text
  } catch (error: any) {
    logger.error('[DL OCR] Text extraction failed', error)
    throw new Error('Failed to extract text from image')
  }
}

/**
 * Parse extracted text to find license information
 */
function parseDriversLicense(text: string): LicenseData | null {
  try {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    logger.debug('[DL OCR] Parsing license data', { totalLines: lines.length, text })

    const data: Partial<LicenseData> = {}

    // Common patterns for driver's licenses
    const dobPatterns = [
      /DOB[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /DATE OF BIRTH[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /\bDOB\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b/
    ]

    const genderPatterns = [
      /\bSEX[:\s]+(M|F)\b/i,
      /\bGENDER[:\s]+(M|F|MALE|FEMALE)\b/i,
      /\bSEX\s+(M|F)\b/i,
      /\bGENDER\s+(M|F)\b/i,
      /\b(MALE|FEMALE)\b/i,
      /\b(M|F)\b(?=\s+HT[:\s]+|$)/i // M or F before HT (height)
    ]

    const addressPatterns = [
      /(\d+\s+[A-Z\s]+(?:#\d+\s*)?(?:ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|LN|LANE|BLVD|BOULEVARD|CT|COURT|PL|PLACE))/i,
    ]

    const statePatterns = /\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/

    // Try to find date of birth
    for (const pattern of dobPatterns) {
      const match = text.match(pattern)
      if (match) {
        data.dateOfBirth = formatDate(match[1])
        break
      }
    }

    // Try to find gender
    for (const pattern of genderPatterns) {
      const match = text.match(pattern)
      if (match) {
        const gender = match[1].toUpperCase()
        data.gender = gender === 'M' || gender === 'MALE' ? 'male' : 'female'
        break
      }
    }

    // Try to find address
    for (const line of lines) {
      const addressMatch = line.match(addressPatterns[0])
      if (addressMatch) {
        data.streetAddress = addressMatch[1]

        // Try to extract city from the line after address
        const cityMatch = text.match(new RegExp(addressMatch[1] + '[,\\s]+([A-Z\\s]+),\\s*([A-Z]{2})'))
        if (cityMatch) {
          data.city = cityMatch[1].trim()
          data.state = cityMatch[2]
        }
        break
      }
    }

    // Try to find state and zip
    const stateMatch = text.match(statePatterns)
    if (stateMatch && !data.state) {
      data.state = stateMatch[1]
      data.zipCode = stateMatch[2]
    }

    // Extract name - look for patterns specific to driver's licenses
    // Common formats:
    // 1. LAST_NAME, FIRST_NAME MIDDLE_INITIAL (Pennsylvania)
    // 2. Line numbers with name (New Jersey: "1 SAMPLE" or "2 ANDREW JASON")
    // 3. LN/FN labels (California: "LN SAMPLE" and "FN ALEXANDER JOSEPH")
    // 4. Separate lines with last/first

    // Try LN/FN label format (California)
    const lnMatch = text.match(/\bLN\s*[:\s]*([A-Z]+)/i)
    const fnMatch = text.match(/\bFN\s*[:\s]*([A-Z\s]+?)(?=\n|\d|[A-Z]{2,}\s*:)/i)

    if (lnMatch) {
      data.lastName = lnMatch[1].trim()
    }
    if (fnMatch) {
      const firstPart = fnMatch[1].trim()
      const firstParts = firstPart.split(/\s+/)
      data.firstName = firstParts[0]
      if (firstParts.length > 1) {
        data.middleName = firstParts.slice(1).join(' ')
      }
    }

    // Filter out common license text that's not a name
    const excludeWords = ['DRIVER', 'LICENSE', 'AUTO', 'JERSEY', 'STATE', 'REAL', 'CLASS', 'RESTRICTIONS', 'ENDORSEMENTS', 'COMMERCIAL', 'PENNSYLVANIA', 'CALIFORNIA']

    // Look for name on lines that contain recognizable name patterns
    const nameLines = lines.filter(line => {
      // Skip lines with excluded words
      if (excludeWords.some(word => line.toUpperCase().includes(word))) {
        return false
      }
      // Remove line numbers if present (like "1 SAMPLE" or "2 ANDREW")
      const cleanLine = line.replace(/^\d+\s+/, '')
      // Must be mostly letters and spaces, may have comma
      return /^[A-Z\s,]{2,50}$/.test(cleanLine) &&
             cleanLine.split(/\s+/).length >= 1 &&
             cleanLine.split(/\s+/).length <= 5
    })

    logger.debug('[DL OCR] Name candidates', { nameLines })

    // Try comma-separated format (Pennsylvania)
    if (!data.firstName) {
      for (const line of nameLines) {
        const cleanLine = line.replace(/^\d+\s+/, '') // Remove line numbers
        if (cleanLine.includes(',')) {
          const [lastName, firstPart] = cleanLine.split(',').map(s => s.trim())
          const firstParts = firstPart.split(/\s+/)
          data.lastName = lastName
          data.firstName = firstParts[0]
          if (firstParts.length > 1) {
            data.middleName = firstParts.slice(1).join(' ')
          }
          break
        }
      }
    }

    // Try to find lines with "1 LASTNAME" and "2 FIRSTNAME" (New Jersey)
    if (!data.firstName) {
      const line1 = lines.find(l => /^1\s+[A-Z]+$/.test(l.trim()))
      const line2 = lines.find(l => /^2\s+[A-Z\s]+$/.test(l.trim()))

      if (line1 && line2) {
        data.lastName = line1.replace(/^1\s+/, '').trim()
        const firstPart = line2.replace(/^2\s+/, '').trim()
        const firstParts = firstPart.split(/\s+/)
        data.firstName = firstParts[0]
        if (firstParts.length > 1) {
          data.middleName = firstParts.slice(1).join(' ')
        }
      }
    }

    // Try space-separated format
    if (!data.firstName && nameLines.length > 0) {
      const cleanLine = nameLines[0].replace(/^\d+\s+/, '')
      const nameParts = cleanLine.split(/\s+/)
      if (nameParts.length >= 2) {
        // Assume format: FIRST LAST or LAST FIRST MIDDLE
        if (nameParts.length === 2) {
          // Could be either order, assume FIRST LAST
          data.firstName = nameParts[0]
          data.lastName = nameParts[1]
        } else {
          // Assume format: LAST FIRST MIDDLE
          data.lastName = nameParts[0]
          data.firstName = nameParts[1]
          if (nameParts.length > 2) {
            data.middleName = nameParts.slice(2).join(' ')
          }
        }
      } else if (nameParts.length === 1) {
        // Single name on one line, might be last name
        data.lastName = nameParts[0]
      }
    }

    // Validate we have minimum required data
    if (!data.firstName || !data.lastName || !data.dateOfBirth) {
      logger.warn('[DL OCR] Insufficient data extracted', { extracted: data })
      return null
    }

    logger.info('[DL OCR] Successfully parsed license data', {
      hasName: !!data.firstName && !!data.lastName,
      hasDOB: !!data.dateOfBirth,
      hasGender: !!data.gender,
      hasAddress: !!data.streetAddress
    })

    return data as LicenseData
  } catch (error: any) {
    logger.error('[DL OCR] Failed to parse license data', error)
    return null
  }
}

/**
 * Format date string to YYYY-MM-DD
 */
function formatDate(dateStr: string): string {
  try {
    // Handle MM/DD/YYYY or MM-DD-YYYY
    const parts = dateStr.split(/[-\/]/)
    if (parts.length === 3) {
      let [month, day, year] = parts

      // Handle 2-digit year
      if (year.length === 2) {
        const yearNum = parseInt(year)
        year = yearNum > 50 ? `19${year}` : `20${year}`
      }

      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    return dateStr
  } catch {
    return dateStr
  }
}

/**
 * Scan driver's license from front image and extract data
 */
export async function scanDriversLicenseFront(imageFile: File): Promise<LicenseData | null> {
  try {
    // Extract text using OCR
    const text = await extractText(imageFile)

    // Log the raw text for debugging
    console.log('[DL OCR] Raw text extracted:', text)

    // Parse the extracted text
    const licenseData = parseDriversLicense(text)

    if (!licenseData) {
      console.log('[DL OCR] Failed to parse. Raw OCR text was:', text)
    }

    return licenseData
  } catch (error: any) {
    logger.error('[DL OCR] Scan failed', error)
    return null
  }
}

/**
 * Extract raw text from image without parsing (for debugging)
 */
export async function extractRawText(imageFile: File): Promise<string> {
  return await extractText(imageFile)
}

/**
 * Check if OCR is supported in current environment
 */
export function isOCRSupported(): boolean {
  return typeof File !== 'undefined' && typeof FileReader !== 'undefined'
}
