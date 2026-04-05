'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getAdminAuthToken } from '@/lib/admin/api'
import { getCSRFToken } from '@/lib/csrf'
import { BuildingOffice2Icon, PlusIcon, UserGroupIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { Tenant } from '@/types/tenant'

export default function AdminTenantsPage() {
  const { isAdmin } = useAdminAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    loadTenants()
  }, [])

  const loadTenants = async () => {
    try {
      const token = await getAdminAuthToken()
      const res = await fetch('/api/admin/tenants', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTenants(data.tenants || [])
      }
    } catch {
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-error-light border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-error-dark">You do not have permission to manage franchises.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Franchise Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage franchise partners</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          New Franchise
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <BuildingOffice2Icon className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold text-foreground">{tenants.length}</div>
              <div className="text-sm text-muted-foreground">Total Franchises</div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <UserGroupIcon className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-foreground">
                {tenants.reduce((sum, t) => sum + (t.billing?.currentSeats || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Seats Used</div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="h-8 w-8 text-amber-600" />
            <div>
              <div className="text-2xl font-bold text-foreground">
                ${(tenants.reduce((sum, t) => {
                  const base = t.billing?.monthlyBaseRate || 0
                  const seats = (t.billing?.currentSeats || 0) * (t.billing?.perSeatRate || 0)
                  return sum + base + seats
                }, 0) / 100).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Monthly Revenue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading franchises...</div>
      ) : tenants.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <BuildingOffice2Icon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Franchises Yet</h2>
          <p className="text-muted-foreground mb-4">Create your first franchise partner to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium"
          >
            Create First Franchise
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map(tenant => (
            <div key={tenant.id} className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-foreground text-lg">{tenant.name}</h3>
                  <p className="text-sm text-muted-foreground">{tenant.slug}.wellnessprojectionlab.com</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  tenant.status === 'active' ? 'bg-green-100 text-green-700' :
                  tenant.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                  tenant.status === 'suspended' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {tenant.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admin</span>
                  <span className="text-foreground">{tenant.contact?.adminName || tenant.contact?.adminEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seats</span>
                  <span className="text-foreground">{tenant.billing?.currentSeats || 0} / {tenant.billing?.maxSeats || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly</span>
                  <span className="text-foreground font-medium">
                    ${((tenant.billing?.monthlyBaseRate || 0) / 100 + (tenant.billing?.currentSeats || 0) * (tenant.billing?.perSeatRate || 0) / 100).toLocaleString()}/mo
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">{new Date(tenant.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex gap-2">
                <a
                  href={`https://${tenant.slug}.wellnessprojectionlab.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20"
                >
                  Visit
                </a>
                <button className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Franchise Modal */}
      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={(tenant) => {
            setTenants(prev => [tenant, ...prev])
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}

function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: (tenant: Tenant) => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value)
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim() || !adminEmail.trim()) {
      toast.error('Name, subdomain, and admin email are required')
      return
    }

    setSaving(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ name, slug, adminEmail, adminName, phone }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create franchise')

      toast.success(`Franchise "${name}" created!`)
      onCreated(data.tenant)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create franchise')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-foreground mb-6">Create New Franchise</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Business Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Gentle Touch Care"
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Subdomain *</label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="gentletouch"
                className="flex-1 px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">.wellnessprojectionlab.com</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Admin Name</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Maria Rodriguez"
                className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Admin Email *</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="maria@gentletouch.com"
                className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="bg-muted rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Pricing Summary</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between"><span>Setup fee</span><span>$3,000</span></div>
              <div className="flex justify-between"><span>Monthly base</span><span>$750/mo</span></div>
              <div className="flex justify-between"><span>Per seat</span><span>$35/user/mo</span></div>
              <div className="flex justify-between"><span>Max seats (starter)</span><span>5</span></div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim() || !slug.trim() || !adminEmail.trim()}
            className="flex-1 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-lg font-medium"
          >
            {saving ? 'Creating...' : 'Create Franchise'}
          </button>
        </div>
      </div>
    </div>
  )
}
