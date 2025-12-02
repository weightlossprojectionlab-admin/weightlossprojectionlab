import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * GET /api/admin/users/[uid]/analytics?range=7d|30d|90d|all
 * Get detailed analytics data for a specific user
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  let params: { uid: string } | undefined
  try {
    // Resolve params first (Next.js 15 requirement)
    params = await context.params

    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token with Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail.toLowerCase())

    if (!isSuperAdmin && adminData?.role !== 'admin' && adminData?.role !== 'moderator' && adminData?.role !== 'support') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { uid } = params
    const searchParams = request.nextUrl.searchParams
    const range = searchParams.get('range') || '30d'

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        startDate = new Date(0) // Beginning of time
        break
    }

    // Fetch user profile and all settings
    const userDoc = await adminDb.collection('users').doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userData = userDoc.data()

    // Extract comprehensive user data
    const userPreferences = userData?.preferences || {}
    const userProfile = userData?.profile || {}
    const userGoals = userData?.goals || {}

    // Fetch user's auth data
    let userAuth
    try {
      userAuth = await adminAuth.getUser(uid)
    } catch (err) {
    return errorResponse(err, {
      route: '/api/admin/users/[uid]/analytics',
      operation: 'fetch'
    })
  }
}
