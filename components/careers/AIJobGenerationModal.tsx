'use client'

/**
 * AI Job Generation Modal
 * Allows admins to generate job postings from codebase analysis
 */

import { useState } from 'react'
import { auth } from '@/lib/firebase'
import { toast } from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { GeneratedJob } from '@/lib/ai/job-generator'

interface AIJobGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AIJobGenerationModal({
  isOpen,
  onClose,
  onSuccess,
}: AIJobGenerationModalProps) {
  const [loading, setLoading] = useState(false)
  const [commitCount, setCommitCount] = useState(10)
  const [generatedJobs, setGeneratedJobs] = useState<GeneratedJob[]>([])
  const [showResults, setShowResults] = useState(false)

  if (!isOpen) return null

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setShowResults(false)

      const user = auth.currentUser
      if (!user) {
        throw new Error('Not authenticated')
      }

      const token = await user.getIdToken()
      const response = await fetch('/api/admin/jobs/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commitCount,
          saveToFirestore: false, // Preview first
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate jobs')
      }

      setGeneratedJobs(data.data.generatedJobs)
      setShowResults(true)

      if (data.data.generatedJobs.length === 0) {
        toast.success('No new jobs needed based on codebase analysis')
      } else {
        toast.success(`Generated ${data.data.generatedJobs.length} job posting(s)`)
      }
    } catch (err) {
      logger.error('Error generating jobs:', err as Error)
      toast.error((err as Error).message || 'Failed to generate jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveJobs = async () => {
    try {
      setLoading(true)

      const user = auth.currentUser
      if (!user) {
        throw new Error('Not authenticated')
      }

      const token = await user.getIdToken()
      const response = await fetch('/api/admin/jobs/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commitCount,
          saveToFirestore: true,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to save jobs')
      }

      const savedCount = data.data.savedJobIds?.length || 0
      logger.info(`[AIJobGen] Saved ${savedCount} jobs, calling onSuccess callback`)
      toast.success(`Saved ${savedCount} job(s) as drafts`)
      onSuccess() // This should trigger fetchJobs() in the parent
      handleClose()
    } catch (err) {
      logger.error('Error saving jobs:', err as Error)
      toast.error((err as Error).message || 'Failed to save jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setGeneratedJobs([])
    setShowResults(false)
    setCommitCount(10)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SparklesIcon className="w-6 h-6 text-white" />
                <h3 className="text-xl font-bold text-white">
                  AI Job Generation
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <p className="mt-2 text-purple-100 text-sm">
              Generate job postings based on codebase analysis and recent commits
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {!showResults ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of commits to analyze
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={commitCount}
                    onChange={(e) => setCommitCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    More commits = better understanding of codebase needs
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                    How it works:
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>1. Analyzes recent git commits and file changes</li>
                    <li>2. Scans package.json for tech stack</li>
                    <li>3. Identifies development patterns and complexity</li>
                    <li>4. Uses AI to generate realistic job descriptions</li>
                    <li>5. Creates jobs as drafts for your review</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                    Note:
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Generated jobs are created as <strong>drafts</strong>. You can review,
                    edit, and publish them from the careers management page.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">
                    Generated {generatedJobs.length} job posting(s)
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Review the results below. Click "Save All as Drafts" to add them to your
                    job listings.
                  </p>
                </div>

                {generatedJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-300">
                      No new jobs needed based on current codebase analysis.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      This could mean your existing jobs already cover current needs, or recent
                      commits are maintenance work.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedJobs.map((generated, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                              {generated.job.title}
                            </h4>
                            <div className="flex gap-3 mt-1 text-sm text-gray-600 dark:text-gray-300">
                              <span>{generated.job.department}</span>
                              <span>•</span>
                              <span>
                                ${(generated.job.salaryMin! / 1000).toFixed(0)}K - $
                                {(generated.job.salaryMax! / 1000).toFixed(0)}K
                              </span>
                              <span>•</span>
                              <span>{generated.job.location}</span>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                            {(generated.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <strong className="text-gray-700 dark:text-gray-300">
                              Rationale:
                            </strong>
                            <p className="text-gray-600 dark:text-gray-400">{generated.rationale}</p>
                          </div>

                          <div>
                            <strong className="text-gray-700 dark:text-gray-300">
                              Tech Stack:
                            </strong>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {generated.metadata.techStack.map((tech, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <strong className="text-gray-700 dark:text-gray-300">
                              Generated from:
                            </strong>
                            <p className="text-gray-600 dark:text-gray-400">
                              Commit {generated.metadata.generatedFrom} (analyzed{' '}
                              {generated.metadata.analyzedCommits?.length || 0} commits)
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end gap-3">
            {!showResults ? (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      Generate Jobs
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowResults(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  disabled={loading}
                >
                  Back
                </button>
                {generatedJobs.length > 0 && (
                  <button
                    onClick={handleSaveJobs}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      `Save All as Drafts (${generatedJobs.length})`
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
