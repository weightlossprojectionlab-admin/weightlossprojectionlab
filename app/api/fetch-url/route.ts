import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { errorResponse, validationError } from '@/lib/api-response'
import { validateFetchURL } from '@/lib/url-validation'

/**
 * API Route: Fetch URL
 *
 * Proxy endpoint to fetch external URLs and bypass CORS restrictions
 * Used by recipe import to fetch recipe pages
 *
 * Security: SSRF protection via domain whitelist and IP blocklist
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    // TODO(SEC-006): Add rate limiting
    // const rl = await rateLimit(request, 'fetch-url');
    // if (rl instanceof NextResponse) return rl;

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
    return errorResponse(error, { route: '/api/fetch-url' })
  }
}
