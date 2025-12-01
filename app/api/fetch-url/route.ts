import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * API Route: Fetch URL
 *
 * Proxy endpoint to fetch external URLs and bypass CORS restrictions
 * Used by recipe import to fetch recipe pages
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS protocols are allowed' },
        { status: 400 }
      )
    }

    // Fetch the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WeightLossProjectLab/1.0 RecipeImporter'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    // Get the HTML content
    const html = await response.text()

    // Return the HTML content
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    })
  } catch (error: any) {
    logger.error('Error fetching URL', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: error.message || 'Failed to fetch URL' },
      { status: 500 }
    )
  }
}
