'use client'

import { storage } from './firebase'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { auth } from './firebase'
import { logger } from '@/lib/logger'

/**
 * Upload a base64 image to Firebase Storage
 * @param base64Image - Base64 encoded image string (data:image/...)
 * @param path - Storage path (e.g., 'meals/meal-123')
 * @returns Download URL of the uploaded image
 */
export async function uploadBase64Image(
  base64Image: string,
  path: string
): Promise<string> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User not authenticated')
  }

  try {
    // Create storage reference
    const storageRef = ref(storage, `users/${user.uid}/${path}`)

    // Upload base64 string
    const snapshot = await uploadString(storageRef, base64Image, 'data_url')

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref)

    return downloadURL
  } catch (error) {
    logger.error('Error uploading image', error as Error)
    throw new Error('Failed to upload image')
  }
}

/**
 * Upload a meal photo and return the download URL
 * @param base64Image - Base64 encoded image
 * @returns Download URL
 */
export async function uploadMealPhoto(base64Image: string): Promise<string> {
  // Generate unique filename with timestamp
  const timestamp = Date.now()
  const filename = `meal-${timestamp}.jpg`
  const path = `meals/${filename}`

  return uploadBase64Image(base64Image, path)
}
