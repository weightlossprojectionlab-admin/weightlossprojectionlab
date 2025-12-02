import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { errorResponse, validationError } from '@/lib/api-response'
import { validateFetchURL } from '@/lib/url-validation'
import { rateLimit } from '@/lib/rate-limit'

/**
 * API Route: Fetch URL
 *
 * Proxy endpoint to fetch external URLs and bypass CORS restrictions
 * Used by recipe import to fetch recipe pages
 *
 * Security: SSRF protection via domain whitelist and IP blocklist
 * Rate Limited: 10 requests per minute (SEC-006)
 */
export async function GET(request: NextRequest) {
  // Production check
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  // Apply rate limiting FIRST (SEC-006)
  const rateLimitResponse = await rateLimit(request, 'fetch-url')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')

    if (!url) {
      return validationError('URL parameter is required')
    }

    // Validate URL against SSRF attacks
    try {
      await validateFetchURL(url)
    } catch (validationErr) {
      logger.warn('URL validation failed', {
        url,
        error: validationErr instanceof Error ? validationErr.message : String(validationErr),
      })
      return validationError(
        validationErr instanceof Error ? validationErr.message : 'Invalid URL'
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
  } catch (error) {
    return errorResponse(error, {
      route: '/api/fetch-url',
      operation: 'fetch'
    })
  }
}
