'use client'

/**
 * Tenant Context Provider
 *
 * Fetches tenant data from Firestore based on the subdomain slug.
 * When no slug is provided (main WPL domain), tenant is null and
 * the app behaves exactly as before — zero breaking changes.
 *
 * Usage:
 *   const { tenant, isFranchise, branding } = useTenant()
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type { Tenant, TenantBranding } from '@/types/tenant'

interface TenantContextType {
  tenant: Tenant | null
  tenantId: string | null
  tenantSlug: string | null
  isLoading: boolean
  isFranchise: boolean
  branding: TenantBranding | null
  error: string | null
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantId: null,
  tenantSlug: null,
  isLoading: false,
  isFranchise: false,
  branding: null,
  error: null,
})

export function useTenant() {
  return useContext(TenantContext)
}

interface TenantProviderProps {
  tenantSlug: string | null
  children: ReactNode
}

export function TenantProvider({ tenantSlug, children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(!!tenantSlug) // only loading if slug provided
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantSlug) {
      // No subdomain — WPL direct. Not a franchise.
      setTenant(null)
      setIsLoading(false)
      return
    }

    const fetchTenant = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const tenantsRef = collection(db, 'tenants')
        const q = query(tenantsRef, where('slug', '==', tenantSlug), limit(1))
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
          logger.warn('[TenantContext] Tenant not found for slug', { slug: tenantSlug })
          setError('Organization not found')
          setTenant(null)
          return
        }

        const doc = snapshot.docs[0]
        const data = doc.data() as Omit<Tenant, 'id'>
        const tenantData: Tenant = { ...data, id: doc.id }

        if (tenantData.status !== 'active' && tenantData.status !== 'paid') {
          logger.warn('[TenantContext] Tenant is not active', { slug: tenantSlug, status: tenantData.status })
          setError('This organization is not currently active')
          setTenant(null)
          return
        }

        logger.info('[TenantContext] Tenant loaded', {
          slug: tenantSlug,
          name: tenantData.name,
          status: tenantData.status,
        })

        setTenant(tenantData)
      } catch (err) {
        // Firestore rules may block client-side tenant reads (Phase B slice 8
        // tightened to admin/tenant-admin only). Fall back to DOM attributes
        // set by the server-rendered tenant-shell layout.
        const errMsg = (err as any)?.message || ''
        if (errMsg.includes('permission') || errMsg.includes('insufficient')) {
          logger.warn('[TenantContext] Permission denied — falling back to DOM attributes', { slug: tenantSlug })
          const el = typeof document !== 'undefined' ? document.querySelector('[data-tenant-id]') : null
          if (el) {
            const fallbackTenant = {
              id: el.getAttribute('data-tenant-id') || '',
              slug: el.getAttribute('data-tenant-slug') || tenantSlug,
              name: tenantSlug, // best we can do without the doc
              status: 'active' as const,
              branding: {} as any,
              billing: {} as any,
              contact: {} as any,
              features: {} as any,
              createdAt: '',
              updatedAt: '',
              onboardingCompleted: true,
            }
            setTenant(fallbackTenant)
          } else {
            setError('Failed to load organization')
          }
        } else {
          logger.error('[TenantContext] Failed to fetch tenant', err as Error, { slug: tenantSlug })
          setError('Failed to load organization')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchTenant()
  }, [tenantSlug])

  const value: TenantContextType = {
    tenant,
    tenantId: tenant?.id || null,
    tenantSlug,
    isLoading,
    isFranchise: !!tenantSlug,
    branding: tenant?.branding || null,
    error,
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}
