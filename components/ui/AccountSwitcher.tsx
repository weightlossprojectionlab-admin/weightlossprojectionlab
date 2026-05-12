/**
 * Account Context Switcher
 *
 * Allows users who have both their own account AND caregiver access
 * to switch between viewing contexts
 */

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOwnerNames } from '@/hooks/useOwnerNames'
import type { CaregiverContext } from '@/types'

interface AccountContext {
  type: 'own' | 'caregiver'
  id: string
  name: string
  userMode?: string
}

export function AccountSwitcher() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [hasOwnAccount, setHasOwnAccount] = useState(false)
  const [ownUserMode, setOwnUserMode] = useState<string | undefined>(undefined)
  const [caregiverEntries, setCaregiverEntries] = useState<CaregiverContext[]>([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Step 1: pull this user's own doc — establishes own-account flag and the
  // list of caregiver relationships (IDs only; names are stale here).
  useEffect(() => {
    if (!user) return

    const loadOwnDoc = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const userData = userDoc.data()
        if (!userData) {
          setLoading(false)
          return
        }
        setHasOwnAccount(userData.profile?.onboardingCompleted === true)
        setOwnUserMode(userData.preferences?.userMode)
        setCaregiverEntries((userData.caregiverOf || []) as CaregiverContext[])
      } catch (error) {
        console.error('Error loading account contexts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOwnDoc()
  }, [user])

  // Step 2: dedupe caregiverOf by accountOwnerId. Semantic intent — an entry
  // in the switcher represents an OWNER SCOPE, not a caregiver relationship.
  // Duplicates can occur from re-accepting an invite or from backfill scripts,
  // and they trip React's "two children with the same key" warning. One owner,
  // one row. First entry wins (good enough until we need to merge permissions).
  const uniqueCaregiverEntries = useMemo(() => {
    const seen = new Set<string>()
    const out: CaregiverContext[] = []
    for (const ctx of caregiverEntries) {
      if (seen.has(ctx.accountOwnerId)) continue
      seen.add(ctx.accountOwnerId)
      out.push(ctx)
    }
    return out
  }, [caregiverEntries])

  // Step 3: resolve each owner's *live* display name from THEIR user doc.
  // The accountOwnerName field on caregiverOf is denormalized and can be
  // stale ("Account Owner" is the giveaway). Source of truth lives on the
  // owner's user doc; useOwnerNames reads it there via a server endpoint.
  const caregiverOwnerIds = useMemo(
    () => uniqueCaregiverEntries.map((c) => c.accountOwnerId),
    [uniqueCaregiverEntries],
  )
  const { names: ownerNames } = useOwnerNames(caregiverOwnerIds)

  // Step 4: assemble the final contexts list — own account first (if any),
  // then one entry per unique owner using the live owner name.
  const contexts: AccountContext[] = useMemo(() => {
    const list: AccountContext[] = []
    if (hasOwnAccount && user) {
      list.push({
        type: 'own',
        id: user.uid,
        name: 'My Account',
        userMode: ownUserMode,
      })
    }
    uniqueCaregiverEntries.forEach((ctx) => {
      const liveName = ownerNames[ctx.accountOwnerId] || ctx.accountOwnerName || 'Family'
      list.push({
        type: 'caregiver',
        id: ctx.accountOwnerId,
        name: `${liveName}'s Family`,
      })
    })
    return list
  }, [hasOwnAccount, ownUserMode, uniqueCaregiverEntries, ownerNames, user])

  // Step 5: pick the active context from the URL — caregiver path picks
  // that owner, anything else falls back to the own context.
  const currentContext: AccountContext | null = useMemo(() => {
    if (contexts.length === 0) return null
    if (pathname.startsWith('/caregiver/')) {
      const accountOwnerId = pathname.split('/')[2]
      return (
        contexts.find((ctx) => ctx.type === 'caregiver' && ctx.id === accountOwnerId) ||
        contexts[0]
      )
    }
    return contexts.find((ctx) => ctx.type === 'own') || contexts[0]
  }, [contexts, pathname])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSwitchContext = (context: AccountContext) => {
    if (context.type === 'own') {
      // Switch to own account - redirect to dashboard
      router.push('/dashboard')
    } else {
      // Switch to caregiver view
      router.push(`/caregiver/${context.id}`)
    }
    setIsOpen(false)
  }

  // Don't show if user only has one context
  if (loading || contexts.length <= 1) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-lg hover:border-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          {currentContext?.type === 'caregiver' ? (
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Viewing:</p>
            <p className="text-sm font-medium text-foreground">{currentContext?.name}</p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-card border-2 border-border rounded-lg shadow-lg z-50">
          <div className="p-2">
            <p className="text-xs text-muted-foreground px-3 py-2">Switch account</p>
            {contexts.map((context) => {
              const isActive = context.id === currentContext?.id && context.type === currentContext?.type

              return (
                <button
                  key={`${context.type}-${context.id}`}
                  onClick={() => handleSwitchContext(context)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {context.type === 'caregiver' ? (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{context.name}</p>
                    {context.type === 'own' && context.userMode && (
                      <p className="text-xs opacity-80 capitalize">
                        {context.userMode} mode
                      </p>
                    )}
                    {context.type === 'caregiver' && (
                      <p className="text-xs opacity-80">Caregiver access</p>
                    )}
                  </div>
                  {isActive && (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
