import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminStorage, verifyIdToken } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params as required by Next.js 15
    const { id: recipeId } = await params
    logger.debug('Media Upload: Starting upload for recipe', { recipeId })

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    logger.debug('Media Upload: Auth header present', { hasAuth: !!authHeader })

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    logger.debug('Media Upload: Verifying ID token')
    const decodedToken = await verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    logger.debug('Media Upload: User authenticated', { adminUid })

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const role = adminData?.role
    logger.debug('Media Upload: User role', { role })

    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    logger.debug('Media Upload: Recipe ID', { recipeId })

    // Parse multipart form data
    logger.debug('Media Upload: Parsing form data')
    const formData = await request.formData()
    logger.debug('Media Upload: Form data entries', { entries: Array.from(formData.keys()) })

    // Get up to 4 image files
    const imageFiles: (File | null)[] = [
      formData.get('image1') as File | null,
      formData.get('image2') as File | null,
      formData.get('image3') as File | null,
      formData.get('image4') as File | null,
    ]

    const videoFile = formData.get('video') as File | null

    const hasAnyImage = imageFiles.some(file => file !== null)
    logger.debug('Media Upload: Media check', { hasImages: hasAnyImage, hasVideo: !!videoFile })

    if (!hasAnyImage && !videoFile) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    logger.debug('Media Upload: Getting storage bucket')
    const bucket = adminStorage.bucket()
    logger.debug('Media Upload: Bucket name', { bucketName: bucket.name })
    const uploadedMedia: {
      imageUrls?: string[]
      videoUrl?: string
      imageStoragePaths?: string[]
      videoStoragePath?: string
    } = {}

    // Upload images (up to 4)
    if (hasAnyImage) {
      logger.debug('Media Upload: Starting image uploads')
      const imageUrls: string[] = []
      const imageStoragePaths: string[] = []

      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i]
        if (!imageFile) continue

        logger.debug('Media Upload: Uploading image', { imageIndex: i + 1 })
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
        const imagePath = `recipes/media/${recipeId}/image-${i + 1}.jpg`
        const imageFileRef = bucket.file(imagePath)

        await imageFileRef.save(imageBuffer, {
          metadata: {
            contentType: imageFile.type,
            metadata: {
              uploadedBy: adminUid,
              uploadedAt: new Date().toISOString(),
              imageIndex: i.toString(),
            },
          },
        })

        // Make file publicly accessible
        await imageFileRef.makePublic()

        imageUrls.push(`https://storage.googleapis.com/${bucket.name}/${imagePath}`)
        imageStoragePaths.push(imagePath)
        logger.debug('Media Upload: Image uploaded successfully', { imageIndex: i + 1 })
      }

      uploadedMedia.imageUrls = imageUrls
      uploadedMedia.imageStoragePaths = imageStoragePaths
      logger.debug('Media Upload: All images uploaded', { imageCount: imageUrls.length })
    }

    // Upload video
    if (videoFile) {
      const videoBuffer = Buffer.from(await videoFile.arrayBuffer())
      const videoPath = `recipes/media/${recipeId}/video.mp4`
      const videoFileRef = bucket.file(videoPath)

      await videoFileRef.save(videoBuffer, {
        metadata: {
          contentType: videoFile.type,
          metadata: {
            uploadedBy: adminUid,
            uploadedAt: new Date().toISOString(),
          },
        },
      })

      // Make file publicly accessible
      await videoFileRef.makePublic()

      uploadedMedia.videoUrl = `https://storage.googleapis.com/${bucket.name}/${videoPath}`
      uploadedMedia.videoStoragePath = videoPath

      // TODO: Generate video thumbnail
      // This would require a video processing service like Cloud Functions
      // For now, using a placeholder
    }

    // Update recipe in Firestore (or create if doesn't exist)
    logger.debug('Media Upload: Updating Firestore')
    const recipeRef = adminDb.collection('recipes').doc(recipeId)
    await recipeRef.set(
      {
        ...uploadedMedia,
        mediaUploadedAt: Timestamp.now(),
        mediaUploadedBy: adminUid,
      },
      { merge: true }
    )
    logger.debug('Media Upload: Firestore updated')

    // Log admin action
    logger.debug('Media Upload: Logging admin action')
    await logAdminAction({
      adminUid,
      adminEmail: decodedToken.email || 'unknown',
      action: 'recipe_edit',
      targetType: 'recipe',
      targetId: recipeId,
      metadata: {
        imagesUploaded: uploadedMedia.imageUrls?.length || 0,
        uploadedVideo: !!videoFile,
      },
      reason: `Uploaded ${uploadedMedia.imageUrls?.length || 0} image(s)${videoFile ? ' and 1 video' : ''}`,
    })
    logger.info('Media Upload: Upload complete', { recipeId, imageCount: uploadedMedia.imageUrls?.length || 0, hasVideo: !!videoFile })

    return NextResponse.json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        recipeId,
        ...uploadedMedia,
      },
    })
  } catch (error) {
    logger.error('Media Upload: Failed', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        error: 'Failed to upload media',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    )
  }
}

// DELETE endpoint to remove media
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params as required by Next.js 15
    const { id: recipeId } = await params

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const adminUid = decodedToken.uid

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const role = adminData?.role

    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }
    const { searchParams } = new URL(request.url)
    const mediaType = searchParams.get('type') // 'image' or 'video'

    if (!mediaType || !['image', 'video'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'Invalid media type. Must be "image" or "video"' },
        { status: 400 }
      )
    }

    const bucket = adminStorage.bucket()
    const filePath = `recipes/media/${recipeId}/${mediaType === 'image' ? 'image.jpg' : 'video.mp4'}`

    // Delete file from storage
    try {
      await bucket.file(filePath).delete()
    } catch (error) {
      // File might not exist, that's okay
      logger.debug('File not found in storage', { filePath })
    }

    // Update Firestore
    const recipeRef = adminDb.collection('recipes').doc(recipeId)
    await recipeRef.update({
      [`${mediaType}Url`]: null,
      [`${mediaType}StoragePath`]: null,
    })

    // Log admin action
    await logAdminAction({
      adminUid,
      adminEmail: decodedToken.email || 'unknown',
      action: 'recipe_edit',
      targetType: 'recipe',
      targetId: recipeId,
      metadata: {
        deletedMediaType: mediaType,
      },
      reason: `Deleted recipe ${mediaType}`,
    })

    return NextResponse.json({
      success: true,
      message: `${mediaType} deleted successfully`,
    })
  } catch (error) {
    logger.error('Error deleting recipe media', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        error: 'Failed to delete media',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
