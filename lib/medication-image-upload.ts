import { storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { logger } from '@/lib/logger'

/**
 * Upload medication image to Firebase Storage
 * @param imageFile - The image file to upload
 * @param userId - The user ID (for path organization)
 * @param patientId - The patient ID (for path organization)
 * @returns The download URL of the uploaded image
 */
export async function uploadMedicationImage(
  imageFile: File,
  userId: string,
  patientId: string
): Promise<string> {
  try {
    logger.info('[Medication Image Upload] Starting upload', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type,
      userId,
      patientId
    })

    logger.info('[Medication Image Upload] Using Firebase storage instance')

    // Create a unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedFileName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `medications/${userId}/${patientId}/${timestamp}_${sanitizedFileName}`

    logger.info('[Medication Image Upload] Creating storage reference', { filename })
    const storageRef = ref(storage, filename)

    // Upload the image
    logger.info('[Medication Image Upload] Uploading bytes...')
    await uploadBytes(storageRef, imageFile)

    logger.info('[Medication Image Upload] Upload complete, getting download URL...')

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef)

    logger.info('[Medication Image Upload] Upload successful', {
      filename,
      downloadURL
    })

    return downloadURL
  } catch (error) {
    const errorDetails = {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: (error as any)?.code,
      errorName: (error as any)?.name,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorString: JSON.stringify(error, Object.getOwnPropertyNames(error))
    }

    logger.error('[Medication Image Upload] Upload failed', error as Error, errorDetails)
    console.error('[Medication Image Upload] Full error:', error)
    console.error('[Medication Image Upload] Error details:', errorDetails)

    throw error
  }
}
