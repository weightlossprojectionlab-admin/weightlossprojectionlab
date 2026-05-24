'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { signOut } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/auth/AuthGuard'
import { getAuth, getIdToken } from 'firebase/auth'
import { useConfirm } from '@/hooks/useConfirm'
import { useStepTracking, StepTrackingProvider } from '@/components/StepTrackingProvider'
import { userProfileOperations } from '@/lib/firebase-operations'
import {
  isBiometricSupported,
  registerBiometric,
  removeBiometricCredential,
  hasBiometricCredential
} from '@/lib/webauthn'
import { checkProfileCompleteness } from '@/lib/profile-completeness'
import { Spinner } from '@/components/ui/Spinner'
import { HealthSyncCard } from '@/components/health/HealthSyncCard'
import { HealthConnectModal } from '@/components/health/HealthConnectModal'
import { detectPlatform, getHealthAppForPlatform } from '@/lib/health-sync-utils'
import { logger } from '@/lib/logger'
import { useSubscription } from '@/hooks/useSubscription'
import { hasActiveSubscription, isSubscriptionTerminated } from '@/lib/subscription-utils'
import { PlanDetailModal } from '@/components/subscription/PlanDetailModal'
import { useNotifications } from '@/hooks/useNotifications'
import { usePatientLimit } from '@/hooks/usePatientLimit'
import { PlanBadge } from '@/components/subscription/PlanBadge'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { usePatients } from '@/hooks/usePatients'
import { NotificationSettings } from '@/components/ui/NotificationPrompt'
import { NotificationPreferences } from '@/components/settings/NotificationPreferences'
import { AdvancedHealthProfile } from '@/components/profile/AdvancedHealthProfile'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { VitalType } from '@/types/medical'
import {
  getAllVitalTypes,
  VITAL_DISPLAY_NAMES,
  VITAL_ICONS,
  DEFAULT_FREQUENCIES,
  FREQUENCY_OPTIONS,
  FREQUENCY_LABELS,
  VitalFrequency,
  migrateLegacyWeightReminders
} from '@/lib/vital-reminder-logic'
import { updateVitalReminders } from '@/lib/services/patient-preferences'
import { getApplicableVitalTypes } from '@/lib/vital-applicability'
import { getCSRFToken } from '@/lib/csrf'
import { useFeatureGate } from '@/hooks/useFeatureGate'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getPatientBadgeLabel, getPatientDisplayName } from '@/lib/life-stage-utils'
import { UpgradeRequiredModal } from '@/components/subscription/UpgradeRequiredModal'
import { FeatureEnabledModal } from '@/components/subscription/FeatureEnabledModal'
import type { FeaturePreference, SubscriptionPlan } from '@/types'

function ProfileContent() {
  const { user } = useAuth()
  const router = useRouter()
  const { confirm, ConfirmDialog } = useConfirm()
  const { canAccess: hasMedicalFeatures } = useFeatureGate('medications')
  // "Send Test Reminder" is a developer affordance for verifying the FCM
  // pipeline — not something family-admins should see. Gate on platform
  // super-admin status.
  const { isSuperAdmin } = useAdminAuth()

  // Subscription state
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const { patients, loading: patientsLoading, refetch: refetchPatients } = usePatients()
  const { current, max, percentage } = usePatientLimit(patients.length)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  // Plan-detail modal opens from the Current Plan badge tap. Houses
  // the feature list + the Manage Subscription / Reactivate CTA.
  const [planDetailOpen, setPlanDetailOpen] = useState(false)
  const { isEnabled: stepTrackingEnabled, enableTracking, disableTracking, isTracking } = useStepTracking()

  // Push notification registration (FCM token + permission)
  const { requestPermission: registerForPushNotifications } = useNotifications(user?.uid)

  // Get user preferences from onboarding
  const userPrefs = useUserPreferences()
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [showHealthModal, setShowHealthModal] = useState(false)
  const [healthApp, setHealthApp] = useState<'apple-health' | 'google-fit' | 'none'>('none')
  const [sendingTestNotif, setSendingTestNotif] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')

  // Modal state for feature upgrade flow
  const [showUpgradeRequiredModal, setShowUpgradeRequiredModal] = useState(false)
  const [showFeatureEnabledModal, setShowFeatureEnabledModal] = useState(false)
  const [pendingFeature, setPendingFeature] = useState<FeaturePreference | null>(null)
  const [requiredPlan, setRequiredPlan] = useState<SubscriptionPlan>('single_plus')
  const [wasUpgradeRequired, setWasUpgradeRequired] = useState(false)

  // Use patients as family members (patients ARE the family members)
  const familyMembers = patients

  // Get the currently selected member (or null if viewing own profile)
  const currentlyViewingMember = selectedMemberId && selectedMemberId !== user?.uid
    ? familyMembers.find(m => m.id === selectedMemberId)
    : null

  // Detect if viewing a pet profile
  const isPetProfile = currentlyViewingMember?.type === 'pet' || !!currentlyViewingMember?.species

  // "Own profile view" — the account holder is looking at their own
  // surface. True when nothing is selected (legacy fallback, no
  // self-Patient yet) OR when the selected member IS the self-Patient
  // (relationship === 'self'). Account-level sections (Subscription,
  // Account Info, App Settings, Privacy, Sign Out, Health Sync,
  // Biometric Auth) gate on this predicate — they're owner-scoped,
  // not patient-scoped, so they should appear whenever the user is
  // viewing themselves regardless of how the self-Patient is selected
  // (the AccountSwitcher dedupe in Phase A removed the user.uid entry,
  // which previously was the only way to get currentlyViewingMember
  // to be null).
  const isOwnProfileView =
    !currentlyViewingMember || currentlyViewingMember.relationship === 'self'

  // Get the effective patient ID for medications (DRY)
  const effectivePatientId = selectedMemberId || user?.uid || ''

  // Debug logging for medication sync
  useEffect(() => {
    if (effectivePatientId) {
      logger.debug('[Profile] Patient ID for medications', {
        selectedMemberId,
        userId: user?.uid,
        effectivePatientId,
        currentMember: currentlyViewingMember?.name
      })
    }
  }, [effectivePatientId, selectedMemberId, user?.uid, currentlyViewingMember])

  useEffect(() => {
    setMounted(true)
    checkBiometricStatus()
  }, [user])

  // Set default to first family member when family members load
  useEffect(() => {
    // Only set default if not already selected and family members exist
    if (!selectedMemberId && familyMembers.length > 0 && !patientsLoading) {
      setSelectedMemberId(familyMembers[0].id)
    }
  }, [familyMembers, selectedMemberId, patientsLoading])

  // Real-time listener for profile data (uses onSnapshot for live updates)
  useEffect(() => {
    if (!user) return

    let unsubscribe: (() => void) | undefined
    let isMounted = true // Track if component is still mounted

    const setupRealtimeListener = async () => {
      try {
        // If a family member is selected, subscribe to their patient document
        if (selectedMemberId && selectedMemberId !== user.uid) {
          logger.debug('[Profile] Setting up real-time listener for patient', { selectedMemberId })

          // Import Firestore client
          const { db } = await import('@/lib/firebase')
          const { doc, onSnapshot, collection } = await import('firebase/firestore')

          // Check if still mounted after async import
          if (!isMounted) return

          // Subscribe to patient document changes
          const patientRef = doc(collection(db, 'users', user.uid, 'patients'), selectedMemberId)

          unsubscribe = onSnapshot(
            patientRef,
            (snapshot) => {
              // Only update state if component is still mounted
              if (!isMounted) return

              if (snapshot.exists()) {
                const data = snapshot.data()
                setProfileData({ id: snapshot.id, ...data })
                logger.debug('[Profile] Patient profile updated via onSnapshot', {
                  patientId: selectedMemberId,
                  vitalReminders: data?.preferences?.vitalReminders
                })
              } else {
                logger.warn('[Profile] Patient document not found', { selectedMemberId })
                toast.error('Patient profile not found')
              }
            },
            (error) => {
              if (!isMounted) return
              logger.error('[Profile] Real-time listener error', error)
              toast.error('Failed to sync profile data')
            }
          )
          return
        }

        // Otherwise load own profile (use API for user profile - no onSnapshot needed)
        const profile = await userProfileOperations.getUserProfile()

        // Only update state if component is still mounted
        if (isMounted) {
          setProfileData(profile.data)
        }
      } catch (error) {
        if (!isMounted) return
        logger.error('Error setting up profile listener', error as Error)
        toast.error('Failed to load profile data')
      }
    }

    setupRealtimeListener()

    // Cleanup listener on unmount or when selectedMemberId changes
    return () => {
      isMounted = false // Mark as unmounted
      if (unsubscribe) {
        logger.debug('[Profile] Cleaning up real-time listener')
        unsubscribe()
      }
    }
  }, [user, selectedMemberId])

  // Detect platform and health app
  useEffect(() => {
    const platform = detectPlatform()
    const app = getHealthAppForPlatform(platform)
    setHealthApp(app)
  }, [])

  const checkBiometricStatus = async () => {
    try {
      const supported = await isBiometricSupported()
      setBiometricSupported(supported)

      if (supported && user) {
        const enabled = await hasBiometricCredential(user.uid)
        setBiometricEnabled(enabled)
      }
    } catch (error) {
      logger.error('Error checking biometric status', error as Error)
    }
  }

  const handleEnableBiometrics = async () => {
    if (!user || !biometricSupported) return

    setLoading(true)
    try {
      await registerBiometric(user.uid, user.email || '')
      setBiometricEnabled(true)
      // No success toast — the "Enabled" status, green indicator dot,
      // and "Remove" button replacing "Set Up" are the confirmation.
    } catch (error: any) {
      logger.error('Failed to enable biometrics', error as Error)
      toast.error('Failed to set up biometric authentication: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDisableBiometrics = async () => {
    if (!user) return

    const confirmed = await confirm({
      title: 'Remove Biometric Authentication?',
      message: 'You will need to use your password to sign in after removing biometric authentication.',
      confirmText: 'Remove',
      cancelText: 'Keep It',
      variant: 'warning'
    })

    if (confirmed) {
      removeBiometricCredential(user.uid)
      setBiometricEnabled(false)
      // No success toast — UI state flips back to "Disabled" / "Set Up".
    }
  }

  const handleToggleStepTracking = async () => {
    try {
      if (stepTrackingEnabled) {
        await disableTracking()
      } else {
        await enableTracking()
      }
      // No success toast — toggle flips visually and the pulsing
      // green "tracking" dot appears/disappears next to the label.
    } catch (error) {
      logger.error('Toggle step tracking error', error as Error)
      toast.error('Failed to toggle step tracking. Please check device permissions.')
    }
  }

  const handleSignOut = async () => {
    setSignOutLoading(true)
    try {
      await signOut()
    } catch (error) {
      logger.error('Sign out error', error as Error)
      toast.error('Failed to sign out. Please try again.')
    } finally {
      setSignOutLoading(false)
    }
  }

  const handleSendVitalTestNotification = async (vitalType: string) => {
    try {
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        toast.error('Please sign in to send a test notification')
        return
      }

      const typeMap: Record<string, string> = {
        weight: 'weight_reminder',
        bloodPressure: 'general',
        glucose: 'general',
        heartRate: 'general',
        temperature: 'general',
        oxygenSaturation: 'general',
      }

      const sendTest = async (): Promise<Response> => {
        return fetch('/api/notifications/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': getCSRFToken(),
          },
          body: JSON.stringify({
            type: typeMap[vitalType] || 'general',
            vitalType,
            // patientId is omitted when viewing your own profile; backend treats
            // missing patientId as "self" and skips the family-member name suffix
            patientId: currentlyViewingMember?.id,
          }),
        })
      }

      let response = await sendTest()
      let result = await response.json()

      // If this browser has no FCM token (or has a stale one the server just pruned),
      // register it now and retry once — saves the user a hidden manual step.
      const needsRegister = !response.ok && (response.status === 400 || response.status === 410)
      if (needsRegister) {
        toast.loading('Registering this device for notifications...', { id: 'fcm-register' })
        const registered = await registerForPushNotifications()
        toast.dismiss('fcm-register')
        if (!registered) {
          toast.error(result.error || 'Could not register this device for notifications')
          return
        }
        response = await sendTest()
        result = await response.json()
      }

      if (response.ok) {
        toast.success('Test reminder sent! Check your notifications.')
      } else {
        toast.error(result.error || 'Failed to send test reminder')
      }
    } catch (error) {
      toast.error('Failed to send test reminder')
    }
  }

  const handleSendTestNotification = async () => {
    setSendingTestNotif(true)
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        toast.error('Your browser does not support notifications')
        return
      }

      // Check if service worker is available
      if (!('serviceWorker' in navigator)) {
        toast.error('Service workers not supported. Please use a modern browser.')
        return
      }

      // Check current permission
      let permission = Notification.permission

      // Request permission if not granted
      if (permission === 'default') {
        logger.debug('[Profile] Requesting notification permission...')
        permission = await Notification.requestPermission()
      }

      if (permission === 'denied') {
        toast.error('Notification permission denied. Please enable notifications in your browser settings.')
        return
      }

      if (permission === 'granted') {
        // Wait for service worker to be ready (critical for mobile)
        logger.debug('[Profile] Waiting for service worker...')
        const swReg = await navigator.serviceWorker.ready
        logger.debug('[Profile] Service worker ready, showing notification...')

        // Use ServiceWorkerRegistration.showNotification() — required on mobile
        // (new Notification() is blocked on Android/iOS browsers)
        await swReg.showNotification('🎉 Test Notification', {
          body: 'Your notifications are working! You\'ll receive helpful reminders to stay on track.',
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: 'test-notification',
          requireInteraction: false,
          silent: false
        })

        toast.success('Test notification sent! You should see it now.')
        logger.info('[Test Notification] Browser notification sent successfully')
      }
    } catch (error) {
      logger.error('Error sending test notification:', error as Error)
      const errorMsg = (error as Error).message
      if (errorMsg.includes('service worker')) {
        toast.error('Service worker not ready. Please refresh the page and try again.')
      } else {
        toast.error('Failed to send test notification: ' + errorMsg)
      }
    } finally {
      setSendingTestNotif(false)
    }
  }

  const handleResetAllData = async () => {
    const confirmed = await confirm({
      title: '⚠️ Reset All Data & Start Over?',
      message: 'This will PERMANENTLY delete:\n\n• All meal logs and photos\n• All weight history\n• All step tracking data\n• Your entire profile and goals\n\nYou will start fresh from onboarding. This action CANNOT be undone!\n\nAre you absolutely sure?',
      confirmText: 'Yes, Delete Everything',
      cancelText: 'Cancel',
      variant: 'danger'
    })

    if (!confirmed) return

    // Double confirmation for extra safety
    const doubleConfirmed = await confirm({
      title: 'Final Confirmation',
      message: 'This is your last chance to cancel. All your data will be permanently deleted and cannot be recovered.\n\nType "DELETE" in your mind and click confirm if you are absolutely certain.',
      confirmText: 'DELETE EVERYTHING',
      cancelText: 'No, Keep My Data',
      variant: 'danger'
    })

    if (!doubleConfirmed) return

    setResetLoading(true)
    try {
      await userProfileOperations.resetAllData()
      toast.success('All data has been reset. Redirecting to onboarding...')

      // Wait a moment for the user to see the message
      setTimeout(() => {
        router.push('/onboarding')
      }, 2000)
    } catch (error) {
      logger.error('Reset all data error', error as Error)
      toast.error('Failed to reset data. Please try again or contact support.')
      setResetLoading(false)
    }
  }

  const handleSaveAdvancedProfile = async (updates: any) => {
    try {
      // If viewing a family member, update their patient record
      if (currentlyViewingMember) {
        // Merge the updates with existing patient data (use profileData for fresh data)
        const updatedPatientData = {
          ...profileData,
          ...updates,
          // Ensure required fields are present
          name: profileData?.name || currentlyViewingMember.name,
          relationship: profileData?.relationship || currentlyViewingMember.relationship,
          userId: profileData?.userId || currentlyViewingMember.userId,
        }

        // Get Firebase auth token (bypasses CSRF check in middleware)
        const auth = getAuth()
        const currentUser = auth.currentUser
        if (!currentUser) {
          throw new Error('Not authenticated')
        }
        const authToken = await currentUser.getIdToken()

        const csrfToken = getCSRFToken()
        const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(updatedPatientData)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to update patient profile')
        }

        toast.success(`${getPatientDisplayName(currentlyViewingMember)}'s health profile updated successfully!`)

        // Refresh the patient data by refetching from the updated response
        const result = await response.json()
        // API returns data in result.data (not result.patient)
        setProfileData(result.data || { ...currentlyViewingMember, ...updates })
      } else {
        // Saving own profile - need to structure the data correctly for user profile API
        const userProfileUpdates = {
          profile: {
            foodAllergies: updates.foodAllergies,
            healthConditions: updates.healthConditions,
            conditionDetails: updates.conditionDetails,
          },
          preferences: {
            dietaryPreferences: updates.dietaryPreferences,
          },
          lifestyle: updates.lifestyle,
          bodyMeasurements: updates.bodyMeasurements,
        }

        await userProfileOperations.updateUserProfile(userProfileUpdates)
        toast.success('Health profile updated successfully!')

        // Refresh profile data
        const updated = await userProfileOperations.getUserProfile()
        setProfileData(updated.data)
      }
    } catch (error: any) {
      console.error('Full save error:', error)
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        response: error?.response,
        stack: error?.stack
      })
      logger.error('Save advanced profile error', error as Error)
      toast.error(error?.message || 'Failed to save health profile. Please try again.')
      throw error
    }
  }

  const handleEnableHealthSync = () => {
    // The HealthSyncCard will handle the actual sync enabling
    // This just closes the modal
    setShowHealthModal(false)
  }

  return (
    <>
      <ConfirmDialog />
      <main className="min-h-screen bg-card">
        {/* Header */}
        <header className="bg-card shadow-sm">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-primary hover:text-primary"
              aria-label="Back to dashboard"
            >
              ← Back
            </Link>
            <div className="flex-1">
              {(() => {
                // Self-Patient is the account holder — read as "Your
                // Profile & Settings" rather than the templated possessive
                // form that would otherwise jam "You" into the slot and
                // produce "You's health information". `relationship: 'self'`
                // is the canonical self-Patient flag (lib/self-patient.ts).
                const isSelfMember = currentlyViewingMember?.relationship === 'self'
                return (
                  <>
                    <h1 className="text-xl font-semibold text-foreground">
                      {currentlyViewingMember && !isSelfMember
                        ? `${getPatientDisplayName(currentlyViewingMember)}'s Profile`
                        : 'Your Profile & Settings'
                      }
                    </h1>
                    {currentlyViewingMember && !isSelfMember && (
                      <p className="text-description-sm">
                        Managing {getPatientBadgeLabel(currentlyViewingMember)}&apos;s health information
                      </p>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Family Member Selector - ALWAYS SHOW */}
        <div className="bg-gradient-to-r from-primary-light to-accent-light rounded-lg p-6 shadow-lg border-2 border-primary/30">
          {/* Mobile: avatar+title row at top, pill row below (left-aligned).
              Desktop: avatar+title on left, pill on right of the same row. */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-3xl flex-shrink-0">
                {currentlyViewingMember ? '👥' : '🙋'}
              </div>
              <div className="min-w-0">
                <div className="text-label-sm uppercase tracking-wide mb-1">
                  ⭐ Currently Viewing
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {currentlyViewingMember
                    ? getPatientDisplayName(currentlyViewingMember)
                    : (user?.displayName || 'You')}
                </h2>
                <p className="text-description mt-1">
                  {currentlyViewingMember && currentlyViewingMember.relationship !== 'self'
                    ? `${getPatientBadgeLabel(currentlyViewingMember)}'s Health Profile`
                    : 'Your Personal Health Profile'
                  }
                </p>
              </div>
            </div>
            {/* Badge: only show "Family Member" for actual family members,
                not the account holder's self-Patient. The self-Patient
                gets the "Currently Viewing" header above; no extra chip
                needed (and "Family Member" badge would be semantically
                wrong — the user isn't a family member of themselves). */}
            {currentlyViewingMember && currentlyViewingMember.relationship !== 'self' && (
              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 flex-shrink-0">
                <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full uppercase whitespace-nowrap">
                  Family Member
                </span>
                <span className="text-description-sm">
                  {getPatientBadgeLabel(currentlyViewingMember)}
                </span>
              </div>
            )}
          </div>

          {patientsLoading ? (
            <div className="border-t border-gray-300 pt-4">
              <p className="text-description">Loading family members...</p>
            </div>
          ) : familyMembers.length > 0 ? (
            <div className="border-t border-gray-300 pt-4">
              <label className="block text-sm font-bold text-foreground mb-3">
                💫 Switch to Different Profile:
              </label>
              {(() => {
                // Source of truth for the account holder's identity is
                // the self-Patient (`relationship === 'self'`), which
                // already appears in familyMembers/patients. Only fall
                // back to the Auth.displayName entry when no self-Patient
                // exists yet (legacy accounts before lib/self-patient.ts
                // auto-creation). Without this guard the dropdown showed
                // BOTH entries — Auth name + self-Patient name — which
                // diverged when onboarding captured a different name
                // than Google provided. The self-Patient is canonical.
                const hasSelfPatient = familyMembers.some(
                  (m) => m.relationship === 'self',
                )
                return (
                  <select
                    value={selectedMemberId || user?.uid || ''}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 font-semibold text-base"
                  >
                    {!hasSelfPatient && (
                      <option value={user?.uid || ''}>
                        🙋 {user?.displayName || 'Me'} (Account Settings)
                      </option>
                    )}
                    {familyMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        👥 {getPatientDisplayName(member)} ({getPatientBadgeLabel(member)})
                      </option>
                    ))}
                  </select>
                )
              })()}
              <p className="text-description-sm mt-2">
                Select a family member to view and manage their health information
              </p>
            </div>
          ) : (
            <div className="border-t border-gray-300 pt-4">
              <p className="text-description">
                No family members in household yet. Add family members from the dashboard to manage their health profiles.
              </p>
            </div>
          )}
        </div>

        {/* Advanced Health Profile Component - Only show if health_medical feature enabled */}
        {profileData && userPrefs.hasFeature('health_medical') && (
          <AdvancedHealthProfile
            profileData={profileData}
            onSave={handleSaveAdvancedProfile}
            isPatientProfile={!!currentlyViewingMember}
            patientId={effectivePatientId}
          />
        )}

        {/* Account Information - Only show for own profile */}
        {isOwnProfileView && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium text-foreground mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-label mb-1">Email</label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-label mb-1">Account Created</label>
              <p className="font-medium">
                {user?.metadata?.creationTime ?
                  new Date(user.metadata.creationTime).toLocaleDateString() :
                  'Unknown'
                }
              </p>
            </div>
          </div>
          </div>
        )}

        {/* Subscription Section - Only show for own profile */}
        {isOwnProfileView && subscription && !subscriptionLoading && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium text-foreground mb-4">Subscription</h2>

            <div className="space-y-4">
              {/* Terminated-state banner — appears above the plan/usage
                  panels so the user understands at a glance that the
                  details below are historical, not currently active. */}
              {isSubscriptionTerminated(subscription) && (
                <div className="bg-error/5 border border-error/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-error mb-1">
                    Your subscription has ended
                  </p>
                  <p className="text-xs text-foreground/80">
                    The plan and limits below show what you had on your previous subscription.
                    Reactivate to restore access.
                  </p>
                </div>
              )}

              {/* Current Plan — visually muted when terminated so the
                  badge doesn't read as "active high-tier user."
                  Tap the badge to open the plan-detail modal, which
                  shows the full feature list + the Manage Subscription
                  CTA (active) or Reactivate (terminated). This is the
                  canonical entry point to the Customer Portal now
                  that the profile-page footer is trialing-only. */}
              <div className={isSubscriptionTerminated(subscription) ? 'opacity-50' : ''}>
                <label className="text-label mb-2">
                  {isSubscriptionTerminated(subscription) ? 'Previous Plan' : 'Current Plan'}
                </label>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setPlanDetailOpen(true)}
                    className="rounded-full hover:opacity-90 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-label={`View ${subscription.plan} plan details and manage subscription`}
                  >
                    <PlanBadge
                      plan={subscription.plan}
                      addons={subscription.addons}
                      status={subscription.status}
                      size="lg"
                    />
                  </button>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Tap to see what&apos;s included{hasActiveSubscription(subscription) ? ' · manage subscription' : ''}
                  </p>
                </div>
              </div>

              {/* Usage Stats — muted when terminated. The seat counts
                  reflect the terminated plan's limits and aren't the
                  user's current entitlements; opacity makes that clear
                  without hiding history. */}
              <div className={isSubscriptionTerminated(subscription) ? 'opacity-50' : ''}>
                <label className="text-label mb-2">Family Members</label>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-foreground flex items-center gap-2">
                      {(max ?? 0) >= 999 ? (
                        <>
                          {current} of <span className="text-2xl">∞</span>
                        </>
                      ) : (
                        `${current} of ${max}`
                      )}
                    </span>
                    {(max ?? 0) < 999 && (
                      <span className="text-description">
                        {percentage}% used
                      </span>
                    )}
                    {(max ?? 0) >= 999 && (
                      <span className="text-sm text-success font-medium">
                        Unlimited
                      </span>
                    )}
                  </div>
                  {(max ?? 0) < 999 && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentage >= 100 ? 'bg-error' :
                          percentage >= 80 ? 'bg-warning-dark' :
                          'bg-success'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}
                  {(max ?? 0) >= 999 && (
                    <div className="h-2 bg-success rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full w-full" />
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-label mb-1">Status</label>
                <p className={`font-medium capitalize ${
                  subscription.status === 'active' ? 'text-success' :
                  subscription.status === 'trialing' ? 'text-warning-dark' :
                  'text-error'
                }`}>
                  {subscription.status}
                </p>
              </div>

              {/* Trial Info with Upgrade CTA */}
              {subscription.status === 'trialing' && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-blue-900 mb-1">
                        🎁 Free Trial Active
                      </p>
                      <p className="text-sm text-blue-800">
                        Trial ends:{' '}
                        <strong>
                          {(() => {
                            try {
                              if (!subscription.trialEndsAt) return 'Soon'
                              const date = typeof subscription.trialEndsAt === 'object' && subscription.trialEndsAt && 'toDate' in subscription.trialEndsAt && typeof (subscription.trialEndsAt as any).toDate === 'function'
                                ? (subscription.trialEndsAt as any).toDate()
                                : new Date(subscription.trialEndsAt as any)
                              return isNaN(date.getTime()) ? 'Soon' : date.toLocaleDateString()
                            } catch {
                              return 'Soon'
                            }
                          })()}
                        </strong>
                      </p>
                      <p className="text-xs text-blue-700 mt-2">
                        Unlock all features and never lose access to your health data
                      </p>
                    </div>
                    <a
                      href="/pricing"
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                    >
                      Upgrade Now
                    </a>
                  </div>
                </div>
              )}

              {/* Trial-conversion CTA lives inside the "Free Trial
                  Active" banner above ("Upgrade Now") — that's the
                  contextual placement (banner explains trial-ending
                  semantics + CTA right next to it). The redundant
                  full-width "Subscribe Now" button below it was
                  removed in identity Phase A polish; both linked to
                  /pricing and both gated on the same trialing status,
                  so the dupe added clutter without surfacing anything
                  new.

                  Non-trialing states are still handled elsewhere:
                    - active: Customer Portal opens via the plan
                      badge → PlanDetailModal → Manage Subscription.
                    - terminated: limited-access + FOMO mechanics
                      (deferred — see project_pricing_deferred_features
                      .md). Reactivation happens in-context via locked
                      affordances; terminated users can hit /pricing
                      directly until those FOMO surfaces ship. */}
            </div>
          </div>
        )}

        {/* Biometric Authentication Settings - Only show for own profile */}
        {isOwnProfileView && mounted && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium text-foreground mb-4">
              Biometric Authentication
            </h2>

            {!biometricSupported ? (
              <div className="bg-warning-light border border-warning-light rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-medium text-warning-dark">Not Available</p>
                    <p className="text-sm text-yellow-700">
                      Biometric authentication is not supported on this device or browser.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {biometricEnabled ? '🔐' : '🔓'}
                    </span>
                    <div>
                      <p className="font-medium">
                        Touch ID / Face ID
                      </p>
                      <p className="text-description">
                        {biometricEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${biometricEnabled ? 'bg-success' : 'bg-muted'}`} />
                </div>

                <p className="text-description">
                  {biometricEnabled ?
                    'You can sign in using your fingerprint or face recognition.' :
                    'Use your fingerprint or face recognition for quick and secure sign-in.'
                  }
                </p>

                <div className="pt-2">
                  {biometricEnabled ? (
                    <button
                      onClick={handleDisableBiometrics}
                      className="btn btn-secondary w-full"
                      aria-label="Disable biometric authentication"
                    >
                      🗑️ Remove Biometric Authentication
                    </button>
                  ) : (
                    <button
                      onClick={handleEnableBiometrics}
                      disabled={loading}
                      className="btn btn-primary w-full"
                      aria-label="Enable biometric authentication"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center space-x-2">
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                          <span>Setting up...</span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center space-x-2">
                          <span>🔐</span>
                          <span>Set Up Biometric Authentication</span>
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {biometricSupported && (
                  <div className="bg-accent-light rounded-lg p-3">
                    <p className="text-xs text-accent-dark">
                      <strong>Compatible devices:</strong> iPhone with Touch/Face ID,
                      Android with fingerprint, Windows with Windows Hello
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* App Settings - Only show step tracking for own profile */}
        {isOwnProfileView && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium text-foreground mb-4">App Settings</h2>
          <div className="space-y-4">
            {/* Automatic Step Tracking */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <p className="font-medium">Automatic Step Tracking</p>
                  {isTracking && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                  )}
                </div>
                <p className="text-description">
                  {stepTrackingEnabled ? 'Counting steps in background' : 'Count steps automatically using device sensors'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={stepTrackingEnabled}
                  onChange={handleToggleStepTracking}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

          </div>
          </div>
        )}

        {/* Reminders Settings - Hide vital reminders for pets, filter by onboarding goals */}
        {!isPetProfile && (userPrefs.hasFeature('health_medical') || userPrefs.getAllFeatures().length === 0) && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">⏰ Vital Sign Reminders</h2>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
              {currentlyViewingMember ? getPatientDisplayName(currentlyViewingMember) : 'You'}
            </span>
          </div>
          <p className="text-description mb-6">
            Configure reminders to log vital signs at regular intervals for <strong>{currentlyViewingMember ? getPatientDisplayName(currentlyViewingMember) : 'yourself'}</strong>. Each family member has their own reminder settings. For advanced schedules with specific times, use the Vitals Wizard in the patient detail page.
          </p>

          <div className="space-y-6">
            {/* Life-stage / species-aware vital list. Newborns and infants
                see neonatal vitals (heart rate, respiratory rate, etc) and
                NOT adult-only ones like blood pressure/sugar. Pets get the
                species-specific set. See lib/vital-applicability.ts. */}
            {getApplicableVitalTypes(
              currentlyViewingMember
                ? { type: currentlyViewingMember.type, species: currentlyViewingMember.species, dateOfBirth: currentlyViewingMember.dateOfBirth }
                : { type: 'human', dateOfBirth: profileData?.dateOfBirth }
            ).map((vitalType) => {
              // Get current settings (migrate legacy weight settings if needed)
              const vitalReminders = profileData?.preferences?.vitalReminders || {}
              let vitalConfig = vitalReminders[vitalType]

              // Auto-migrate legacy weight reminder settings
              if (vitalType === 'weight' && !vitalConfig) {
                vitalConfig = migrateLegacyWeightReminders(
                  profileData?.preferences?.disableWeightReminders,
                  profileData?.preferences?.weightCheckInFrequency
                )
              }

              // Trust the saved config exactly — no implicit "weight defaults
              // to on" fallback. Previously: when vitalConfig was missing or
              // had been cleared, the weight toggle re-rendered as enabled
              // even after the user had disabled it. "Off should mean off."
              // New patients can be initialized via initializeDefaultPreferences
              // at creation time if a default-on weight reminder is desired.
              const isEnabled = vitalConfig?.enabled === true
              const currentFrequency = vitalConfig?.frequency || DEFAULT_FREQUENCIES[vitalType]
              const availableFrequencies = FREQUENCY_OPTIONS[vitalType]

              // DRY: Shared function to save vital reminder settings
              const saveVitalReminders = async (updatedVitalReminders: any) => {
                console.log('[Profile] Saving vital reminders:', {
                  updatedVitalReminders,
                  isPatient: !!currentlyViewingMember,
                  patientId: effectivePatientId,
                  currentPreferences: profileData?.preferences
                })

                // Ensure we preserve all existing preferences including required fields like 'units'
                const currentPrefs = profileData?.preferences || {}

                // Validate and set units field (required by API - must be exactly "metric" or "imperial")
                const validUnits = currentPrefs.units === 'metric' || currentPrefs.units === 'imperial'
                  ? currentPrefs.units
                  : 'imperial'

                const mergedPreferences = {
                  ...currentPrefs,
                  units: validUnits,
                  vitalReminders: {
                    ...(currentPrefs.vitalReminders || {}),
                    ...updatedVitalReminders
                  }
                }

                console.log('[Profile] Merged preferences being sent:', {
                  mergedPreferences,
                  originalUnits: currentPrefs.units,
                  validatedUnits: validUnits
                })

                // If viewing a family member, save to their patient profile
                if (currentlyViewingMember) {
                  const auth = getAuth()
                  const currentUser = auth.currentUser
                  if (!currentUser) {
                    throw new Error('Not authenticated')
                  }
                  const authToken = await currentUser.getIdToken()
                  const csrfToken = getCSRFToken()

                  // Send only the preferences field (API will deep merge)
                  const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${authToken}`,
                      'X-CSRF-Token': csrfToken,
                    },
                    body: JSON.stringify({
                      preferences: mergedPreferences
                    })
                  })

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    const errorMsg = errorData.error || `Server returned ${response.status}`
                    logger.error('[Profile] Failed to update patient vital reminders', undefined, {
                      status: response.status,
                      errorData,
                      patientId: currentlyViewingMember.id
                    })
                    throw new Error(errorMsg)
                  }

                  // Refresh patient data from the API response
                  const result = await response.json()
                  // API returns data in result.data (not result.patient)
                  setProfileData(result.data)
                } else {
                  // Saving own profile
                  await userProfileOperations.updateUserProfile({
                    preferences: mergedPreferences
                  })

                  // Fetch fresh profile data from server
                  const updated = await userProfileOperations.getUserProfile()
                  setProfileData(updated.data)
                }

                console.log('[Profile] Vital reminders saved successfully')
              }

              return (
                <div key={vitalType} className="border-b border-border last:border-0 pb-6 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{VITAL_ICONS[vitalType]}</span>
                        <h3 className="font-medium text-foreground">
                          {VITAL_DISPLAY_NAMES[vitalType]} Reminders
                        </h3>
                      </div>
                      <p className="text-description mt-1">
                        Get reminded to log your {VITAL_DISPLAY_NAMES[vitalType].toLowerCase()} based on your check-in frequency
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const updatedVitalReminders = {
                            ...vitalReminders,
                            [vitalType]: {
                              enabled: !isEnabled,
                              frequency: currentFrequency
                            }
                          }

                          await saveVitalReminders(updatedVitalReminders)
                          // No success toast — the toggle color flip + the
                          // frequency dropdown appearing/disappearing IS the
                          // confirmation. Rapid double-taps were stacking
                          // toasts.
                        } catch (error) {
                          logger.error('[Profile] Failed to update vital reminder settings', error as Error)
                          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
                          toast.error(`Failed to update reminder settings: ${errorMsg}`)
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        isEnabled
                          ? 'bg-primary'
                          : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isEnabled
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Frequency Selector */}
                  {isEnabled && (
                    <div className="mt-4 pl-4 border-l-2 border-primary/30">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Check-in Frequency
                      </label>
                      <select
                        value={currentFrequency}
                        onChange={async (e) => {
                          try {
                            const newFrequency = e.target.value as VitalFrequency
                            const updatedVitalReminders = {
                              ...vitalReminders,
                              [vitalType]: {
                                enabled: true,
                                frequency: newFrequency
                              }
                            }

                            await saveVitalReminders(updatedVitalReminders)
                            // No success toast — the dropdown already shows
                            // the new value the user just picked.
                          } catch (error) {
                            logger.error('[Profile] Failed to update frequency', error as Error)
                            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
                            toast.error(`Failed to update frequency: ${errorMsg}`)
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {availableFrequencies.map((freq) => (
                          <option key={freq} value={freq}>
                            {FREQUENCY_LABELS[freq]}
                          </option>
                        ))}
                      </select>
                      <p className="text-description-sm mt-2">
                        You'll be reminded to log your {VITAL_DISPLAY_NAMES[vitalType].toLowerCase()} when it's due
                      </p>
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleSendVitalTestNotification(vitalType)}
                          className="mt-3 text-sm px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                        >
                          🔔 Send Test Reminder
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-description">
              <strong>💡 Tip:</strong> Need specific times (e.g., "8am, 12pm, 4pm, 8pm")?
              Use the <strong>Vitals Wizard</strong> in the patient detail page for advanced scheduling with compliance tracking.
            </p>
          </div>
          </div>
        )}

        {/* Pet Reminder Settings - Show for pets instead of vital reminders */}
        {isPetProfile && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{currentlyViewingMember?.species === 'Dog' ? '🐕' : currentlyViewingMember?.species === 'Cat' ? '🐱' : currentlyViewingMember?.species === 'Bird' ? '🦜' : currentlyViewingMember?.species === 'Fish' ? '🐠' : '🐾'}</span>
                <h2 className="text-lg font-medium text-foreground">Pet Health Reminders</h2>
              </div>
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                {currentlyViewingMember?.name}
              </span>
            </div>
            <p className="text-description mb-6">
              Configure reminders for <strong>{currentlyViewingMember?.name}'s</strong> health and care needs.
            </p>

            <div className="space-y-6">
              {/* Feeding Reminders */}
              <div className="border-b border-border pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">🔔</span>
                      <h3 className="font-medium text-foreground">Feeding Reminders</h3>
                    </div>
                    <p className="text-description mt-1">
                      Get notified when it's time to feed {currentlyViewingMember?.name}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const currentValue = profileData?.preferences?.petReminders?.feeding?.enabled ?? true

                        const auth = getAuth()
                        const currentUser = auth.currentUser
                        if (!currentUser) throw new Error('Not authenticated')
                        const authToken = await currentUser.getIdToken()
                        const csrfToken = getCSRFToken()

                        const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
                            'Authorization': `Bearer ${authToken}`,
                          },
                          body: JSON.stringify({
                            preferences: {
                              ...profileData?.preferences,
                              petReminders: {
                                ...profileData?.preferences?.petReminders,
                                feeding: {
                                  enabled: !currentValue,
                                  minutesBefore: profileData?.preferences?.petReminders?.feeding?.minutesBefore || 15
                                }
                              }
                            }
                          })
                        })

                        if (!response.ok) throw new Error('Failed to update reminder settings')

                        const result = await response.json()
                        setProfileData(result.data)

                        // No success toast — toggle visual flip is the confirmation.
                      } catch (error) {
                        toast.error('Failed to update reminder settings')
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      profileData?.preferences?.petReminders?.feeding?.enabled ?? true
                        ? 'bg-primary'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        profileData?.preferences?.petReminders?.feeding?.enabled ?? true
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {(profileData?.preferences?.petReminders?.feeding?.enabled ?? true) && (
                  <div className="mt-4 pl-4 border-l-2 border-primary/30">
                    <p className="text-description-sm">
                      ⚙️ Feeding times are configured in the <a href={`/patients/${currentlyViewingMember?.id}`} className="text-primary hover:underline">Feeding Schedule</a>
                    </p>
                  </div>
                )}
              </div>

              {/* Vaccination Reminders */}
              <div className="border-b border-border pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">💉</span>
                      <h3 className="font-medium text-foreground">Vaccination & Prevention Reminders</h3>
                    </div>
                    <p className="text-description mt-1">
                      Get reminded when vaccinations or preventive treatments are due
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const currentValue = profileData?.preferences?.petReminders?.vaccinations?.enabled ?? true

                        const auth = getAuth()
                        const currentUser = auth.currentUser
                        if (!currentUser) throw new Error('Not authenticated')
                        const authToken = await currentUser.getIdToken()
                        const csrfToken = getCSRFToken()

                        const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
                            'Authorization': `Bearer ${authToken}`,
                          },
                          body: JSON.stringify({
                            preferences: {
                              ...profileData?.preferences,
                              petReminders: {
                                ...profileData?.preferences?.petReminders,
                                vaccinations: {
                                  enabled: !currentValue,
                                  daysBefore: profileData?.preferences?.petReminders?.vaccinations?.daysBefore || 7
                                }
                              }
                            }
                          })
                        })

                        if (!response.ok) throw new Error('Failed to update reminder settings')

                        const result = await response.json()
                        setProfileData(result.data)

                        // No success toast — toggle visual flip is the confirmation.
                      } catch (error) {
                        toast.error('Failed to update reminder settings')
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      profileData?.preferences?.petReminders?.vaccinations?.enabled ?? true
                        ? 'bg-primary'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        profileData?.preferences?.petReminders?.vaccinations?.enabled ?? true
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {(profileData?.preferences?.petReminders?.vaccinations?.enabled ?? true) && (
                  <div className="mt-4 pl-4 border-l-2 border-primary/30">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Remind me before
                    </label>
                    <select
                      value={profileData?.preferences?.petReminders?.vaccinations?.daysBefore || 7}
                      onChange={async (e) => {
                        try {
                          const daysBefore = parseInt(e.target.value)

                          const auth = getAuth()
                          const currentUser = auth.currentUser
                          if (!currentUser) throw new Error('Not authenticated')
                          const authToken = await currentUser.getIdToken()
                          const csrfToken = getCSRFToken()

                          const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
                              'Authorization': `Bearer ${authToken}`,
                            },
                            body: JSON.stringify({
                              preferences: {
                                ...profileData?.preferences,
                                petReminders: {
                                  ...profileData?.preferences?.petReminders,
                                  vaccinations: {
                                    enabled: true,
                                    daysBefore
                                  }
                                }
                              }
                            })
                          })

                          if (!response.ok) throw new Error('Failed to update reminder settings')

                          const result = await response.json()
                          setProfileData(result.data)

                          // No success toast — dropdown already shows the new value.
                        } catch (error) {
                          toast.error('Failed to update reminder settings')
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="1">1 day before</option>
                      <option value="3">3 days before</option>
                      <option value="7">1 week before</option>
                      <option value="14">2 weeks before</option>
                      <option value="30">1 month before</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Medication Reminders */}
              <div className="border-b border-border pb-6 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">💊</span>
                      <h3 className="font-medium text-foreground">Medication Reminders</h3>
                    </div>
                    <p className="text-description mt-1">
                      Get reminded when it's time to give medications
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const currentValue = profileData?.preferences?.petReminders?.medications?.enabled ?? true

                        const auth = getAuth()
                        const currentUser = auth.currentUser
                        if (!currentUser) throw new Error('Not authenticated')
                        const authToken = await currentUser.getIdToken()
                        const csrfToken = getCSRFToken()

                        const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
                            'Authorization': `Bearer ${authToken}`,
                          },
                          body: JSON.stringify({
                            preferences: {
                              ...profileData?.preferences,
                              petReminders: {
                                ...profileData?.preferences?.petReminders,
                                medications: {
                                  enabled: !currentValue,
                                  minutesBefore: profileData?.preferences?.petReminders?.medications?.minutesBefore || 15
                                }
                              }
                            }
                          })
                        })

                        if (!response.ok) throw new Error('Failed to update reminder settings')

                        const result = await response.json()
                        setProfileData(result.data)

                        // No success toast — toggle visual flip is the confirmation.
                      } catch (error) {
                        toast.error('Failed to update reminder settings')
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      profileData?.preferences?.petReminders?.medications?.enabled ?? true
                        ? 'bg-primary'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        profileData?.preferences?.petReminders?.medications?.enabled ?? true
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {(profileData?.preferences?.petReminders?.medications?.enabled ?? true) && (
                  <div className="mt-4 pl-4 border-l-2 border-primary/30">
                    <p className="text-description-sm">
                      ⚙️ Medication schedules are configured in the <a href={`/patients/${currentlyViewingMember?.id}`} className="text-primary hover:underline">Medications section</a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-description">
                <strong>💡 Tip:</strong> Configure specific feeding times, medication schedules, and veterinary appointments in <a href={`/patients/${currentlyViewingMember?.id}`} className="text-primary hover:underline font-semibold">{currentlyViewingMember?.name}'s Dashboard</a>.
              </p>
            </div>
          </div>
        )}

        {/* Upsell: Health & Medical Tracking - Show if user didn't select medical_tracking */}
        {!isPetProfile && isOwnProfileView && userPrefs.getAllFeatures().length > 0 && !userPrefs.hasFeature('health_medical') && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💊</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-900 mb-2">Track Health & Medical Records</h3>
                <p className="text-description mb-4">
                  Track appointments, medications, vital signs (blood pressure, glucose, etc.), and health records all in one place.
                </p>
                <button
                  onClick={async () => {
                    if (!user?.uid) return

                    // Use feature enablement helper to check user intent
                    const { canEnableFeature, enableFeature, getFeatureMessages } = await import('@/lib/feature-enablement')

                    const result = canEnableFeature(user as any, 'health_medical')
                    const messages = getFeatureMessages('health_medical')

                    if (result.requiresUpgrade) {
                      // Show upgrade modal instead of redirecting
                      const { getRequiredPlanForFeature } = await import('@/lib/feature-enablement')
                      setPendingFeature('health_medical')
                      setRequiredPlan(getRequiredPlanForFeature('health_medical') as SubscriptionPlan)
                      setWasUpgradeRequired(true)
                      setShowUpgradeRequiredModal(true)
                    } else if (result.canEnable) {
                      // User has subscription, enable the preference
                      try {
                        const currentFeatures = userPrefs.getAllFeatures()
                        const enableResult = await enableFeature(
                          currentFeatures,
                          'health_medical',
                          userPrefs.preferences
                        )

                        if (enableResult.success) {
                          setPendingFeature('health_medical')
                          setWasUpgradeRequired(false)
                          setShowFeatureEnabledModal(true)
                        } else {
                          toast.error(enableResult.error || 'Failed to enable feature')
                        }
                      } catch (error) {
                        toast.error('Failed to enable feature. Please try again.')
                        logger.error('Failed to enable health_medical', error as Error)
                      }
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                >
                  {hasMedicalFeatures ? 'Enable Health & Medical Tracking' : 'Upgrade to Enable'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Preferences - Filter by onboarding goals */}
        {user?.uid && (userPrefs.hasFeature('health_medical') || userPrefs.hasFeature('nutrition_kitchen') || userPrefs.getAllFeatures().length === 0) && (
          <NotificationPreferences userId={user.uid} />
        )}

        {/* Legacy Notification Settings */}
        {(userPrefs.getAllFeatures().length === 0 || userPrefs.getAllFeatures().some(pref =>
          ['meal_planning', 'weight_loss', 'medical_tracking', 'vitals', 'medications', 'fitness', 'body_fitness', 'health_medical', 'nutrition_kitchen'].includes(pref)
        )) && <NotificationSettings userId={user?.uid} />}

        {/* Health Sync - Only show for own profile (not pets or family members) */}
        {isOwnProfileView && !isPetProfile && (
          <div className="bg-card rounded-lg shadow-sm">
            <HealthSyncCard onSetupClick={() => setShowHealthModal(true)} />
          </div>
        )}

        {/* Privacy & Data Settings - Only show for own profile */}
        {isOwnProfileView && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium text-foreground mb-4">Privacy & Data</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Data Export</p>
                <p className="text-description">Download your personal data</p>
              </div>
              <button className="btn btn-secondary">
                📥 Export
              </button>
            </div>

            <div className="border-t border-border pt-4">
              <div className="bg-error-light border-2 border-error rounded-lg p-4 mb-3">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-error-dark mb-1">Reset All Data & Start Over</p>
                    <p className="text-sm text-error-dark">
                      If you entered false information during onboarding and want to start fresh with accurate data, use this option.
                      This will permanently delete ALL your data including meals, weight logs, and progress.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleResetAllData}
                disabled={resetLoading}
                className="btn btn-secondary w-full text-error border-error hover:bg-error-light font-semibold"
              >
                {resetLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="animate-spin w-5 h-5 border-2 border-error border-t-transparent rounded-full" />
                    <span>Resetting...</span>
                  </span>
                ) : (
                  '🔄 Reset All Data & Start Over'
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Sign Out - Only show for own profile */}
        {isOwnProfileView && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
          <button
            onClick={handleSignOut}
            disabled={signOutLoading}
            className={`btn btn-secondary w-full text-error border-error hover:bg-error-light inline-flex items-center justify-center space-x-2 ${signOutLoading ? 'cursor-wait' : ''}`}
            aria-label="Sign out of account"
          >
            {signOutLoading && <Spinner size="sm" className="text-error" />}
            <span>{signOutLoading ? 'Signing Out...' : '🚪 Sign Out'}</span>
          </button>
          </div>
        )}

        {/* App Info */}
        <div className="text-center text-description space-y-1">
          <p>WPL - Wellness Projection Lab</p>
          <p>Version 1.0.0</p>
          <p>Privacy-focused • Secure • Accessible</p>
        </div>
      </div>

      {/* Health Connect Modal */}
      <HealthConnectModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        healthApp={healthApp}
        onEnableSync={handleEnableHealthSync}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={subscription?.plan}
      />

      {/* Plan-detail modal — opens when user taps the Current Plan
          badge above. Shows feature list for the user's plan and
          surfaces the Manage Subscription path (active) or Reactivate
          (terminated). This is the canonical Customer Portal entry
          point now that the page footer is trialing-only. */}
      <PlanDetailModal
        isOpen={planDetailOpen}
        onClose={() => setPlanDetailOpen(false)}
        subscription={subscription}
      />

      {/* Upgrade Required Modal - Feature Gate */}
      {pendingFeature && (
        <UpgradeRequiredModal
          isOpen={showUpgradeRequiredModal}
          onClose={() => {
            setShowUpgradeRequiredModal(false)
            setPendingFeature(null)
          }}
          feature={pendingFeature}
          currentPlan={(subscription?.plan || 'free') as SubscriptionPlan}
          requiredPlan={requiredPlan}
          onConfirm={async () => {
            const { trackFeatureIntent } = await import('@/lib/feature-enablement')
            if (user?.uid) {
              await trackFeatureIntent(user.uid, pendingFeature, '/profile')
            }
            router.push('/pricing')
          }}
        />
      )}

      {/* Feature Enabled Modal - Success Celebration */}
      {pendingFeature && (
        <FeatureEnabledModal
          isOpen={showFeatureEnabledModal}
          onClose={() => {
            setShowFeatureEnabledModal(false)
            setPendingFeature(null)
          }}
          feature={pendingFeature}
          wasUpgradeRequired={wasUpgradeRequired}
        />
      )}
    </main>
    </>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <StepTrackingProvider>
        <ProfileContent />
      </StepTrackingProvider>
    </AuthGuard>
  )
}