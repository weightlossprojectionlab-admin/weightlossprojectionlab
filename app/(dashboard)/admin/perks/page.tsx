'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getPermissions } from '@/lib/admin/permissions'
import { logger } from '@/lib/logger'
import {
  GiftIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  TagIcon,
} from '@heroicons/react/24/outline'

interface Perk {
  perkId: string
  partnerId: string
  partnerName: string
  title: string
  description: string
  value: string
  xpRequired: number
  tier: 'Bronze' | 'Silver' | 'Champion'
  redemptionType: 'code' | 'link' | 'webhook'
  redemptionUrl?: string
  discountCode?: string
  maxRedemptionsPerUser: number
  totalAvailable: number
  remainingCount: number
  enabled: boolean
  category: string
  expiresAt?: Date
  createdAt: Date
}

export default function PerksAdminPage() {
  const { isAdmin, role } = useAdminAuth()
  const permissions = getPermissions(role)
  const [perks, setPerks] = useState<Perk[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPerk, setEditingPerk] = useState<Perk | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    partnerName: '',
    title: '',
    description: '',
    value: '',
    xpRequired: 0,
    tier: 'Bronze' as 'Bronze' | 'Silver' | 'Champion',
    redemptionType: 'code' as 'code' | 'link' | 'webhook',
    redemptionUrl: '',
    discountCode: '',
    maxRedemptionsPerUser: 1,
    totalAvailable: 100,
    enabled: true,
    category: 'Fitness',
  })

  useEffect(() => {
    if (isAdmin) {
      loadPerks()
    }
  }, [isAdmin])

  const loadPerks = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/perks')
      if (!response.ok) throw new Error('Failed to load perks')
      const data = await response.json()
      setPerks(data.perks || [])
    } catch (err) {
      logger.error('Error loading perks:', err as Error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (perk?: Perk) => {
    if (perk) {
      setEditingPerk(perk)
      setFormData({
        partnerName: perk.partnerName,
        title: perk.title,
        description: perk.description,
        value: perk.value,
        xpRequired: perk.xpRequired,
        tier: perk.tier,
        redemptionType: perk.redemptionType,
        redemptionUrl: perk.redemptionUrl || '',
        discountCode: perk.discountCode || '',
        maxRedemptionsPerUser: perk.maxRedemptionsPerUser,
        totalAvailable: perk.totalAvailable,
        enabled: perk.enabled,
        category: perk.category,
      })
    } else {
      setEditingPerk(null)
      setFormData({
        partnerName: '',
        title: '',
        description: '',
        value: '',
        xpRequired: 0,
        tier: 'Bronze',
        redemptionType: 'code',
        redemptionUrl: '',
        discountCode: '',
        maxRedemptionsPerUser: 1,
        totalAvailable: 100,
        enabled: true,
        category: 'Fitness',
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.partnerName || !formData.title || !formData.value) {
      alert('Please fill in all required fields')
      return
    }

    setActionLoading(true)
    try {
      const method = editingPerk ? 'PUT' : 'POST'
      const url = editingPerk ? `/api/admin/perks?id=${editingPerk.perkId}` : '/api/admin/perks'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to save perk')

      alert(editingPerk ? 'Perk updated successfully' : 'Perk created successfully')
      setShowModal(false)
      await loadPerks()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save perk')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (perkId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/perks?id=${perkId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete perk')

      alert('Perk deleted successfully')
      await loadPerks()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete perk')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleEnabled = async (perkId: string, enabled: boolean) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/perks?id=${perkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      })

      if (!response.ok) throw new Error('Failed to toggle perk')

      await loadPerks()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle perk')
    } finally {
      setActionLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-error-dark dark:text-red-300">
            You do not have permission to access perk management.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Perk Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage sponsor perks and partner benefits
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
          >
            <PlusCircleIcon className="h-5 w-5" />
            Create Perk
          </button>
        </div>
      </div>

      {/* Perks List */}
      <div className="bg-card rounded-lg shadow">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : perks.length === 0 ? (
          <div className="text-center py-12">
            <GiftIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground dark:text-muted-foreground">No perks created yet</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 text-primary hover:underline"
            >
              Create your first perk
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {perks.map((perk) => (
              <div key={perk.perkId} className="p-6 hover:bg-background">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <GiftIcon className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {perk.title}
                        </h3>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                          {perk.partnerName} • {perk.category}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {perk.description}
                    </p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-light dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                        {perk.tier} • {perk.xpRequired} XP
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                        {perk.value}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-secondary-dark">
                        {perk.remainingCount} / {perk.totalAvailable} remaining
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground dark:text-gray-200">
                        {perk.redemptionType}
                      </span>
                      {!perk.enabled && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleEnabled(perk.perkId, perk.enabled)}
                      disabled={actionLoading}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        perk.enabled
                          ? 'bg-yellow-100 text-warning-dark'
                          : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                      }`}
                    >
                      {perk.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleOpenModal(perk)}
                      disabled={actionLoading}
                      className="p-2 bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30"
                      title="Edit perk"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(perk.perkId, perk.title)}
                      disabled={actionLoading}
                      className="p-2 bg-red-100 dark:bg-red-900/20 text-error-dark dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30"
                      title="Delete perk"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">
                  {editingPerk ? 'Edit Perk' : 'Create New Perk'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Partner Name *
                    </label>
                    <input
                      type="text"
                      value={formData.partnerName}
                      onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
                      className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option>Fitness</option>
                      <option>Nutrition</option>
                      <option>Wellness</option>
                      <option>Lifestyle</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Value * (e.g., "$10 off")
                    </label>
                    <input
                      type="text"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tier
                    </label>
                    <select
                      value={formData.tier}
                      onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                      className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Bronze">Bronze</option>
                      <option value="Silver">Silver</option>
                      <option value="Champion">Champion</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    XP Required
                  </label>
                  <input
                    type="number"
                    value={formData.xpRequired}
                    onChange={(e) => setFormData({ ...formData, xpRequired: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Redemption Type
                  </label>
                  <select
                    value={formData.redemptionType}
                    onChange={(e) => setFormData({ ...formData, redemptionType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="code">Discount Code</option>
                    <option value="link">Redemption Link</option>
                    <option value="webhook">Webhook Verification</option>
                  </select>
                </div>

                {formData.redemptionType === 'code' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Discount Code
                    </label>
                    <input
                      type="text"
                      value={formData.discountCode}
                      onChange={(e) => setFormData({ ...formData, discountCode: e.target.value })}
                      className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {formData.redemptionType === 'link' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Redemption URL
                    </label>
                    <input
                      type="url"
                      value={formData.redemptionUrl}
                      onChange={(e) => setFormData({ ...formData, redemptionUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Max Redemptions Per User
                    </label>
                    <input
                      type="number"
                      value={formData.maxRedemptionsPerUser}
                      onChange={(e) => setFormData({ ...formData, maxRedemptionsPerUser: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Total Available
                    </label>
                    <input
                      type="number"
                      value={formData.totalAvailable}
                      onChange={(e) => setFormData({ ...formData, totalAvailable: parseInt(e.target.value) || 100 })}
                      className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="enabled" className="text-sm text-foreground">
                    Enabled (visible to users)
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <button
                    onClick={handleSave}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
                  >
                    {actionLoading ? 'Saving...' : editingPerk ? 'Update Perk' : 'Create Perk'}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-6">
        <h3 className="text-lg font-semibold text-accent-dark mb-2">Perk Management Guidelines</h3>
        <ul className="space-y-2 text-sm text-accent-dark">
          <li>• Bronze tier: 0 XP, Silver tier: 5000 XP, Champion tier: 10000 XP</li>
          <li>• Redemption codes are shown to users upon redemption</li>
          <li>• Redemption links redirect users to partner sites</li>
          <li>• Webhooks verify redemptions with partner APIs</li>
          <li>• Monitor remaining inventory to avoid overselling</li>
        </ul>
      </div>
    </div>
  )
}
