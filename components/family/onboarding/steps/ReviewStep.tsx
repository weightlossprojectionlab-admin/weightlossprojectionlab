'use client'

import type { CaregiverProfile } from '@/types/caregiver-profile'

interface ReviewStepProps {
  data: Partial<CaregiverProfile>
  onEdit: (step: number) => void
}

export function ReviewStep({ data, onEdit }: ReviewStepProps) {
  const {
    displayName,
    phoneNumber,
    photoUrl,
    isProfessional,
    relationshipToPatients,
    professionalInfo,
    availability,
    preferences
  } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Review Your Profile</h2>
        <p className="text-muted-foreground">
          Please review your information before completing onboarding
        </p>
      </div>

      {/* Basic Info Section */}
      <div className="p-6 rounded-xl border-2 border-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
          <button
            type="button"
            onClick={() => onEdit(1)}
            className="text-sm text-primary hover:underline"
          >
            Edit
          </button>
        </div>

        <div className="flex items-center gap-4">
          {photoUrl ? (
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary">
              <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <span className="text-4xl">👤</span>
            </div>
          )}
          <div>
            <div className="font-semibold text-foreground text-lg">{displayName || 'Not set'}</div>
            <div className="text-sm text-muted-foreground">{phoneNumber || 'No phone'}</div>
          </div>
        </div>
      </div>

      {/* Role & Relationship Section */}
      <div className="p-6 rounded-xl border-2 border-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Role & Relationships</h3>
          <button
            type="button"
            onClick={() => onEdit(2)}
            className="text-sm text-primary hover:underline"
          >
            Edit
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role:</span>
            <span className="px-3 py-1 rounded-full bg-primary text-white text-sm font-medium">
              {isProfessional ? 'Professional Caregiver' : 'Family Member'}
            </span>
          </div>

          {relationshipToPatients && Object.keys(relationshipToPatients).length > 0 && (
            <div>
              <div className="text-sm text-muted-foreground mb-2">Patient Relationships:</div>
              <div className="space-y-2">
                {Object.entries(relationshipToPatients).map(([patientId, relationship]) => (
                  <div key={patientId} className="flex items-center gap-2 text-sm">
                    <span className="text-foreground">•</span>
                    <span className="text-foreground">{relationship}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Professional Info Section (if applicable) */}
      {isProfessional && professionalInfo && (
        <div className="p-6 rounded-xl border-2 border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Professional Information</h3>
            <button
              type="button"
              onClick={() => onEdit(3)}
              className="text-sm text-primary hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="space-y-3">
            {professionalInfo.title && (
              <div>
                <span className="text-sm text-muted-foreground">Title:</span>
                <div className="font-medium text-foreground">{professionalInfo.title}</div>
              </div>
            )}

            {professionalInfo.credentials.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Credentials:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {professionalInfo.credentials.map((cred) => (
                    <span key={cred} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-sm">
                      {cred}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {professionalInfo.certifications.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Certifications:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {professionalInfo.certifications.map((cert) => (
                    <span key={cert} className="px-2 py-1 rounded-full bg-muted text-foreground text-sm">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {professionalInfo.yearsOfExperience && (
              <div>
                <span className="text-sm text-muted-foreground">Experience:</span>
                <div className="font-medium text-foreground">
                  {professionalInfo.yearsOfExperience} {professionalInfo.yearsOfExperience === 1 ? 'year' : 'years'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Availability Section */}
      {availability && (
        <div className="p-6 rounded-xl border-2 border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Availability</h3>
            <button
              type="button"
              onClick={() => onEdit(4)}
              className="text-sm text-primary hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Timezone:</span>
              <div className="font-medium text-foreground">{availability.timezone}</div>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Available Days:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(availability.schedule)
                  .filter(([_, dayData]) => dayData.available)
                  .map(([day, dayData]) => (
                    <span key={day} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                      {day.charAt(0).toUpperCase() + day.slice(1)} ({dayData.startTime} - {dayData.endTime})
                    </span>
                  ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Emergency Availability:</span>
              <span className={`px-2 py-1 rounded-full text-sm ${
                availability.isAvailableForEmergencies
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {availability.isAvailableForEmergencies ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Section */}
      {preferences && (
        <div className="p-6 rounded-xl border-2 border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Communication Preferences</h3>
            <button
              type="button"
              onClick={() => onEdit(5)}
              className="text-sm text-primary hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Languages:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {preferences.languagesSpoken.map((lang) => (
                  <span key={lang} className="px-2 py-1 rounded-full bg-muted text-foreground text-sm">
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Preferred Contact:</span>
              <div className="font-medium text-foreground capitalize">
                {preferences.preferredContactMethod.replace('_', ' ')}
              </div>
            </div>

            {preferences.quietHours && (
              <div>
                <span className="text-sm text-muted-foreground">Quiet Hours:</span>
                <div className="font-medium text-foreground">
                  {preferences.quietHours.startTime} - {preferences.quietHours.endTime}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completion Notice */}
      <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎉</span>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">Almost Done!</h4>
            <p className="text-sm text-muted-foreground">
              Click "Complete Onboarding" to finish setup and start coordinating care with your family.
              You can always update these settings later in your profile.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
