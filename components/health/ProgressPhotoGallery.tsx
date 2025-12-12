/**
 * Progress Photo Gallery
 *
 * Upload and display injury/illness progression photos with timeline view.
 * Features:
 * - Photo upload with captions and tags
 * - Timeline view showing day numbers
 * - Before/after comparison builder
 * - Associate photos with specific symptoms
 */

'use client'

import { useState, useRef } from 'react'
import { ProgressPhoto, HealthSymptom } from '@/types/health-episodes'
import { PhotoIcon, XMarkIcon, CalendarIcon, TagIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Image from 'next/image'

interface ProgressPhotoGalleryProps {
  episodeId: string
  patientId: string
  photos: ProgressPhoto[]
  symptoms: HealthSymptom[]
  episodeStartDate: string // For calculating day numbers
  onUpload: (file: File, metadata: { caption?: string; tags?: string[]; relatedSymptomId?: string }) => Promise<void>
  onDelete: (photoId: string) => Promise<void>
  onUpdateMetadata: (photoId: string, updates: { caption?: string; tags?: string[] }) => Promise<void>
}

export function ProgressPhotoGallery({
  episodeId,
  patientId,
  photos,
  symptoms,
  episodeStartDate,
  onUpload,
  onDelete,
  onUpdateMetadata
}: ProgressPhotoGalleryProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null)
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload modal state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [relatedSymptomId, setRelatedSymptomId] = useState<string>('')

  // Calculate day number from episode start
  const getDayNumber = (date: string): number => {
    const start = new Date(episodeStartDate)
    const current = new Date(date)
    const diffTime = Math.abs(current.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Sort photos by day number
  const sortedPhotos = [...photos].sort((a, b) => a.dayNumber - b.dayNumber)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10MB')
      return
    }

    setUploadFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setUploadPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setShowUploadModal(true)
  }

  const handleUpload = async () => {
    if (!uploadFile) return

    setIsUploading(true)
    try {
      await onUpload(uploadFile, {
        caption: caption.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        relatedSymptomId: relatedSymptomId || undefined
      })

      toast.success('Progress photo uploaded!')

      // Reset state
      setUploadFile(null)
      setUploadPreview(null)
      setCaption('')
      setTags([])
      setRelatedSymptomId('')
      setShowUploadModal(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload photo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (photoId: string) => {
    if (!confirm('Delete this progress photo? This cannot be undone.')) return

    try {
      await onDelete(photoId)
      toast.success('Photo deleted')
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete photo')
    }
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      setTags([...tags, tag.trim()])
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Progress Photos</h3>
          <p className="text-sm text-muted-foreground">
            Track visual recovery with photos
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          <PhotoIcon className="w-5 h-5" />
          <span>Add Photo</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Photo Timeline */}
      {sortedPhotos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <PhotoIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-1">No progress photos yet</p>
          <p className="text-sm text-muted-foreground">
            Add photos to track recovery visually
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sortedPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => setSelectedPhoto(photo)}
            >
              <Image
                src={photo.thumbnailUrl || photo.photoUrl}
                alt={photo.caption || `Day ${photo.dayNumber}`}
                fill
                className="object-cover"
              />

              {/* Day Number Badge */}
              <div className="absolute top-2 left-2 bg-primary text-white px-2 py-1 rounded text-xs font-semibold">
                Day {photo.dayNumber}
              </div>

              {/* Delete Button (on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(photo.id)
                }}
                className="absolute top-2 right-2 bg-error text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>

              {/* Caption Preview */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs truncate">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && uploadPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">Add Progress Photo</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                    setUploadPreview(null)
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Preview */}
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <Image
                  src={uploadPreview}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Caption
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g., Swelling reduced significantly"
                  className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['before', 'after', 'morning', 'evening', 'bandage-removed', 'cleaned'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => tags.includes(tag) ? removeTag(tag) : addTag(tag)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        tags.includes(tag)
                          ? 'bg-primary text-white'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                      <div key={tag} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                        <TagIcon className="w-3 h-3" />
                        <span>{tag}</span>
                        <button onClick={() => removeTag(tag)} className="ml-1">
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Related Symptom */}
              {symptoms.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Related Symptom (Optional)
                  </label>
                  <select
                    value={relatedSymptomId}
                    onChange={(e) => setRelatedSymptomId(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">None</option>
                    {symptoms.filter(s => !s.resolved).map(symptom => (
                      <option key={symptom.id} value={symptom.id}>
                        {symptom.symptom}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                    setUploadPreview(null)
                  }}
                  disabled={isUploading}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">
                  Day {selectedPhoto.dayNumber} Progress
                </h3>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Full Size Photo */}
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <Image
                  src={selectedPhoto.photoUrl}
                  alt={selectedPhoto.caption || `Day ${selectedPhoto.dayNumber}`}
                  fill
                  className="object-contain"
                />
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="w-4 h-4" />
                  <span>
                    {new Date(selectedPhoto.capturedAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {selectedPhoto.caption && (
                  <p className="text-foreground">{selectedPhoto.caption}</p>
                )}

                {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPhoto.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => handleDelete(selectedPhoto.id)}
                  className="px-4 py-2 text-error hover:bg-error-light rounded-lg transition-colors"
                >
                  Delete Photo
                </button>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
