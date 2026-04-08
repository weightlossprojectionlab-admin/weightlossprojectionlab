'use client'

/**
 * Franchise Requests — Admin Review Queue
 *
 * Lists all docs from the franchise_applications collection. Visiting prospects
 * who submitted /franchise/apply land here as 'pending'. Admin can click into
 * each one to view details, mark reviewed/rejected, or approve (which converts
 * the application into a tenant doc).
 */

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getAdminAuthToken } from '@/lib/admin/api'
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface FranchiseApplication {
  id: string
  businessName: string
  contactName: string
  email: string
  phone?: string
  practiceType: string
  staffCount?: string
  familyCount?: number
  plan: string
  subdomain: string
  status: 'pending' | 'reviewed' | 'approved' | 'rejected' | 'paid' | 'active'
  createdAt: string
  reviewedAt?: string
  reviewedBy?: string
  tenantId?: string
  leadSource?: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-emerald-100 text-emerald-700',
  active: 'bg-emerald-100 text-emerald-700',
}

export default function FranchiseRequestsPage() {
  const { isAdmin } = useAdminAuth()
  const [applications, setApplications] = useState<FranchiseApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (isAdmin) loadApplications()
  }, [isAdmin])

  const loadApplications = async () => {
    setLoading(true)
    try {
      const token = await getAdminAuthToken()
      const res = await fetch('/api/admin/franchise-requests', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setApplications(data.applications || [])
      } else {
        toast.error('Failed to load applications')
      }
    } catch {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-error-light border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-error-dark">You do not have permission to view franchise applications.</p>
        </div>
      </div>
    )
  }

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    reviewed: applications.filter(a => a.status === 'reviewed').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Franchise Applications</h1>
          <p className="text-muted-foreground mt-1">
            Review prospects from the public /franchise/apply form
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <ClipboardDocumentListIcon className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold text-foreground">{counts.all}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold text-foreground">{counts.pending}</div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-foreground">{counts.approved}</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <XCircleIcon className="h-8 w-8 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-foreground">{counts.rejected}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 border-b border-border">
        {(['all', 'pending', 'reviewed', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === s
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {' '}
            <span className="text-xs">({counts[s as keyof typeof counts] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Applications list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading applications…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <ClipboardDocumentListIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            {filter === 'all' ? 'No Applications Yet' : `No ${filter} applications`}
          </h2>
          <p className="text-muted-foreground">
            {filter === 'all'
              ? 'When prospects submit the /franchise/apply form, they will appear here.'
              : `Switch the filter to see other applications.`}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Business</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Contact</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Plan</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Subdomain</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Submitted</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(app => (
                <tr key={app.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{app.businessName}</div>
                    <div className="text-xs text-muted-foreground">{app.practiceType}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-foreground">{app.contactName}</div>
                    <div className="text-xs text-muted-foreground">{app.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm capitalize text-foreground">{app.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      {app.subdomain}.wellnessprojectionlab.com
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        STATUS_STYLES[app.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/admin/franchise-requests/${app.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20"
                    >
                      <EyeIcon className="h-4 w-4" />
                      Review
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
