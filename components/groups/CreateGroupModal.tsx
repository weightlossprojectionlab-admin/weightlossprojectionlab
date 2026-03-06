'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createGroup } from '@/lib/group-operations'
import { logger } from '@/lib/logger'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onSuccess
}: CreateGroupModalProps) {
  const { user, loading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'public' as 'public' | 'private',
    maxMembers: 50,
    tags: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required'
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Group name must be at least 3 characters'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Group name must be less than 100 characters'
    }

    if (formData.maxMembers < 2) {
      newErrors.maxMembers = 'Minimum 2 members required'
    } else if (formData.maxMembers > 500) {
      newErrors.maxMembers = 'Maximum 500 members allowed'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!user) {
      logger.error('[CreateGroupModal] No user found when submitting', {
        loading,
        hasUser: !!user
      })
      toast.error('You must be logged in to create a group')
      return
    }

    setIsSubmitting(true)

    try {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const result = await createGroup({
        name: formData.name,
        description: formData.description,
        privacy: formData.privacy,
        maxMembers: formData.maxMembers,
        tags,
        creatorUid: user.uid,
        creatorDisplayName: user.displayName || 'Anonymous'
      })

      if (result.success) {
        logger.info('[CreateGroupModal] Group created successfully', {
          groupId: result.groupId
        })
        toast.success('Group created successfully!')

        // Reset form
        setFormData({
          name: '',
          description: '',
          privacy: 'public',
          maxMembers: 50,
          tags: ''
        })
        setErrors({})

        onSuccess()
        onClose()
      } else {
        toast.error(result.error || 'Failed to create group')
      }
    } catch (error) {
      logger.error('[CreateGroupModal] Error creating group', error as Error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        description: '',
        privacy: 'public',
        maxMembers: 50,
        tags: ''
      })
      setErrors({})
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create New Group
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Group Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Group Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.name
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="e.g., Morning Warriors"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="What's this group about?"
              disabled={isSubmitting}
            />
          </div>

          {/* Privacy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Privacy
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="public"
                  checked={formData.privacy === 'public'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      privacy: e.target.value as 'public' | 'private'
                    })
                  }
                  className="mr-2"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Public
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="private"
                  checked={formData.privacy === 'private'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      privacy: e.target.value as 'public' | 'private'
                    })
                  }
                  className="mr-2"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Private
                </span>
              </label>
            </div>
          </div>

          {/* Max Members */}
          <div>
            <label
              htmlFor="maxMembers"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Maximum Members
            </label>
            <input
              type="number"
              id="maxMembers"
              value={formData.maxMembers}
              onChange={(e) =>
                setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 0 })
              }
              min={2}
              max={500}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.maxMembers
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={isSubmitting}
            />
            {errors.maxMembers && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.maxMembers}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Tags
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="e.g., fitness, motivation, accountability (comma-separated)"
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
