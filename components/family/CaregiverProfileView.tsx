/**
 * CaregiverProfileView Component
 *
 * Full profile display component for viewing any caregiver profile
 * Responsive layout with all profile sections
 */

'use client'

import Image from 'next/image'
import { RelationshipBadge } from './RelationshipBadge'
import { ContactButtons } from './ContactButtons'
import { AvailabilityCalendar } from './AvailabilityCalendar'
import type { CaregiverProfile } from '@/types/caregiver'

interface CaregiverProfileViewProps {
  profile: CaregiverProfile
  isOwnProfile: boolean
  onEdit?: () => void
  patientNames?: Record<string, string> // patientId -> patient name
}

const statusConfig = {
  available: {
    color: 'bg-green-500',
    label: 'Available',
    textColor: 'text-green-700 dark:text-green-400'
  },
  busy: {
    color: 'bg-yellow-500',
    label: 'Busy',
    textColor: 'text-yellow-700 dark:text-yellow-400'
  },
  away: {
    color: 'bg-orange-500',
    label: 'Away',
    textColor: 'text-orange-700 dark:text-orange-400'
  },
  offline: {
    color: 'bg-gray-400',
    label: 'Offline',
    textColor: 'text-gray-700 dark:text-gray-400'
  }
}

export function CaregiverProfileView({
  profile,
  isOwnProfile,
  onEdit,
  patientNames = {}
}: CaregiverProfileViewProps) {
  const statusInfo = statusConfig[profile.availabilityStatus]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-card border-2 border-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Photo and Status */}
          <div className="flex flex-col items-center md:items-start">
            <div className="relative mb-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-muted">
                {profile.photo ? (
                  <Image
                    src={profile.photo}
                    alt={profile.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-muted-foreground">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div
                className={`absolute bottom-2 right-2 w-8 h-8 rounded-full border-4 border-card ${statusInfo.color}`}
                title={statusInfo.label}
              />
            </div>
            <div className={`text-sm font-medium ${statusInfo.textColor}`}>
              {statusInfo.label}
            </div>
          </div>

          {/* Name and Role */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{profile.name}</h1>
                {profile.professionalInfo?.title && (
                  <p className="text-lg text-muted-foreground mb-3">
                    {profile.professionalInfo.title}
                  </p>
                )}
                <RelationshipBadge
                  role={profile.familyRole}
                  relationship={profile.relationship}
                  size="lg"
                />
              </div>
              {isOwnProfile && onEdit && (
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-foreground mb-4 leading-relaxed">{profile.bio}</p>
            )}

            {/* Contact Info (if permitted) */}
            {profile.shareContactInfo && (
              <div className="mt-4">
                <ContactButtons
                  email={profile.email}
                  phone={profile.phone}
                  name={profile.name}
                  size="md"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-card border-2 border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Contact Information
          </h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="text-foreground">{profile.email}</div>
            </div>
            {profile.phone && profile.shareContactInfo && (
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="text-foreground">{profile.phone}</div>
              </div>
            )}
            {profile.address && profile.shareContactInfo && (
              <div>
                <div className="text-sm text-muted-foreground">Address</div>
                <div className="text-foreground">
                  {profile.address.street && <div>{profile.address.street}</div>}
                  {(profile.address.city || profile.address.state || profile.address.zipCode) && (
                    <div>
                      {profile.address.city}, {profile.address.state} {profile.address.zipCode}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Professional Info */}
        {profile.professionalInfo && (
          <div className="bg-card border-2 border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Professional Information
            </h2>
            <div className="space-y-3">
              {profile.professionalInfo.organization && (
                <div>
                  <div className="text-sm text-muted-foreground">Organization</div>
                  <div className="text-foreground">{profile.professionalInfo.organization}</div>
                </div>
              )}
              {profile.professionalInfo.credentials && profile.professionalInfo.credentials.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground">Credentials</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.professionalInfo.credentials.map((cred, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        {cred}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.professionalInfo.specialties && profile.professionalInfo.specialties.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground">Specialties</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.professionalInfo.specialties.map((spec, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.professionalInfo.yearsOfExperience && (
                <div>
                  <div className="text-sm text-muted-foreground">Experience</div>
                  <div className="text-foreground">
                    {profile.professionalInfo.yearsOfExperience} years
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Patient Relationships */}
      <div className="bg-card border-2 border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Patient Access</h2>
        {profile.patientsAccess.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-3">
            {profile.patientsAccess.map((patientId) => (
              <div
                key={patientId}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {patientNames[patientId] || 'Unknown Patient'}
                  </div>
                  {profile.patientRelationships[patientId] && (
                    <div className="text-sm text-muted-foreground">
                      {profile.patientRelationships[patientId]}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground italic">No patients assigned yet</div>
        )}
      </div>

      {/* Availability Schedule */}
      {profile.weeklySchedule && profile.shareAvailability && (
        <div className="bg-card border-2 border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Weekly Availability
          </h2>
          <AvailabilityCalendar schedule={profile.weeklySchedule} editable={false} />
        </div>
      )}

      {/* Emergency Contact */}
      {profile.emergencyContact && isOwnProfile && (
        <div className="bg-card border-2 border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Emergency Contact</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="text-foreground">{profile.emergencyContact.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Relationship</div>
              <div className="text-foreground">{profile.emergencyContact.relationship}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Phone</div>
              <div className="text-foreground">{profile.emergencyContact.phone}</div>
            </div>
            {profile.emergencyContact.email && (
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="text-foreground">{profile.emergencyContact.email}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preferences */}
      {isOwnProfile && (
        <div className="bg-card border-2 border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Preferences</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Preferred Contact Method</div>
              <div className="text-foreground capitalize">
                {profile.preferences.preferredContactMethod || 'Not set'}
              </div>
            </div>
            {profile.preferences.timezone && (
              <div>
                <div className="text-sm text-muted-foreground">Timezone</div>
                <div className="text-foreground">{profile.preferences.timezone}</div>
              </div>
            )}
            {profile.preferences.quietHoursStart && profile.preferences.quietHoursEnd && (
              <div>
                <div className="text-sm text-muted-foreground">Quiet Hours</div>
                <div className="text-foreground">
                  {profile.preferences.quietHoursStart} - {profile.preferences.quietHoursEnd}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Info */}
      <div className="bg-card border-2 border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Account Information</h2>
        <div className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground">Member Since</div>
            <div className="text-foreground">{formatDate(profile.joinedAt)}</div>
          </div>
          {profile.lastActive && (
            <div>
              <div className="text-sm text-muted-foreground">Last Active</div>
              <div className="text-foreground">{formatDate(profile.lastActive)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
