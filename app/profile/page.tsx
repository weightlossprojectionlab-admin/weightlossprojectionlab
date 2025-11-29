'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { signOut } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/auth/AuthGuard'
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
import { useTheme } from '@/hooks/useTheme'
import { logger } from '@/lib/logger'
import { useSubscription } from '@/hooks/useSubscription'
import { usePatientLimit } from '@/hooks/usePatientLimit'
import { PlanBadge } from '@/components/subscription/PlanBadge'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { usePatients } from '@/hooks/usePatients'
import { NotificationSettings } from '@/components/ui/NotificationPrompt'

function ProfileContent() {
  const { user } = useAuth()
  const router = useRouter()
  const { confirm, ConfirmDialog } = useConfirm()

  // Subscription state
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const { patients } = usePatients()
  const { current, max, percentage } = usePatientLimit(patients.length)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { isEnabled: stepTrackingEnabled, enableTracking, disableTracking, isTracking } = useStepTracking()
  const { theme, setTheme } = useTheme()
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [showHealthModal, setShowHealthModal] = useState(false)
  const [healthApp, setHealthApp] = useState<'apple-health' | 'google-fit' | 'none'>('none')
  const [sendingTestNotif, setSendingTestNotif] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkBiometricStatus()
  }, [user])

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return

      try {
        const profile = await userProfileOperations.getUserProfile()
        setProfileData(profile.data)
      } catch (error) {
        logger.error('Error fetching profile', error as Error)
        toast.error('Failed to load profile data')
      }
    }

    fetchProfile()
  }, [user])

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
        disableTracking()
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

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      // Only send user-editable fields, not system fields
      await userProfileOperations.updateUserProfile({
        preferences: {
          dietaryPreferences: profileData.preferences?.dietaryPreferences || []
        },
        profile: {
          foodAllergies: profileData.profile?.foodAllergies || [],
          healthConditions: profileData.profile?.healthConditions || []
        }
      })

      toast.success('Profile updated successfully!')
      setEditMode(false)

      // Refresh profile data
      const updated = await userProfileOperations.getUserProfile()
      setProfileData(updated.data)
    } catch (error) {
      logger.error('Save profile error', error as Error)
      toast.error('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = async () => {
    setEditMode(false)
    // Refresh to reset any unsaved changes
    try {
      const profile = await userProfileOperations.getUserProfile()
      setProfileData(profile.data)
    } catch (error) {
      logger.error('Error refreshing profile', error as Error)
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
            <h1 className="text-xl font-semibold text-foreground">Profile & Settings</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Profile Completeness Banner */}
        {profileData && (() => {
          const completeness = checkProfileCompleteness(profileData)
          return !completeness.isSafe && (
            <div className="bg-error-light dark:bg-red-900/20 border-2 border-error dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-bold text-error-dark dark:text-red-200 mb-1">
                    Confirm Your Dietary Information
                  </h3>
                  <p className="text-sm text-error-dark dark:text-red-300 mb-3">
                    We need to know if you have any dietary restrictions, allergies, or health conditions.
                    <strong> Even if you have none, please confirm by selecting "None".</strong>
                  </p>
                  <p className="text-xs text-error-dark dark:text-red-300">
                    Profile Completeness: {completeness.score}%
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Safety Information - MOST IMPORTANT */}
        {profileData && (
          <div className="bg-card rounded-lg p-6 shadow-sm border-2 border-error dark:border-red-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-foreground">⚠️ Dietary Information</h2>
                <p className="text-sm text-error">Please confirm (select "None" if you have no restrictions)</p>
              </div>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="btn btn-primary text-sm px-4 py-2"
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            {editMode ? (
              <div className="space-y-4">
                {/* Dietary Preferences */}
                <div>
                  <label className="text-label block mb-2">
                    Dietary Preferences
                    <span className="text-xs text-muted-foreground ml-2">(Select all that apply, or "None")</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProfileData((prev: any) => ({
                        ...prev,
                        preferences: { ...prev.preferences, dietaryPreferences: [] }
                      }))}
                      className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                        profileData?.preferences?.dietaryPreferences?.length === 0
                          ? 'border-success dark:border-success bg-success-light dark:bg-green-900/20 font-bold'
                          : 'border-border hover:border-success/50'
                      }`}
                    >
                      ✓ None
                    </button>
                    {['Vegan', 'Vegetarian', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'Low-Carb'].map(pref => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => {
                          const current = profileData?.preferences?.dietaryPreferences || []
                          const updated = current.includes(pref)
                            ? current.filter((p: string) => p !== pref)
                            : [...current, pref]
                          setProfileData((prev: any) => ({
                            ...prev,
                            preferences: { ...prev.preferences, dietaryPreferences: updated }
                          }))
                        }}
                        className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                          profileData?.preferences?.dietaryPreferences?.includes(pref)
                            ? 'border-primary bg-primary-light dark:bg-purple-900/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Food Allergies */}
                <div>
                  <label className="text-label block mb-2">
                    Food Allergies
                    <span className="text-xs text-muted-foreground ml-2">(Select all that apply, or "None")</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProfileData((prev: any) => ({
                        ...prev,
                        profile: { ...prev.profile, foodAllergies: [] }
                      }))}
                      className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                        profileData?.profile?.foodAllergies?.length === 0
                          ? 'border-success dark:border-success bg-success-light dark:bg-green-900/20 font-bold'
                          : 'border-border hover:border-success/50'
                      }`}
                    >
                      ✓ None
                    </button>
                    {['Peanuts', 'Tree Nuts', 'Dairy', 'Eggs', 'Shellfish', 'Soy', 'Wheat/Gluten', 'Fish'].map(allergy => (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => {
                          const current = profileData?.profile?.foodAllergies || []
                          const updated = current.includes(allergy)
                            ? current.filter((a: string) => a !== allergy)
                            : [...current, allergy]
                          setProfileData((prev: any) => ({
                            ...prev,
                            profile: { ...prev.profile, foodAllergies: updated }
                          }))
                        }}
                        className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                          profileData?.profile?.foodAllergies?.includes(allergy)
                            ? 'border-error dark:border-error bg-error-light dark:bg-red-900/20'
                            : 'border-border hover:border-error/50'
                        }`}
                      >
                        {allergy}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Health Conditions */}
                <div>
                  <label className="text-label block mb-2">Health Conditions</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProfileData((prev: any) => ({
                        ...prev,
                        profile: { ...prev.profile, healthConditions: [] }
                      }))}
                      className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                        profileData?.profile?.healthConditions?.length === 0
                          ? 'border-success dark:border-success bg-success-light dark:bg-green-900/20 font-bold'
                          : 'border-border hover:border-success/50'
                      }`}
                    >
                      ✓ None
                    </button>
                    {['Type 2 Diabetes', 'Heart Disease', 'High Blood Pressure', 'High Cholesterol'].map(condition => (
                      <button
                        key={condition}
                        type="button"
                        onClick={() => {
                          const current = profileData?.profile?.healthConditions || []
                          const updated = current.includes(condition)
                            ? current.filter((c: string) => c !== condition)
                            : [...current, condition]
                          setProfileData((prev: any) => ({
                            ...prev,
                            profile: { ...prev.profile, healthConditions: updated }
                          }))
                        }}
                        className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                          profileData?.profile?.healthConditions?.includes(condition)
                            ? 'border-warning dark:border-yellow-600 bg-warning-light'
                            : 'border-border hover:border-warning/50'
                        }`}
                      >
                        {condition}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save/Cancel Buttons */}
                <div className="flex space-x-3 pt-4 border-t border-border">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className={`btn btn-primary flex-1 inline-flex items-center justify-center space-x-2 ${saving ? 'cursor-wait' : ''}`}
                  >
                    {saving && <Spinner size="sm" />}
                    <span>{saving ? 'Saving...' : '💾 Save Changes'}</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-muted-foreground text-xs">Dietary Preferences</label>
                  <p className="font-medium">
                    {profileData?.preferences?.dietaryPreferences?.length > 0
                      ? profileData.preferences.dietaryPreferences.join(', ')
                      : 'None'}
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground text-xs">Food Allergies</label>
                  <p className="font-medium">
                    {profileData?.profile?.foodAllergies?.length > 0
                      ? profileData.profile.foodAllergies.join(', ')
                      : 'None'}
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground text-xs">Health Conditions</label>
                  <p className="font-medium">
                    {profileData?.profile?.healthConditions?.length > 0
                      ? profileData.profile.healthConditions.join(', ')
                      : 'None'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Account Information */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium text-foreground mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Account Created</label>
              <p className="font-medium">
                {user?.metadata?.creationTime ?
                  new Date(user.metadata.creationTime).toLocaleDateString() :
                  'Unknown'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        {subscription && !subscriptionLoading && (
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium text-foreground mb-4">Subscription</h2>

            <div className="space-y-4">
              {/* Current Plan */}
              <div>
                <label className="text-sm text-muted-foreground">Current Plan</label>
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
                <label className="text-sm text-muted-foreground">Family Members</label>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-foreground">
                      {current} of {max}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {percentage}% used
                    </span>
                  </div>
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
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <p className={`font-medium capitalize ${
                  subscription.status === 'active' ? 'text-success' :
                  subscription.status === 'trialing' ? 'text-warning-dark' :
                  'text-error'
                }`}>
                  {subscription.status}
                </p>
              </div>

              {/* Trial Info */}
              {subscription.trialEndsAt && subscription.status === 'trialing' && (
                <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Trial ends:</strong> {new Date(subscription.trialEndsAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Manage Button */}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                Manage Subscription
              </button>
            </div>
          </div>
        )}

        {/* Biometric Authentication Settings */}
        {mounted && (
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
                      <p className="text-sm text-muted-foreground">
                        {biometricEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${biometricEnabled ? 'bg-success' : 'bg-muted'}`} />
                </div>

                <p className="text-sm text-muted-foreground">
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
                  <div className="bg-indigo-100 dark:bg-indigo-900/20 rounded-lg p-3">
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

        {/* Privacy & Data Settings */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium text-foreground mb-4">Privacy & Data</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Data Export</p>
                <p className="text-sm text-muted-foreground">Download your personal data</p>
              </div>
              <button className="btn btn-secondary">
                📥 Export
              </button>
            </div>

            <div className="border-t border-border pt-4">
              <div className="bg-error-light dark:bg-red-900/20 border-2 border-error dark:border-red-800 rounded-lg p-4 mb-3">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-medium text-error-dark dark:text-red-200 mb-1">Reset All Data & Start Over</p>
                    <p className="text-sm text-error-dark dark:text-red-300">
                      If you entered false information during onboarding and want to start fresh with accurate data, use this option.
                      This will permanently delete ALL your data including meals, weight logs, and progress.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleResetAllData}
                disabled={resetLoading}
                className="btn btn-secondary w-full text-error border-error dark:border-error hover:bg-error-light dark:hover:bg-red-900/20 font-medium"
              >
                {resetLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="animate-spin w-5 h-5 border-2 border-error dark:border-error border-t-transparent rounded-full" />
                    <span>Resetting...</span>
                  </span>
                ) : (
                  '🔄 Reset All Data & Start Over'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* App Settings */}
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
                <p className="text-sm text-muted-foreground">
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

            {/* Theme Preference */}
            <div className="border-t border-border pt-4">
              <div className="mb-3">
                <p className="font-medium text-foreground">Theme</p>
                <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`
                    flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                    ${theme === 'light'
                      ? 'border-primary bg-primary-light'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <span className="text-2xl mb-2">☀️</span>
                  <span className="text-sm font-medium text-foreground">Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`
                    flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                    ${theme === 'dark'
                      ? 'border-primary bg-primary-light'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <span className="text-2xl mb-2">🌙</span>
                  <span className="text-sm font-medium text-foreground">Dark</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`
                    flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                    ${theme === 'system'
                      ? 'border-primary bg-primary-light'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <span className="text-2xl mb-2">🔄</span>
                  <span className="text-sm font-medium text-foreground">System</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Test Notification */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">🔔 Test Notifications</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Send a test notification to verify your notification setup is working correctly.
          </p>
          <button
            onClick={handleSendTestNotification}
            disabled={sendingTestNotif}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sendingTestNotif ? 'Sending Test...' : '📬 Send Test Notification'}
          </button>
        </div>

        {/* Notification Settings */}
        <NotificationSettings userId={user?.uid} />

        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Other Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Weight Units</p>
                <p className="text-sm text-muted-foreground">Pounds or kilograms</p>
              </div>
              <select className="form-input text-sm">
                <option value="lbs">Pounds (lbs)</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Health Sync */}
        <div className="bg-card rounded-lg shadow-sm">
          <HealthSyncCard onSetupClick={() => setShowHealthModal(true)} />
        </div>

        {/* Sign Out */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <button
            onClick={handleSignOut}
            disabled={signOutLoading}
            className={`btn btn-secondary w-full text-error border-error dark:border-error hover:bg-error-light dark:hover:bg-red-900/20 inline-flex items-center justify-center space-x-2 ${signOutLoading ? 'cursor-wait' : ''}`}
            aria-label="Sign out of account"
          >
            {signOutLoading && <Spinner size="sm" className="text-error" />}
            <span>{signOutLoading ? 'Signing Out...' : '🚪 Sign Out'}</span>
          </button>
        </div>

        {/* App Info */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>WLPL - Weight Loss Progress Lab</p>
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
        suggestedUpgrade="addon"
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