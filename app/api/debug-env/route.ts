import { NextResponse } from 'next/server'

/**
 * DEBUG ENDPOINT - Check Firebase Admin environment variables
 * IMPORTANT: This should be deleted or protected before production use
 */
export async function GET(request: Request) {
  // Only allow in development or with special auth
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const envCheck = {
    FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    FIREBASE_ADMIN_PRIVATE_KEY_BASE64: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64,
    FIREBASE_ADMIN_PRIVATE_KEY_PART1: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY_PART1,
    FIREBASE_ADMIN_PRIVATE_KEY_PART2: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY_PART2,
    FIREBASE_ADMIN_PRIVATE_KEY_PART3: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY_PART3,
    FIREBASE_STORAGE_BUCKET: !!process.env.FIREBASE_STORAGE_BUCKET,
  }

  const hasValidKey =
    (envCheck.FIREBASE_ADMIN_PRIVATE_KEY_PART1 &&
     envCheck.FIREBASE_ADMIN_PRIVATE_KEY_PART2 &&
     envCheck.FIREBASE_ADMIN_PRIVATE_KEY_PART3) ||
    envCheck.FIREBASE_ADMIN_PRIVATE_KEY_BASE64 ||
    envCheck.FIREBASE_ADMIN_PRIVATE_KEY

  return NextResponse.json({
    envCheck,
    hasValidKey,
    nodeEnv: process.env.NODE_ENV,
    recommendation: !hasValidKey
      ? 'Missing Firebase Admin private key. Set one of: FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_PRIVATE_KEY_BASE64, or FIREBASE_ADMIN_PRIVATE_KEY_PART1/2/3'
      : 'Environment variables look good!'
  })
}
