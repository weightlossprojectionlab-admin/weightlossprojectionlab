'use client'

import { useState, useEffect } from 'react'
import { usePatients } from '@/hooks/usePatients'
import { RelationshipType } from '@/types/caregiver-profile'

interface RoleStepProps {
  data: {
    isProfessional: boolean
    relationshipToPatients: Record<string, string>
  }
  onChange: (data: Partial<RoleStepProps['data']>) => void
}

const FAMILY_RELATIONSHIPS = [
  RelationshipType.MOTHER,
  RelationshipType.FATHER,
  RelationshipType.SPOUSE,
  RelationshipType.PARTNER,
  RelationshipType.CHILD,
  RelationshipType.SON,
  RelationshipType.DAUGHTER,
  RelationshipType.SIBLING,
  RelationshipType.BROTHER,
  RelationshipType.SISTER,
  RelationshipType.GRANDPARENT,
  RelationshipType.GRANDMOTHER,
  RelationshipType.GRANDFATHER,
  RelationshipType.FRIEND,
  RelationshipType.NEIGHBOR,
  RelationshipType.OTHER
]

const PROFESSIONAL_RELATIONSHIPS = [
  RelationshipType.PROFESSIONAL_CAREGIVER,
  RelationshipType.NURSE,
  RelationshipType.REGISTERED_NURSE,
  RelationshipType.LICENSED_PRACTICAL_NURSE,
  RelationshipType.NURSING_ASSISTANT,
  RelationshipType.HOME_HEALTH_AIDE,
  RelationshipType.DOCTOR,
  RelationshipType.PHYSICIAN,
  RelationshipType.NURSE_PRACTITIONER,
  RelationshipType.PHYSICIAN_ASSISTANT,
  RelationshipType.THERAPIST,
  RelationshipType.PHYSICAL_THERAPIST,
  RelationshipType.OCCUPATIONAL_THERAPIST
]

export function RoleStep({ data, onChange }: RoleStepProps) {
  const { patients, loading } = usePatients()
  const [customRelationships, setCustomRelationships] = useState<Record<string, string>>({})

  const availableRelationships = data.isProfessional
    ? PROFESSIONAL_RELATIONSHIPS
    : FAMILY_RELATIONSHIPS

  const handleProfessionalToggle = () => {
    onChange({
      isProfessional: !data.isProfessional,
      relationshipToPatients: {} // Reset relationships when switching
    })
  }

  const handleRelationshipChange = (patientId: string, relationship: string) => {
    onChange({
      relationshipToPatients: {
        ...data.relationshipToPatients,
        [patientId]: relationship
      }
    })
  }

  const handleCustomRelationshipChange = (patientId: string, value: string) => {
    setCustomRelationships({
      ...customRelationships,
      [patientId]: value
    })
  }

  const handleCustomRelationshipSubmit = (patientId: string) => {
    const customValue = customRelationships[patientId]
    if (customValue && customValue.trim()) {
      handleRelationshipChange(patientId, customValue.trim())
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Professional Toggle */}
      <div className="p-4 rounded-lg border-2 border-border bg-card">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.isProfessional}
            onChange={handleProfessionalToggle}
            className="w-5 h-5 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary"
          />
          <div className="flex-1">
            <span className="font-semibold text-foreground">I am a medical professional</span>
            <p className="text-sm text-muted-foreground mt-1">
              Select this if you're a nurse, doctor, or licensed caregiver
            </p>
          </div>
          {data.isProfessional && (
            <span className="px-3 py-1 rounded-full bg-primary text-white text-sm font-medium">
              Professional
            </span>
          )}
        </label>
      </div>

      {/* Patient Relationships */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground text-lg">
          Select Your Relationship to Each Patient
        </h3>

        {patients.length === 0 ? (
          <div className="p-6 rounded-lg border-2 border-dashed border-border text-center">
            <p className="text-muted-foreground mb-2">No patients found</p>
            <p className="text-sm text-muted-foreground">
              The account owner will assign you to patients after onboarding
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="p-4 rounded-lg border-2 border-border bg-card space-y-3"
              >
                {/* Patient Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl">
                      {patient.type === 'pet' ? '🐾' : '👤'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{patient.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {patient.relationship} • {patient.type === 'pet' ? patient.species : `Age ${patient.age || 'N/A'}`}
                    </p>
                  </div>
                </div>

                {/* Relationship Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Your relationship to {patient.name}:
                  </label>
                  <select
                    value={data.relationshipToPatients[patient.id] || ''}
                    onChange={(e) => handleRelationshipChange(patient.id, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="">Select relationship...</option>
                    {availableRelationships.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Relationship Input */}
                {data.relationshipToPatients[patient.id] === RelationshipType.OTHER && (
                  <div className="space-y-2 pl-4 border-l-4 border-primary">
                    <label className="block text-sm font-medium text-foreground">
                      Specify custom relationship:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customRelationships[patient.id] || ''}
                        onChange={(e) => handleCustomRelationshipChange(patient.id, e.target.value)}
                        onBlur={() => handleCustomRelationshipSubmit(patient.id)}
                        placeholder="e.g., Family Friend, Neighbor"
                        className="flex-1 px-4 py-2 rounded-lg border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Selection Indicator */}
                {data.relationshipToPatients[patient.id] && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <span>✓</span>
                    <span>Relationship set</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="p-4 rounded-lg bg-muted border border-border">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">Why do we ask?</h4>
            <p className="text-sm text-muted-foreground">
              Understanding your relationship helps us provide appropriate access levels and
              customize notifications. You can update this information later if needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
