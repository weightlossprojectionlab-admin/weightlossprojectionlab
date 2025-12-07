'use client'

import { useState } from 'react'
import type { ProfessionalInfo } from '@/types/caregiver-profile'

interface ProfessionalInfoStepProps {
  data: ProfessionalInfo | undefined
  onChange: (data: ProfessionalInfo) => void
}

const COMMON_TITLES = [
  'Registered Nurse (RN)',
  'Licensed Practical Nurse (LPN)',
  'Certified Nursing Assistant (CNA)',
  'Home Health Aide',
  'Physician',
  'Nurse Practitioner',
  'Physician Assistant',
  'Physical Therapist',
  'Occupational Therapist',
  'Social Worker',
  'Other'
]

const COMMON_CERTIFICATIONS = [
  'CPR',
  'First Aid',
  'BLS (Basic Life Support)',
  'ACLS (Advanced Cardiac Life Support)',
  'Dementia Care',
  'Hospice Care',
  'Wound Care',
  'Medication Administration',
  'IV Therapy',
  'Diabetes Management'
]

export function ProfessionalInfoStep({ data, onChange }: ProfessionalInfoStepProps) {
  const [credentialInput, setCredentialInput] = useState('')
  const [certificationSelections, setCertificationSelections] = useState<string[]>(
    data?.certifications || []
  )
  const [specializationInput, setSpecializationInput] = useState('')

  const professionalData: ProfessionalInfo = data || {
    title: '',
    credentials: [],
    certifications: [],
    specializations: [],
    yearsOfExperience: undefined
  }

  const handleChange = (updates: Partial<ProfessionalInfo>) => {
    onChange({ ...professionalData, ...updates })
  }

  const handleAddCredential = () => {
    if (credentialInput.trim() && !professionalData.credentials.includes(credentialInput.trim())) {
      handleChange({
        credentials: [...professionalData.credentials, credentialInput.trim()]
      })
      setCredentialInput('')
    }
  }

  const handleRemoveCredential = (credential: string) => {
    handleChange({
      credentials: professionalData.credentials.filter(c => c !== credential)
    })
  }

  const handleToggleCertification = (cert: string) => {
    const updated = certificationSelections.includes(cert)
      ? certificationSelections.filter(c => c !== cert)
      : [...certificationSelections, cert]

    setCertificationSelections(updated)
    handleChange({ certifications: updated })
  }

  const handleAddSpecialization = () => {
    if (specializationInput.trim() && !professionalData.specializations.includes(specializationInput.trim())) {
      handleChange({
        specializations: [...professionalData.specializations, specializationInput.trim()]
      })
      setSpecializationInput('')
    }
  }

  const handleRemoveSpecialization = (spec: string) => {
    handleChange({
      specializations: professionalData.specializations.filter(s => s !== spec)
    })
  }

  return (
    <div className="space-y-6">
      {/* Professional Title */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Professional Title <span className="text-red-500">*</span>
        </label>
        <select
          value={professionalData.title}
          onChange={(e) => handleChange({ title: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          required
        >
          <option value="">Select your title...</option>
          {COMMON_TITLES.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
      </div>

      {/* Credentials */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Professional Credentials
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Add credentials like RN, BSN, MSN, etc.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={credentialInput}
            onChange={(e) => setCredentialInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCredential())}
            placeholder="e.g., RN, BSN"
            className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          />
          <button
            type="button"
            onClick={handleAddCredential}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
          >
            Add
          </button>
        </div>
        {professionalData.credentials.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {professionalData.credentials.map((cred) => (
              <span
                key={cred}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {cred}
                <button
                  type="button"
                  onClick={() => handleRemoveCredential(cred)}
                  className="text-primary hover:text-primary-hover"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Certifications */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Certifications
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Select all certifications that apply
        </p>
        <div className="grid grid-cols-2 gap-2">
          {COMMON_CERTIFICATIONS.map((cert) => {
            const isSelected = certificationSelections.includes(cert)
            return (
              <button
                key={cert}
                type="button"
                onClick={() => handleToggleCertification(cert)}
                className={`
                  px-4 py-3 rounded-xl text-left font-medium transition-all
                  ${isSelected
                    ? 'bg-primary text-white border-2 border-primary'
                    : 'bg-card border-2 border-border hover:border-primary text-foreground'
                  }
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">{cert}</span>
                  {isSelected && <span>✓</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* License Number */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          License Number (Optional)
        </label>
        <input
          type="text"
          value={professionalData.licenseNumber || ''}
          onChange={(e) => handleChange({ licenseNumber: e.target.value })}
          placeholder="Enter your license number"
          className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Years of Experience */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Years of Experience
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={professionalData.yearsOfExperience || ''}
          onChange={(e) => handleChange({ yearsOfExperience: parseInt(e.target.value) || undefined })}
          placeholder="0"
          className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Specializations */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Areas of Specialization
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Add any areas where you have special expertise
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={specializationInput}
            onChange={(e) => setSpecializationInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialization())}
            placeholder="e.g., Diabetes Management, Elderly Care"
            className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          />
          <button
            type="button"
            onClick={handleAddSpecialization}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
          >
            Add
          </button>
        </div>
        {professionalData.specializations.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {professionalData.specializations.map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {spec}
                <button
                  type="button"
                  onClick={() => handleRemoveSpecialization(spec)}
                  className="text-primary hover:text-primary-hover"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Privacy Note */}
      <div className="p-4 rounded-lg bg-muted border border-border">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">Credential Verification</h4>
            <p className="text-sm text-muted-foreground">
              Your credentials are private and will only be shared with family members
              who have appropriate access. We may verify professional licenses periodically
              to maintain trust and safety.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
