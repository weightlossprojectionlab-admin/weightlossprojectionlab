'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export type AdminRole = 'admin' | 'moderator' | 'support' | null

interface AdminAuthState {
  isAdmin: boolean
  isSuperAdmin: boolean
  role: AdminRole
  loading: boolean
}

// Super admin emails with full access (cannot be revoked)
const SUPER_ADMIN_EMAILS = [
  'perriceconsulting@gmail.com',
  'weigthlossprojectionlab@gmail.com', // Note: keeping original spelling from user
]

export const isSuperAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
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
          // Super admins get admin role even without Firestore doc
          if (isSuper) {
            setRole('admin')
            // Auto-create admin profile for super admins
            try {
              await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                role: 'admin',
                createdAt: new Date(),
                lastActiveAt: new Date(),
              }, { merge: true })
            } catch (err) {
              console.error('Error creating super admin profile:', err)
            }
          } else {
            setRole(null)
          }
          setLoading(false)
          return
        }

        const userData = userDoc.data()
        let userRole = userData?.role as AdminRole

        // Super admins always have admin role
        if (isSuper) {
          userRole = 'admin'
          // Update Firestore if not already set
          if (userData?.role !== 'admin') {
            try {
              await setDoc(doc(db, 'users', user.uid), {
                role: 'admin',
                lastActiveAt: new Date(),
              }, { merge: true })
            } catch (err) {
              console.error('Error updating super admin role:', err)
            }
          }
        }

        // Valid admin roles: admin, moderator, support
        if (['admin', 'moderator', 'support'].includes(userRole || '')) {
          setRole(userRole)
        } else {
          setRole(null)
        }
      } catch (error) {
        console.error('Error checking admin role:', error)
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
