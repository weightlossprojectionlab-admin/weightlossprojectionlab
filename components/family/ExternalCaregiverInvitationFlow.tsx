/**
 * External Caregiver Invitation Flow
 *
 * Multi-step flow for inviting external caregivers:
 * 1. Basic professional info (name, email, role, organization)
 * 2. Select patients to share access with
 * 3. Set access permissions
 * 4. Set expiration (optional)
 */

'use client'

import { useState } from 'react'
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { PatientProfile, ExternalCaregiverRole, ExternalCaregiverAccessLevel } from '@/types/medical'
import toast from 'react-hot-toast'

interface ExternalCaregiverInvitationFlowProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: ExternalCaregiverFormData) => Promise<void>
  patients: PatientProfile[]
  currentExternalCaregivers: number
  maxExternalCaregivers: number
}

export interface ExternalCaregiverFormData {
  name: string
  email: string
  role: ExternalCaregiverRole
  organization?: string
  credentials?: string
  patientsAccess: string[] // Patient IDs
  accessLevel: ExternalCaregiverAccessLevel
  permissions: {
    viewMedicalRecords: boolean
    editMedicalRecords: boolean
    viewMedications: boolean
    manageMedications: boolean
    viewDocuments: boolean
    uploadDocuments: boolean
    receiveAlerts: boolean
    logVitals: boolean
    viewAppointments: boolean
    manageAppointments: boolean
  }
  accessExpiresAt?: string // ISO date string
}

type Step = 'basic_info' | 'select_patients' | 'permissions' | 'expiration'

export function ExternalCaregiverInvitationFlow({
  isOpen,
  onClose,
  onComplete,
  patients,
  currentExternalCaregivers,
  maxExternalCaregivers,
}: ExternalCaregiverInvitationFlowProps) {
  const [step, setStep] = useState<Step>('basic_info')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<ExternalCaregiverFormData>({
    name: '',
    email: '',
    role: 'nurse',
    organization: '',
    credentials: '',
    patientsAccess: [],
    accessLevel: 'limited',
    permissions: {
      viewMedicalRecords: true,
      editMedicalRecords: false,
      viewMedications: true,
      manageMedications: false,
      viewDocuments: true,
      uploadDocuments: false,
      receiveAlerts: true,
      logVitals: true,
      viewAppointments: true,
      manageAppointments: false,
    },
    accessExpiresAt: undefined,
  })

  if (!isOpen) return null

  const handleBasicInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.role) {
      toast.error('Please fill in all required fields')
      return
    }

    setStep('select_patients')
  }

  const handlePatientsSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.patientsAccess.length === 0) {
      toast.error('Please select at least one patient')
      return
    }

    setStep('permissions')
  }

  const handlePermissionsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('expiration')
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onComplete(formData)
      toast.success(`Invitation sent to ${formData.name}!`)
      onClose()
      // Reset form
      setFormData({
        name: '',
        email: '',
        role: 'nurse',
        organization: '',
        credentials: '',
        patientsAccess: [],
        accessLevel: 'limited',
        permissions: {
          viewMedicalRecords: true,
          editMedicalRecords: false,
          viewMedications: true,
          manageMedications: false,
          viewDocuments: true,
          uploadDocuments: false,
          receiveAlerts: true,
          logVitals: true,
          viewAppointments: true,
          manageAppointments: false,
        },
        accessExpiresAt: undefined,
      })
      setStep('basic_info')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step === 'select_patients') setStep('basic_info')
    else if (step === 'permissions') setStep('select_patients')
    else if (step === 'expiration') setStep('permissions')
  }

  const togglePatient = (patientId: string) => {
    setFormData(prev => ({
      ...prev,
      patientsAccess: prev.patientsAccess.includes(patientId)
        ? prev.patientsAccess.filter(id => id !== patientId)
        : [...prev.patientsAccess, patientId]
    }))
  }

  const selectAllPatients = () => {
    setFormData(prev => ({
      ...prev,
      patientsAccess: patients.map(p => p.id)
    }))
  }

  const deselectAllPatients = () => {
    setFormData(prev => ({
      ...prev,
      patientsAccess: []
    }))
  }

  const setAccessLevelPreset = (level: ExternalCaregiverAccessLevel) => {
    const presets = {
      view_only: {
        viewMedicalRecords: true,
        editMedicalRecords: false,
        viewMedications: true,
        manageMedications: false,
        viewDocuments: true,
        uploadDocuments: false,
        receiveAlerts: false,
        logVitals: false,
        viewAppointments: true,
        manageAppointments: false,
      },
      limited: {
        viewMedicalRecords: true,
        editMedicalRecords: false,
        viewMedications: true,
        manageMedications: false,
        viewDocuments: true,
        uploadDocuments: true,
        receiveAlerts: true,
        logVitals: true,
        viewAppointments: true,
        manageAppointments: false,
      },
      full: {
        viewMedicalRecords: true,
        editMedicalRecords: true,
        viewMedications: true,
        manageMedications: true,
        viewDocuments: true,
        uploadDocuments: true,
        receiveAlerts: true,
        logVitals: true,
        viewAppointments: true,
        manageAppointments: true,
      },
    }

    setFormData(prev => ({
      ...prev,
      accessLevel: level,
      permissions: presets[level]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            {step !== 'basic_info' && (
              <button
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-foreground">Invite External Caregiver</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Caregivers: {currentExternalCaregivers + 1} / {maxExternalCaregivers} • Not billable
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step === 'basic_info' ? '1' : step === 'select_patients' ? '2' : step === 'permissions' ? '3' : '4'}</span>
            <span className="capitalize">{step.replace('_', ' ')}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: step === 'basic_info' ? '25%' : step === 'select_patients' ? '50%' : step === 'permissions' ? '75%' : '100%'
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Basic Info */}
          {step === 'basic_info' && (
            <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Professional Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as ExternalCaregiverRole }))}
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    <option value="nurse">Nurse</option>
                    <option value="doctor">Doctor</option>
                    <option value="aide">Home Health Aide</option>
                    <option value="therapist">Therapist</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Organization (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                    placeholder="Hospital, clinic, etc."
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Credentials (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.credentials}
                    onChange={(e) => setFormData(prev => ({ ...prev, credentials: e.target.value }))}
                    placeholder="RN, MD, CNA, etc."
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Select Patients */}
          {step === 'select_patients' && (
            <form onSubmit={handlePatientsSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">Select Patients</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllPatients}
                      className="text-xs px-3 py-1 border border-border rounded hover:bg-muted"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllPatients}
                      className="text-xs px-3 py-1 border border-border rounded hover:bg-muted"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose which patients {formData.name} can access
                </p>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {patients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No patients available. Add family members first.</p>
                    </div>
                  ) : (
                    patients.map(patient => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => togglePatient(patient.id)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          formData.patientsAccess.includes(patient.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-foreground">{patient.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {patient.relationship} • {patient.type}
                            </div>
                          </div>
                          {formData.patientsAccess.includes(patient.id) && (
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                  <span className="text-muted-foreground">Selected: </span>
                  <span className="font-medium text-foreground">{formData.patientsAccess.length} patient(s)</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Permissions */}
          {step === 'permissions' && (
            <form onSubmit={handlePermissionsSubmit} className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">Access Level</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a preset or customize individual permissions
                </p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {(['view_only', 'limited', 'full'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setAccessLevelPreset(level)}
                      className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                        formData.accessLevel === level
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium capitalize">{level.replace('_', ' ')}</div>
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {Object.entries(formData.permissions).map(([key, value]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                    >
                      <span className="text-sm text-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            permissions: {
                              ...prev.permissions,
                              [key]: e.target.checked
                            }
                          }))
                        }
                        className="w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Expiration */}
          {step === 'expiration' && (
            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">Access Expiration</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Optionally set when this caregiver's access should expire
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, accessExpiresAt: undefined }))}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      !formData.accessExpiresAt
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-foreground">Never Expires</div>
                    <div className="text-sm text-muted-foreground">Access until manually revoked</div>
                  </button>

                  {[30, 90, 180, 365].map(days => {
                    const expiryDate = new Date()
                    expiryDate.setDate(expiryDate.getDate() + days)
                    const dateString = expiryDate.toISOString().split('T')[0]

                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, accessExpiresAt: dateString }))}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          formData.accessExpiresAt === dateString
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium text-foreground">{days} Days</div>
                        <div className="text-sm text-muted-foreground">
                          Expires {expiryDate.toLocaleDateString()}
                        </div>
                      </button>
                    )
                  })}

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Custom Date
                    </label>
                    <input
                      type="date"
                      value={formData.accessExpiresAt || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, accessExpiresAt: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <h4 className="font-medium text-foreground mb-2">Summary</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="text-foreground font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="text-foreground font-medium capitalize">{formData.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patients:</span>
                    <span className="text-foreground font-medium">{formData.patientsAccess.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Access Level:</span>
                    <span className="text-foreground font-medium capitalize">{formData.accessLevel.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expiration:</span>
                    <span className="text-foreground font-medium">
                      {formData.accessExpiresAt
                        ? new Date(formData.accessExpiresAt).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billable:</span>
                    <span className="text-success-dark font-medium">No (Free)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
