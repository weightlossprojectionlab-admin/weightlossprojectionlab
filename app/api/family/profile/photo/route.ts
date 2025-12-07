/**
 * API Route: /api/family/profile/photo
 *
 * Handles caregiver profile photo upload
 * POST - Upload profile photo (handle base64 or multipart)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse, unauthorizedResponse, validationError } from '@/lib/api-response'
import { apiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'

// POST /api/family/profile/photo - Upload profile photo
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[API /family/profile/photo POST] Missing or invalid Authorization header')
      return unauthorizedResponse('Missing or invalid authorization token')
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check rate limit (stricter for uploads)
    const rateLimitResult = await apiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/profile/photo POST] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    const contentType = request.headers.get('content-type') || ''

    let photoUrl: string
    let photoData: Buffer
    let fileName: string

    // Handle base64 encoded image
    if (contentType.includes('application/json')) {
      const body = await request.json()

      if (!body.photo) {
        logger.warn('[API /family/profile/photo POST] Missing photo in request body', { userId })
        return validationError('Photo data is required')
      }

      // Extract base64 data
      const base64Match = body.photo.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/)

      if (!base64Match) {
        logger.warn('[API /family/profile/photo POST] Invalid base64 format', { userId })
        return validationError('Invalid photo format. Expected base64 encoded image.')
      }

      const [, fileExt, base64Data] = base64Match
      photoData = Buffer.from(base64Data, 'base64')

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (photoData.length > maxSize) {
        logger.warn('[API /family/profile/photo POST] Photo too large', {
          userId,
          size: photoData.length,
          maxSize
        })
        return validationError('Photo size exceeds 5MB limit')
      }

      fileName = `${userId}_${Date.now()}.${fileExt}`

      logger.debug('[API /family/profile/photo POST] Processing base64 photo', {
        userId,
        size: photoData.length,
        format: fileExt
      })
    }
    // Handle multipart form data
    else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('photo') as File

      if (!file) {
        logger.warn('[API /family/profile/photo POST] Missing photo in form data', { userId })
        return validationError('Photo file is required')
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        logger.warn('[API /family/profile/photo POST] Invalid file type', {
          userId,
          type: file.type
        })
        return validationError('Invalid file type. Allowed: PNG, JPEG, JPG, GIF')
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        logger.warn('[API /family/profile/photo POST] File too large', {
          userId,
          size: file.size,
          maxSize
        })
        return validationError('File size exceeds 5MB limit')
      }

      const arrayBuffer = await file.arrayBuffer()
      photoData = Buffer.from(arrayBuffer)

      const fileExt = file.type.split('/')[1]
      fileName = `${userId}_${Date.now()}.${fileExt}`

      logger.debug('[API /family/profile/photo POST] Processing multipart photo', {
        userId,
        size: file.size,
        type: file.type
      })
    } else {
      logger.warn('[API /family/profile/photo POST] Unsupported content type', {
        userId,
        contentType
      })
      return validationError('Unsupported content type. Use application/json or multipart/form-data')
    }

    // Upload to Firebase Storage
    const bucket = adminStorage.bucket()
    const filePath = `caregiver-photos/${fileName}`
    const file = bucket.file(filePath)

    await file.save(photoData, {
      metadata: {
        contentType: contentType.includes('json') ? 'image/jpeg' : contentType.split(';')[0],
        metadata: {
          userId,
          uploadedAt: new Date().toISOString()
        }
      }
    })

    // Make file publicly accessible
    await file.makePublic()

    // Get public URL
    photoUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`

    logger.info('[API /family/profile/photo POST] Photo uploaded successfully', {
      userId,
      photoUrl,
      size: photoData.length
    })

    // Update caregiver profile with photo URL
    const profileRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('caregiverProfile')
      .doc('profile')

    await profileRef.update({
      photo: photoUrl,
      lastActive: new Date().toISOString()
    })

    logger.info('[API /family/profile/photo POST] Profile updated with photo URL', { userId })

    return successResponse({
      photoUrl,
      message: 'Photo uploaded successfully'
    })

  } catch (error: any) {
    logger.error('[API /family/profile/photo POST] Error uploading photo', error, {
      errorMessage: error.message,
      errorStack: error.stack
    })
    return errorResponse(error, { route: '/api/family/profile/photo', method: 'POST' })
  }
}
