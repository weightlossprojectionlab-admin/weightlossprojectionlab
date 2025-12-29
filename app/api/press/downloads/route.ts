/**
 * Press Downloads Tracking API
 * Tracks media kit and press asset downloads with analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase/firestore'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { adminDb as db } from '@/lib/firebase-admin'
import type { PressDownload, DownloadResponse } from '@/types/press'

// Initialize rate limiter - 20 downloads per hour per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  analytics: true,
})

// Define available press assets
const PRESS_ASSETS: Record<string, { name: string; path: string; type: string }> = {
  'logos': {
    name: 'Brand Logos Package',
    path: '/press/logos/wlpl-logos.zip',
    type: 'application/zip',
  },
  'screenshots': {
    name: 'Product Screenshots',
    path: '/press/screenshots/wlpl-screenshots.zip',
    type: 'application/zip',
  },
  'brand-guidelines': {
    name: 'Brand Guidelines',
    path: '/press/guidelines/wlpl-brand-guidelines.pdf',
    type: 'application/pdf',
  },
  'executive-photos': {
    name: 'Executive Photos',
    path: '/press/executive-photos/wlpl-executive-photos.zip',
    type: 'application/zip',
  },
  'fact-sheet': {
    name: 'Company Fact Sheet',
    path: '/press/fact-sheet/wlpl-fact-sheet.pdf',
    type: 'application/pdf',
  },
  'press-kit': {
    name: 'Complete Press Kit',
    path: '/press/press-kit/wlpl-complete-press-kit.zip',
    type: 'application/zip',
  },
}

/**
 * Validate asset identifier
 */
function isValidAsset(asset: string): boolean {
  return asset in PRESS_ASSETS
}

/**
 * Track download in Firestore
 */
async function trackDownload(
  asset: string,
  ip: string,
  userAgent: string | null,
  referrer: string | null
): Promise<void> {
  try {
    // Create download record
    const downloadData: Omit<PressDownload, 'id' | 'downloadedAt'> & { downloadedAt: FirebaseFirestore.Timestamp } = {
      asset,
      downloadedAt: Timestamp.now() as unknown as FirebaseFirestore.Timestamp,
      ipAddress: ip !== 'unknown' ? ip : undefined,
      userAgent: userAgent || undefined,
      referrer: referrer || undefined,
    }

    await db.collection('press_downloads').add(downloadData)

    // Update aggregate stats
    const statsRef = db.collection('press_download_stats').doc(asset)
    const statsDoc = await statsRef.get()

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    if (statsDoc.exists) {
      const currentData = statsDoc.data()
      await statsRef.update({
        totalDownloads: (currentData?.totalDownloads || 0) + 1,
        lastDownloaded: Timestamp.now(),
        [`downloadsByDay.${today}`]: ((currentData?.downloadsByDay as Record<string, number>)?.[today] || 0) + 1,
      })
    } else {
      await statsRef.set({
        asset,
        totalDownloads: 1,
        lastDownloaded: Timestamp.now(),
        downloadsByDay: { [today]: 1 },
      })
    }
  } catch (error) {
    console.error('Download tracking error:', error)
    // Don't fail the download if tracking fails
  }
}

/**
 * GET /api/press/downloads?asset=logos
 * Returns download URL and tracks the download
 */
export async function GET(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') ??
               request.headers.get('x-real-ip') ??
               'unknown'

    // Check rate limit
    const { success: rateLimitSuccess, limit, remaining, reset } = await ratelimit.limit(
      `downloads_${ip}`
    )

    if (!rateLimitSuccess) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many download requests. Please try again in ${Math.ceil((reset - Date.now()) / 1000 / 60)} minutes.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      )
    }

    // Get asset parameter
    const { searchParams } = new URL(request.url)
    const asset = searchParams.get('asset')

    if (!asset) {
      return NextResponse.json(
        {
          success: false,
          message: 'Asset parameter is required',
        },
        { status: 400 }
      )
    }

    // Validate asset
    if (!isValidAsset(asset)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid asset identifier',
        },
        { status: 404 }
      )
    }

    const assetInfo = PRESS_ASSETS[asset]

    // Track download
    const userAgent = request.headers.get('user-agent')
    const referrer = request.headers.get('referer')
    await trackDownload(asset, ip, userAgent, referrer)

    // Return download URL
    return NextResponse.json<DownloadResponse>(
      {
        success: true,
        downloadUrl: assetInfo.path,
        message: `Download initiated for ${assetInfo.name}`,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Download error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while processing your download. Please try again later.',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/press/downloads
 * Alternative endpoint for tracking downloads via POST
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asset } = body

    if (!asset || !isValidAsset(asset)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid asset identifier',
        },
        { status: 400 }
      )
    }

    // Get client IP
    const ip = request.headers.get('x-forwarded-for') ??
               request.headers.get('x-real-ip') ??
               'unknown'

    // Track download
    const userAgent = request.headers.get('user-agent')
    const referrer = request.headers.get('referer')
    await trackDownload(asset, ip, userAgent, referrer)

    const assetInfo = PRESS_ASSETS[asset]

    return NextResponse.json<DownloadResponse>(
      {
        success: true,
        downloadUrl: assetInfo.path,
        message: 'Download tracked successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Download tracking error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while tracking your download.',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/press/downloads
 * CORS preflight handling
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
