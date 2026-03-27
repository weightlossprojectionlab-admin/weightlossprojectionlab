'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from '@/lib/firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getPermissions } from '@/lib/admin/permissions'
import { getAdminAuthToken } from '@/lib/admin/api'
import { logger } from '@/lib/logger'
import { getCSRFToken } from '@/lib/csrf'
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  ChartBarIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface UserRecord {
  uid: string
  email: string
  displayName?: string
  name?: string
  createdAt: Date
  lastActiveAt?: Date
  role?: 'admin' | 'moderator' | 'support'
  suspended?: boolean
  mealLogsCount?: number
  weightLogsCount?: number
  stepLogsCount?: number
  patientsCount?: number
  familyMembersCount?: number
  caregiverOf?: any[]
  onboardingCompleted?: boolean
  userMode?: string
  isAccountOwner?: boolean
  subscription?: {
    plan: string
    maxSeats: number
    currentSeats: number
    status: string
  } | null
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { isAdmin, role } = useAdminAuth()
  const permissions = getPermissions(role)
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserRecord[]>([])
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ uid: string; email: string } | null>(null)

  // Ref for intersection observer
  const observerTarget = useRef<HTMLDivElement>(null)

  // Handler for viewing user analytics
  const handleViewUserAnalytics = (user: UserRecord) => {
    // Navigate to analytics page with user filter
    router.push(`/admin/analytics?uid=${user.uid}&email=${encodeURIComponent(user.email)}`)
  }

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = useCallback(async (pageToken?: string, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (pageToken) params.set('pageToken', pageToken)

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load users' }))
        throw new Error(errorData.error || 'Failed to load users')
      }

      const data = await response.json()

      if (append) {
        // Append new users to existing list
        setUsers(prev => [...prev, ...(data.users || [])])
      } else {
        // Replace users list
        setUsers(data.users || [])
      }

      setNextPageToken(data.nextPageToken)
      setHasMore(!!data.nextPageToken)
    } catch (err) {
      logger.error('Load users error:', err as Error)
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If search is empty, reload all users
      loadUsers()
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to search users' }))
        throw new Error(errorData.error || 'Failed to search users')
      }

      const data = await response.json()
      setUsers(data.users || [])
      setHasMore(false) // No pagination for search results
      setNextPageToken(undefined)

      if (data.users.length === 0) {
        setError('No users found')
      }
    } catch (err) {
      logger.error('Search error:', err as Error)
      setError(err instanceof Error ? err.message : 'Failed to search users')
    } finally {
      setLoading(false)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    loadUsers()
  }

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Only load more if:
        // 1. Element is visible
        // 2. There are more users to load
        // 3. Not currently loading
        // 4. Not in search mode (searchQuery empty)
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading && !searchQuery) {
          loadUsers(nextPageToken, true)
        }
      },
      {
        root: null, // viewport
        rootMargin: '100px', // Start loading 100px before reaching bottom
        threshold: 0.1
      }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoadingMore, loading, nextPageToken, searchQuery, loadUsers])

  const handleSuspend = async (uid: string) => {
    if (!permissions.canSuspendUsers) return

    setActionLoading(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid, action: 'suspend' }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to suspend user' }))
        throw new Error(errorData.error || 'Failed to suspend user')
      }

      // Refresh list
      if (searchQuery) {
        await handleSearch()
      } else {
        await loadUsers()
      }
      alert('User suspended successfully')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suspend user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnsuspend = async (uid: string) => {
    if (!permissions.canSuspendUsers) return

    setActionLoading(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid, action: 'unsuspend' }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to unsuspend user' }))
        throw new Error(errorData.error || 'Failed to unsuspend user')
      }

      // Refresh list
      if (searchQuery) {
        await handleSearch()
      } else {
        await loadUsers()
      }
      alert('User unsuspended successfully')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unsuspend user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportData = async (uid: string, email: string) => {
    if (!permissions.canExportUserData) return

    setActionLoading(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch(`/api/admin/users/export?uid=${uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to export user data' }))
        throw new Error(errorData.error || 'Failed to export user data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-data-${email}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export user data')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteClick = (uid: string, email: string) => {
    if (!permissions.canDeleteUsers) return
    setPendingDelete({ uid, email })
  }

  const handleDeleteConfirmed = async () => {
    if (!pendingDelete) return
    const { uid, email } = pendingDelete

    setActionLoading(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete user' }))
        throw new Error(errorData.error || 'Failed to delete user')
      }

      setUsers(prev => prev.filter(u => u.uid !== uid))
      alert(`User ${email} deleted successfully`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setActionLoading(false)
      setPendingDelete(null)
    }
  }

  if (!isAdmin || !permissions.canViewUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-error-dark dark:text-red-300">
            You do not have permission to access user management.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Search and manage user accounts</p>
      </div>

      {/* Search */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-foreground mb-2">
              Search by Email or UID
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="user@example.com or uid123..."
                className="w-full pl-10 pr-4 py-3 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-error-dark dark:text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && users.length === 0 && (
        <div className="bg-card rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading users...</p>
        </div>
      )}

      {/* Results */}
      {!loading && users.length > 0 && (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    UID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr
                    key={user.uid}
                    className="hover:bg-background cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserCircleIcon className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-foreground">
                            {user.displayName || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground dark:text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {user.uid.slice(0, 12)}...
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      {user.role ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-light dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                          {user.role}
                        </span>
                      ) : (
                        <span className="text-muted-foreground dark:text-muted-foreground text-sm">User</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.suspended ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-foreground">
                          {user.mealLogsCount ?? 0} meals
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            👥 {user.familyMembersCount || 0} caregivers
                          </span>
                          {(user.patientsCount ?? 0) > 0 && (
                            <span className="text-xs text-muted-foreground">
                              • {user.patientsCount} patients
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                          Last active: {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewUserAnalytics(user)}
                          className="p-2 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/30 transition-colors"
                          title="View analytics"
                        >
                          <ChartBarIcon className="h-5 w-5" />
                        </button>
                        {permissions.canSuspendUsers && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              user.suspended ? handleUnsuspend(user.uid) : handleSuspend(user.uid)
                            }}
                            disabled={actionLoading}
                            className={`p-2 rounded-lg transition-colors ${
                              user.suspended
                                ? 'bg-green-100 dark:bg-green-900/20 text-success-dark dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/30'
                                : 'bg-yellow-100 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/30'
                            }`}
                            title={user.suspended ? 'Unsuspend' : 'Suspend'}
                          >
                            {user.suspended ? <CheckCircleIcon className="h-5 w-5" /> : <ShieldExclamationIcon className="h-5 w-5" />}
                          </button>
                        )}
                        {permissions.canExportUserData && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExportData(user.uid, user.email)
                            }}
                            disabled={actionLoading}
                            className="p-2 bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                            title="Export GDPR data"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                        )}
                        {permissions.canDeleteUsers && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(user.uid, user.email)
                            }}
                            disabled={actionLoading}
                            className="p-2 bg-red-100 dark:bg-red-900/20 text-error-dark dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete user"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lazy Loading Indicator */}
          {!searchQuery && (
            <div className="px-6 py-4 border-t border-border">
              {isLoadingMore && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span className="text-sm">Loading more users...</span>
                </div>
              )}
              {!isLoadingMore && hasMore && (
                <div className="text-center text-sm text-muted-foreground dark:text-muted-foreground">
                  Scroll down to load more users
                </div>
              )}
              {!hasMore && users.length > 0 && (
                <div className="text-center text-sm text-muted-foreground dark:text-muted-foreground">
                  All users loaded ({users.length} total)
                </div>
              )}
            </div>
          )}

          {/* Intersection Observer Target */}
          {!searchQuery && hasMore && (
            <div ref={observerTarget} className="h-4"></div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && users.length === 0 && !error && (
        <div className="bg-card rounded-lg shadow p-12 text-center">
          <UserCircleIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No Users Found</p>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try a different search query' : 'No users registered yet'}
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-6">
        <h2 className="text-lg font-semibold text-accent-dark mb-2">User Management Guidelines</h2>
        <ul className="space-y-2 text-sm text-accent-dark">
          <li>• Search by email or UID to find specific users</li>
          <li>• Suspend users to temporarily disable their account access</li>
          <li>• Export user data for GDPR compliance requests</li>
          <li>• Delete users only when absolutely necessary - this action is permanent</li>
          <li>• All actions are logged in the audit trail for compliance</li>
        </ul>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirmed}
        title="Delete User"
        message={`Are you sure you want to permanently DELETE user ${pendingDelete?.email}?\n\nThis action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRefresh={loadUsers}
        />
      )}
    </div>
  )
}

interface UserDetailsModalProps {
  user: UserRecord
  onClose: () => void
  onRefresh: () => void
}

function UserDetailsModal({ user, onClose, onRefresh }: UserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'caregivers' | 'patients'>('caregivers') // Default to caregivers for helpdesk
  const [showAddCaregiver, setShowAddCaregiver] = useState(false)
  const [caregiverEmail, setCaregiverEmail] = useState('')
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [patients, setPatients] = useState<any[]>([])
  const [editingCaregiver, setEditingCaregiver] = useState<any | null>(null)
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({})
  const [pendingDeletePatient, setPendingDeletePatient] = useState<{ id: string; name: string } | null>(null)
  const [pendingRestorePatient, setPendingRestorePatient] = useState<{ id: string; name: string } | null>(null)
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null)
  const [editingPatientName, setEditingPatientName] = useState('')
  const [savingPatientName, setSavingPatientName] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(user.displayName || user.name || '')
  const [savingName, setSavingName] = useState(false)
  const [currentDisplayName, setCurrentDisplayName] = useState(user.displayName || user.name || '')

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName.trim() === currentDisplayName) {
      setIsEditingName(false)
      setEditedName(currentDisplayName)
      return
    }

    setSavingName(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: user.uid, action: 'update_name', displayName: editedName.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update name' }))
        throw new Error(errorData.error || 'Failed to update name')
      }

      setCurrentDisplayName(editedName.trim())
      setIsEditingName(false)
      onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update name')
    } finally {
      setSavingName(false)
    }
  }

  const handleSavePatientName = async (patientId: string) => {
    const trimmed = editingPatientName.trim()
    if (!trimmed) {
      setEditingPatientId(null)
      return
    }

    setSavingPatientName(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch(`/api/admin/users/${user.uid}/patients/${patientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update patient name' }))
        throw new Error(errorData.error || 'Failed to update patient name')
      }

      // Update local state
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, name: trimmed } : p))
      setEditingPatientId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update patient name')
    } finally {
      setSavingPatientName(false)
    }
  }

  // Map of accountOwnerId → their patients (for "Caregiver For" section)
  const [caregiverForPatients, setCaregiverForPatients] = useState<Record<string, any[]>>({})
  // Map of accountOwnerId → their user profile (household info)
  const [caregiverForOwners, setCaregiverForOwners] = useState<Record<string, any>>({})

  // Load family members and patients when modal opens
  useEffect(() => {
    loadFamilyMembers()
    loadCaregiverForData()

    // Real-time patients listener
    const patientsRef = collection(db, 'users', user.uid, 'patients')
    const unsubscribe = onSnapshot(patientsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          name: d.name,
          type: d.type || 'human',
          relationship: d.relationship,
          dateOfBirth: d.dateOfBirth,
          age: d.age,
          gender: d.gender,
          photo: d.photo,
          status: d.status || 'active',
        }
      })
      setPatients(data)
    }, (error) => {
      console.error('Error listening to patients:', error)
    })

    return () => unsubscribe()
  }, [user.uid])

  const loadCaregiverForData = async () => {
    if (!user.caregiverOf?.length) return
    const token = await getAdminAuthToken()
    const patientResults: Record<string, any[]> = {}
    const ownerResults: Record<string, any> = {}

    await Promise.all(
      user.caregiverOf.map(async (ctx: any) => {
        if (!ctx.accountOwnerId) return
        try {
          // Fetch patients and owner profile in parallel for each household
          const [patientsRes, ownerRes] = await Promise.all([
            fetch(`/api/admin/users/${ctx.accountOwnerId}/patients`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`/api/admin/users?q=${ctx.accountOwnerId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
          ])
          if (patientsRes.ok) {
            const data = await patientsRes.json()
            patientResults[ctx.accountOwnerId] = data.patients || []
          }
          if (ownerRes.ok) {
            const data = await ownerRes.json()
            const owner = data.users?.[0]
            if (owner) ownerResults[ctx.accountOwnerId] = owner
          }
        } catch {
          // silently skip
        }
      })
    )
    setCaregiverForPatients(patientResults)
    setCaregiverForOwners(ownerResults)
  }

  const loadFamilyMembers = async () => {
    try {
      setLoadingMembers(true)
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch(`/api/admin/users/${user.uid}/family-members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setFamilyMembers(data.familyMembers || [])
      }
    } catch (error) {
      console.error('Error loading family members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  // Helper to get patient names from IDs
  const getPatientNames = (patientIds: string[]) => {
    if (!patientIds || patientIds.length === 0) {
      return patients.length > 0 ? `All ${patients.length} patients` : 'All patients'
    }

    const names = patientIds.map(id => {
      const patient = patients.find(p => p.id === id)
      return patient?.name || `Unknown (${id.slice(0, 8)}...)`
    })

    return names.length > 0 ? names.join(', ') : 'No patients assigned'
  }

  const handleAddCaregiver = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch(`/api/admin/users/${user.uid}/add-caregiver`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          caregiverEmail,
          caregiverUserId: null, // Will be looked up by email
          caregiverName: null,
          patientIds: selectedPatientIds,
          permissions: {
            viewRecords: true,
            editRecords: true,
            viewVitals: true,
            editVitals: true,
            viewMedications: true,
            editMedications: true,
            viewAppointments: true,
            editAppointments: true,
            viewDocuments: true,
            uploadDocuments: true,
            manageFamily: true,
            viewBilling: true
          }
        })
      })

      if (response.ok) {
        alert('Caregiver added successfully!')
        setShowAddCaregiver(false)
        setCaregiverEmail('')
        setSelectedPatientIds([])
        loadFamilyMembers()
        onRefresh()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error adding caregiver:', error)
      alert('Failed to add caregiver')
    } finally {
      setLoading(false)
    }
  }

  const handleEditCaregiver = (member: any) => {
    setEditingCaregiver(member)
    setEditPermissions(member.permissions || {})
  }

  const handleSaveEdit = async () => {
    if (!editingCaregiver) return
    setLoading(true)

    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch(`/api/admin/users/${user.uid}/update-caregiver`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          familyMemberId: editingCaregiver.id,
          permissions: editPermissions
        })
      })

      if (response.ok) {
        alert('Permissions updated successfully!')
        setEditingCaregiver(null)
        loadFamilyMembers()
        onRefresh()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating caregiver:', error)
      alert('Failed to update caregiver')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCaregiver = async (member: any) => {
    setLoading(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch(`/api/admin/users/${user.uid}/remove-caregiver`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          familyMemberId: member.id,
          caregiverUserId: member.userId
        })
      })

      if (response.ok) {
        alert('Caregiver removed successfully!')
        loadFamilyMembers()
        onRefresh()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error removing caregiver:', error)
      alert('Failed to remove caregiver')
    } finally {
      setLoading(false)
    }
  }

  const handleArchivePatient = async () => {
    if (!pendingDeletePatient) return
    const { id, name } = pendingDeletePatient
    setPendingDeletePatient(null)
    setLoading(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch(`/api/admin/users/${user.uid}/patients`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ patientId: id }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to archive patient' }))
        throw new Error(err.error || 'Failed to archive patient')
      }
      setPatients(prev => prev.map(p => p.id === id ? { ...p, status: 'deleted' } : p))
      alert(`${name} has been archived.`)
    } catch (error) {
      console.error('Error archiving patient:', error)
      alert(error instanceof Error ? error.message : 'Failed to archive patient')
    } finally {
      setLoading(false)
    }
  }

  const handleRestorePatient = async () => {
    if (!pendingRestorePatient) return
    const { id, name } = pendingRestorePatient
    setLoading(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()
      const response = await fetch(`/api/admin/users/${user.uid}/patients`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ patientId: id }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to restore patient' }))
        throw new Error(err.error || 'Failed to restore patient')
      }
      setPatients(prev => prev.map(p => p.id === id ? { ...p, status: 'active' } : p))
      alert(`${name} has been restored.`)
    } catch (error) {
      console.error('Error restoring patient:', error)
      alert(error instanceof Error ? error.message : 'Failed to restore patient')
    } finally {
      setLoading(false)
      setPendingRestorePatient(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') { setIsEditingName(false); setEditedName(currentDisplayName) }
                  }}
                  autoFocus
                  className="text-2xl font-bold bg-background border border-border rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary w-full max-w-md"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  title="Save"
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => { setIsEditingName(false); setEditedName(currentDisplayName) }}
                  className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Cancel"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-2xl font-bold">{currentDisplayName || 'No name'}</h2>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Edit name"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                👥 {user.familyMembersCount || 0} Caregivers
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                🏥 {user.patientsCount || 0} Patients
              </span>
              {user.caregiverOf && user.caregiverOf.length > 0 && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  🤝 Caregiver for {user.caregiverOf.length}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border flex overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'info' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            User Info
          </button>
          <button
            onClick={() => setActiveTab('caregivers')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'caregivers' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            Caregivers
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'patients' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            Patients ({patients.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div><strong>UID:</strong> <code className="text-xs bg-muted px-2 py-1 rounded">{user.uid}</code></div>

              {/* Show subscription info for context */}
              {user.subscription ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <div className="font-semibold text-indigo-900 mb-1">📋 Subscription Plan</div>
                  <div className="text-sm text-indigo-700">
                    Plan: <strong className="uppercase">{user.subscription.plan.replace('_', ' ')}</strong> • Status: {user.subscription.status}
                  </div>
                  <div className="text-sm text-indigo-700 mt-1">
                    Max Patients/Seats: <strong>{user.subscription.maxSeats}</strong> • Currently Using: {user.patientsCount || 0}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                  <div className="text-sm text-gray-600">No active subscription</div>
                </div>
              )}

              <div><strong>Patients:</strong> {user.patientsCount || 0}</div>
              <div><strong>Family Members (Caregivers):</strong> {user.familyMembersCount || 0}</div>
              <div><strong>Caregiver For:</strong> {user.caregiverOf?.length || 0} accounts</div>
              <div><strong>User Mode:</strong> {user.userMode || 'Not set'}</div>
              <div><strong>Onboarding:</strong> {user.onboardingCompleted ? '✓ Completed' : '⚠ Not completed'}</div>
              <div><strong>Account Owner:</strong> {user.isAccountOwner ? 'Yes' : 'No'}</div>
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-1">🏥 Patient Records</h3>
                <p className="text-sm text-blue-700">View and manage this user's patients. Archiving a patient hides them from the user's active list but preserves all data.</p>
              </div>

              {loadingMembers ? (
                <div className="text-center py-8 text-muted-foreground">Loading patients...</div>
              ) : patients.length === 0 ? (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-600">No patients found for this user</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patients.map((patient) => {
                    const isDeleted = patient.status === 'deleted' || patient.status === 'archived'
                    return (
                      <div key={patient.id} className={`border-2 rounded-lg p-4 ${isDeleted ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-200 hover:border-primary'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl mt-0.5">{patient.type === 'pet' ? '🐾' : '🧑'}</span>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {editingPatientId === patient.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={editingPatientName}
                                      onChange={(e) => setEditingPatientName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSavePatientName(patient.id)
                                        if (e.key === 'Escape') setEditingPatientId(null)
                                      }}
                                      autoFocus
                                      className="font-semibold text-lg bg-background border border-border rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary w-48"
                                    />
                                    <button
                                      onClick={() => handleSavePatientName(patient.id)}
                                      disabled={savingPatientName}
                                      className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                      title="Save"
                                    >
                                      <CheckIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingPatientId(null)}
                                      className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                      title="Cancel"
                                    >
                                      <XMarkIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 group/name">
                                    <span className="font-semibold text-lg">{patient.name}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingPatientId(patient.id)
                                        setEditingPatientName(patient.name)
                                      }}
                                      className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded opacity-0 group-hover/name:opacity-100 transition-opacity"
                                      title="Edit name"
                                    >
                                      <PencilIcon className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                                {patient.relationship && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 capitalize">
                                    {patient.relationship}
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                  isDeleted
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {isDeleted ? (patient.status === 'archived' ? 'Archived' : 'Deleted') : 'Active'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 space-y-0.5">
                                {patient.age && <span>Age: {patient.age}</span>}
                                {patient.gender && <span className="ml-3 capitalize">Gender: {patient.gender}</span>}
                                {patient.dateOfBirth && <div className="text-xs text-gray-400">DOB: {patient.dateOfBirth}</div>}
                              </div>
                            </div>
                          </div>
                          {isDeleted ? (
                            <button
                              onClick={() => setPendingRestorePatient({ id: patient.id, name: patient.name })}
                              disabled={loading}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm disabled:opacity-50 shrink-0"
                              title="Restore patient"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => setPendingDeletePatient({ id: patient.id, name: patient.name })}
                              disabled={loading}
                              className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-sm disabled:opacity-50 shrink-0"
                              title="Archive patient"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'caregivers' && (
            <div className="space-y-6">
              {/* HELPDESK: Quick Actions */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">🎧 Helpdesk Quick Actions</h3>
                <button
                  onClick={() => setShowAddCaregiver(!showAddCaregiver)}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover text-sm font-medium"
                >
                  {showAddCaregiver ? 'Cancel' : '+ Add New Caregiver'}
                </button>
              </div>

              {/* Add Caregiver Form */}
              {showAddCaregiver && (
                <form onSubmit={handleAddCaregiver} className="space-y-3 bg-yellow-50 border-2 border-yellow-300 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-900">Adding Caregiver to {user.displayName || 'User'}'s Account</h4>
                  <div>
                    <label className="block text-sm font-medium mb-1">Caregiver Email *</label>
                    <input
                      type="email"
                      required
                      value={caregiverEmail}
                      onChange={(e) => setCaregiverEmail(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-border rounded bg-background"
                      placeholder="caregiver@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Patient Access (optional)
                    </label>
                    {patients.filter(p => p.status === 'active').length === 0 ? (
                      <p className="text-xs text-muted-foreground">No active patients found — caregiver will have access to all patients.</p>
                    ) : (
                      <div className="border-2 border-border rounded bg-background max-h-48 overflow-y-auto divide-y divide-border">
                        {patients.filter(p => p.status === 'active').map((patient) => (
                          <label key={patient.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded border-border"
                              checked={selectedPatientIds.includes(patient.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPatientIds(prev => [...prev, patient.id])
                                } else {
                                  setSelectedPatientIds(prev => prev.filter(id => id !== patient.id))
                                }
                              }}
                            />
                            <span className="text-sm">
                              {patient.type === 'pet' ? '🐾' : '🧑'} {patient.name}
                              {patient.relationship && (
                                <span className="ml-1 text-xs text-muted-foreground">({patient.relationship})</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedPatientIds.length === 0
                        ? 'None selected = access to ALL patients'
                        : `${selectedPatientIds.length} patient${selectedPatientIds.length !== 1 ? 's' : ''} selected`}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Adding...' : '✓ Add with Full Permissions'}
                  </button>
                </form>
              )}

              {/* Current Caregivers */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">Current Caregivers ({familyMembers.length})</h3>
                {loadingMembers ? (
                  <div className="text-center py-4 text-muted-foreground">Loading caregivers...</div>
                ) : familyMembers.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-600">No caregivers assigned yet</p>
                    <p className="text-sm text-gray-500 mt-1">Click "Add New Caregiver" above to assign someone</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {familyMembers.map((member) => (
                      <div key={member.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-primary">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-lg">{member.name}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                member.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                member.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {member.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">{member.email}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Role: {member.familyRole || 'caregiver'} •
                              Patients: {member.patientsAccess?.length || 0} •
                              Permissions: {Object.values(member.permissions || {}).filter(Boolean).length}
                            </div>
                            {/* Show patient names they have access to */}
                            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                              <div className="text-xs font-medium text-blue-900 mb-1">
                                👨‍👩‍👧‍👦 Can access ({member.patientsAccess?.length || 0} of {patients.length} total):
                              </div>
                              <div className="text-xs text-blue-700 font-medium">
                                {getPatientNames(member.patientsAccess || [])}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditCaregiver(member)}
                              disabled={loading}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm disabled:opacity-50"
                              title="Edit permissions"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleRemoveCaregiver(member)}
                              disabled={loading}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm disabled:opacity-50"
                              title="Remove caregiver"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Expandable Details */}
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">View Details</summary>
                          <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-1 text-sm">
                            <div><strong>User ID:</strong> {member.userId}</div>
                            <div><strong>Added:</strong> {member.addedAt ? new Date(member.addedAt).toLocaleString() : 'N/A'}</div>
                            <div><strong>Accepted:</strong> {member.acceptedAt ? new Date(member.acceptedAt).toLocaleString() : 'N/A'}</div>
                            <div><strong>Permissions:</strong>
                              <div className="grid grid-cols-2 gap-1 mt-1">
                                {Object.entries(member.permissions || {}).map(([key, value]) => (
                                  <div key={key} className={value ? 'text-green-600' : 'text-gray-400'}>
                                    {value ? '✓' : '✗'} {key.replace(/([A-Z])/g, ' $1').trim()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* This User is a Caregiver For */}
              <div className="border-t-2 border-gray-200 pt-6">
                <h3 className="font-semibold mb-3">This User is Caregiver For ({user.caregiverOf?.length || 0})</h3>
                {user.caregiverOf && user.caregiverOf.length > 0 ? (
                  <div className="space-y-2">
                    {user.caregiverOf.map((ctx: any, idx: number) => {
                      const ownerProfile = caregiverForOwners[ctx.accountOwnerId]
                      // Best available name: fetched profile > stored name (if not generic) > email > UID
                      const householdName = ownerProfile?.displayName || ownerProfile?.name
                        || (ctx.accountOwnerName && ctx.accountOwnerName !== 'Account Owner' ? ctx.accountOwnerName : null)
                        || ctx.accountOwnerEmail
                        || ctx.accountOwnerId
                        || 'Unknown Household'
                      const householdEmail = ownerProfile?.email || ctx.accountOwnerEmail
                      const ownerPatients = caregiverForPatients[ctx.accountOwnerId] || []
                      const accessIds: string[] = ctx.patientsAccess || []
                      const accessedPatients = accessIds.length > 0
                        ? ownerPatients.filter(p => accessIds.includes(p.id) && p.status === 'active')
                        : ownerPatients.filter(p => p.status === 'active')
                      const permCount = Object.values(ctx.permissions || {}).filter(Boolean).length
                      return (
                        <div key={idx} className="bg-purple-50 border border-purple-200 p-3 rounded-lg space-y-2">
                          {/* Household header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-purple-900">🏠 {householdName}</div>
                              {householdEmail && householdEmail !== householdName && (
                                <div className="text-xs text-purple-600">{householdEmail}</div>
                              )}
                            </div>
                            <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full shrink-0">
                              {ctx.role || 'caregiver'}
                            </span>
                          </div>

                          {/* Stats row */}
                          <div className="flex gap-3 text-xs text-purple-700">
                            <span>👥 {accessIds.length === 0 ? 'All patients' : `${accessIds.length} patient${accessIds.length !== 1 ? 's' : ''}`}</span>
                            <span>🔑 {permCount} permissions</span>
                            {ownerProfile?.subscription?.plan && (
                              <span>📋 {ownerProfile.subscription.plan}</span>
                            )}
                          </div>

                          {/* Patient name pills */}
                          {accessedPatients.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {accessedPatients.map(p => (
                                <span key={p.id} className="text-xs px-2 py-0.5 bg-white border border-purple-200 text-purple-800 rounded-full">
                                  {p.type === 'pet' ? '🐾' : '🧑'} {p.name}
                                </span>
                              ))}
                            </div>
                          ) : ownerPatients.length === 0 && (
                            <p className="text-xs text-purple-500 italic">No active patients in this household</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Not a caregiver for anyone</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Archive Patient Confirmation */}
      <ConfirmModal
        isOpen={pendingDeletePatient !== null}
        onClose={() => setPendingDeletePatient(null)}
        onConfirm={handleArchivePatient}
        title="Archive Patient"
        message={`Archive ${pendingDeletePatient?.name}?\n\nTheir data will be preserved but hidden from the user's active patient list.`}
        confirmText="Archive"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Restore Patient Confirmation */}
      <ConfirmModal
        isOpen={pendingRestorePatient !== null}
        onClose={() => setPendingRestorePatient(null)}
        onConfirm={handleRestorePatient}
        title="Restore Patient"
        message={`Restore ${pendingRestorePatient?.name}? They will become active again and appear in the user's patient list.`}
        confirmText="Restore"
        cancelText="Cancel"
        variant="info"
      />

      {/* Edit Permissions Modal */}
      {editingCaregiver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={() => setEditingCaregiver(null)}>
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Edit Permissions: {editingCaregiver.name}</h3>
                <p className="text-sm text-muted-foreground">{editingCaregiver.email}</p>
              </div>
              <button onClick={() => setEditingCaregiver(null)} className="p-2 hover:bg-muted rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="text-sm text-blue-900 font-medium mb-2">Current Patient Access:</div>
                  <div className="text-sm text-blue-700">
                    {getPatientNames(editingCaregiver.patientsAccess || [])}
                  </div>
                </div>

                <div className="text-sm font-medium mb-2">Edit Permissions:</div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(editingCaregiver.permissions || {}).sort().map((key) => (
                    <label key={key} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions[key] || false}
                        onChange={(e) => setEditPermissions({ ...editPermissions, [key]: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => setEditingCaregiver(null)}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
