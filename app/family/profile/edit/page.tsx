/**
 * Edit Caregiver Profile Page
 *
 * Editable version of caregiver profile with:
 * - Tabbed interface (Basic Info, Professional, Availability, Preferences)
 * - Form validation
 * - Unsaved changes warning
 * - Save/Cancel buttons
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { CaregiverProfileForm } from '@/components/family/CaregiverProfileForm'
import AuthGuard from '@/components/auth/AuthGuard'
import type { CaregiverProfileFormData, CaregiverProfile } from '@/types/caregiver'

import { getCSRFToken } from '@/lib/csrf'
export default function EditProfilePage() {
  return (
    <AuthGuard>
      <EditProfileContent />
    </AuthGuard>
  )
}

function EditProfileContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<CaregiverProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        // TODO: Replace with actual API call
        // const response = await fetch('/api/family/profile')
        // const data = await response.json()

        // Mock data for demonstration
        const mockProfile: CaregiverProfile = {
          id: 'currentUser123',
          userId: 'currentUser123',
          name: 'John Smith',
          email: 'john@example.com',
          phone: '(555) 123-4567',
          photo: undefined,
          dateOfBirth: '1980-03-20',
          familyRole: 'account_owner',
          relationship: 'Self',
          professionalInfo: {
            title: 'Family Caregiver',
            organization: undefined,
            credentials: [],
            specialties: [],
            yearsOfExperience: 5,
            licenseNumber: undefined
          },
          patientsAccess: ['patient1', 'patient2'],
          patientRelationships: {
            patient1: 'Mother',
            patient2: 'Father'
          },
          permissions: {
            viewPatientProfile: true,
            viewMedicalRecords: true,
            editMedications: true,
            scheduleAppointments: true,
            editAppointments: true,
            deleteAppointments: true,
            uploadDocuments: true,
            deleteDocuments: true,
            logVitals: true,
            viewVitals: true,
            chatAccess: true,
            inviteOthers: true,
            viewSensitiveInfo: true,
            editPatientProfile: true,
            deletePatient: true
          },
          availabilityStatus: 'available',
          weeklySchedule: {
            monday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
            tuesday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
            wednesday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
            thursday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
            friday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
            saturday: { available: true, slots: [{ start: '10:00', end: '14:00' }] },
            sunday: { available: false, slots: [] }
          },
          address: {
            street: '456 Oak Ave',
            city: 'Springfield',
            state: 'IL',
            zipCode: '62702'
          },
          emergencyContact: {
            name: 'Jane Smith',
            relationship: 'Spouse',
            phone: '(555) 987-6543',
            email: 'jane@example.com'
          },
          preferences: {
            notificationMethods: ['email', 'push', 'sms'],
            preferredContactMethod: 'email',
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00',
            language: 'en',
            timezone: 'America/Chicago'
          },
          joinedAt: '2024-01-01T10:00:00Z',
          lastActive: new Date().toISOString(),
          managedBy: 'currentUser123',
          profileVisibility: 'family_only',
          shareContactInfo: true,
          shareAvailability: true,
          bio: 'Primary caregiver for my parents. Coordinating care and managing their health needs.'
        }

        setProfile(mockProfile)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load profile. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleSave = async (formData: CaregiverProfileFormData) => {
    setSaving(true)
    setError(null)

    try {
      // TODO: Replace with actual API call
      // const csrfToken = getCSRFToken()
      // const response = await fetch('/api/family/profile', {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'X-CSRF-Token': csrfToken,
      //   },
      //   body: JSON.stringify(formData)
      // })
      // if (!response.ok) throw new Error('Failed to save profile')

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Success - redirect to profile view
      router.push(`/family/${profile?.userId}`)
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push(`/family/${profile?.userId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Edit Profile" subtitle="Loading..." />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-card border-2 border-border rounded-xl p-6 animate-pulse">
            <div className="space-y-6">
              <div className="h-10 bg-muted rounded w-full" />
              <div className="h-10 bg-muted rounded w-full" />
              <div className="h-10 bg-muted rounded w-full" />
              <div className="h-10 bg-muted rounded w-full" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Error" subtitle="Unable to load profile" />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12 bg-card border-2 border-border rounded-xl">
            <svg
              className="mx-auto h-12 w-12 text-error mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-foreground mb-2">{error}</h3>
            <button
              onClick={() => router.push('/family/directory')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Back to Directory
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const initialFormData: Partial<CaregiverProfileFormData> = {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    photo: profile.photo,
    relationship: profile.relationship,
    professionalInfo: profile.professionalInfo,
    availabilityStatus: profile.availabilityStatus,
    weeklySchedule: profile.weeklySchedule,
    address: profile.address,
    emergencyContact: profile.emergencyContact,
    preferences: profile.preferences,
    profileVisibility: profile.profileVisibility,
    shareContactInfo: profile.shareContactInfo,
    shareAvailability: profile.shareAvailability,
    bio: profile.bio
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Edit Profile"
        subtitle="Update your caregiver profile information"
      />

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-error-light border-2 border-error rounded-lg">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-error"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-error font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-card border-2 border-border rounded-xl p-6">
          <CaregiverProfileForm
            initialData={initialFormData}
            onSave={handleSave}
            onCancel={handleCancel}
            loading={saving}
          />
        </div>
      </main>
    </div>
  )
}
