'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getAdminAuthToken } from '@/lib/admin/api'
import { getCSRFToken } from '@/lib/csrf'
import { ReferralStatsCard } from '@/components/admin/ReferralStatsCard'
import { SearchInput } from '@/components/ui/SearchInput'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { ReferralSettings, ReferralStats, AffiliateRow, ReferralConversion } from '@/types/referral'

export default function AdminReferralsPage() {
  const { isAdmin } = useAdminAuth()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<ReferralSettings>({ commissionPercent: 10, discountPercent: 7, enabled: true })
  const [stats, setStats] = useState<ReferralStats>({ totalEarningsCents: 0, totalClicks: 0, totalConversions: 0, monthly: [] })
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [conversions, setConversions] = useState<ReferralConversion[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Editable settings
  const [editCommission, setEditCommission] = useState(10)
  const [editDiscount, setEditDiscount] = useState(7)
  const [editEnabled, setEditEnabled] = useState(true)

  useEffect(() => {
    if (isAdmin) fetchData()
  }, [isAdmin])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = await getAdminAuthToken()
      const res = await fetch('/api/admin/referrals', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSettings(data.settings)
      setStats(data.stats)
      setAffiliates(data.affiliates || [])
      setConversions(data.conversions || [])
      setEditCommission(data.settings.commissionPercent)
      setEditDiscount(data.settings.discountPercent)
      setEditEnabled(data.settings.enabled)
    } catch {
      toast.error('Failed to load referral data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const token = await getAdminAuthToken()
      const res = await fetch('/api/admin/referrals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': getCSRFToken(),
        },
        body: JSON.stringify({
          commissionPercent: editCommission,
          discountPercent: editDiscount,
          enabled: editEnabled,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      setSettings(data.settings)
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async (conversion: ReferralConversion) => {
    try {
      const token = await getAdminAuthToken()
      await fetch(`/api/admin/referrals/${conversion.referrerUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': getCSRFToken(),
        },
        body: JSON.stringify({ conversionId: conversion.id, action: 'mark_paid' }),
      })
      toast.success('Marked as paid')
      fetchData()
    } catch {
      toast.error('Failed to update')
    }
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentMonthStats = stats.monthly.find(m => m.month === currentMonth)

  const filteredAffiliates = affiliates.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.email.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q)
  })

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-error-dark dark:text-red-300">Admin access required.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading referral data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Admin
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Affiliate Program Management</h1>
      </div>

      {/* Program Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Program Settings</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">Commission %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={editCommission}
              onChange={(e) => setEditCommission(Number(e.target.value))}
              className="w-24 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">New User Discount %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={editDiscount}
              onChange={(e) => setEditDiscount(Number(e.target.value))}
              className="w-24 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">Status</label>
            <button
              onClick={() => setEditEnabled(!editEnabled)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                editEnabled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}
            >
              {editEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">All-time Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ReferralStatsCard
            title="Earnings"
            value={`$${(stats.totalEarningsCents / 100).toFixed(2)}`}
            subtitle={currentMonthStats ? `${currentMonth}: $${(currentMonthStats.earningsCents / 100).toFixed(2)}` : `${currentMonth}: $0`}
          />
          <ReferralStatsCard
            title="Plans Purchased"
            value={String(stats.totalConversions)}
            subtitle={currentMonthStats ? `${currentMonth}: ${currentMonthStats.conversions}` : `${currentMonth}: 0`}
          />
          <ReferralStatsCard
            title="Clicks"
            value={String(stats.totalClicks)}
            subtitle={currentMonthStats ? `${currentMonth}: ${currentMonthStats.clicks}` : `${currentMonth}: 0`}
          />
        </div>
      </div>

      {/* Affiliates Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Affiliates</h2>
          <div className="w-64">
            <SearchInput value={search} onChange={setSearch} placeholder="Search affiliates..." />
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Clicks</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Signups</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {filteredAffiliates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      {search ? 'No affiliates match your search' : 'No affiliates yet'}
                    </td>
                  </tr>
                ) : (
                  filteredAffiliates.map(affiliate => (
                    <tr key={affiliate.userId} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{affiliate.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{affiliate.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{affiliate.code}</td>
                      <td className="px-4 py-3 text-right text-foreground">{affiliate.totalClicks}</td>
                      <td className="px-4 py-3 text-right text-foreground">{affiliate.totalConversions}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        ${(affiliate.totalEarningsCents / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Conversions */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">Recent Conversions</h2>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Referred User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Commission</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {conversions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No conversions yet
                    </td>
                  </tr>
                ) : (
                  conversions.map(conversion => (
                    <tr key={conversion.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(conversion.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {conversion.referredEmail || conversion.referredUserId.slice(0, 8) + '...'}
                      </td>
                      <td className="px-4 py-3 text-foreground capitalize">{conversion.plan || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        ${(conversion.earningsCents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          conversion.status === 'paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : conversion.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {conversion.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {conversion.status === 'confirmed' && (
                          <button
                            onClick={() => handleMarkPaid(conversion)}
                            className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
