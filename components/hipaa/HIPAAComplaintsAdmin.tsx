'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, where, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { HIPAAComplaint, ComplaintStatus } from '@/schemas/firestore/hipaa-complaints'
import { AlertCircle, CheckCircle2, Clock, Eye, FileText, Filter, Search, XCircle } from 'lucide-react'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

type FilterStatus = 'all' | ComplaintStatus

export default function HIPAAComplaintsAdmin() {
  const [complaints, setComplaints] = useState<HIPAAComplaint[]>([])
  const [filteredComplaints, setFilteredComplaints] = useState<HIPAAComplaint[]>([])
  const [selectedComplaint, setSelectedComplaint] = useState<HIPAAComplaint | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Real-time listener for complaints
  useEffect(() => {
    logger.info('[HIPAAAdmin] Setting up complaints listener')

    const complaintsQuery = query(
      collection(db, 'hipaaComplaints'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      complaintsQuery,
      (snapshot) => {
        const complaintsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as HIPAAComplaint[]

        setComplaints(complaintsData)
        setIsLoading(false)
        logger.info('[HIPAAAdmin] Complaints loaded', { count: complaintsData.length })
      },
      (error) => {
        logger.error('[HIPAAAdmin] Error loading complaints', error as Error)
        toast.error('Failed to load complaints')
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = complaints

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((c) => c.status === filterStatus)
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.description.toLowerCase().includes(term)
      )
    }

    setFilteredComplaints(filtered)
  }, [complaints, filterStatus, searchTerm])

  const handleUpdateStatus = async (complaintId: string, newStatus: ComplaintStatus) => {
    try {
      const complaintRef = doc(db, 'hipaaComplaints', complaintId)
      await updateDoc(complaintRef, {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'resolved' || newStatus === 'closed' ? { resolvedAt: new Date() } : {}),
      })

      toast.success(`Status updated to ${newStatus}`)
      logger.info('[HIPAAAdmin] Status updated', { complaintId, newStatus })
    } catch (error) {
      logger.error('[HIPAAAdmin] Error updating status', error as Error)
      toast.error('Failed to update status')
    }
  }

  const handleUpdatePriority = async (
    complaintId: string,
    newPriority: 'low' | 'medium' | 'high' | 'critical'
  ) => {
    try {
      const complaintRef = doc(db, 'hipaaComplaints', complaintId)
      await updateDoc(complaintRef, {
        priority: newPriority,
        updatedAt: new Date(),
      })

      toast.success(`Priority updated to ${newPriority}`)
      logger.info('[HIPAAAdmin] Priority updated', { complaintId, newPriority })
    } catch (error) {
      logger.error('[HIPAAAdmin] Error updating priority', error as Error)
      toast.error('Failed to update priority')
    }
  }

  const getStatusIcon = (status: ComplaintStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'reviewing':
        return <Eye className="w-4 h-4 text-blue-600" />
      case 'investigating':
        return <AlertCircle className="w-4 h-4 text-orange-600" />
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
      case 'reviewing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
      case 'investigating':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
    }
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading complaints...</p>
        </div>
      </div>
    )
  }

  if (selectedComplaint) {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => setSelectedComplaint(null)}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Complaints
        </button>

        {/* Complaint Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Case {selectedComplaint.caseNumber}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Filed on {formatDate(selectedComplaint.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(selectedComplaint.status)}`}
              >
                {getStatusIcon(selectedComplaint.status)}
                {selectedComplaint.status}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedComplaint.priority)}`}
              >
                {selectedComplaint.priority}
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Complainant Information
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Name:</span>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedComplaint.name}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Email:</span>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedComplaint.email}</p>
                </div>
                {selectedComplaint.phone && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Phone:</span>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedComplaint.phone}</p>
                  </div>
                )}
                {selectedComplaint.userId && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">User ID:</span>
                    <p className="text-sm text-gray-900 dark:text-white font-mono">
                      {selectedComplaint.userId}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Complaint Details
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Type:</span>
                  <p className="text-sm text-gray-900 dark:text-white capitalize">
                    {selectedComplaint.type.replace(/_/g, ' ')}
                  </p>
                </div>
                {selectedComplaint.incidentDate && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Incident Date:</span>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedComplaint.incidentDate}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {selectedComplaint.description}
              </p>
            </div>
          </div>

          {selectedComplaint.affectedData && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Affected Health Information
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedComplaint.affectedData}
                </p>
              </div>
            </div>
          )}

          {/* Action Section */}
          <div className="grid md:grid-cols-2 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Update Status
              </label>
              <select
                value={selectedComplaint.status}
                onChange={(e) => handleUpdateStatus(selectedComplaint.id, e.target.value as ComplaintStatus)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Update Priority
              </label>
              <select
                value={selectedComplaint.priority}
                onChange={(e) =>
                  handleUpdatePriority(
                    selectedComplaint.id,
                    e.target.value as 'low' | 'medium' | 'high' | 'critical'
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['pending', 'reviewing', 'investigating', 'resolved', 'closed'] as ComplaintStatus[]).map((status) => {
          const count = complaints.filter((c) => c.status === status).length
          return (
            <div
              key={status}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(status)}
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                  {status}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by case number, name, email, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredComplaints.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No complaints found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Case Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Filed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredComplaints.map((complaint) => (
                  <tr
                    key={complaint.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                        {complaint.caseNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900 dark:text-white">{complaint.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {complaint.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}
                      >
                        {getStatusIcon(complaint.status)}
                        {complaint.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}
                      >
                        {complaint.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(complaint.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedComplaint(complaint)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
