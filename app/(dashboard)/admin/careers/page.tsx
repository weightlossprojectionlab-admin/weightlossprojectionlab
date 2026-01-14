'use client'

/**
 * Admin Careers Management Page
 * Manage job postings - view, create, edit, delete
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { toast } from 'react-hot-toast'
import { MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { JobFormModal } from '@/components/careers/JobFormModal'
import { AIJobGenerationModal } from '@/components/careers/AIJobGenerationModal'
import type { JobPosting, JobStatus } from '@/types/jobs'

import { getCSRFToken } from '@/lib/csrf'
export default function AdminCareersPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showAIGenerationModal, setShowAIGenerationModal] = useState(false)
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all')

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const user = auth.currentUser
      if (!user) {
        throw new Error('Not authenticated')
      }

      const token = await user.getIdToken()
      const response = await fetch('/api/admin/jobs', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setJobs(data.data)
      } else {
        setError(data.error || 'Failed to load jobs')
      }
    } catch (err: any) {
      logger.error('Error fetching jobs:', err)
      setError(err.message || 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = () => {
    setEditingJob(null)
    setShowJobModal(true)
  }

  const handleEditJob = (job: JobPosting) => {
    setEditingJob(job)
    setShowJobModal(true)
  }

  const handleJobSuccess = () => {
    fetchJobs()
  }

  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) {
      return
    }

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('Not authenticated')
      }

      const token = await user.getIdToken()
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setJobs(jobs.filter(j => j.id !== jobId))
        toast.success('Job deleted successfully')
      } else {
        toast.error(data.error || 'Failed to delete job')
      }
    } catch (err: any) {
      logger.error('Error deleting job:', err)
      toast.error(err.message || 'Failed to delete job')
    }
  }

  const toggleStatus = async (job: JobPosting) => {
    const newStatus = job.status === 'published' ? 'draft' : 'published'

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('Not authenticated')
      }

      const token = await user.getIdToken()
      const response = await fetch(`/api/admin/jobs/${job.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (data.success) {
        setJobs(jobs.map(j => (j.id === job.id ? { ...j, status: newStatus } : j)))
        toast.success(`Job ${newStatus}`)
      } else {
        toast.error(data.error || 'Failed to update status')
      }
    } catch (err: any) {
      logger.error('Error updating job status:', err)
      toast.error(err.message || 'Failed to update status')
    }
  }

  // Filter jobs based on search and status
  const filteredJobs = jobs.filter(job => {
    // Status filter
    if (statusFilter !== 'all' && job.status !== statusFilter) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        job.title.toLowerCase().includes(query) ||
        job.department.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query)
      )
    }

    return true
  })

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading jobs...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Careers Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage job postings and applications
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/careers/applications"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            View Applications
          </Link>
          <Link
            href="/careers"
            target="_blank"
            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            View Public Page →
          </Link>
          <button
            onClick={() => setShowAIGenerationModal(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <SparklesIcon className="w-5 h-5" />
            Generate from Codebase
          </button>
          <button
            onClick={handleCreateJob}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Create Job
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by title, department, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'published'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Published
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'draft'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Drafts
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'closed'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Closed
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="text-gray-600 dark:text-gray-300 text-sm mb-1">Total Jobs</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{jobs.length}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 shadow-sm">
          <div className="text-green-600 dark:text-green-400 text-sm mb-1">Published</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {jobs.filter(j => j.status === 'published').length}
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 shadow-sm">
          <div className="text-yellow-600 dark:text-yellow-400 text-sm mb-1">Drafts</div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {jobs.filter(j => j.status === 'draft').length}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm">
          <div className="text-gray-600 dark:text-gray-300 text-sm mb-1">Closed</div>
          <div className="text-3xl font-bold text-gray-600 dark:text-gray-300">
            {jobs.filter(j => j.status === 'closed').length}
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No jobs found. Create your first job posting!
                  </td>
                </tr>
              ) : (
                filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900 dark:text-white">{job.title}</div>
                        {job.isAIGenerated && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                            title="AI-Generated from codebase analysis"
                          >
                            <SparklesIcon className="w-3 h-3" />
                            AI
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {job.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {job.department}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      ${(job.salaryMin / 1000).toFixed(0)}K - ${(job.salaryMax / 1000).toFixed(0)}K
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(job)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          job.status === 'published'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : job.status === 'draft'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {job.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/careers/${job.slug}`}
                          target="_blank"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleEditJob(job)}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteJob(job.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Form Modal */}
      <JobFormModal
        isOpen={showJobModal}
        onClose={() => {
          setShowJobModal(false)
          setEditingJob(null)
        }}
        onSuccess={handleJobSuccess}
        editJob={editingJob}
      />

      {/* AI Job Generation Modal */}
      <AIJobGenerationModal
        isOpen={showAIGenerationModal}
        onClose={() => setShowAIGenerationModal(false)}
        onSuccess={handleJobSuccess}
      />
    </div>
  )
}
