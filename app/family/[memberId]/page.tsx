/**
 * Individual Caregiver Profile Page
 *
 * Full caregiver profile view with sections for:
 * - Profile header (photo, name, title)
 * - Contact information
 * - Relationships to patients
 * - Professional info (if applicable)
 * - Availability schedule
 * - Emergency contact
 * - Preferences
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { CaregiverProfileView } from '@/components/family/CaregiverProfileView'
import AuthGuard from '@/components/auth/AuthGuard'
import type { CaregiverProfile } from '@/types/caregiver'

export default function CaregiverProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}

function ProfileContent() {
  const params = useParams()
  const router = useRouter()
  const memberId = params?.memberId as string

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<CaregiverProfile | null>(null)
  const [patientNames, setPatientNames] = useState<Record<string, string>>({})
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!memberId) return

      setLoading(true)
      setError(null)

      try {
        // TODO: Replace with actual API calls
        // const [profileRes, patientsRes, userRes] = await Promise.all([
        //   fetch(`/api/family/caregivers/${memberId}`),
        //   fetch('/api/patients'),
        //   fetch('/api/auth/user')
        // ])
        // const profileData = await profileRes.json()
        // const patientsData = await patientsRes.json()
        // const userData = await userRes.json()

        // Mock data for demonstration
        const mockProfile: CaregiverProfile = {
          id: memberId,
          userId: memberId,
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          phone: '(555) 234-5678',
          photo: undefined,
          dateOfBirth: '1985-06-15',
          familyRole: 'co_admin',
          relationship: 'Spouse',
          professionalInfo: {
            title: 'Registered Nurse',
            organization: 'City Hospital',
            credentials: ['RN', 'BSN'],
            specialties: ['Geriatric Care', 'Diabetes Management'],
            yearsOfExperience: 12,
            licenseNumber: 'RN123456'
          },
          patientsAccess: ['patient1', 'patient2'],
          patientRelationships: {
            patient1: 'Mother-in-law',
            patient2: 'Father-in-law'
          },
          permissions: {
            viewPatientProfile: true,
            viewMedicalRecords: true,
            editMedications: true,
            scheduleAppointments: true,
            editAppointments: true,
            deleteAppointments: false,
            uploadDocuments: true,
            deleteDocuments: false,
            logVitals: true,
            viewVitals: true,
            chatAccess: true,
            inviteOthers: true,
            viewSensitiveInfo: false,
            editPatientProfile: false,
            deletePatient: false
          },
          availabilityStatus: 'available',
          weeklySchedule: {
            monday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
            tuesday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
            wednesday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
            thursday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
            friday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
            saturday: { available: false, slots: [] },
            sunday: { available: false, slots: [] }
          },
          address: {
            street: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            zipCode: '62701'
          },
          emergencyContact: {
            name: 'John Johnson',
            relationship: 'Spouse',
            phone: '(555) 345-6789',
            email: 'john@example.com'
          },
          preferences: {
            notificationMethods: ['email', 'push'],
            preferredContactMethod: 'email',
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00',
            language: 'en',
            timezone: 'America/Chicago'
          },
          joinedAt: '2024-01-15T10:00:00Z',
          lastActive: new Date().toISOString(),
          invitedBy: 'owner123',
          managedBy: 'owner123',
          profileVisibility: 'family_only',
          shareContactInfo: true,
          shareAvailability: true,
          bio: 'Experienced registered nurse specializing in geriatric care and chronic disease management. Passionate about providing compassionate, high-quality care for elderly patients.'
        }

        const mockPatientNames = {
          patient1: 'Margaret Smith',
          patient2: 'Robert Smith'
        }

        const mockCurrentUserId = 'currentUser123'

        setProfile(mockProfile)
        setPatientNames(mockPatientNames)
        setCurrentUserId(mockCurrentUserId)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load profile. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [memberId])

  const handleEdit = () => {
    router.push('/family/profile/edit')
  }

  const handleBack = () => {
    router.push('/family/directory')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Loading..." subtitle="Please wait" />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="bg-card border-2 border-border rounded-xl p-6 animate-pulse">
              <div className="flex gap-6">
                <div className="w-32 h-32 rounded-full bg-muted" />
                <div className="flex-1 space-y-4">
                  <div className="h-8 bg-muted rounded w-48" />
                  <div className="h-5 bg-muted rounded w-32" />
                  <div className="h-6 bg-muted rounded w-40" />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border-2 border-border rounded-xl p-6 h-64 animate-pulse">
                <div className="h-6 bg-muted rounded w-40 mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded" />
                </div>
              </div>
              <div className="bg-card border-2 border-border rounded-xl p-6 h-64 animate-pulse">
                <div className="h-6 bg-muted rounded w-40 mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !profile) {
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
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {error || 'Profile not found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              The profile you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Back to Directory
            </button>
          </div>
        </main>
      </div>
    )
  }

  const isOwnProfile = currentUserId === profile.userId

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={profile.name}
        subtitle={profile.professionalInfo?.title || 'Family Member'}
        actions={
          <button
            onClick={handleBack}
            className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
          >
            Back to Directory
          </button>
        }
      />

      <main className="container mx-auto px-4 py-8">
        <CaregiverProfileView
          profile={profile}
          isOwnProfile={isOwnProfile}
          onEdit={isOwnProfile ? handleEdit : undefined}
          patientNames={patientNames}
        />
      </main>
    </div>
  )
}
