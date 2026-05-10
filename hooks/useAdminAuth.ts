'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { logger } from '@/lib/logger'
import { isSuperAdmin as isSuperAdminCheck } from '@/lib/admin/permissions'

export type AdminRole = 'admin' | 'moderator' | 'support' | null

interface AdminAuthState {
  isAdmin: boolean
  isSuperAdmin: boolean
  role: AdminRole
  loading: boolean
}

// Re-export for backward compatibility
export const isSuperAdminEmail = (email: string | null | undefined): boolean => {
  return isSuperAdminCheck(email)
}

export const useAdminAuth = (): AdminAuthState => {
  const { user, loading: authLoading } = useAuth()
  const [role, setRole] = useState<AdminRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminRole = async () => {
      if (authLoading) {
        return // Wait for auth to finish loading
      }

      if (!user) {
        setRole(null)
        setLoading(false)
        return
      }

      try {
        // Check if user is super admin
        const isSuper = isSuperAdminEmail(user.email)

        // Get user document from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))

        if (!userDoc.exists()) {
          // Super admins get admin role even without Firestore doc.
          // The doc itself is intentionally NOT auto-created from the
          // client — Firestore rules block users from setting their
          // own `role` field (correctly, prevents privilege
          // escalation). Server-side endpoints honor super-admin
          // status via SUPER_ADMIN_EMAILS rather than reading a role
          // doc the client wrote, so the doc is unnecessary.
          setRole(isSuper ? 'admin' : null)
          setLoading(false)
          return
        }

        const userData = userDoc.data()
        let userRole = userData?.role as AdminRole

        // Super admins always have admin role — no Firestore write
        // attempted (see comment above). The local state below is
        // what the rest of the hook consumes.
        if (isSuper) {
          userRole = 'admin'
        }

        // Valid admin roles: admin, moderator, support
        if (['admin', 'moderator', 'support'].includes(userRole || '')) {
          setRole(userRole)
        } else {
          setRole(null)
        }
      } catch (error) {
        logger.error('Error checking admin role:', error as Error)
        // Super admins still get access even on error
        if (isSuperAdminEmail(user.email)) {
          setRole('admin')
        } else {
          setRole(null)
        }
      } finally {
        setLoading(false)
      }
    }

    checkAdminRole()
  }, [user, authLoading])

  return {
    isAdmin: role === 'admin' || role === 'moderator' || role === 'support',
    isSuperAdmin: isSuperAdminEmail(user?.email),
    role,
    loading: authLoading || loading
  }
}
