'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/admin/permissions'
import { logger } from '@/lib/logger'
import {
  UserGroupIcon,
  ShieldCheckIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface AdminUser {
  uid: string
  email: string
  displayName?: string
  role: 'admin' | 'moderator' | 'support'
  grantedAt?: Date
  grantedBy?: string
}

interface AuditLog {
  logId: string
  adminEmail: string
  action: string
  targetType: string
  targetId: string
  timestamp: Date
  reason?: string
}

export default function AdminSettingsPage() {
  const { isAdmin, role, isSuperAdmin } = useAdminAuth()
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showGrantRoleModal, setShowGrantRoleModal] = useState(false)
  const [grantRoleEmail, setGrantRoleEmail] = useState('')
  const [grantRoleType, setGrantRoleType] = useState<'admin' | 'moderator' | 'support'>('moderator')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      loadAdminUsers()
      loadAuditLogs()
    }
  }, [isAdmin])

  const loadAdminUsers = async () => {
    try {
      const response = await fetch('/api/admin/settings/admin-users')
      if (!response.ok) throw new Error('Failed to load admin users')
      const data = await response.json()
      setAdminUsers(data.admins || [])
    } catch (err) {
      logger.error('Error loading admin users:', err as Error)
    }
  }

  const loadAuditLogs = async () => {
    try {
      const response = await fetch('/api/admin/settings/audit-logs?limit=50')
      if (!response.ok) throw new Error('Failed to load audit logs')
      const data = await response.json()
      setAuditLogs(data.logs || [])
      setLoading(false)
    } catch (err) {
      logger.error('Error loading audit logs:', err as Error)
      setLoading(false)
    }
  }

  const handleGrantRole = async () => {
    if (!grantRoleEmail.trim()) {
      alert('Please enter an email address')
      return
    }

    if (!isSuperAdmin) {
      alert('Only super admins can grant roles')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/grant-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: grantRoleEmail,
          role: grantRoleType,
          action: 'grant',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to grant role')
      }

      alert(`${grantRoleType} role granted to ${grantRoleEmail}`)
      setShowGrantRoleModal(false)
      setGrantRoleEmail('')
      await loadAdminUsers()
      await loadAuditLogs()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to grant role')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeRole = async (email: string) => {
    if (!isSuperAdmin) {
      alert('Only super admins can revoke roles')
      return
    }

    if (!confirm(`Are you sure you want to revoke admin access for ${email}?`)) {
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/grant-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: email,
          action: 'revoke',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke role')
      }

      alert(`Role revoked for ${email}`)
      await loadAdminUsers()
      await loadAuditLogs()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke role')
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
            You do not have permission to access admin settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage admin users, view audit logs, and configure system settings
        </p>
      </div>

      {/* Admin Users Section */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <UserGroupIcon className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Admin Users</h2>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => setShowGrantRoleModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
            >
              <PlusCircleIcon className="h-5 w-5" />
              Grant Role
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {adminUsers.length === 0 ? (
              <p className="text-muted-foreground dark:text-muted-foreground text-center py-4">No admin users found</p>
            ) : (
              adminUsers.map((admin) => (
                <div
                  key={admin.uid}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-background"
                >
                  <div className="flex items-center gap-4">
                    <ShieldCheckIcon className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-medium text-foreground">
                        {admin.displayName || admin.email}
                      </div>
                      <div className="text-sm text-muted-foreground dark:text-muted-foreground">{admin.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(admin.role)}`}>
                      {getRoleDisplayName(admin.role)}
                    </span>
                    {isSuperAdmin && !['perriceconsulting@gmail.com', 'weightlossprojectionlab@gmail.com'].includes(admin.email) && (
                      <button
                        onClick={() => handleRevokeRole(admin.email)}
                        disabled={actionLoading}
                        className="text-error hover:text-error-dark dark:hover:text-red-300 text-sm font-medium"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {isSuperAdmin && (
          <div className="mt-4 p-4 bg-accent-light dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
            <p className="text-sm text-indigo-900 dark:text-indigo-200">
              <strong>Super Admins:</strong> perriceconsulting@gmail.com, weightlossprojectionlab@gmail.com
              <br />
              <span className="text-xs text-indigo-700 dark:text-indigo-300">
                Super admin access cannot be revoked via this interface
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Audit Logs Section */}
      <div className="bg-card rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <ClockIcon className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Recent Admin Activity</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-muted-foreground dark:text-muted-foreground text-center py-4">No audit logs found</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.logId}
                  className="p-3 border border-border rounded-lg text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{log.adminEmail}</span>
                        <span className="text-muted-foreground dark:text-muted-foreground">•</span>
                        <span className="text-primary font-medium">{log.action.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {log.targetType}: {log.targetId.slice(0, 12)}...
                      </div>
                      {log.reason && (
                        <div className="text-muted-foreground dark:text-muted-foreground text-xs mt-1">
                          Reason: {log.reason}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Grant Role Modal */}
      {showGrantRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Grant Admin Role</h2>
              <button
                onClick={() => setShowGrantRoleModal(false)}
                className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  User Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={grantRoleEmail}
                  onChange={(e) => setGrantRoleEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-foreground mb-2">
                  Role
                </label>
                <select
                  id="role"
                  value={grantRoleType}
                  onChange={(e) => setGrantRoleType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="admin">Admin - Full access</option>
                  <option value="moderator">Moderator - Content moderation</option>
                  <option value="support">Support - User support</option>
                </select>
              </div>

              <div className="bg-warning-light border border-warning-light rounded-lg p-3">
                <p className="text-sm text-warning-dark">
                  <strong>Warning:</strong> Only grant admin roles to trusted team members.
                  All admin actions are logged for security.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGrantRole}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
                >
                  {actionLoading ? 'Granting...' : 'Grant Role'}
                </button>
                <button
                  onClick={() => setShowGrantRoleModal(false)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
