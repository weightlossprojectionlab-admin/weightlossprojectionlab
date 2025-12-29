/**
 * Press Contact Tracking API
 * Tracks when media/users attempt to contact press team via release pages
 */

import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase/firestore'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { adminDb as db } from '@/lib/firebase-admin'
import type { PressContact, ContactResponse } from '@/types/press'

// Initialize rate limiter - 5 contact attempts per hour per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true,
})

/**
 * Validate contact tracking payload
 */
function validateContactData(data: unknown): {
  valid: boolean
  error?: string
  data?: {
    releaseId: string
    releaseSlug: string
    releaseTitle: string
    source: 'release-page' | 'release-list' | 'email'
  }
} {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Invalid request body' }
  }

  const payload = data as Record<string, unknown>

  // Validate required fields
  if (!payload.releaseId || typeof payload.releaseId !== 'string') {
    return { valid: false, error: 'Release ID is required' }
  }

  if (!payload.releaseSlug || typeof payload.releaseSlug !== 'string') {
    return { valid: false, error: 'Release slug is required' }
  }

  if (!payload.releaseTitle || typeof payload.releaseTitle !== 'string') {
    return { valid: false, error: 'Release title is required' }
  }

  if (!payload.source || typeof payload.source !== 'string') {
    return { valid: false, error: 'Source is required' }
  }

  // Validate source value
  const validSources = ['release-page', 'release-list', 'email']
  if (!validSources.includes(payload.source as string)) {
    return { valid: false, error: 'Invalid source value' }
  }

  return {
    valid: true,
    data: {
      releaseId: payload.releaseId as string,
      releaseSlug: payload.releaseSlug as string,
      releaseTitle: payload.releaseTitle as string,
      source: payload.source as 'release-page' | 'release-list' | 'email',
    },
  }
}

/**
 * Track contact attempt in Firestore
 */
async function trackContact(
  releaseId: string,
  releaseSlug: string,
  releaseTitle: string,
  source: 'release-page' | 'release-list' | 'email',
  ip: string,
  userAgent: string | null,
  referrer: string | null
): Promise<void> {
  try {
    // Create contact record
    const contactData: Omit<PressContact, 'id' | 'contactedAt'> & {
      contactedAt: FirebaseFirestore.Timestamp
    } = {
      releaseId,
      releaseSlug,
      releaseTitle,
      contactedAt: Timestamp.now() as unknown as FirebaseFirestore.Timestamp,
      source,
      ipAddress: ip !== 'unknown' ? ip : undefined,
      userAgent: userAgent || undefined,
      referrer: referrer || undefined,
    }

    await db.collection('press_contacts').add(contactData)

    // Update aggregate stats
    const statsRef = db.collection('press_contact_stats').doc(releaseSlug)
    const statsDoc = await statsRef.get()

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    if (statsDoc.exists) {
      const currentData = statsDoc.data()
      await statsRef.update({
        totalContacts: (currentData?.totalContacts || 0) + 1,
        lastContactedAt: Timestamp.now(),
        [`contactsByDay.${today}`]:
          ((currentData?.contactsByDay as Record<string, number>)?.[today] || 0) + 1,
      })
    } else {
      await statsRef.set({
        releaseSlug,
        releaseTitle,
        totalContacts: 1,
        lastContactedAt: Timestamp.now(),
        contactsByDay: { [today]: 1 },
      })
    }
  } catch (error) {
    console.error('Contact tracking error:', error)
    // Don't fail the request if tracking fails
  }
}

/**
 * POST /api/press/contact
 * Track a press contact attempt
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      'unknown'

    // Check rate limit
    const { success: rateLimitSuccess, limit, remaining, reset } = await ratelimit.limit(
      `press_contact_${ip}`
    )

    if (!rateLimitSuccess) {
      return NextResponse.json<ContactResponse>(
        {
          success: false,
          message: `Too many contact attempts. Please try again in ${Math.ceil(
            (reset - Date.now()) / 1000 / 60
          )} minutes.`,
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

    // Parse and validate request body
    const body = await request.json()
    const validation = validateContactData(body)

    if (!validation.valid || !validation.data) {
      return NextResponse.json<ContactResponse>(
        {
          success: false,
          message: validation.error || 'Invalid contact data',
        },
        { status: 400 }
      )
    }

    const { releaseId, releaseSlug, releaseTitle, source } = validation.data

    // Track contact
    const userAgent = request.headers.get('user-agent')
    const referrer = request.headers.get('referer')
    await trackContact(releaseId, releaseSlug, releaseTitle, source, ip, userAgent, referrer)

    return NextResponse.json<ContactResponse>(
      {
        success: true,
        message: 'Contact attempt tracked successfully',
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    )
  } catch (error) {
    console.error('Contact tracking error:', error)

    return NextResponse.json<ContactResponse>(
      {
        success: false,
        message: 'An error occurred while tracking your contact attempt. Please try again.',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/press/contact
 * CORS preflight handling
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
