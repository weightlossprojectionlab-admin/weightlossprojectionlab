// Create Post Component
// PRD Reference: social_retention_and_group_missions (PRD v1.3.7)
// Create new posts with media uploads

'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createPost } from '@/lib/post-operations'
import { Image, Video, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

interface CreatePostProps {
  groupId: string
}

export default function CreatePost({ groupId }: CreatePostProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])

    // Validate file types and sizes
    const validFiles: File[] = []
    const newPreviews: string[] = []

    for (const file of selectedFiles) {
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 10MB per file.`)
        continue
      }

      // Only images and videos
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`${file.name} is not a valid image or video.`)
        continue
      }

      validFiles.push(file)

      // Create preview
      const previewUrl = URL.createObjectURL(file)
      newPreviews.push(previewUrl)
    }

    // Limit to 4 files total
    if (files.length + validFiles.length > 4) {
      toast.error('You can upload up to 4 files per post.')
      return
    }

    setFiles([...files, ...validFiles])
    setPreviews([...previews, ...newPreviews])
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setFiles(files.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('You must be logged in to post')
      return
    }

    if (!content.trim() && files.length === 0) {
      toast.error('Post must have content or media')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createPost(
        {
          groupId,
          authorId: user.uid,
          authorName: user.displayName || 'Anonymous',
          content,
        },
        files.length > 0 ? files : undefined
      )

      if (result.success) {
        toast.success('Post shared!')
        setContent('')
        setFiles([])
        previews.forEach((url) => URL.revokeObjectURL(url))
        setPreviews([])
      } else {
        toast.error(result.error || 'Failed to create post')
      }
    } catch (error) {
      logger.error('[CreatePost] Error creating post', error as Error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <form onSubmit={handleSubmit}>
        {/* Text Input */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share an update, progress, or motivation..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-600 focus:border-transparent dark:bg-gray-700 dark:text-white"
          rows={3}
          disabled={isSubmitting}
        />

        {/* File Previews */}
        {previews.length > 0 && (
          <div className={`grid gap-2 mt-3 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {previews.map((preview, index) => {
              const file = files[index]
              const isVideo = file.type.startsWith('video/')

              return (
                <div key={index} className="relative group bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {isVideo ? (
                    <video
                      src={preview}
                      className="w-full h-auto max-h-96 object-contain"
                      controls
                    />
                  ) : (
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {/* Image Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || files.length >= 4}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              <Image className="w-4 h-4" />
              <span>Photo</span>
            </button>

            {/* Video Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || files.length >= 4}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              <Video className="w-4 h-4" />
              <span>Video</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && files.length === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <span>Post</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
