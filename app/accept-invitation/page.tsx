/**
 * Accept Family Invitation Page
 *
 * Allows users to accept invitations via invite code
 * Shows permissions and patient access before accepting
 * Redirects to onboarding after acceptance
 */

'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { medicalOperations } from '@/lib/medical-operations'
import { PageHeader } from '@/components/ui/PageHeader'
import { PERMISSION_LABELS } from '@/lib/family-permissions'
import type { FamilyInvitation } from '@/types/medical'
import toast from 'react-hot-toast'

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AcceptInvitationContent />
    </Suspense>
  )
}

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '')
  const [invitation, setInvitation] = useState<FamilyInvitation | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHipaaModal, setShowHipaaModal] = useState(false)
  const [hipaaAcknowledged, setHipaaAcknowledged] = useState(false)

  // Auto-verify if code is in URL
  useEffect(() => {
    if (inviteCode && !invitation && !verifying) {
      handleVerifyCode()
    }
  }, [inviteCode])

  const handleVerifyCode = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setVerifying(true)
    setError(null)

    try {
      // Verify invitation by code via public API endpoint
      const response = await fetch(`/api/invitations/verify?code=${encodeURIComponent(inviteCode.toUpperCase().trim())}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to verify invite code')
      }

      const foundInvitation = await response.json()

      if (foundInvitation.status !== 'pending') {
        setError(`This invitation has already been ${foundInvitation.status}`)
        setInvitation(null)
      } else {
        // Check if expired
        const now = new Date()
        const expiresAt = new Date(foundInvitation.expiresAt)
        if (now > expiresAt) {
          setError('This invitation has expired')
          setInvitation(null)
        } else {
          setInvitation(foundInvitation)
          setError(null)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify invite code')
      setInvitation(null)
    } finally {
      setVerifying(false)
    }
  }

  const handleAccept = async () => {
    if (!invitation) return

    // If user is not authenticated, save invitation code and redirect to signup
    if (!user) {
      // Store invitation code in localStorage for after signup
      localStorage.setItem('pendingInvitationCode', inviteCode)
      router.push('/auth?invitation=true')
      return
    }

    // If user IS authenticated, show HIPAA modal before accepting
    setShowHipaaModal(true)
  }

  const handleHipaaAcknowledge = async () => {
    if (!hipaaAcknowledged) {
      toast.error('Please acknowledge HIPAA privacy requirements to continue')
      return
    }

    if (!invitation) return

    setLoading(true)
    try {
      // Accept invitation with HIPAA acknowledgment
      await medicalOperations.family.acceptInvitation(invitation.id, {
        hipaaAcknowledged: true,
        acknowledgedAt: new Date().toISOString()
      })
      toast.success('Invitation accepted!')

      // Check if user has their own account (onboarding completed)
      const userProfileResponse = await fetch('/api/users/profile')
      const userProfile = userProfileResponse.ok ? await userProfileResponse.json() : null

      const hasOwnAccount = userProfile?.data?.profile?.onboardingCompleted === true

      // Redirect based on account status
      setTimeout(() => {
        if (hasOwnAccount) {
          // User has their own account - redirect to family dashboard (can switch contexts)
          router.push('/family/dashboard')
        } else {
          // User is caregiver-only - redirect to caregiver-only dashboard
          router.push(`/caregiver/${invitation.invitedByUserId}`)
        }
      }, 1000)
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept invitation')
      setError(err.message || 'Failed to accept invitation')
    } finally {
      setLoading(false)
      setShowHipaaModal(false)
    }
  }

  const handleDecline = () => {
    if (confirm('Are you sure you want to decline this invitation?')) {
      router.push('/family')
    }
  }

  const grantedPermissions = invitation
    ? Object.entries(invitation.permissions).filter(([_, value]) => value)
    : []

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Accept Family Invitation"
        subtitle="Enter your invite code to view and accept the invitation"
      />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Invite Code Entry */}
        {!invitation && (
          <div className="bg-card rounded-lg border-2 border-border p-8 mb-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Enter Invite Code</h2>
              <p className="text-muted-foreground">
                You should have received an invite code via email
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground text-center text-xl font-mono tracking-wider focus:border-primary focus:ring-2 focus:ring-purple-600/20 uppercase"
                  maxLength={20}
                />
              </div>

              {error && (
                <div className="bg-error-light border-2 border-error rounded-lg p-4">
                  <p className="text-sm text-error-dark">{error}</p>
                </div>
              )}

              <button
                onClick={handleVerifyCode}
                disabled={verifying || !inviteCode.trim()}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {verifying ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          </div>
        )}

        {/* Invitation Details */}
        {invitation && (
          <div className="space-y-6">
            {/* Inviter Info */}
            <div className="bg-card rounded-lg border-2 border-border p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl text-primary font-bold">
                    {invitation.invitedByName[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {invitation.invitedByName}
                  </h3>
                  <p className="text-muted-foreground">
                    has invited you to access family health records
                  </p>
                  {invitation.message && (
                    <div className="mt-4 p-4 bg-primary-light border-l-4 border-primary rounded">
                      <p className="text-sm text-foreground italic">
                        "{invitation.message}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Patient Access */}
            <div className="bg-card rounded-lg border-2 border-border p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Patient Access
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                You will have access to {invitation.patientsShared.length} patient record(s)
              </p>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-primary-light text-primary-dark rounded-full text-sm font-medium">
                  {invitation.patientsShared.length} {invitation.patientsShared.length === 1 ? 'Patient' : 'Patients'}
                </span>
              </div>
            </div>

            {/* Permissions */}
            <div className="bg-card rounded-lg border-2 border-border p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Permissions Granted
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                You will be able to:
              </p>
              <div className="grid gap-3">
                {grantedPermissions.map(([key, _]) => (
                  <div key={key} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <div className="w-6 h-6 bg-success-light rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-success-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-foreground">
                      {PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expiration Warning */}
            <div className="bg-warning-light border-2 border-warning rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-warning-dark flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-warning-dark">
                    This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleAccept}
                disabled={loading}
                className="flex-1 px-6 py-4 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
              >
                {loading ? 'Accepting...' : 'Accept Invitation'}
              </button>
              <button
                onClick={handleDecline}
                disabled={loading}
                className="px-6 py-4 border-2 border-border text-foreground rounded-lg hover:bg-muted disabled:opacity-50 transition-colors font-medium"
              >
                Decline
              </button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              By accepting, you agree to access these health records responsibly and in accordance with privacy regulations.
            </p>
          </div>
        )}

        {/* HIPAA Acknowledgment Modal */}
        {showHipaaModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg border-2 border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      HIPAA Privacy Requirements
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      As a caregiver accessing Protected Health Information (PHI), you must acknowledge these requirements
                    </p>
                  </div>
                </div>

                {/* HIPAA Requirements */}
                <div className="space-y-4 mb-6">
                  <div className="bg-background rounded-lg p-4 border-2 border-border">
                    <h4 className="font-semibold text-foreground mb-3">You agree to:</h4>
                    <ul className="space-y-2 text-sm text-foreground">
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Access health information <strong>only</strong> for authorized caregiving purposes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Keep all health information <strong>confidential</strong> and secure</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span><strong>Never share</strong> login credentials or patient information with unauthorized individuals</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Report any suspected <strong>privacy breaches</strong> immediately</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Comply with all <strong>HIPAA regulations</strong> and platform policies</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-warning-light border-2 border-warning rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-warning-dark flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="text-sm text-warning-dark">
                        <p className="font-semibold mb-1">Important Notice</p>
                        <p>Violation of HIPAA privacy requirements may result in loss of access, legal consequences, and civil/criminal penalties.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkbox Acknowledgment */}
                <div className="mb-6">
                  <label className="flex items-start gap-3 p-4 bg-background rounded-lg border-2 border-border cursor-pointer hover:bg-muted transition-colors">
                    <input
                      type="checkbox"
                      checked={hipaaAcknowledged}
                      onChange={(e) => setHipaaAcknowledged(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-sm text-foreground">
                      I acknowledge that I have read and understand the HIPAA privacy requirements above, and I agree to comply with all applicable privacy regulations when accessing Protected Health Information.
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleHipaaAcknowledge}
                    disabled={loading || !hipaaAcknowledged}
                    className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    {loading ? 'Processing...' : 'Accept & Continue'}
                  </button>
                  <button
                    onClick={() => {
                      setShowHipaaModal(false)
                      setHipaaAcknowledged(false)
                    }}
                    disabled={loading}
                    className="px-6 py-3 border-2 border-border text-foreground rounded-lg hover:bg-muted disabled:opacity-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
