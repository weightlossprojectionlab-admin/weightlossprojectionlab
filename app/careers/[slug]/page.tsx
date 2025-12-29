'use client'

/**
 * Individual Job Posting Page
 * Displays full job description with apply option
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { JobPosting } from '@/types/jobs'
import { logger } from '@/lib/logger'
import { ApplicationForm } from '@/components/careers/ApplicationForm'

export default function JobPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [job, setJob] = useState<JobPosting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (slug) {
      fetchJob()
    }
  }, [slug])

  const fetchJob = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/jobs/${slug}`)
      const data = await response.json()

      if (data.success) {
        setJob(data.data)
      } else {
        setError(data.error || 'Job not found')
      }
    } catch (err) {
      logger.error('Error fetching job:', err as Error)
      setError('Failed to load job')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">✗</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Job Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <Link
            href="/careers"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            View All Positions
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link
            href="/careers"
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
          >
            ← Back to Careers
          </Link>
          <a
            href={`mailto:careers@weightlossprojectionlab.com?subject=Application: ${job.title}&body=Hi, I'm interested in the ${job.title} position.`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Apply Now
          </a>
        </div>
      </div>

      {/* Job Details */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title & Meta */}
        <div className="mb-8">
          <div className="flex gap-2 mb-4">
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
              {job.department}
            </span>
            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium">
              {job.locationType.charAt(0).toUpperCase() + job.locationType.slice(1)}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{job.title}</h1>
          <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {job.location}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              ${(job.salaryMin / 1000).toFixed(0)}K - ${(job.salaryMax / 1000).toFixed(0)}K
              {job.equity && ` + ${job.equity} equity`}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Reports to: {job.reportsTo}
            </span>
          </div>
        </div>

        {/* About the Role */}
        <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            About the Role
          </h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{job.about}</p>
        </section>

        {/* Why Critical */}
        <section className="mb-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Why This Role is Critical
          </h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {job.whyCritical}
          </p>
        </section>

        {/* Responsibilities */}
        <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Responsibilities
          </h2>
          <ul className="space-y-2">
            {job.responsibilities.map((resp, i) => (
              <li key={i} className="flex gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                <span>{resp}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Required Qualifications */}
        <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Required Qualifications
          </h2>
          <ul className="space-y-2">
            {job.requiredQualifications.map((qual, i) => (
              <li key={i} className="flex gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                <span>{qual}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Nice to Have */}
        {job.niceToHave && job.niceToHave.length > 0 && (
          <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Nice to Have
            </h2>
            <ul className="space-y-2">
              {job.niceToHave.map((nice, i) => (
                <li key={i} className="flex gap-3 text-gray-700 dark:text-gray-300">
                  <span className="text-purple-600 dark:text-purple-400 mt-1">+</span>
                  <span>{nice}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Success Metrics */}
        <section className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            What Success Looks Like (First 90 Days)
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-bold text-lg text-purple-600 dark:text-purple-400 mb-3">
                Month 1
              </h3>
              <ul className="space-y-2">
                {job.successMetrics.month1.map((metric, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span>•</span>
                    <span>{metric}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400 mb-3">Month 2</h3>
              <ul className="space-y-2">
                {job.successMetrics.month2.map((metric, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span>•</span>
                    <span>{metric}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg text-green-600 dark:text-green-400 mb-3">
                Month 3
              </h3>
              <ul className="space-y-2">
                {job.successMetrics.month3.map((metric, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span>•</span>
                    <span>{metric}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Why Join */}
        <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Why Join</h2>
          <ul className="space-y-3">
            {job.whyJoin.map((reason, i) => (
              <li key={i} className="flex gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-orange-600 dark:text-orange-400 text-xl">★</span>
                <span dangerouslySetInnerHTML={{ __html: reason }} />
              </li>
            ))}
          </ul>
        </section>

        {/* Application Form */}
        <div id="apply" className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Apply for This Position
          </h2>
          <ApplicationForm job={job} />
        </div>

        {/* Alternative Contact */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Having trouble with the form?{' '}
            <a
              href={`mailto:careers@weightlossprojectionlab.com?subject=Application: ${job.title}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Email us directly
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
