'use client'

import { storage } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth } from './firebase'
import { generateRecipeImageFilename, generateRecipeVideoFilename } from './utils'

/**
 * Upload recipe media files (images/videos) to Firebase Storage
 * Used by admin for uploading marketing content for recipes
 */

export interface RecipeMediaUploadResult {
  imageUrls: string[]
  videoUrl?: string
  imageStoragePaths: string[]
  videoStoragePath?: string
}

/**
 * Upload multiple recipe images to Firebase Storage
 * @param recipeId - The recipe ID
 * @param recipeName - The recipe name (for SEO-friendly filenames)
 * @param imageFiles - Array of image File objects (max 4)
 * @param onProgress - Optional progress callback (0-100)
 * @returns Object with image URLs and storage paths
 */
export async function uploadRecipeImages(
  recipeId: string,
  recipeName: string,
  imageFiles: File[],
  onProgress?: (progress: number) => void
): Promise<{ imageUrls: string[]; imageStoragePaths: string[] }> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User not authenticated')
  }

  if (imageFiles.length === 0) {
    throw new Error('No image files provided')
  }

  if (imageFiles.length > 4) {
    throw new Error('Maximum 4 images allowed')
  }

  try {
    const imageUrls: string[] = []
    const imageStoragePaths: string[] = []
    const totalFiles = imageFiles.length

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error(`File ${i + 1} is not a valid image`)
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`Image ${i + 1} exceeds 5MB limit`)
      }

      // Generate SEO-friendly filename
      const imageType = i === 0 ? 'hero' : 'angle'
      const seoFilename = generateRecipeImageFilename(recipeName, i + 1, imageType)

      // Create storage path: recipes/media/{recipeId}/{seo-filename}
      const imagePath = `recipes/media/${recipeId}/${seoFilename}`
      const storageRef = ref(storage, imagePath)

      // Upload file
      await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: user.uid,
          uploadedAt: new Date().toISOString(),
          imageIndex: (i + 1).toString(),
        },
      })

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef)
      imageUrls.push(downloadURL)
      imageStoragePaths.push(imagePath)

      // Report progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / totalFiles) * 100)
        onProgress(progress)
      }
    }

    return { imageUrls, imageStoragePaths }
  } catch (error) {
    console.error('Error uploading recipe images:', error)
    throw error
  }
}

/**
 * Upload recipe video to Firebase Storage
 * @param recipeId - The recipe ID
 * @param recipeName - The recipe name (for SEO-friendly filenames)
 * @param videoFile - Video File object
 * @returns Object with video URL and storage path
 */
export async function uploadRecipeVideo(
  recipeId: string,
  recipeName: string,
  videoFile: File
): Promise<{ videoUrl: string; videoStoragePath: string }> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User not authenticated')
  }

  try {
    // Validate file type
    if (!videoFile.type.startsWith('video/')) {
      throw new Error('File is not a valid video')
    }

    // Validate file size (max 20MB)
    if (videoFile.size > 20 * 1024 * 1024) {
      throw new Error('Video exceeds 20MB limit')
    }

    // Generate SEO-friendly filename
    const seoFilename = generateRecipeVideoFilename(recipeName)

    // Create storage path: recipes/media/{recipeId}/{seo-filename}
    const videoPath = `recipes/media/${recipeId}/${seoFilename}`
    const storageRef = ref(storage, videoPath)

    // Upload file
    await uploadBytes(storageRef, videoFile, {
      contentType: videoFile.type,
      customMetadata: {
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
      },
    })

    // Get download URL
    const videoUrl = await getDownloadURL(storageRef)

    return { videoUrl, videoStoragePath: videoPath }
  } catch (error) {
    console.error('Error uploading recipe video:', error)
    throw error
  }
}

/**
 * Upload all recipe media (images and optional video)
 * @param recipeId - The recipe ID
 * @param recipeName - The recipe name (for SEO-friendly filenames)
 * @param imageFiles - Array of image File objects (max 4)
 * @param videoFile - Optional video File object
 * @param onProgress - Optional progress callback (0-100)
 * @returns Object with all media URLs and storage paths
 */
export async function uploadRecipeMedia(
  recipeId: string,
  recipeName: string,
  imageFiles: File[],
  videoFile?: File | null,
  onProgress?: (progress: number) => void
): Promise<RecipeMediaUploadResult> {
  const result: RecipeMediaUploadResult = {
    imageUrls: [],
    imageStoragePaths: [],
  }

  // Upload images
  if (imageFiles.length > 0) {
    const imageResult = await uploadRecipeImages(recipeId, recipeName, imageFiles, (progress) => {
      // Images are 80% of total progress, video is 20%
      const totalProgress = videoFile ? progress * 0.8 : progress
      onProgress?.(Math.round(totalProgress))
    })
    result.imageUrls = imageResult.imageUrls
    result.imageStoragePaths = imageResult.imageStoragePaths
  }

  // Upload video if provided
  if (videoFile) {
    const videoResult = await uploadRecipeVideo(recipeId, recipeName, videoFile)
    result.videoUrl = videoResult.videoUrl
    result.videoStoragePath = videoResult.videoStoragePath
    onProgress?.(100)
  }

  return result
}
