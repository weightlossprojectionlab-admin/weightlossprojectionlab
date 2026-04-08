'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getAdminAuthToken } from '@/lib/admin/api'
import { getCSRFToken } from '@/lib/csrf'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Tenant } from '@/types/tenant'

export default function EditTenantPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.tenantId as string
  const { isAdmin } = useAdminAuth()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState<string>('active')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [tagline, setTagline] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [accentColor, setAccentColor] = useState('')
  const [maxSeats, setMaxSeats] = useState(5)
  const [plan, setPlan] = useState('starter')

  useEffect(() => {
    if (tenantId) loadTenant()
  }, [tenantId])

  const loadTenant = async () => {
    try {
      const token = await getAdminAuthToken()
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const t = data.tenant as Tenant
      setTenant(t)
      setUsers(data.users || [])

      // Populate form
      setName(t.name)
      setSlug(t.slug)
      setStatus(t.status)
      setAdminName(t.contact?.adminName || '')
      setAdminEmail(t.contact?.adminEmail || '')
      setPhone(t.contact?.phone || '')
      setCompanyName(t.branding?.companyName || '')
      setTagline(t.branding?.tagline || '')
      setSupportEmail(t.branding?.supportEmail || '')
      setPrimaryColor(t.branding?.primaryColor || '')
      setSecondaryColor(t.branding?.secondaryColor || '')
      setAccentColor(t.branding?.accentColor || '')
      setMaxSeats(t.billing?.maxSeats || 5)
      setPlan(t.billing?.plan || 'starter')
    } catch {
      toast.error('Failed to load franchise')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          name,
          slug,
          status,
          contact: { adminName, adminEmail, phone },
          branding: {
            ...tenant?.branding,
            companyName: companyName || name,
            tagline,
            supportEmail: supportEmail || adminEmail,
            primaryColor,
            secondaryColor,
            accentColor,
          },
          billing: {
            ...tenant?.billing,
            plan,
            maxSeats,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      toast.success('Franchise updated')
      loadTenant()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-600">Access Denied</div>
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading franchise...</div>
  }

  if (!tenant) {
    return <div className="p-8 text-center text-muted-foreground">Franchise not found</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeftIcon className="h-5 w-5" /> Back to Franchises
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{tenant.name}</h1>
          <p className="text-muted-foreground">{tenant.slug}.wellnessprojectionlab.com</p>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
          status === 'active' ? 'bg-green-100 text-green-700' :
          status === 'pending_payment' ? 'bg-yellow-100 text-yellow-700' :
          status === 'suspended' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {status}
        </span>
      </div>

      <div className="space-y-6">
        {/* Business Info */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Business Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Business Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subdomain</label>
              <div className="flex items-center gap-1">
                <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="flex-1 px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
                <span className="text-xs text-muted-foreground">.wellnessprojectionlab.com</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg">
                <option value="pending_payment">Pending Payment</option>
                <option value="paid">Paid</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended (Non-Payment)</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
            </div>
          </div>
        </div>

        {/* Admin Contact */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Franchise Admin</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Admin Name</label>
              <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Admin Email</label>
              <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Branding</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Company Name (displayed)</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tagline</label>
              <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Your health, our priority" className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Support Email</label>
              <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Primary Color (HSL)</label>
              <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="262 83% 58%" className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Secondary Color (HSL)</label>
              <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} placeholder="217 91% 60%" className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Accent Color (HSL)</label>
              <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)} placeholder="239 84% 67%" className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
            </div>
          </div>
        </div>

        {/* Billing */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Billing & Plan</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Plan</label>
              <select value={plan} onChange={e => setPlan(e.target.value)} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg">
                <option value="starter">Starter ($750/mo)</option>
                <option value="professional">Professional ($1,250/mo)</option>
                <option value="enterprise">Enterprise ($2,000/mo)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Max Seats</label>
              <input type="number" value={maxSeats} onChange={e => setMaxSeats(parseInt(e.target.value) || 5)} min={1} className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Current Seats</label>
              <div className="px-3 py-2 bg-muted rounded-lg text-foreground">{tenant.billing?.currentSeats || 0}</div>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Users ({users.length})</h2>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users registered for this franchise yet.</p>
          ) : (
            <div className="space-y-2">
              {users.map((user: any) => (
                <div key={user.uid} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <span className="font-medium text-foreground">{user.name || user.email}</span>
                    <span className="text-xs text-muted-foreground ml-2">{user.email}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    user.tenantRole === 'franchise_admin' ? 'bg-purple-100 text-purple-700' :
                    user.tenantRole === 'staff' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {user.tenantRole || 'user'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Link (for pending_payment tenants) */}
        {(status === 'pending_payment' || status === 'paid') && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-foreground mb-2">Payment</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {status === 'pending_payment' ? 'Setup fee has not been paid yet.' : 'Setup fee has been paid. Ready to activate.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const token = await getAdminAuthToken()
                    const csrfToken = getCSRFToken()
                    const res = await fetch(`/api/admin/tenants/${tenantId}/payment-link`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}`, 'X-CSRF-Token': csrfToken },
                    })
                    if (!res.ok) throw new Error('Failed')
                    const data = await res.json()
                    toast.success(`Payment link sent to ${adminEmail}`)
                  } catch {
                    toast.error('Failed to send payment link')
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
              >
                {status === 'pending_payment' ? 'Send Payment Link' : 'Resend Payment Link'}
              </button>
              {status === 'paid' && (
                <button
                  onClick={async () => {
                    const updated = { ...tenant!, status: 'active' as const }
                    setStatus('active')
                    await handleSave()
                    toast.success('Franchise activated!')
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                >
                  Activate Franchise
                </button>
              )}
            </div>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/tenants" className="px-5 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80">
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-lg font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
