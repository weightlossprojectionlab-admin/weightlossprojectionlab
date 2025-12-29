/**
 * Admin Contact Submissions Page
 *
 * View and manage contact form submissions
 * Admin-only access
 */

'use client'

import { useEffect, useState } from 'react'
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import {
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface ContactSubmission {
  id: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: 'new' | 'in_progress' | 'resolved'
  submittedAt: string
  ipAddress: string
  userAgent: string
  resolvedAt?: string
  resolvedBy?: string
  internalNotes?: string
}

export default function ContactSubmissionsPage() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      const q = query(
        collection(db, 'contact_submissions'),
        orderBy('submittedAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContactSubmission[]
      setSubmissions(data)
    } catch (error) {
      console.error('Error fetching submissions:', error)
      toast.error('Failed to load contact submissions')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (submissionId: string, newStatus: 'new' | 'in_progress' | 'resolved') => {
    try {
      const submissionRef = doc(db, 'contact_submissions', submissionId)
      const updateData: any = {
        status: newStatus
      }

      if (newStatus === 'resolved') {
        updateData.resolvedAt = new Date().toISOString()
        updateData.resolvedBy = user?.uid || 'unknown'
      }

      await updateDoc(submissionRef, updateData)
      toast.success(`Status updated to ${newStatus}`)
      fetchSubmissions()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const filteredSubmissions = submissions.filter(sub => {
    // Filter by status
    if (filter !== 'all' && sub.status !== filter) return false

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        sub.name.toLowerCase().includes(query) ||
        sub.email.toLowerCase().includes(query) ||
        sub.subject.toLowerCase().includes(query) ||
        sub.message.toLowerCase().includes(query)
      )
    }

    return true
  })

  const stats = {
    total: submissions.length,
    new: submissions.filter(s => s.status === 'new').length,
    inProgress: submissions.filter(s => s.status === 'in_progress').length,
    resolved: submissions.filter(s => s.status === 'resolved').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Contact Submissions</h1>
          <p className="text-muted-foreground">Manage and respond to contact form inquiries</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-lg border-2 border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-card rounded-lg border-2 border-blue-200 p-4">
            <p className="text-sm text-blue-600 mb-1">New</p>
            <p className="text-3xl font-bold text-blue-600">{stats.new}</p>
          </div>
          <div className="bg-card rounded-lg border-2 border-orange-200 p-4">
            <p className="text-sm text-orange-600 mb-1">In Progress</p>
            <p className="text-3xl font-bold text-orange-600">{stats.inProgress}</p>
          </div>
          <div className="bg-card rounded-lg border-2 border-green-200 p-4">
            <p className="text-sm text-green-600 mb-1">Resolved</p>
            <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border-2 border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, email, subject, or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-secondary text-foreground hover:bg-secondary-dark'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('new')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'new'
                    ? 'bg-blue-600 text-white'
                    : 'bg-secondary text-foreground hover:bg-secondary-dark'
                }`}
              >
                New
              </button>
              <button
                onClick={() => setFilter('in_progress')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'in_progress'
                    ? 'bg-orange-600 text-white'
                    : 'bg-secondary text-foreground hover:bg-secondary-dark'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setFilter('resolved')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'resolved'
                    ? 'bg-green-600 text-white'
                    : 'bg-secondary text-foreground hover:bg-secondary-dark'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="bg-card rounded-lg border-2 border-border p-12 text-center">
            <EnvelopeIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No submissions found</h3>
            <p className="text-muted-foreground">
              {filter !== 'all' ? `No ${filter.replace('_', ' ')} submissions` : 'No contact submissions yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map(submission => (
              <div
                key={submission.id}
                className="bg-card rounded-lg border-2 border-border p-6 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{submission.name}</h3>
                      <StatusBadge status={submission.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <EnvelopeIcon className="w-4 h-4" />
                        <a href={`mailto:${submission.email}`} className="hover:text-blue-600">
                          {submission.email}
                        </a>
                      </div>
                      {submission.phone && (
                        <div className="flex items-center gap-1">
                          <PhoneIcon className="w-4 h-4" />
                          <a href={`tel:${submission.phone}`} className="hover:text-blue-600">
                            {submission.phone}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        {new Date(submission.submittedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {submission.status !== 'in_progress' && (
                      <button
                        onClick={() => updateStatus(submission.id, 'in_progress')}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
                      >
                        In Progress
                      </button>
                    )}
                    {submission.status !== 'resolved' && (
                      <button
                        onClick={() => updateStatus(submission.id, 'resolved')}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                      >
                        Resolve
                      </button>
                    )}
                    {submission.status !== 'new' && (
                      <button
                        onClick={() => updateStatus(submission.id, 'new')}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                      >
                        Mark New
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-semibold text-foreground mb-1">Subject:</p>
                  <p className="text-sm text-muted-foreground capitalize">{submission.subject.replace('_', ' ')}</p>
                </div>

                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-sm font-semibold text-foreground mb-2">Message:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{submission.message}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">Technical Details</summary>
                    <div className="mt-2 space-y-1 pl-4">
                      <p>IP Address: {submission.ipAddress}</p>
                      <p>User Agent: {submission.userAgent}</p>
                      {submission.resolvedAt && (
                        <p>Resolved At: {new Date(submission.resolvedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'new' | 'in_progress' | 'resolved' }) {
  const config = {
    new: {
      label: 'New',
      icon: <ClockIcon className="w-4 h-4" />,
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    in_progress: {
      label: 'In Progress',
      icon: <ClockIcon className="w-4 h-4" />,
      className: 'bg-orange-100 text-orange-700 border-orange-200'
    },
    resolved: {
      label: 'Resolved',
      icon: <CheckCircleIcon className="w-4 h-4" />,
      className: 'bg-green-100 text-green-700 border-green-200'
    }
  }

  const { label, icon, className } = config[status]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${className}`}>
      {icon}
      {label}
    </span>
  )
}
