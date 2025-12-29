/**
 * Press Newsletter Subscription API
 * Handles email subscriptions to press updates with validation and spam protection
 */

import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase/firestore'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { adminDb as db } from '@/lib/firebase-admin'
import type { PressSubscriber, NewsletterSubscriptionResponse } from '@/types/press'

// Initialize rate limiter - 3 subscriptions per hour per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
})

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'throwaway.email',
]

/**
 * Validate email format and check for disposable domains
 */
function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }

  const trimmedEmail = email.trim().toLowerCase()

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' }
  }

  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email is too long' }
  }

  // Check for disposable email domains
  const domain = trimmedEmail.split('@')[1]
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { valid: false, error: 'Disposable email addresses are not allowed' }
  }

  return { valid: true }
}

/**
 * Sanitize input to prevent XSS and injection attacks
 */
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .substring(0, 254) // Limit length
}

/**
 * POST /api/press/newsletter
 * Subscribe to press newsletter
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') ??
               request.headers.get('x-real-ip') ??
               'unknown'

    // Check rate limit
    const { success: rateLimitSuccess, limit, remaining, reset } = await ratelimit.limit(
      `newsletter_${ip}`
    )

    if (!rateLimitSuccess) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many subscription attempts. Please try again in ${Math.ceil((reset - Date.now()) / 1000 / 60)} minutes.`,
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

    // Parse request body
    const body = await request.json()
    const { email, source = 'press-page' } = body

    // Validate email
    const validation = validateEmail(email)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error || 'Invalid email address',
        },
        { status: 400 }
      )
    }

    const sanitizedEmail = sanitizeInput(email).toLowerCase()

    // Check if email already exists
    const existingSubscriber = await db
      .collection('press_subscribers')
      .where('email', '==', sanitizedEmail)
      .limit(1)
      .get()

    if (!existingSubscriber.empty) {
      return NextResponse.json<NewsletterSubscriptionResponse>(
        {
          success: true,
          message: 'You are already subscribed to our press updates.',
          alreadySubscribed: true,
        },
        { status: 200 }
      )
    }

    // Create subscriber record
    const subscriberData: Omit<PressSubscriber, 'subscribedAt'> & { subscribedAt: FirebaseFirestore.Timestamp } = {
      email: sanitizedEmail,
      subscribedAt: Timestamp.now() as unknown as FirebaseFirestore.Timestamp,
      source: source as 'press-page' | 'blog' | 'newsletter-footer' | 'other',
      verified: false, // Email verification can be added later
      ipAddress: ip !== 'unknown' ? ip : undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }

    await db.collection('press_subscribers').add(subscriberData)

    // TODO: Send welcome email via SendGrid (optional)
    // TODO: Send verification email (optional)

    // Log successful subscription for analytics
    await db.collection('press_analytics').add({
      type: 'newsletter_subscription',
      email: sanitizedEmail,
      source,
      timestamp: Timestamp.now(),
      ipAddress: ip !== 'unknown' ? ip : undefined,
    })

    return NextResponse.json<NewsletterSubscriptionResponse>(
      {
        success: true,
        message: 'Successfully subscribed! You will receive press updates at the email address provided.',
        alreadySubscribed: false,
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    )
  } catch (error) {
    console.error('Newsletter subscription error:', error)

    // Don't expose internal errors to clients
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while processing your subscription. Please try again later.',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/press/newsletter
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
