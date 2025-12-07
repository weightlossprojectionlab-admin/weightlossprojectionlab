'use client'

import { useState, useRef } from 'react'
import { MedicationImage } from '@/types/medical'
import { storage, auth } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { extractTextFromImage, extractMedicationFromImage } from '@/lib/ocr-medication'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import {
  CameraIcon,
  PhotoIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface MedicationImageManagerProps {
  images: MedicationImage[]
  medicationId: string
  patientId: string
  onImagesChange: (images: MedicationImage[]) => void
  onOCRComplete?: (extractedData: any) => void
  maxImages?: number
}

export function MedicationImageManager({
  images,
  medicationId,
  patientId,
  onImagesChange,
  onOCRComplete,
  maxImages = 10
}: MedicationImageManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [ocrProcessing, setOcrProcessing] = useState<Record<string, boolean>>({})
  const [selectedImage, setSelectedImage] = useState<MedicationImage | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  /**
   * Upload image to Firebase Storage
   */
  const uploadImage = async (file: File, label: MedicationImage['label']): Promise<MedicationImage> => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    const imageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const storagePath = `medications/${user.uid}/${patientId}/${medicationId}/${imageId}_${file.name}`
    const storageRef = ref(storage, storagePath)

    // Upload file
    await uploadBytes(storageRef, file)

    // Get download URL
    const url = await getDownloadURL(storageRef)

    // Get image dimensions
    const dimensions = await getImageDimensions(file)

    const image: MedicationImage = {
      id: imageId,
      url,
      storagePath,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.uid,
      label,
      ocrProcessed: false,
      isPrimary: images.length === 0, // First image is primary
      width: dimensions.width,
      height: dimensions.height,
      fileSize: file.size
    }

    return image
  }

  /**
   * Get image dimensions from file
   */
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.width, height: img.height })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }

      img.src = url
    })
  }

  /**
   * Handle file selection
   */
  const handleFileSelect = async (files: FileList | null, label: MedicationImage['label'] = 'other') => {
    if (!files || files.length === 0) return

    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`)
      return
    }

    setUploading(true)

    try {
      const newImages: MedicationImage[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`)
          continue
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`)
          continue
        }

        // Upload image
        const image = await uploadImage(file, label)
        newImages.push(image)

        toast.success(`${file.name} uploaded successfully`)
      }

      // Update images array
      onImagesChange([...images, ...newImages])

    } catch (error) {
      logger.error('[MedicationImageManager] Upload error', error as Error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  /**
   * Process OCR on an image
   */
  const processOCR = async (image: MedicationImage) => {
    setOcrProcessing({ ...ocrProcessing, [image.id]: true })

    try {
      // Fetch image as blob
      const response = await fetch(image.url)
      const blob = await response.blob()

      // Extract text using Tesseract
      const { text, confidence } = await extractTextFromImage(blob, (progress) => {
        setUploadProgress({ ...uploadProgress, [image.id]: progress })
      })

      // Extract structured medication data
      const extractedData = await extractMedicationFromImage(blob, (progress) => {
        setUploadProgress({ ...uploadProgress, [image.id]: progress })
      })

      // Update image with OCR results
      const updatedImage: MedicationImage = {
        ...image,
        ocrProcessed: true,
        ocrConfidence: confidence,
        ocrExtractedText: text
      }

      // Update images array
      const updatedImages = images.map(img =>
        img.id === image.id ? updatedImage : img
      )
      onImagesChange(updatedImages)

      // Notify parent with extracted data
      if (onOCRComplete && extractedData) {
        onOCRComplete(extractedData)
      }

      toast.success(`OCR completed with ${confidence.toFixed(0)}% confidence`)

    } catch (error) {
      logger.error('[MedicationImageManager] OCR error', error as Error)
      toast.error('Failed to process OCR')
    } finally {
      setOcrProcessing({ ...ocrProcessing, [image.id]: false })
    }
  }

  /**
   * Delete an image
   */
  const deleteImage = async (image: MedicationImage) => {
    if (!confirm('Delete this image? This cannot be undone.')) return

    try {
      // Delete from Firebase Storage
      const storageRef = ref(storage, image.storagePath)
      await deleteObject(storageRef)

      // Remove from images array
      const updatedImages = images.filter(img => img.id !== image.id)

      // If we deleted the primary image, make the first remaining image primary
      if (image.isPrimary && updatedImages.length > 0) {
        updatedImages[0].isPrimary = true
      }

      onImagesChange(updatedImages)
      toast.success('Image deleted')

    } catch (error) {
      logger.error('[MedicationImageManager] Delete error', error as Error)
      toast.error('Failed to delete image')
    }
  }

  /**
   * Set primary image
   */
  const setPrimaryImage = (imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId
    }))
    onImagesChange(updatedImages)
    toast.success('Primary image updated')
  }

  /**
   * Change image label
   */
  const changeLabel = (imageId: string, newLabel: MedicationImage['label']) => {
    const updatedImages = images.map(img =>
      img.id === imageId ? { ...img, label: newLabel } : img
    )
    onImagesChange(updatedImages)
  }

  const labelOptions: Array<{ value: MedicationImage['label']; label: string; icon: string }> = [
    { value: 'front', label: 'Prescription Front', icon: '📄' },
    { value: 'back', label: 'Prescription Back', icon: '📋' },
    { value: 'bottle', label: 'Medication Bottle', icon: '💊' },
    { value: 'label', label: 'Bottle Label', icon: '🏷️' },
    { value: 'information', label: 'Information Sheet', icon: '📰' },
    { value: 'other', label: 'Other', icon: '📷' }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Prescription Images</h3>
          <p className="text-sm text-muted-foreground">
            Upload multiple images for OCR and analysis ({images.length}/{maxImages})
          </p>
        </div>

        {images.length < maxImages && (
          <div className="flex gap-2">
            {/* Camera button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              <CameraIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Camera</span>
            </button>

            {/* File upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <PhotoIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e.target.files, 'bottle')}
        className="hidden"
      />

      {/* Images Grid */}
      {images.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <PhotoIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No images yet</p>
          <p className="text-sm text-muted-foreground">
            Upload prescription images for OCR analysis and patient reporting
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative bg-background border-2 rounded-lg overflow-hidden ${
                image.isPrimary ? 'border-primary' : 'border-border'
              }`}
            >
              {/* Image */}
              <div className="relative aspect-square">
                <img
                  src={image.url}
                  alt={`Medication ${image.label}`}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImage(image)}
                />

                {/* Primary badge */}
                {image.isPrimary && (
                  <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full font-semibold">
                    Primary
                  </div>
                )}

                {/* OCR status badge */}
                <div className="absolute top-2 right-2">
                  {ocrProcessing[image.id] ? (
                    <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                      OCR...
                    </div>
                  ) : image.ocrProcessed ? (
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      {image.ocrConfidence?.toFixed(0)}%
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                {/* Label selector */}
                <select
                  value={image.label}
                  onChange={(e) => changeLabel(image.id, e.target.value as MedicationImage['label'])}
                  className="w-full text-xs px-2 py-1 border border-border rounded bg-background text-foreground"
                >
                  {labelOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>

                {/* Actions */}
                <div className="flex gap-1">
                  {!image.isPrimary && (
                    <button
                      onClick={() => setPrimaryImage(image.id)}
                      className="flex-1 text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Set as primary"
                    >
                      Set Primary
                    </button>
                  )}

                  {!image.ocrProcessed && (
                    <button
                      onClick={() => processOCR(image)}
                      disabled={ocrProcessing[image.id]}
                      className="flex-1 text-xs px-2 py-1 bg-blue-500 text-white hover:bg-blue-600 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      title="Run OCR"
                    >
                      <ArrowPathIcon className="w-3 h-3" />
                      OCR
                    </button>
                  )}

                  {image.ocrProcessed && (
                    <button
                      onClick={() => processOCR(image)}
                      disabled={ocrProcessing[image.id]}
                      className="flex-1 text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                      title="Re-run OCR"
                    >
                      Re-OCR
                    </button>
                  )}

                  <button
                    onClick={() => deleteImage(image)}
                    className="text-xs px-2 py-1 text-error hover:bg-error/10 rounded transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* File info */}
                <div className="text-xs text-muted-foreground">
                  {(image.fileSize! / 1024).toFixed(0)}KB • {image.width}x{image.height}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-5xl max-h-[90vh] relative">
            <img
              src={selectedImage.url}
              alt={`Medication ${selectedImage.label}`}
              className="max-w-full max-h-[90vh] object-contain"
            />

            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>

            {/* OCR text overlay */}
            {selectedImage.ocrExtractedText && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 text-white p-4 rounded-lg max-h-48 overflow-y-auto">
                <div className="font-semibold mb-2">Extracted Text ({selectedImage.ocrConfidence?.toFixed(0)}% confidence):</div>
                <pre className="text-xs whitespace-pre-wrap">{selectedImage.ocrExtractedText}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-600 dark:text-blue-400">Uploading images...</span>
          </div>
        </div>
      )}
    </div>
  )
}
