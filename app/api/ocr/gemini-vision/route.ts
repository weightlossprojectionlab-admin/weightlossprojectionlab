/**
 * Gemini Vision OCR API Endpoint
 * Server-side endpoint for processing images with Gemini Vision API
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromImageWithGemini } from '@/lib/ocr-gemini'
import { logger } from '@/lib/logger'
import { getAdminStorage } from '@/lib/firebase-admin'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for complex documents

// Firebase Admin is initialized centrally in @/lib/firebase-admin
// No need to initialize here - just import and use the getter functions

/**
 * Fetch image from Firebase Storage or external URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    // Check if it's a Firebase Storage URL
    if (url.includes('firebasestorage.googleapis.com')) {
      logger.info('[Gemini Vision API] Fetching from Firebase Storage')

      // Extract path from Firebase Storage URL
      const urlObj = new URL(url)
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)/)

      if (pathMatch) {
        const storagePath = decodeURIComponent(pathMatch[1].split('?')[0])
        logger.info('[Gemini Vision API] Storage path extracted', { path: storagePath })

        // Get file from Firebase Storage using Admin SDK
        const storage = getAdminStorage()
        const bucket = storage.bucket()
        const file = bucket.file(storagePath)

        const [buffer] = await file.download()
        const base64 = buffer.toString('base64')

        // Determine MIME type from file extension
        const ext = storagePath.split('.').pop()?.toLowerCase()
        const mimeType = ext === 'png' ? 'image/png' :
                        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                        ext === 'gif' ? 'image/gif' :
                        ext === 'webp' ? 'image/webp' : 'image/jpeg'

        return `data:${mimeType};base64,${base64}`
      }
    }

    // For non-Firebase URLs or if path extraction failed, use fetch
    logger.info('[Gemini Vision API] Fetching from external URL')
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    return `data:${contentType};base64,${base64}`

  } catch (error) {
    logger.error('[Gemini Vision API] Failed to fetch image', error as Error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageData, imageUrl } = body

    let base64Image: string

    // Accept either imageData (base64) or imageUrl
    if (imageUrl) {
      // Fetch image from URL and convert to base64
      logger.info('[Gemini Vision API] Processing image from URL', {
        url: imageUrl.substring(0, 100)
      })

      base64Image = await fetchImageAsBase64(imageUrl)
    } else if (imageData) {
      // Validate imageData format
      if (typeof imageData !== 'string') {
        return NextResponse.json(
          { error: 'Invalid request: imageData must be a string' },
          { status: 400 }
        )
      }

      if (!imageData.startsWith('data:image/')) {
        return NextResponse.json(
          { error: 'Invalid image format: must be base64 data URL' },
          { status: 400 }
        )
      }

      base64Image = imageData
    } else {
      return NextResponse.json(
        { error: 'Invalid request: either imageData or imageUrl is required' },
        { status: 400 }
      )
    }

    logger.info('[Gemini Vision API] Processing OCR request', {
      imageSize: base64Image.length
    })

    // Call Gemini Vision API
    const result = await extractTextFromImageWithGemini(base64Image)

    logger.info('[Gemini Vision API] OCR completed successfully', {
      textLength: result.text.length,
      confidence: result.confidence
    })

    return NextResponse.json(result)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('[Gemini Vision API] OCR request failed', error as Error)

    // Check for specific error types
    if (errorMessage.includes('GEMINI_API_KEY')) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return NextResponse.json(
        { error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: `OCR processing failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
