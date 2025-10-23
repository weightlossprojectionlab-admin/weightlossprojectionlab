'use client'

import { useState, useRef } from 'react'
import { MealSuggestion } from '@/lib/meal-suggestions'
import { useAuth } from '@/hooks/useAuth'
import { uploadRecipeMedia } from '@/lib/recipe-upload'
import { db } from '@/lib/firebase'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import Image from 'next/image'
import {
  XMarkIcon,
  PhotoIcon,
  VideoCameraIcon,
  CloudArrowUpIcon,
  TrashIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface RecipeMediaUploadProps {
  recipe: MealSuggestion
  onClose: () => void
  onSuccess: () => void
}

interface ImageSlot {
  file: File | null
  preview: string | null
}

export function RecipeMediaUpload({ recipe, onClose, onSuccess }: RecipeMediaUploadProps) {
  const { user } = useAuth()

  // Initialize 4 image slots with existing images if available
  const initializeImageSlots = (): ImageSlot[] => {
    const slots: ImageSlot[] = []
    for (let i = 0; i < 4; i++) {
      slots.push({
        file: null,
        preview: recipe.imageUrls?.[i] || (i === 0 ? recipe.imageUrl ?? null : null)
      })
    }
    return slots
  }

  const [imageSlots, setImageSlots] = useState<ImageSlot[]>(initializeImageSlots())
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(recipe.videoUrl || null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const imageInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]
  const bulkImageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (slotIndex: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImageSlots(prev => {
        const newSlots = [...prev]
        newSlots[slotIndex] = {
          file,
          preview: reader.result as string
        }
        return newSlots
      })
    }
    reader.readAsDataURL(file)
  }

  const handleBulkImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate that we have between 1-4 files
    if (files.length > 4) {
      toast.error('You can upload a maximum of 4 images')
      return
    }

    // Validate all files
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'))
    if (invalidFiles.length > 0) {
      toast.error('All files must be valid images')
      return
    }

    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast.error('All images must be less than 5MB')
      return
    }

    // Process all files and create previews
    const newSlots: ImageSlot[] = [...imageSlots]
    let processedCount = 0

    files.forEach((file, index) => {
      if (index >= 4) return // Safety check

      const reader = new FileReader()
      reader.onloadend = () => {
        newSlots[index] = {
          file,
          preview: reader.result as string
        }
        processedCount++

        // Update state once all files are processed
        if (processedCount === files.length) {
          setImageSlots(newSlots)
          toast.success(`${files.length} image${files.length > 1 ? 's' : ''} selected`)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDeleteImage = (slotIndex: number) => {
    setImageSlots(prev => {
      const newSlots = [...prev]
      newSlots[slotIndex] = {
        file: null,
        preview: recipe.imageUrls?.[slotIndex] || (slotIndex === 0 ? recipe.imageUrl ?? null : null)
      }
      return newSlots
    })
    if (imageInputRefs[slotIndex].current) {
      imageInputRefs[slotIndex].current!.value = ''
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file')
      return
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Video must be less than 20MB')
      return
    }

    // Validate video duration (5-7 seconds)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src)
      const duration = video.duration
      if (duration < 5 || duration > 7) {
        toast.error('Video must be 5-7 seconds long')
        return
      }
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
    }
    video.src = URL.createObjectURL(file)
  }

  const handleUpload = async () => {
    const hasAnyImage = imageSlots.some(slot => slot.file !== null)

    if (!hasAnyImage && !videoFile) {
      toast.error('Please select at least one file to upload')
      return
    }

    if (!user) {
      toast.error('You must be logged in to upload media')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Collect image files
      const imageFiles = imageSlots
        .filter(slot => slot.file !== null)
        .map(slot => slot.file!)

      // Upload to Firebase Storage (client-side)
      const uploadResult = await uploadRecipeMedia(
        recipe.id,
        imageFiles,
        videoFile,
        (progress) => {
          setUploadProgress(progress)
        }
      )

      // Create/update recipe document in Firestore with media URLs
      const recipeRef = doc(db, 'recipes', recipe.id)
      await setDoc(recipeRef, {
        imageUrls: uploadResult.imageUrls,
        imageStoragePaths: uploadResult.imageStoragePaths,
        ...(uploadResult.videoUrl && {
          videoUrl: uploadResult.videoUrl,
          videoStoragePath: uploadResult.videoStoragePath,
        }),
        mediaUploadedAt: Timestamp.now(),
        mediaUploadedBy: user.uid,
      }, { merge: true })

      toast.success('Media uploaded successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload media'
      toast.error(errorMessage, { duration: 5000 })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteVideo = () => {
    setVideoFile(null)
    setVideoPreview(recipe.videoUrl || null)
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    // Validate that we have between 1-4 files
    if (files.length > 4) {
      toast.error('You can upload a maximum of 4 images')
      return
    }

    // Validate all files
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'))
    if (invalidFiles.length > 0) {
      toast.error('All files must be valid images')
      return
    }

    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast.error('All images must be less than 5MB')
      return
    }

    // Process all files and create previews (same logic as handleBulkImageSelect)
    const newSlots: ImageSlot[] = [...imageSlots]
    let processedCount = 0

    files.forEach((file, index) => {
      if (index >= 4) return // Safety check

      const reader = new FileReader()
      reader.onloadend = () => {
        newSlots[index] = {
          file,
          preview: reader.result as string
        }
        processedCount++

        // Update state once all files are processed
        if (processedCount === files.length) {
          setImageSlots(newSlots)
          toast.success(`${files.length} image${files.length > 1 ? 's' : ''} selected`)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Upload Media</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{recipe.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Image Upload - 4 Slots in Grid */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Recipe Images (Up to 4 Photos)
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              First image will be the primary/hero image shown in the carousel
            </p>

            {/* Drag & Drop Upload Zone */}
            <div
              className={`mb-4 relative transition-all duration-200 ${
                isDragging
                  ? 'border-4 border-solid border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div
                onClick={() => bulkImageInputRef.current?.click()}
                className="cursor-pointer px-6 py-8 rounded-lg text-center"
              >
                <div className={`flex flex-col items-center gap-3 ${isDragging ? 'scale-105' : ''} transition-transform`}>
                  <PhotoIcon className={`h-12 w-12 ${isDragging ? 'text-purple-600 animate-bounce' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div>
                    <p className={`text-lg font-semibold ${isDragging ? 'text-purple-600' : 'text-gray-700 dark:text-gray-300'}`}>
                      {isDragging ? 'Drop images here!' : 'Drag & drop images here'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      or click to select up to 4 images
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>PNG, JPG up to 5MB each</span>
                  </div>
                </div>
              </div>
              <input
                ref={bulkImageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleBulkImageSelect}
                className="hidden"
              />
            </div>

            {/* Divider */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">or upload individually</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {imageSlots.map((slot, index) => (
                <div
                  key={index}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 relative"
                >
                  {/* Primary Badge */}
                  {index === 0 && (
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md z-10">
                      <StarIcon className="h-3 w-3" />
                      Primary
                    </div>
                  )}

                  {slot.preview ? (
                    <div className="relative">
                      <div className="relative h-40 rounded-lg overflow-hidden">
                        <Image
                          src={slot.preview}
                          alt={`Image ${index + 1} preview`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => imageInputRefs[index].current?.click()}
                          className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Change
                        </button>
                        <button
                          onClick={() => handleDeleteImage(index)}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => imageInputRefs[index].current?.click()}
                      className="cursor-pointer text-center py-8"
                    >
                      <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 dark:text-gray-400 font-medium text-sm mb-1">
                        Image {index + 1}
                      </p>
                      <p className="text-xs text-gray-500">
                        Click to upload
                      </p>
                    </div>
                  )}
                  <input
                    ref={imageInputRefs[index]}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect(index)}
                    className="hidden"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Video Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Recipe Video (5-7 Seconds)
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
              {videoPreview ? (
                <div className="relative">
                  <div className="relative h-64 rounded-lg overflow-hidden bg-black">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Change Video
                    </button>
                    <button
                      onClick={handleDeleteVideo}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="cursor-pointer text-center py-8"
                >
                  <VideoCameraIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
                    Click to upload video
                  </p>
                  <p className="text-sm text-gray-500">
                    MP4, 5-7 seconds, max 20MB
                  </p>
                </div>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <CloudArrowUpIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-bounce" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Uploading... {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              Best Practices for Social Media
            </h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>• Upload up to 4 images showing different angles and stages of the recipe</li>
              <li>• First image is the hero - make it the most appetizing!</li>
              <li>• Use high-quality food photography (1920x1080 or 4:5 ratio)</li>
              <li>• Video: Show the cooking/plating process in 5-7 seconds</li>
              <li>• Lighting: Ensure good lighting for appetizing appearance</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || (!imageSlots.some(s => s.file) && !videoFile)}
              className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CloudArrowUpIcon className="h-5 w-5" />
              {uploading ? 'Uploading...' : 'Upload Media'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
