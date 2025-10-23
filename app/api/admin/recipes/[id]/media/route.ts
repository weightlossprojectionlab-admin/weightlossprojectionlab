import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminStorage, verifyIdToken } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { Timestamp } from 'firebase-admin/firestore'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params as required by Next.js 15
    const { id: recipeId } = await params
    console.log('[Media Upload] Starting upload for recipe:', recipeId)

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    console.log('[Media Upload] Auth header present:', !!authHeader)

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    console.log('[Media Upload] Verifying ID token...')
    const decodedToken = await verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    console.log('[Media Upload] User authenticated:', adminUid)

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const role = adminData?.role
    console.log('[Media Upload] User role:', role)

    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    console.log('[Media Upload] Recipe ID:', recipeId)

    // Parse multipart form data
    console.log('[Media Upload] Parsing form data...')
    const formData = await request.formData()
    console.log('[Media Upload] Form data entries:', Array.from(formData.keys()))

    // Get up to 4 image files
    const imageFiles: (File | null)[] = [
      formData.get('image1') as File | null,
      formData.get('image2') as File | null,
      formData.get('image3') as File | null,
      formData.get('image4') as File | null,
    ]

    const videoFile = formData.get('video') as File | null

    const hasAnyImage = imageFiles.some(file => file !== null)
    console.log('[Media Upload] Has images:', hasAnyImage, 'Has video:', !!videoFile)

    if (!hasAnyImage && !videoFile) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    console.log('[Media Upload] Getting storage bucket...')
    const bucket = adminStorage.bucket()
    console.log('[Media Upload] Bucket name:', bucket.name)
    const uploadedMedia: {
      imageUrls?: string[]
      videoUrl?: string
      imageStoragePaths?: string[]
      videoStoragePath?: string
    } = {}

    // Upload images (up to 4)
    if (hasAnyImage) {
      console.log('[Media Upload] Starting image uploads...')
      const imageUrls: string[] = []
      const imageStoragePaths: string[] = []

      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i]
        if (!imageFile) continue

        console.log(`[Media Upload] Uploading image ${i + 1}...`)
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
        console.log(`[Media Upload] Image ${i + 1} uploaded successfully`)
      }

      uploadedMedia.imageUrls = imageUrls
      uploadedMedia.imageStoragePaths = imageStoragePaths
      console.log('[Media Upload] All images uploaded:', imageUrls.length)
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
    console.log('[Media Upload] Updating Firestore...')
    const recipeRef = adminDb.collection('recipes').doc(recipeId)
    await recipeRef.set(
      {
        ...uploadedMedia,
        mediaUploadedAt: Timestamp.now(),
        mediaUploadedBy: adminUid,
      },
      { merge: true }
    )
    console.log('[Media Upload] Firestore updated')

    // Log admin action
    console.log('[Media Upload] Logging admin action...')
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
    console.log('[Media Upload] Admin action logged')

    console.log('[Media Upload] Upload complete!')
    return NextResponse.json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        recipeId,
        ...uploadedMedia,
      },
    })
  } catch (error) {
    console.error('[Media Upload] ERROR:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[Media Upload] Error stack:', errorStack)

    return NextResponse.json(
      {
        error: 'Failed to upload media',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
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
      console.log('File not found in storage:', filePath)
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
    console.error('Error deleting recipe media:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete media',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
