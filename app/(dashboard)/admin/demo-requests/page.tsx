/**
 * Admin Demo Requests Page
 *
 * View and manage demo requests from marketing pages
 * Admin-only access with real-time updates
 */

'use client'

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import {
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import type { DemoRequest, DemoRequestStatus } from '@/types/demo-requests'

export default function DemoRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | DemoRequestStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null)

  // Real-time listener for demo requests
  useEffect(() => {

    const q = query(
      collection(db, 'demo_requests'),
      orderBy('submittedAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DemoRequest[]
        setRequests(data)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching demo requests:', error)
        toast.error('Failed to load demo requests')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const updateStatus = async (requestId: string, newStatus: DemoRequestStatus) => {
    try {
      const requestRef = doc(db, 'demo_requests', requestId)
      const updateData: any = {
        status: newStatus
      }

      if (newStatus === 'scheduled') {
        updateData.scheduledAt = new Date().toISOString()
      } else if (newStatus === 'completed') {
        updateData.completedAt = new Date().toISOString()
      } else if (newStatus === 'cancelled') {
        updateData.cancelledAt = new Date().toISOString()
      }

      await updateDoc(requestRef, updateData)
      toast.success(`Status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const filteredRequests = requests.filter(req => {
    // Filter by status
    if (filter !== 'all' && req.status !== filter) return false

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        req.name.toLowerCase().includes(query) ||
        req.email.toLowerCase().includes(query) ||
        req.company?.toLowerCase().includes(query) ||
        req.role?.toLowerCase().includes(query) ||
        req.useCase?.toLowerCase().includes(query)
      )
    }

    return true
  })

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    scheduled: requests.filter(r => r.status === 'scheduled').length,
    completed: requests.filter(r => r.status === 'completed').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Demo Requests</h1>
          <p className="text-muted-foreground">Manage and schedule product demos from marketing pages</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card rounded-lg border-2 border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-card rounded-lg border-2 border-yellow-200 p-4">
            <p className="text-sm text-yellow-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-card rounded-lg border-2 border-blue-200 p-4">
            <p className="text-sm text-blue-600 mb-1">Scheduled</p>
            <p className="text-3xl font-bold text-blue-600">{stats.scheduled}</p>
          </div>
          <div className="bg-card rounded-lg border-2 border-green-200 p-4">
            <p className="text-sm text-green-600 mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-card rounded-lg border-2 border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Cancelled</p>
            <p className="text-3xl font-bold text-gray-600">{stats.cancelled}</p>
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
                  placeholder="Search by name, email, company, role, or use case..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto">
              <FilterButton
                label="All"
                active={filter === 'all'}
                onClick={() => setFilter('all')}
              />
              <FilterButton
                label="Pending"
                active={filter === 'pending'}
                onClick={() => setFilter('pending')}
                color="yellow"
              />
              <FilterButton
                label="Scheduled"
                active={filter === 'scheduled'}
                onClick={() => setFilter('scheduled')}
                color="blue"
              />
              <FilterButton
                label="Completed"
                active={filter === 'completed'}
                onClick={() => setFilter('completed')}
                color="green"
              />
              <FilterButton
                label="Cancelled"
                active={filter === 'cancelled'}
                onClick={() => setFilter('cancelled')}
                color="gray"
              />
            </div>
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-card rounded-lg border-2 border-border p-12 text-center">
            <CalendarDaysIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No demo requests found</h3>
            <p className="text-muted-foreground">
              {filter !== 'all' ? `No ${filter} requests` : 'No demo requests yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(request => (
              <div
                key={request.id}
                className="bg-card rounded-lg border-2 border-border p-6 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{request.name}</h3>
                      <StatusBadge status={request.status} />
                      {request.urgency === 'high' && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                          High Priority
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <EnvelopeIcon className="w-4 h-4" />
                        <a href={`mailto:${request.email}`} className="hover:text-blue-600">
                          {request.email}
                        </a>
                      </div>
                      {request.phone && (
                        <div className="flex items-center gap-1">
                          <PhoneIcon className="w-4 h-4" />
                          <a href={`tel:${request.phone}`} className="hover:text-blue-600">
                            {request.phone}
                          </a>
                        </div>
                      )}
                      {request.company && (
                        <div className="flex items-center gap-1">
                          <BuildingOfficeIcon className="w-4 h-4" />
                          {request.company}
                          {request.companySize && (
                            <span className="text-xs">({request.companySize})</span>
                          )}
                        </div>
                      )}
                      {request.role && (
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-4 h-4" />
                          {request.role}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        {new Date(request.submittedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 ml-4">
                    {request.status !== 'scheduled' && request.status !== 'completed' && (
                      <button
                        onClick={() => updateStatus(request.id, 'scheduled')}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium whitespace-nowrap"
                      >
                        Schedule
                      </button>
                    )}
                    {request.status === 'scheduled' && (
                      <button
                        onClick={() => updateStatus(request.id, 'completed')}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium whitespace-nowrap"
                      >
                        Complete
                      </button>
                    )}
                    {request.status !== 'cancelled' && (
                      <button
                        onClick={() => updateStatus(request.id, 'cancelled')}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Preferences Section */}
                {(request.preferredDate || request.preferredTime || request.useCase) && (
                  <div className="mb-4 p-4 bg-secondary rounded-lg">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Demo Preferences</h4>
                    <div className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                      {request.preferredDate && (
                        <div>
                          <span className="font-medium">Preferred Date:</span>{' '}
                          {new Date(request.preferredDate).toLocaleDateString()}
                        </div>
                      )}
                      {request.preferredTime && (
                        <div>
                          <span className="font-medium">Preferred Time:</span>{' '}
                          {request.preferredTime}
                        </div>
                      )}
                      {request.timezone && (
                        <div>
                          <span className="font-medium">Timezone:</span> {request.timezone}
                        </div>
                      )}
                      {request.useCase && (
                        <div className="md:col-span-2">
                          <span className="font-medium">Use Case:</span> {request.useCase}
                        </div>
                      )}
                      {request.currentSolution && (
                        <div className="md:col-span-2">
                          <span className="font-medium">Current Solution:</span> {request.currentSolution}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Source & UTM */}
                <div className="mt-4 pt-4 border-t border-border">
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground font-medium">
                      Technical Details & Tracking
                    </summary>
                    <div className="mt-2 space-y-1 pl-4">
                      <p>Source: {request.source}</p>
                      <p>IP Address: {request.ipAddress}</p>
                      <p>User Agent: {request.userAgent}</p>
                      {request.utmParams && Object.keys(request.utmParams).length > 0 && (
                        <div>
                          <p className="font-medium mt-2">UTM Parameters:</p>
                          {Object.entries(request.utmParams).map(([key, value]) => (
                            <p key={key} className="pl-2">
                              {key}: {value}
                            </p>
                          ))}
                        </div>
                      )}
                      {request.scheduledAt && (
                        <p>Scheduled At: {new Date(request.scheduledAt).toLocaleString()}</p>
                      )}
                      {request.completedAt && (
                        <p>Completed At: {new Date(request.completedAt).toLocaleString()}</p>
                      )}
                      {request.cancelledAt && (
                        <p>Cancelled At: {new Date(request.cancelledAt).toLocaleString()}</p>
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

// Helper Components

function StatusBadge({ status }: { status: DemoRequestStatus }) {
  const config = {
    pending: {
      label: 'Pending',
      icon: <ClockIcon className="w-4 h-4" />,
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    },
    scheduled: {
      label: 'Scheduled',
      icon: <CalendarDaysIcon className="w-4 h-4" />,
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    completed: {
      label: 'Completed',
      icon: <CheckCircleIcon className="w-4 h-4" />,
      className: 'bg-green-100 text-green-700 border-green-200'
    },
    cancelled: {
      label: 'Cancelled',
      icon: <XCircleIcon className="w-4 h-4" />,
      className: 'bg-gray-100 text-gray-700 border-gray-200'
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

function FilterButton({
  label,
  active,
  onClick,
  color = 'blue'
}: {
  label: string
  active: boolean
  onClick: () => void
  color?: 'blue' | 'yellow' | 'green' | 'gray'
}) {
  const colorClasses = {
    blue: active ? 'bg-blue-600 text-white' : 'bg-secondary text-foreground hover:bg-secondary-dark',
    yellow: active ? 'bg-yellow-600 text-white' : 'bg-secondary text-foreground hover:bg-secondary-dark',
    green: active ? 'bg-green-600 text-white' : 'bg-secondary text-foreground hover:bg-secondary-dark',
    gray: active ? 'bg-gray-600 text-white' : 'bg-secondary text-foreground hover:bg-secondary-dark',
  }

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${colorClasses[color]}`}
    >
      {label}
    </button>
  )
}
