// API route to proxy Firebase Storage images to avoid CORS issues
// This fetches the image server-side where CORS doesn't apply

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Parse allowed origins from environment variable
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

export async function GET(request: NextRequest) {
  try {
    // Check origin header for CORS validation
    const origin = request.headers.get('origin')

    // If origin is present, validate it against allowed list
    if (origin && ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin)) {
      logger.warn('Blocked proxy-image request from disallowed origin', { origin, allowedOrigins: ALLOWED_ORIGINS })
      return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
    }

    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
    }

    // Validate it's a Firebase Storage URL
    if (!url.includes('firebasestorage.googleapis.com')) {
      return NextResponse.json({ error: 'Only Firebase Storage URLs allowed' }, { status: 400 })
    }

    logger.info('Proxying Firebase Storage image', { url, origin })

    // Fetch the image from Firebase Storage (server-side, no CORS)
    const response = await fetch(url)

    if (!response.ok) {
      logger.error('Failed to fetch image from Firebase Storage', new Error(response.statusText), { url, status: response.status })
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status })
    }

    // Get the image blob
    const blob = await response.blob()
    const buffer = await blob.arrayBuffer()

    logger.info('Image fetched successfully', { size: blob.size, type: blob.type })

    // Build response headers
    const headers: Record<string, string> = {
      'Content-Type': blob.type || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    }

    // Set CORS headers if origin is present and allowed
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Vary'] = 'Origin'
    }

    // Return the image with appropriate headers
    return new NextResponse(buffer, { headers })
  } catch (error) {
    logger.error('Error proxying Firebase Storage image', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
