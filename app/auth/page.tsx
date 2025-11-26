'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { User } from 'firebase/auth'
import { signIn, signUp, signInWithGoogle, signInWithGoogleRedirect, checkSignInMethods } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  isBiometricSupported,
  registerBiometric,
  authenticateBiometric,
  hasBiometricCredential,
  getBiometricErrorMessage,
  checkBiometricPermissionStatus
} from '@/lib/webauthn'
import { checkBiometricPermission, getSettingsInstructions } from '@/lib/permissions'
import { userProfileOperations } from '@/lib/firebase-operations'
import { createDefaultProfile } from '@/lib/default-profile'
import { useAuth } from '@/hooks/useAuth'
import { determineUserDestination } from '@/lib/auth-router'

export default function AuthPage() {
  const { user: authUser, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const isInvitationFlow = searchParams.get('invitation') === 'true'
  const [isSignUp, setIsSignUp] = useState(isInvitationFlow) // Default to signup for invitations
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [showBiometricSetup, setShowBiometricSetup] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [suggestedAuthMethod, setSuggestedAuthMethod] = useState<'google' | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()

  // Check if user is already authenticated and redirect if needed
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (authLoading) {
        logger.debug('⏳ Auth page: Waiting for auth to load...')
        return
      }

      if (authUser) {
        logger.debug('✅ User already authenticated on /auth page, checking destination...')

        // Check if this is a redirect result from Google Sign-in and handle invitation flow
        const wasInvitationFlow = localStorage.getItem('isInvitationFlow') === 'true'
        if (wasInvitationFlow) {
          localStorage.removeItem('isInvitationFlow')
          const pendingCode = localStorage.getItem('pendingInvitationCode')

          logger.debug('🔗 Detected invitation flow after OAuth redirect', { pendingCode })

          if (pendingCode) {
            router.push(`/accept-invitation?code=${pendingCode}`)
          } else {
            router.push('/accept-invitation')
          }
          return
        }

        try {
          const destination = await determineUserDestination(authUser, '/auth')

          if (destination.type === 'dashboard') {
            logger.debug('➡️ Redirecting to dashboard:', { reason: destination.reason })
            router.push('/dashboard')
          } else if (destination.type === 'patients') {
            logger.debug('➡️ Redirecting to patients:', { reason: destination.reason })
            router.push('/patients')
          } else if (destination.type === 'onboarding') {
            logger.debug('➡️ Redirecting to onboarding:', { reason: destination.reason })
            router.push('/onboarding')
          } else if (destination.type === 'stay') {
            logger.debug('⚠️ User authenticated but destination is "stay" - allowing /auth access')
          }
        } catch (error) {
          logger.error('❌ Error checking auth destination:', error as Error)
        }
      }

      setCheckingAuth(false)
    }

    checkAuthStatus()
  }, [authUser, authLoading, router])

  // Check for WebAuthn and biometric support on component mount
  useEffect(() => {
    setMounted(true)
    checkBiometricSupport()
  }, [])

  const checkBiometricSupport = async () => {
    try {
      // Check both general support and permission status
      const permissionCheck = await checkBiometricPermission()
      const detailedStatus = await checkBiometricPermissionStatus()

      // Only show biometric option if it's supported and available
      const isSupported = permissionCheck.status !== 'unsupported' && detailedStatus.available
      setBiometricSupported(isSupported)

      if (!isSupported && detailedStatus.message) {
        logger.debug('Biometric status:', { message: detailedStatus.message })
      }
    } catch (error) {
      logger.error('Error checking biometric support:', error as Error)
      setBiometricSupported(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let user
      if (isSignUp) {
        user = await signUp(email, password)

        // Create user profile in Firestore
        if (user) {
          try {
            const profileData = createDefaultProfile(email, name || email.split('@')[0])
            await userProfileOperations.createUserProfile(profileData)
          } catch (profileError: any) {
            // Log error but don't block signup flow
            logger.error('Error creating user profile:', profileError)
            // If profile already exists (409), that's fine - just continue
            if (profileError.message && !profileError.message.includes('409') && !profileError.message.includes('already exists')) {
              setError('Account created but profile setup failed. Please contact support.')
            }
          }
        }
      } else {
        user = await signIn(email, password)
      }

      // For invitation flow, skip biometric setup and go directly to accept invitation
      if (isInvitationFlow && isSignUp) {
        const pendingCode = localStorage.getItem('pendingInvitationCode')
        if (pendingCode) {
          router.push(`/accept-invitation?code=${pendingCode}`)
        } else {
          router.push('/accept-invitation')
        }
        return
      }

      // For signup, show optional biometric setup
      if (isSignUp && biometricSupported && user) {
        setCurrentUser(user)
        setSignupSuccess(true)
        setShowBiometricSetup(true)
        return // Don't redirect yet, show biometric setup option
      }

      // For signup, redirect to onboarding; for login, redirect to dashboard
      if (isSignUp) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }

    } catch (error: any) {
      logger.error('Auth error:', error as Error)

      // Check if it's an invalid credential error
      if (error.code === 'auth/invalid-credential') {
        try {
          // Check what sign-in methods are available for this email
          const methods = await checkSignInMethods(email)

          if (methods.length === 0) {
            // No account exists - redirect to signup
            setError('No account found. Creating a new account...')
            setTimeout(() => {
              setIsSignUp(true)
              setError('')
            }, 1500)
          } else if (methods.includes('google.com')) {
            setError('This account uses Google sign-in. Please use the Google button below.')
            setSuggestedAuthMethod('google')
          } else if (methods.includes('password')) {
            setError('Invalid password. Please try again.')
          } else {
            setError(`This account uses a different sign-in method: ${methods[0]}`)
          }
        } catch (checkError) {
          // If we can't check methods, show helpful message
          setError('Invalid credentials. Please check your password or try signing in with Google.')
        }
      } else if (error.code === 'auth/user-not-found') {
        // User not found - redirect to signup
        setError('No account found. Redirecting to sign up...')
        setTimeout(() => {
          setIsSignUp(true)
          setError('')
        }, 1500)
      } else {
        setError(error.message || 'Authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBiometricAuth = async () => {
    if (!biometricSupported) {
      setError('Biometric authentication not supported on this device')
      return
    }

    if (!email) {
      setError('Please enter your email address first')
      return
    }

    setBiometricLoading(true)
    setError('')

    try {
      // First, try to sign in with email to get user ID
      const user = await signIn(email, 'temp-password') // This will fail, but that's OK
    } catch (authError) {
      // Expected to fail without password, but we need to get user info differently
      // In a real app, you'd have a separate endpoint to get user info by email

      try {
        // For demo purposes, assume user exists and use email as user ID
        const userId = btoa(email) // Base64 encode email as user ID

        // Check if biometric credential exists for this user
        if (!hasBiometricCredential(userId)) {
          setError('No biometric credentials found for this account. Please sign in with password first to register biometrics.')
          return
        }

        // Authenticate with biometrics
        const success = await authenticateBiometric(userId)

        if (success) {
          // For demo purposes, simulate a successful login
          // In a real app, you'd verify the biometric authentication on the server
          logger.debug('Biometric authentication successful')

          // Try to sign in with a placeholder (this is just for demo)
          // In production, you'd have a separate biometric auth endpoint
          router.push('/dashboard')
        }

      } catch (biometricError: any) {
        logger.error('Biometric auth error:', biometricError)
        setError(getBiometricErrorMessage(biometricError))
      }
    } finally {
      setBiometricLoading(false)
    }
  }

  const handleSetupBiometrics = async () => {
    if (!currentUser) return

    setBiometricLoading(true)
    setError('')

    try {
      // Check permission before attempting registration
      const permissionStatus = await checkBiometricPermissionStatus()

      if (!permissionStatus.available) {
        setError(permissionStatus.message)

        // Show settings instructions if biometric is supported but not set up
        if (permissionStatus.supported) {
          const instructions = getSettingsInstructions('biometric')
          setTimeout(() => {
            setError(`${permissionStatus.message}\n\nTo enable: ${instructions}`)
          }, 500)
        }
        return
      }

      await registerBiometric(currentUser.uid, currentUser.email || email)
      router.push('/onboarding')
    } catch (error: any) {
      logger.error('Biometric setup error:', error as Error)

      // Check if it's a permission error
      if (error.message?.includes('not available') || error.message?.includes('not supported')) {
        const instructions = getSettingsInstructions('biometric')
        setError(`${error.message}\n\nTo enable: ${instructions}`)
      } else {
        setError(getBiometricErrorMessage(error))
      }
    } finally {
      setBiometricLoading(false)
    }
  }

  const handleSkipBiometrics = () => {
    router.push('/onboarding')
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      // Store invitation code before redirect (if in invitation flow)
      if (isInvitationFlow) {
        const code = searchParams.get('code')
        if (code) {
          localStorage.setItem('pendingInvitationCode', code)
        }
        localStorage.setItem('isInvitationFlow', 'true')
      }

      // Use redirect method for better cross-origin compatibility
      await signInWithGoogleRedirect()
      // Redirect method will reload the page, so we don't need to handle user here
      return

      // Fallback to popup (not reached when using redirect)
      const user = await signInWithGoogle()

      // For invitation flow, redirect to accept invitation page
      if (isInvitationFlow) {
        const pendingCode = localStorage.getItem('pendingInvitationCode')
        if (pendingCode) {
          router.push(`/accept-invitation?code=${pendingCode}`)
        } else {
          router.push('/accept-invitation')
        }
        return
      }

      // Use centralized router to determine destination
      // Profile creation is handled automatically by determineUserDestination
      // (creates profile if missing, then routes to onboarding or dashboard)
      const destination = await determineUserDestination(user, '/auth')

      if (destination.type === 'onboarding') {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }

    } catch (error: any) {
      logger.error('Google sign in error:', error as Error)
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.')
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups and try again.')
      } else {
        setError(error.message || 'Google sign-in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Show loading spinner while checking authentication status
  if (authLoading || checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-purple-100 px-4 py-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-purple-100 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-foreground">
            WLPL
          </Link>
          <h2 className="mt-4">
            {isInvitationFlow
              ? 'Create account to accept invitation'
              : (isSignUp ? 'Create your account' : 'Sign in to your account')}
          </h2>
          <p className="mt-2 text-body-sm text-muted-foreground">
            {isInvitationFlow
              ? 'Sign up to view and accept your family care invitation'
              : 'Track your weight loss journey with AI-powered insights'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="notification notification-error">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Biometric Setup Modal */}
        {showBiometricSetup && signupSuccess && (
          <div className="bg-card rounded-lg shadow-lg hover:shadow-md transition-shadow p-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-success-light rounded-full flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>

              <div>
                <h2>Account Created Successfully!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Welcome to WLPL! Your account is ready to use.
                </p>
              </div>

              <div className="bg-indigo-100 dark:bg-indigo-900/20 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-2xl">🔐</span>
                  <div className="text-left">
                    <p className="font-medium text-accent-dark">Set Up Biometric Authentication</p>
                    <p className="text-sm text-accent-dark">
                      Use Touch ID or Face ID for quick, secure sign-in
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleSetupBiometrics}
                    disabled={biometricLoading}
                    className="btn btn-primary w-full"
                    aria-label="Set up biometric authentication"
                  >
                    {biometricLoading ? (
                      <span className="flex items-center justify-center space-x-2">
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        <span>Setting up...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center space-x-2">
                        <span>🔐</span>
                        <span>Set Up Touch/Face ID</span>
                      </span>
                    )}
                  </button>

                  <button
                    onClick={handleSkipBiometrics}
                    disabled={biometricLoading}
                    className="btn btn-secondary w-full"
                    aria-label="Skip biometric setup"
                  >
                    Skip for now
                  </button>
                </div>

                <p className="text-xs text-accent-dark mt-3">
                  You can always set this up later in your profile settings
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auth Form */}
        {!showBiometricSetup && (
          <>
            <form onSubmit={handleEmailAuth} className="space-y-6">
              <div className="space-y-4">
                {isSignUp && (
                  <div>
                    <label htmlFor="name" className="sr-only">
                      Full name
                    </label>
                    <input
                      id="name"
                  name="name"
                  type="text"
                  required={isSignUp}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  placeholder="Full name"
                  aria-label="Full name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setSuggestedAuthMethod(null)
                  setError('')
                }}
                className="form-input"
                placeholder="Email address"
                aria-label="Email address"
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Password"
                aria-label="Password"
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
              aria-label={isSignUp ? 'Create account' : 'Sign in'}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>

            {/* Biometric Authentication - DISABLED
                TODO: Implement proper biometric sign-in flow
                Requires:
                1. Backend API endpoint to verify WebAuthn assertion
                2. Store credential ID → Firebase UID mapping in Firestore
                3. Use Firebase Admin SDK to create custom token after verification
                4. Sign in with custom token on client

                For now, biometric setup is available after email/Google sign-in
            */}
            {/* {mounted && biometricSupported && !isSignUp && (
              <button
                type="button"
                onClick={handleBiometricAuth}
                disabled={loading || biometricLoading}
                className="btn btn-secondary w-full"
                aria-label="Sign in with biometrics"
              >
                {biometricLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="animate-spin w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full" />
                    <span>Authenticating...</span>
                  </span>
                ) : (
                  <>
                    <span className="text-lg" role="img" aria-label="fingerprint">
                      🔐
                    </span>
                    Sign in with Touch ID / Face ID
                  </>
                )}
              </button>
            )} */}

            {/* OAuth Options */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`btn w-full ${suggestedAuthMethod === 'google' ? 'btn-primary animate-pulse' : 'btn-secondary'}`}
              aria-label="Sign in with Google"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-5 h-5 border-2 border-accent-dark border-t-transparent rounded-full" />
                  <span>Signing in...</span>
                </span>
              ) : (
                <>
                  <span className="text-lg" role="img" aria-label="google">
                    📧
                  </span>
                  {suggestedAuthMethod === 'google' ? 'Sign in with Google (Recommended)' : 'Continue with Google'}
                </>
              )}
            </button>
          </div>
            </form>

            {/* Toggle Sign Up/Sign In */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setSuggestedAuthMethod(null)
                  setError('')
                }}
                className="text-sm text-accent hover:text-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                aria-label={isSignUp ? 'Switch to sign in' : 'Switch to sign up'}
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </>
        )}

        {/* Accessibility Note */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Fully accessible • Touch-optimized • Privacy-focused</p>
        </div>
      </div>
    </main>
  )
}