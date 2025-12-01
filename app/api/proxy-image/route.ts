// API route to proxy Firebase Storage images to avoid CORS issues
// This fetches the image server-side where CORS doesn't apply

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
    }

    // Validate it's a Firebase Storage URL
    if (!url.includes('firebasestorage.googleapis.com')) {
      return NextResponse.json({ error: 'Only Firebase Storage URLs allowed' }, { status: 400 })
    }

    logger.info('Proxying Firebase Storage image', { url })

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

    // Return the image with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': blob.type || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*', // Allow from any origin
      },
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/proxy-image',
      operation: 'fetch'
    })
  }
}
