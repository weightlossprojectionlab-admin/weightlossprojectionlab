'use client'

/**
 * Job Application Form Component
 * Handles resume upload and application submission
 */

import { useState } from 'react'
import { logger } from '@/lib/logger'
import type { JobPosting } from '@/types/jobs'

interface ApplicationFormProps {
  job: JobPosting
  onSuccess?: () => void
}

export function ApplicationForm({ job, onSuccess }: ApplicationFormProps) {
  const [formData, setFormData] = useState({
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    applicantLinkedIn: '',
    applicantWebsite: '',
    coverLetter: '',
    whyExcited: '',
  })

  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.applicantName || !formData.applicantEmail) {
        throw new Error('Name and email are required')
      }

      // Create form data
      const submitData = new FormData()
      submitData.append('jobId', job.id)
      submitData.append('jobTitle', job.title)
      submitData.append('jobSlug', job.slug)
      submitData.append('applicantName', formData.applicantName)
      submitData.append('applicantEmail', formData.applicantEmail)

      if (formData.applicantPhone) submitData.append('applicantPhone', formData.applicantPhone)
      if (formData.applicantLinkedIn)
        submitData.append('applicantLinkedIn', formData.applicantLinkedIn)
      if (formData.applicantWebsite)
        submitData.append('applicantWebsite', formData.applicantWebsite)
      if (formData.coverLetter) submitData.append('coverLetter', formData.coverLetter)
      if (formData.whyExcited) submitData.append('whyExcited', formData.whyExcited)

      if (resumeFile) {
        submitData.append('resume', resumeFile)
      }

      // Submit application
      const response = await fetch('/api/applications', {
        method: 'POST',
        body: submitData,
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        logger.info(`Application submitted successfully for job: ${job.title}`)
        if (onSuccess) onSuccess()
      } else {
        throw new Error(data.error || 'Failed to submit application')
      }
    } catch (err: any) {
      logger.error('Error submitting application:', err)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ]

      if (!validTypes.includes(file.type)) {
        setError('Invalid file type. Please upload PDF, DOC, DOCX, or TXT')
        return
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB')
        return
      }

      setResumeFile(file)
      setError(null)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
        <div className="text-green-600 dark:text-green-400 text-6xl mb-4">✓</div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Application Submitted!
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Thank you for applying to the {job.title} position. We'll review your application and get
          back to you soon.
        </p>
        <button
          onClick={() => {
            setSuccess(false)
            setFormData({
              applicantName: '',
              applicantEmail: '',
              applicantPhone: '',
              applicantLinkedIn: '',
              applicantWebsite: '',
              coverLetter: '',
              whyExcited: '',
            })
            setResumeFile(null)
          }}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Submit Another Application
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.applicantName}
            onChange={e => setFormData({ ...formData, applicantName: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="John Doe"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.applicantEmail}
            onChange={e => setFormData({ ...formData, applicantEmail: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="john@example.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone (optional)
          </label>
          <input
            type="tel"
            value={formData.applicantPhone}
            onChange={e => setFormData({ ...formData, applicantPhone: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {/* LinkedIn */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            LinkedIn Profile (optional)
          </label>
          <input
            type="url"
            value={formData.applicantLinkedIn}
            onChange={e => setFormData({ ...formData, applicantLinkedIn: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="https://linkedin.com/in/johndoe"
          />
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Portfolio/Website (optional)
        </label>
        <input
          type="url"
          value={formData.applicantWebsite}
          onChange={e => setFormData({ ...formData, applicantWebsite: e.target.value })}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="https://johndoe.com"
        />
      </div>

      {/* Resume Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Resume/CV {resumeFile ? '' : <span className="text-red-500">*</span>}
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md hover:border-blue-500 transition-colors">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600 dark:text-gray-300">
              <label className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                <span>{resumeFile ? 'Change file' : 'Upload a file'}</span>
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              PDF, DOC, DOCX, TXT up to 10MB
            </p>
            {resumeFile && (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                ✓ {resumeFile.name} ({(resumeFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cover Letter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cover Letter (optional)
        </label>
        <textarea
          rows={6}
          value={formData.coverLetter}
          onChange={e => setFormData({ ...formData, coverLetter: e.target.value })}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Tell us about your experience and why you're interested in this role..."
        />
      </div>

      {/* Why Excited */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Why are you excited about WLPL? (optional)
        </label>
        <textarea
          rows={4}
          value={formData.whyExcited}
          onChange={e => setFormData({ ...formData, whyExcited: e.target.value })}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="What excites you about working on AI-powered health tech?"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-8 py-3 rounded-lg transition-colors flex items-center gap-2"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Submitting...
            </>
          ) : (
            'Submit Application'
          )}
        </button>
      </div>
    </form>
  )
}
