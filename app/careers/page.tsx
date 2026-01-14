'use client'

/**
 * Public Careers Landing Page
 * Displays all published job postings
 */

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import type { JobPosting, JobDepartment, JobLocationType } from '@/types/jobs'
import { logger } from '@/lib/logger'
import { SparklesIcon } from '@heroicons/react/24/outline'

import { getCSRFToken } from '@/lib/csrf'
export default function CareersPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/jobs')
      const data = await response.json()

      if (data.success) {
        setJobs(data.data)
      } else {
        setError(data.error || 'Failed to load jobs')
      }
    } catch (err) {
      logger.error('Error fetching jobs:', err as Error)
      setError('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    const deptMatch = selectedDepartment === 'all' || job.department === selectedDepartment
    const locMatch = selectedLocation === 'all' || job.locationType === selectedLocation
    return deptMatch && locMatch
  })

  const departments = Array.from(new Set(jobs.map(j => j.department)))
  const locationTypes = Array.from(new Set(jobs.map(j => j.locationType)))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h1 className="text-5xl font-bold mb-4">Build the Future of AI-Powered Health Tech</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl">
            Join us in making professional-grade nutrition tracking and family healthcare
            coordination accessible to everyone.
          </p>
          <div className="flex gap-4 text-sm">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="font-bold text-2xl">{jobs.length}</div>
              <div className="text-blue-100">Open Positions</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="font-bold text-2xl">Remote</div>
              <div className="text-blue-100">Work From Anywhere</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="font-bold text-2xl">269+</div>
              <div className="text-blue-100">Features Shipped</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission & Impact */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Our Mission
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Empowering individuals and families to achieve health goals through intelligent,
            AI-powered nutrition and medical management.
          </p>
        </div>

        {/* Why Join */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="text-blue-600 dark:text-blue-400 font-bold text-lg mb-2">
              Modern Stack
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              React 19, Next.js 16, TypeScript, Firebase, Gemini AI
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="text-purple-600 dark:text-purple-400 font-bold text-lg mb-2">
              High Impact
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Your code helps families manage health and nutrition
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="text-green-600 dark:text-green-400 font-bold text-lg mb-2">
              Remote-First
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Work from anywhere with flexible hours
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="text-orange-600 dark:text-orange-400 font-bold text-lg mb-2">
              Great Benefits
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Health insurance, unlimited PTO, $2K learning budget
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-8">
          <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Filter Jobs</h3>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location Type
              </label>
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Locations</option>
                {locationTypes.map(loc => (
                  <option key={loc} value={loc}>
                    {loc.charAt(0).toUpperCase() + loc.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Job Listings */}
        <div className="mb-8">
          <h3 className="font-bold text-2xl mb-6 text-gray-900 dark:text-white">
            Open Positions ({filteredJobs.length})
          </h3>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Loading positions...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && filteredJobs.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-gray-600 dark:text-gray-300">
                No positions match your filters. Try adjusting them!
              </p>
            </div>
          )}

          <div className="space-y-4">
            {filteredJobs.map(job => (
              <Link
                key={job.id}
                href={`/careers/${job.slug}`}
                className="block bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                        {job.title}
                      </h4>
                      {job.isAIGenerated && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                          title="This role was identified by analyzing our actual codebase needs"
                        >
                          <SparklesIcon className="w-3 h-3" />
                          AI-Generated
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                    {job.locationType.charAt(0).toUpperCase() + job.locationType.slice(1)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {job.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                  {job.about}
                </p>
                <div className="mt-4 text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-1">
                  Learn more →
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Values Section */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Our Values
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-bold text-lg text-purple-600 dark:text-purple-400 mb-2">
                User Obsession
              </h4>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Build for real people solving real problems. Every feature starts with user needs.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg text-blue-600 dark:text-blue-400 mb-2">
                Iterate Fearlessly
              </h4>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Ship fast, learn quickly. 269 features shipped because we value action over
                analysis paralysis.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg text-green-600 dark:text-green-400 mb-2">
                Technical Excellence
              </h4>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Modern tech, code quality, testing, and security. Technical debt is tracked and
                addressed.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg text-orange-600 dark:text-orange-400 mb-2">
                Transparency & Trust
              </h4>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Healthcare is personal. We're transparent about data collection, AI decisions, and
                privacy.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg text-pink-600 dark:text-pink-400 mb-2">
                Inclusive by Design
              </h4>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Build for diverse users—single, household, caregiver modes. Health tech for
                everyone.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg text-indigo-600 dark:text-indigo-400 mb-2">
                Remote-First Culture
              </h4>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Work from anywhere. Async communication, deep work culture, minimal meetings.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Don't see the right role?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
            We're always looking for talented, mission-driven people. Send us your resume and tell
            us what you're passionate about!
          </p>
          <a
            href="mailto:careers@weightlossprojectionlab.com?subject=Career Opportunity"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-colors"
          >
            Send Us Your Resume
          </a>
        </div>
      </div>
    </div>
  )
}
