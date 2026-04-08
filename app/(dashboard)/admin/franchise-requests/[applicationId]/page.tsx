'use client'

/**
 * Franchise Application Detail / Review
 *
 * Loads one application by id, displays all fields, and provides three
 * actions:
 *  - Mark Reviewed (PATCH status='reviewed')
 *  - Reject (PATCH status='rejected', with optional notes)
 *  - Approve & Create Tenant (POST /approve — calls createTenant)
 *
 * After approval, redirects to the new tenant edit page so admin can
 * click Send Payment Link.
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getAdminAuthToken } from '@/lib/admin/api'
import { getCSRFToken } from '@/lib/csrf'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Application {
  id: string
  businessName: string
  legalName?: string
  entityType?: string
  ein?: string
  stateOfIncorporation?: string
  contactName: string
  contactTitle?: string
  email: string
  phone?: string
  website?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  practiceType: string
  licenseNumber?: string
  npiNumber?: string
  staffCount?: string
  familyCount?: number
  plan: string
  billingTerm?: string
  subdomain: string
  expectedLaunchDate?: string
  leadSource?: string
  notes?: string
  emergencyContact?: { name?: string; email?: string; phone?: string }
  status: string
  createdAt: string
  reviewedAt?: string
  reviewedBy?: string
  adminNotes?: string
  tenantId?: string
}

function Field({ label, value }: { label: string; value: any }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm text-foreground">{String(value)}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

export default function FranchiseRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params?.applicationId as string
  const { isAdmin } = useAdminAuth()
  const [app, setApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')

  useEffect(() => {
    if (isAdmin && applicationId) loadApplication()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, applicationId])

  const loadApplication = async () => {
    setLoading(true)
    try {
      const token = await getAdminAuthToken()
      const res = await fetch(`/api/admin/franchise-requests/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setApp(data.application)
      } else {
        toast.error('Failed to load application')
      }
    } catch {
      toast.error('Failed to load application')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: 'reviewed' | 'rejected', notes?: string) => {
    setActing(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const res = await fetch(`/api/admin/franchise-requests/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ status, notes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Update failed')
      }
      toast.success(status === 'rejected' ? 'Application rejected' : 'Marked as reviewed')
      setShowReject(false)
      await loadApplication()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setActing(false)
    }
  }

  const approve = async () => {
    if (!confirm(`Approve "${app?.businessName}" and create a tenant?\n\nThis creates a tenant doc with status 'pending_payment'. You'll then click "Send Payment Link" on the tenant page.`)) return
    setActing(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const res = await fetch(`/api/admin/franchise-requests/${applicationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Approve failed')
      toast.success(`Tenant created: ${data.tenant?.slug}`)
      router.push(`/admin/tenants/${data.tenantId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approve failed')
      setActing(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-error-light border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading application…</div>
  }
  if (!app) {
    return <div className="p-8 text-center text-muted-foreground">Application not found.</div>
  }

  const isFinal = app.status === 'approved' || app.status === 'rejected'

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <a
        href="/admin/franchise-requests"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to applications
      </a>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{app.businessName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submitted {new Date(app.createdAt).toLocaleString()} · {app.contactName} ({app.email})
          </p>
        </div>
        <span
          className={`px-3 py-1 text-sm font-medium rounded-full ${
            app.status === 'approved' || app.status === 'paid' || app.status === 'active'
              ? 'bg-green-100 text-green-700'
              : app.status === 'rejected'
              ? 'bg-red-100 text-red-700'
              : app.status === 'reviewed'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {app.status}
        </span>
      </div>

      {app.tenantId && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-green-900 dark:text-green-100">
              This application has been converted to a tenant.
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 mt-1">
              Reviewed by {app.reviewedBy} at {app.reviewedAt && new Date(app.reviewedAt).toLocaleString()}
            </div>
          </div>
          <a
            href={`/admin/tenants/${app.tenantId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
          >
            Go to Tenant
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      )}

      <Section title="Business">
        <Field label="Business Name (DBA)" value={app.businessName} />
        <Field label="Legal Name" value={app.legalName} />
        <Field label="Entity Type" value={app.entityType} />
        <Field label="EIN" value={app.ein} />
        <Field label="State of Incorporation" value={app.stateOfIncorporation} />
        <Field label="Website" value={app.website} />
      </Section>

      <Section title="Primary Contact">
        <Field label="Name" value={app.contactName} />
        <Field label="Title" value={app.contactTitle} />
        <Field label="Email" value={app.email} />
        <Field label="Phone" value={app.phone} />
      </Section>

      <Section title="Business Address">
        <Field label="Street" value={app.address} />
        <Field label="City" value={app.city} />
        <Field label="State" value={app.state} />
        <Field label="ZIP" value={app.zip} />
      </Section>

      <Section title="Practice">
        <Field label="Practice Type" value={app.practiceType} />
        <Field label="License #" value={app.licenseNumber} />
        <Field label="NPI #" value={app.npiNumber} />
        <Field label="Staff Count" value={app.staffCount} />
        <Field label="Families Managed" value={app.familyCount} />
      </Section>

      {app.emergencyContact && (app.emergencyContact.name || app.emergencyContact.email || app.emergencyContact.phone) && (
        <Section title="Emergency Contact">
          <Field label="Name" value={app.emergencyContact.name} />
          <Field label="Email" value={app.emergencyContact.email} />
          <Field label="Phone" value={app.emergencyContact.phone} />
        </Section>
      )}

      <Section title="Plan & Subdomain">
        <Field label="Plan" value={app.plan} />
        <Field label="Billing Term" value={app.billingTerm} />
        <Field label="Subdomain" value={`${app.subdomain}.wellnessprojectionlab.com`} />
        <Field label="Expected Launch" value={app.expectedLaunchDate} />
      </Section>

      {(app.leadSource || app.notes || app.adminNotes) && (
        <Section title="Additional">
          <Field label="Lead Source" value={app.leadSource} />
          <Field label="Applicant Notes" value={app.notes} />
          <Field label="Admin Notes" value={app.adminNotes} />
        </Section>
      )}

      {/* Action bar */}
      {!isFinal && (
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Actions</h2>

          {!showReject ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={approve}
                disabled={acting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Approve & Create Tenant
              </button>
              {app.status === 'pending' && (
                <button
                  onClick={() => updateStatus('reviewed')}
                  disabled={acting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
                >
                  <EyeIcon className="h-5 w-5" />
                  Mark as Reviewed
                </button>
              )}
              <button
                onClick={() => setShowReject(true)}
                disabled={acting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                <XCircleIcon className="h-5 w-5" />
                Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Reason for rejection (optional, internal note):
              </label>
              <textarea
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="e.g. 'Subdomain conflicts with reserved word', 'Practice type out of scope'"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus('rejected', rejectNotes)}
                  disabled={acting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => setShowReject(false)}
                  disabled={acting}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 disabled:opacity-50 text-foreground rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
