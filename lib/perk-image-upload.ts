'use client'

import { storage } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth } from './firebase'
import { logger } from '@/lib/logger'

/**
 * Upload a perk image to Firebase Storage
 * @param file - Image file to upload
 * @param perkId - Perk ID for organizing storage
 * @returns Download URL of the uploaded image
 */
export async function uploadPerkImage(
  file: File,
  perkId?: string
): Promise<string> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User not authenticated')
  }

  try {
    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = perkId
      ? `perk-${perkId}-${timestamp}.${extension}`
      : `perk-${timestamp}.${extension}`

    // Store in admin/perks folder (not user-specific)
    const storageRef = ref(storage, `admin/perks/${filename}`)

    logger.debug('📤 Uploading perk image to Firebase Storage:', {
      path: `admin/perks/${filename}`,
      size: file.size,
      type: file.type
    })

    // Upload the file
    await uploadBytes(storageRef, file)

    logger.debug('✅ Upload complete, getting download URL...')

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef)

    logger.debug('✅ Download URL retrieved:', { downloadURL })

    return downloadURL
  } catch (error) {
    const errorDetails = {
      message: (error as any)?.message,
      name: (error as any)?.name,
      code: (error as any)?.code,
      userId: user.uid,
    }

    console.error('🔍 ERROR uploading perk image:', errorDetails)
    logger.error('Error uploading perk image', error as Error, errorDetails)

    const errorCode = (error as any)?.code
    if (errorCode === 'storage/unauthorized') {
      throw new Error('Storage permission denied. Please check Firebase Storage rules.')
    } else {
      throw error
    }
  }
}

/**
 * Upload a partner logo to Firebase Storage
 * @param file - Image file to upload
 * @param partnerId - Partner ID for organizing storage
 * @returns Download URL of the uploaded image
 */
export async function uploadPartnerLogo(
  file: File,
  partnerId?: string
): Promise<string> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User not authenticated')
  }

  try {
    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = partnerId
      ? `partner-${partnerId}-${timestamp}.${extension}`
      : `partner-${timestamp}.${extension}`

    // Store in admin/partners folder
    const storageRef = ref(storage, `admin/partners/${filename}`)

    logger.debug('📤 Uploading partner logo to Firebase Storage:', {
      path: `admin/partners/${filename}`,
      size: file.size,
      type: file.type
    })

    // Upload the file
    await uploadBytes(storageRef, file)

    logger.debug('✅ Upload complete, getting download URL...')

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef)

    logger.debug('✅ Download URL retrieved:', { downloadURL })

    return downloadURL
  } catch (error) {
    const errorDetails = {
      message: (error as any)?.message,
      name: (error as any)?.name,
      code: (error as any)?.code,
      userId: user.uid,
    }

    console.error('🔍 ERROR uploading partner logo:', errorDetails)
    logger.error('Error uploading partner logo', error as Error, errorDetails)

    const errorCode = (error as any)?.code
    if (errorCode === 'storage/unauthorized') {
      throw new Error('Storage permission denied. Please check Firebase Storage rules.')
    } else {
      throw error
    }
  }
}
