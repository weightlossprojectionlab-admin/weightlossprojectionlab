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

function ProfileContent() {
  const { user } = useAuth()
  const router = useRouter()
  const { confirm, ConfirmDialog } = useConfirm()

  // Subscription state
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const { patients, loading: patientsLoading, refetch: refetchPatients } = usePatients()
  const { current, max, percentage } = usePatientLimit(patients.length)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { isEnabled: stepTrackingEnabled, enableTracking, disableTracking, isTracking } = useStepTracking()

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

  // Use patients as family members (patients ARE the family members)
  const familyMembers = patients

  // Get the currently selected member (or null if viewing own profile)
  const currentlyViewingMember = selectedMemberId && selectedMemberId !== user?.uid
    ? familyMembers.find(m => m.id === selectedMemberId)
    : null

  // Detect if viewing a pet profile
  const isPetProfile = currentlyViewingMember?.type === 'pet' || !!currentlyViewingMember?.species

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

    const setupRealtimeListener = async () => {
      try {
        // If a family member is selected, subscribe to their patient document
        if (selectedMemberId && selectedMemberId !== user.uid) {
          logger.debug('[Profile] Setting up real-time listener for patient', { selectedMemberId })

          // Import Firestore client
          const { db } = await import('@/lib/firebase')
          const { doc, onSnapshot, collection } = await import('firebase/firestore')

          // Subscribe to patient document changes
          const patientRef = doc(collection(db, 'users', user.uid, 'patients'), selectedMemberId)

          unsubscribe = onSnapshot(
            patientRef,
            (snapshot) => {
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
              logger.error('[Profile] Real-time listener error', error)
              toast.error('Failed to sync profile data')
            }
          )
          return
        }

        // Otherwise load own profile (use API for user profile - no onSnapshot needed)
        const profile = await userProfileOperations.getUserProfile()
        setProfileData(profile.data)
      } catch (error) {
        logger.error('Error setting up profile listener', error as Error)
        toast.error('Failed to load profile data')
      }
    }

    setupRealtimeListener()

    // Cleanup listener on unmount or when selectedMemberId changes
    return () => {
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
      toast.success('Biometric authentication enabled successfully!')
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
      toast.success('Biometric authentication removed.')
    }
  }

  const handleToggleStepTracking = async () => {
    try {
      if (stepTrackingEnabled) {
        await disableTracking()
        toast.success('Automatic step tracking disabled')
      } else {
        await enableTracking()
        toast.success('Automatic step tracking enabled! Your steps will be counted in the background.')
      }
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

  const handleSendTestNotification = async () => {
    setSendingTestNotif(true)
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        toast.error('Your browser does not support notifications')
        return
      }

      // Check current permission
      let permission = Notification.permission

      // Request permission if not granted
      if (permission === 'default') {
        permission = await Notification.requestPermission()
      }

      if (permission === 'denied') {
        toast.error('Notification permission denied. Please enable notifications in your browser settings.')
        return
      }

      if (permission === 'granted') {
        // Send a browser notification directly
        const notification = new Notification('🎉 Test Notification', {
          body: 'Your notifications are working! You\'ll receive helpful reminders to stay on track.',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'test-notification',
          requireInteraction: false,
          silent: false
        })

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000)

        // Handle click
        notification.onclick = () => {
          window.focus()
          notification.close()
        }

        toast.success('Test notification sent! You should see it now.')
        logger.info('[Test Notification] Browser notification sent successfully')
      }
    } catch (error) {
      logger.error('Error sending test notification:', error as Error)
      toast.error('Failed to send test notification: ' + (error as Error).message)
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

        const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(updatedPatientData)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to update patient profile')
        }

        toast.success(`${currentlyViewingMember.name}'s health profile updated successfully!`)

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
              <h1 className="text-xl font-semibold text-foreground">
                {currentlyViewingMember
                  ? `${currentlyViewingMember.name}'s Profile`
                  : 'Your Profile & Settings'
                }
              </h1>
              {currentlyViewingMember && (
                <p className="text-description-sm">
                  Managing {currentlyViewingMember.relationship}&apos;s health information
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Family Member Selector - ALWAYS SHOW */}
        <div className="bg-gradient-to-r from-primary-light to-accent-light rounded-lg p-6 shadow-lg border-2 border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-3xl">
                {currentlyViewingMember ? '👥' : '🙋'}
              </div>
              <div>
                <div className="text-label-sm uppercase tracking-wide mb-1">
                  ⭐ Currently Viewing
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {currentlyViewingMember ? currentlyViewingMember.name : (user?.displayName || 'You')}
                </h2>
                <p className="text-description mt-1">
                  {currentlyViewingMember
                    ? `${currentlyViewingMember.relationship}'s Health Profile`
                    : 'Your Personal Health Profile'
                  }
                </p>
              </div>
            </div>
            {currentlyViewingMember && (
              <div className="flex flex-col items-end gap-2">
                <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full uppercase">
                  Family Member
                </span>
                <span className="text-description-sm">
                  {currentlyViewingMember.relationship}
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
              <select
                value={selectedMemberId || user?.uid || ''}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 font-semibold text-base"
              >
                <option value={user?.uid || ''}>🙋 {user?.displayName || 'Me'} (My Profile)</option>
                {familyMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    👥 {member.name} ({member.relationship})
                  </option>
                ))}
              </select>
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

        {/* Advanced Health Profile Component */}
        {profileData && (
          <AdvancedHealthProfile
            profileData={profileData}
            onSave={handleSaveAdvancedProfile}
            isPatientProfile={!!currentlyViewingMember}
            patientId={effectivePatientId}
          />
        )}

        {/* Account Information - Only show for own profile */}
        {!currentlyViewingMember && (
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
        {!currentlyViewingMember && subscription && !subscriptionLoading && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium text-foreground mb-4">Subscription</h2>

            <div className="space-y-4">
              {/* Current Plan */}
              <div>
                <label className="text-label mb-2">Current Plan</label>
                <div className="mt-2">
                  <PlanBadge
                    plan={subscription.plan}
                    addons={subscription.addons}
                    status={subscription.status}
                    size="lg"
                  />
                </div>
              </div>

              {/* Usage Stats */}
              <div>
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
              {subscription.trialEndsAt && subscription.status === 'trialing' && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-blue-900 mb-1">
                        🎁 Free Trial Active
                      </p>
                      <p className="text-sm text-blue-800">
                        Trial ends:{' '}
                        <strong>
                          {typeof subscription.trialEndsAt === 'object' && subscription.trialEndsAt && 'toDate' in subscription.trialEndsAt && typeof (subscription.trialEndsAt as any).toDate === 'function'
                            ? (subscription.trialEndsAt as any).toDate().toLocaleDateString()
                            : new Date(subscription.trialEndsAt as any).toLocaleDateString()}
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

              {/* Manage Button - Only show if user has a Stripe customer ID */}
              {subscription.stripeCustomerId && (
                <button
                  onClick={async () => {
                    try {
                      const { createPortalSession } = await import('@/lib/stripe-client')
                      await createPortalSession(window.location.href)
                    } catch (error: any) {
                      console.error('Failed to open customer portal:', error)
                      const errorMessage = error?.message || 'Failed to open subscription management. Please try again.'
                      alert(errorMessage)
                    }
                  }}
                  className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Manage Subscription
                </button>
              )}

              {/* Upgrade or Pricing Button - Show if no Stripe customer ID */}
              {!subscription.stripeCustomerId && (
                <Link
                  href="/pricing"
                  className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-center block"
                >
                  {subscription.plan === 'free' || subscription.plan === 'family_premium' ? 'View Plans' : 'Upgrade Plan'}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Biometric Authentication Settings - Only show for own profile */}
        {!currentlyViewingMember && mounted && (
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
        {!currentlyViewingMember && (
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
        {!isPetProfile && (userPrefs.featurePreferences.includes('vitals') || userPrefs.featurePreferences.includes('medical_tracking') || userPrefs.featurePreferences.length === 0) && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">⏰ Vital Sign Reminders</h2>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
              {currentlyViewingMember ? currentlyViewingMember.name : 'You'}
            </span>
          </div>
          <p className="text-description mb-6">
            Configure reminders to log vital signs at regular intervals for <strong>{currentlyViewingMember ? currentlyViewingMember.name : 'yourself'}</strong>. Each family member has their own reminder settings. For advanced schedules with specific times, use the Vitals Wizard in the patient detail page.
          </p>

          <div className="space-y-6">
            {getAllVitalTypes().map((vitalType) => {
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

              const isEnabled = vitalConfig?.enabled ?? (vitalType === 'weight') // Weight enabled by default
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

                // Use centralized service to merge preferences (DRY)
                const mergedPreferences = updateVitalReminders(
                  profileData?.preferences,
                  updatedVitalReminders
                )

                // If viewing a family member, save to their patient profile
                if (currentlyViewingMember) {
                  const auth = getAuth()
                  const currentUser = auth.currentUser
                  if (!currentUser) {
                    throw new Error('Not authenticated')
                  }
                  const authToken = await currentUser.getIdToken()

                  // Send only the preferences field (API will deep merge)
                  const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                      preferences: mergedPreferences
                    })
                  })

                  if (!response.ok) {
                    throw new Error('Failed to update patient vital reminders')
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

                          toast.success(
                            !isEnabled
                              ? `${VITAL_DISPLAY_NAMES[vitalType]} reminders enabled`
                              : `${VITAL_DISPLAY_NAMES[vitalType]} reminders disabled`
                          )
                        } catch (error) {
                          toast.error('Failed to update reminder settings')
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
                            toast.success('Check-in frequency updated')
                          } catch (error) {
                            toast.error('Failed to update frequency')
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

                        const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
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

                        toast.success(
                          !currentValue
                            ? 'Feeding reminders enabled'
                            : 'Feeding reminders disabled'
                        )
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

                        const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
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

                        toast.success(
                          !currentValue
                            ? 'Vaccination reminders enabled'
                            : 'Vaccination reminders disabled'
                        )
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

                          const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
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

                          toast.success('Reminder timing updated')
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

                        const response = await fetch(`/api/patients/${currentlyViewingMember.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
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

                        toast.success(
                          !currentValue
                            ? 'Medication reminders enabled'
                            : 'Medication reminders disabled'
                        )
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

        {/* Upsell: Vital Tracking - Show if user didn't select vitals or medical_tracking */}
        {!isPetProfile && !currentlyViewingMember && userPrefs.featurePreferences.length > 0 && !userPrefs.featurePreferences.includes('vitals') && !userPrefs.featurePreferences.includes('medical_tracking') && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-4xl">📊</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-900 mb-2">Track Your Vital Signs</h3>
                <p className="text-description mb-4">
                  Monitor blood pressure, blood sugar, heart rate, and other vital signs. Get reminders and track trends over time.
                </p>
                <button
                  onClick={() => router.push('/onboarding')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                >
                  Enable Vital Tracking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upsell: Medical Tracking - Show if user didn't select medical_tracking or medications */}
        {!isPetProfile && !currentlyViewingMember && userPrefs.featurePreferences.length > 0 && !userPrefs.featurePreferences.includes('medical_tracking') && !userPrefs.featurePreferences.includes('medications') && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💊</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-900 mb-2">Manage Medications & Appointments</h3>
                <p className="text-description mb-4">
                  Track medications, schedule appointments, and never miss a dose or visit with smart reminders.
                </p>
                <button
                  onClick={() => router.push('/onboarding')}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                >
                  Enable Medical Tracking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Test Notification */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">🔔 Test Notifications</h3>
          <p className="text-description mb-4">
            Send a test notification to verify your notification setup is working correctly.
          </p>
          <button
            onClick={handleSendTestNotification}
            disabled={sendingTestNotif}
            className="btn btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sendingTestNotif ? 'Sending Test...' : '📬 Send Test Notification'}
          </button>
        </div>

        {/* Notification Preferences - Filter by onboarding goals */}
        {user?.uid && (userPrefs.featurePreferences.includes('medical_tracking') || userPrefs.featurePreferences.includes('medications') || userPrefs.featurePreferences.includes('meal_planning') || userPrefs.featurePreferences.length === 0) && (
          <NotificationPreferences userId={user.uid} />
        )}

        {/* Legacy Notification Settings */}
        {(userPrefs.featurePreferences.length === 0 || userPrefs.featurePreferences.some(pref =>
          ['meal_planning', 'weight_loss', 'medical_tracking', 'vitals', 'medications', 'fitness'].includes(pref)
        )) && <NotificationSettings userId={user?.uid} />}

        {/* Health Sync - Only show for own profile (not pets or family members) */}
        {!currentlyViewingMember && !isPetProfile && (
          <div className="bg-card rounded-lg shadow-sm">
            <HealthSyncCard onSetupClick={() => setShowHealthModal(true)} />
          </div>
        )}

        {/* Privacy & Data Settings - Only show for own profile */}
        {!currentlyViewingMember && (
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
        {!currentlyViewingMember && (
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
          <p>WLPL - Weight Loss Projection Lab</p>
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