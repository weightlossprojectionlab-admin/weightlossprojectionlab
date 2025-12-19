'use client'

import React, { useState } from 'react'
import { Dialog } from '@headlessui/react'
import {
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  TruckIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'
import LocationMap from '@/components/maps/LocationMap'
import { PROVIDER_TITLES, PROVIDER_SPECIALTIES } from '@/types/providers'
import toast from 'react-hot-toast'
import { getCSRFToken } from '@/lib/csrf'
import { getAuth } from 'firebase/auth'

interface AppointmentWizardProps {
  isOpen: boolean
  onClose: () => void
  familyMember: {
    id: string
    name: string
  }
  providers: Array<{
    id: string
    name: string
    specialty?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    phone?: string
  }>
  familyMembers: Array<{
    userId: string
    name: string
    email: string
  }>
  onSubmit: (appointmentData: AppointmentData) => Promise<void>
  onProviderAdded?: () => void // Callback to refresh providers list
}

export interface AppointmentData {
  providerId?: string
  dateTime: Date
  type: 'routine-checkup' | 'follow-up' | 'specialist' | 'lab' | 'other'
  reason: string
  notes?: string
  location: string
  requiresDriver: boolean
  assignedDriverId?: string
  pickupTime?: Date
}

type WizardStep =
  | 'intro'
  | 'provider'
  | 'datetime'
  | 'type'
  | 'location'
  | 'transportation'
  | 'notes'
  | 'familyConfirmation'
  | 'review'
  | 'confirmation'

export default function AppointmentWizard({
  isOpen,
  onClose,
  familyMember,
  providers,
  familyMembers,
  onSubmit,
  onProviderAdded
}: AppointmentWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('intro')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddProviderForm, setShowAddProviderForm] = useState(false)

  const [appointmentData, setAppointmentData] = useState<Partial<AppointmentData>>({
    type: 'routine-checkup',
    requiresDriver: false
  })
  const [familyConfirmed, setFamilyConfirmed] = useState(false)

  const stepOrder: WizardStep[] = [
    'intro',
    'provider',
    'datetime',
    'type',
    'location',
    'transportation',
    'notes',
    'familyConfirmation',
    'review'
  ]

  const currentStepIndex = stepOrder.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / stepOrder.length) * 100

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < stepOrder.length) {
      setCurrentStep(stepOrder[nextIndex])
    }
  }

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(stepOrder[prevIndex])
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Validate required fields and navigate to missing field
      if (!appointmentData.dateTime) {
        alert('Date and time are required. Please select an appointment date and time.')
        setCurrentStep('datetime')
        setIsSubmitting(false)
        return
      }

      if (!appointmentData.location) {
        alert('Location is required. Please enter the appointment location.')
        setCurrentStep('location')
        setIsSubmitting(false)
        return
      }

      // Ensure reason has a value (use type name if empty)
      const dataToSubmit = {
        ...appointmentData,
        reason: appointmentData.reason?.trim() || appointmentData.type || 'Appointment scheduled'
      }

      await onSubmit(dataToSubmit as AppointmentData)
      setCurrentStep('confirmation')
    } catch (error) {
      logger.error('[AppointmentWizard] Submit failed', error)
      alert(`Failed to schedule appointment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'intro':
        return <IntroStep familyMember={familyMember} onNext={handleNext} />

      case 'provider':
        return (
          <ProviderStep
            providers={providers}
            selectedProviderId={appointmentData.providerId}
            onChange={(providerId) => {
              // Auto-populate location from provider
              const provider = providers.find(p => p.id === providerId)
              let location = ''
              if (provider?.address) {
                location = provider.address
                if (provider.city) location += `\n${provider.city}`
                if (provider.state) location += `, ${provider.state}`
                if (provider.zipCode) location += ` ${provider.zipCode}`
                if (provider.phone) location += `\n\nPhone: ${provider.phone}`
              }

              setAppointmentData((prev) => ({
                ...prev,
                providerId,
                location: location || prev.location
              }))
            }}
            patientId={familyMember.id}
            familyMembers={familyMembers}
            showAddProviderForm={showAddProviderForm}
            onToggleAddProviderForm={(show) => setShowAddProviderForm(show)}
            onProviderAdded={async () => {
              setShowAddProviderForm(false)
              if (onProviderAdded) {
                await onProviderAdded()
              }
            }}
          />
        )

      case 'datetime':
        return (
          <DateTimeStep
            dateTime={appointmentData.dateTime}
            onChange={(dateTime) =>
              setAppointmentData((prev) => ({ ...prev, dateTime }))
            }
          />
        )

      case 'type':
        return (
          <TypeStep
            type={appointmentData.type}
            reason={appointmentData.reason}
            onChange={(type, reason) =>
              setAppointmentData((prev) => ({ ...prev, type, reason }))
            }
          />
        )

      case 'location':
        return (
          <LocationStep
            location={appointmentData.location}
            onChange={(location) =>
              setAppointmentData((prev) => ({ ...prev, location }))
            }
          />
        )

      case 'transportation':
        return (
          <TransportationStep
            requiresDriver={appointmentData.requiresDriver || false}
            assignedDriverId={appointmentData.assignedDriverId}
            pickupTime={appointmentData.pickupTime}
            familyMembers={familyMembers}
            onChange={(requiresDriver, assignedDriverId, pickupTime) =>
              setAppointmentData((prev) => ({
                ...prev,
                requiresDriver,
                assignedDriverId,
                pickupTime
              }))
            }
          />
        )

      case 'notes':
        return (
          <NotesStep
            notes={appointmentData.notes}
            onChange={(notes) =>
              setAppointmentData((prev) => ({ ...prev, notes }))
            }
          />
        )

      case 'familyConfirmation':
        return (
          <FamilyConfirmationStep
            familyMember={familyMember}
            appointmentData={appointmentData}
            confirmed={familyConfirmed}
            onChange={setFamilyConfirmed}
          />
        )

      case 'review':
        return (
          <ReviewStep
            appointmentData={appointmentData}
            familyMember={familyMember}
            providers={providers}
            familyMembers={familyMembers}
          />
        )

      case 'confirmation':
        return <ConfirmationStep familyMember={familyMember} onClose={onClose} />

      default:
        return null
    }
  }

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-3xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <Dialog.Title className="text-xl font-bold text-white">
                Schedule Appointment - {familyMember.name}
              </Dialog.Title>
              <p className="text-sm text-blue-100">
                AI-guided appointment scheduling
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          {currentStep !== 'confirmation' && (
            <div className="bg-gray-200 dark:bg-gray-700 h-2 flex-shrink-0">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto flex-1">
            {renderStepContent()}
          </div>

          {/* Footer Navigation */}
          {currentStep !== 'confirmation' && currentStep !== 'intro' && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-border flex items-center justify-between flex-shrink-0">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>

              <div className="flex items-center gap-3">
                {currentStep === 'review' ? (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-5 h-5" />
                        Schedule Appointment
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={currentStep === 'familyConfirmation' && !familyConfirmed}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
    </>
  )
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function IntroStep({
  familyMember,
  onNext
}: {
  familyMember: { name: string }
  onNext: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CalendarIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Let's Schedule an Appointment for {familyMember.name}
        </h3>
        <p className="text-muted-foreground">
          I'll guide you through each step to ensure nothing is missed
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              What We'll Need
            </h4>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>✓ Healthcare provider information</li>
              <li>✓ Appointment date and time</li>
              <li>✓ Reason for visit</li>
              <li>✓ Location details</li>
              <li>✓ Transportation arrangements (if needed)</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
      >
        Start Scheduling
        <ArrowRightIcon className="w-5 h-5" />
      </button>
    </div>
  )
}

function ProviderStep({
  providers,
  selectedProviderId,
  onChange,
  patientId,
  familyMembers,
  showAddProviderForm,
  onToggleAddProviderForm,
  onProviderAdded
}: {
  providers: Array<{ id: string; name: string; specialty?: string }>
  selectedProviderId?: string
  onChange: (providerId: string) => void
  patientId: string
  familyMembers: Array<{ userId: string; name: string; email: string }>
  showAddProviderForm: boolean
  onToggleAddProviderForm: (show: boolean) => void
  onProviderAdded: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [customSpecialty, setCustomSpecialty] = useState('')
  const [phone, setPhone] = useState('')
  const [facility, setFacility] = useState('')
  const [linkToAllFamily, setLinkToAllFamily] = useState(false)

  // Deduplicate providers by ID (DRY - prevent showing duplicates)
  const uniqueProviders = providers.reduce((acc, provider) => {
    if (!acc.find(p => p.id === provider.id)) {
      acc.push(provider)
    }
    return acc
  }, [] as typeof providers)

  // Sort alphabetically by name for better UX
  const sortedProviders = [...uniqueProviders].sort((a, b) => a.name.localeCompare(b.name))

  const handleSubmitProvider = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !specialty) {
      toast.error('Name and specialty are required')
      return
    }

    if (specialty === 'Other' && !customSpecialty.trim()) {
      toast.error('Please specify the specialty')
      return
    }

    setLoading(true)

    try {
      // Get Firebase auth token
      const auth = getAuth()
      const user = auth.currentUser
      if (!user) {
        throw new Error('You must be logged in to add a provider')
      }

      const authToken = await user.getIdToken()
      const csrfToken = getCSRFToken()

      const finalSpecialty = specialty === 'Other' ? customSpecialty.trim() : specialty

      // Prepare provider payload (without patientIds - will link separately)
      const providerName = title ? `${title} ${name.trim()}` : name.trim()

      const payload: Record<string, any> = {
        name: providerName,
        specialty: finalSpecialty,
        type: 'physician' // Required by schema
      }

      // Only add optional fields if they have values
      if (phone) payload.phone = phone
      if (facility.trim()) payload.organization = facility.trim()

      // Step 1: Create the provider
      const response = await fetch(`/api/providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || errorData.message || 'Failed to add provider'
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('[ProviderStep] Provider created successfully:', result)

      // Step 2: Link provider to patient(s)
      const providerId = result.data.id
      const patientIdsToLink = linkToAllFamily
        ? familyMembers.map(fm => fm.userId)
        : [patientId]

      console.log('[ProviderStep] Linking provider to patients:', patientIdsToLink)

      // Link to each patient
      for (const pid of patientIdsToLink) {
        const linkResponse = await fetch(`/api/providers/${providerId}/patients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ patientId: pid })
        })

        if (!linkResponse.ok) {
          console.warn(`[ProviderStep] Failed to link provider to patient ${pid}`)
        }
      }

      console.log('[ProviderStep] Provider linked to all patients')

      toast.success('Provider added successfully')

      // Reset form
      setTitle('')
      setName('')
      setSpecialty('')
      setCustomSpecialty('')
      setPhone('')
      setFacility('')
      setLinkToAllFamily(false)

      console.log('[ProviderStep] Calling onProviderAdded to refresh list...')
      await onProviderAdded()
      console.log('[ProviderStep] onProviderAdded completed')
    } catch (error: any) {
      console.error('[ProviderStep] Full error details:', {
        message: error?.message,
        error: error,
        stack: error?.stack
      })

      const errorMessage = error.message || 'Failed to add provider'
      logger.error('[ProviderStep] Error adding provider', {
        error: errorMessage,
        errorObject: error,
        stack: error.stack
      })
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (showAddProviderForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground">Add New Provider</h3>
          <button
            onClick={() => onToggleAddProviderForm(false)}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← Back to provider list
          </button>
        </div>

        <form onSubmit={handleSubmitProvider} className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Title</label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {PROVIDER_TITLES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="col-span-3">
              <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Smith"
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Specialty *</label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select specialty...</option>
              {PROVIDER_SPECIALTIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {specialty === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Specify Specialty *</label>
              <input
                type="text"
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
                placeholder="e.g., Sports Medicine"
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Facility</label>
              <input
                type="text"
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                placeholder="e.g., City Medical Center"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={linkToAllFamily}
                onChange={(e) => setLinkToAllFamily(e.target.checked)}
                className="w-4 h-4 rounded border-border text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-foreground">
                Make this provider available for all family members
              </span>
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              {linkToAllFamily
                ? 'This provider will be added to all family members in your household'
                : 'This provider will only be linked to the current family member'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Adding...' : 'Add Provider'}
            </button>
            <button
              type="button"
              onClick={() => onToggleAddProviderForm(false)}
              disabled={loading}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground">Select Healthcare Provider</h3>
      <p className="text-sm text-muted-foreground">
        Choose the provider for this appointment (optional - you can skip if not applicable)
      </p>

      {/* Add Provider Button */}
      <button
        onClick={() => onToggleAddProviderForm(true)}
        className="w-full p-4 rounded-lg border-2 border-dashed border-blue-400 hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-2"
      >
        <PlusIcon className="w-5 h-5" />
        Add New Provider
      </button>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onChange(provider.id)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              selectedProviderId === provider.id
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <UserIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-foreground">{provider.name}</div>
                {provider.specialty && (
                  <div className="text-sm text-muted-foreground">{provider.specialty}</div>
                )}
              </div>
              {selectedProviderId === provider.id && (
                <CheckCircleIcon className="w-5 h-5 text-blue-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      {sortedProviders.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No providers found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Click "Add New Provider" above to get started
          </p>
        </div>
      )}
    </div>
  )
}

function DateTimeStep({
  dateTime,
  onChange
}: {
  dateTime?: Date
  onChange: (dateTime: Date) => void
}) {
  const [date, setDate] = useState(
    dateTime ? dateTime.toISOString().split('T')[0] : ''
  )
  const [time, setTime] = useState(
    dateTime
      ? dateTime.toTimeString().slice(0, 5)
      : ''
  )

  const handleUpdate = () => {
    if (date && time) {
      const combined = new Date(`${date}T${time}`)
      onChange(combined)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground">Appointment Date & Time</h3>
      <p className="text-sm text-muted-foreground">
        When is the appointment scheduled?
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <CalendarIcon className="w-4 h-4 inline mr-1" />
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              if (time) {
                const combined = new Date(`${e.target.value}T${time}`)
                onChange(combined)
              }
            }}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <ClockIcon className="w-4 h-4 inline mr-1" />
            Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value)
              if (date) {
                const combined = new Date(`${date}T${e.target.value}`)
                onChange(combined)
              }
            }}
            className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

function TypeStep({
  type,
  reason,
  onChange
}: {
  type?: string
  reason?: string
  onChange: (type: AppointmentData['type'], reason: string) => void
}) {
  const [showCustomType, setShowCustomType] = useState(false)
  const [customTypeName, setCustomTypeName] = useState('')

  const types: Array<{ value: AppointmentData['type']; label: string; description: string; placeholder: string }> = [
    {
      value: 'routine-checkup',
      label: 'Routine Checkup',
      description: 'Regular wellness visit or physical exam',
      placeholder: 'e.g., Annual physical, preventive screening, wellness exam...'
    },
    {
      value: 'follow-up',
      label: 'Follow-up Visit',
      description: 'Follow-up from previous appointment or treatment',
      placeholder: 'e.g., Post-surgery checkup, medication adjustment, test results review...'
    },
    {
      value: 'specialist',
      label: 'Specialist Consultation',
      description: 'Visit with a medical specialist',
      placeholder: 'e.g., Cardiology consultation, dermatology screening, orthopedic evaluation...'
    },
    {
      value: 'lab',
      label: 'Lab Work / Tests',
      description: 'Blood work, imaging, or other tests',
      placeholder: 'e.g., Fasting blood work, X-ray, MRI, COVID test...'
    },
    {
      value: 'other',
      label: 'Other',
      description: 'Different type of medical appointment',
      placeholder: 'Please describe the type and reason for this appointment...'
    }
  ]

  const selectedType = types.find(t => t.value === type)

  const handleCreateCustomType = () => {
    if (customTypeName.trim()) {
      // Store custom type name in the reason field with a marker
      onChange('other', `[Custom: ${customTypeName.trim()}] ${reason || ''}`)
      setShowCustomType(false)
      setCustomTypeName('')
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground">Appointment Type & Reason</h3>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Type of Appointment
        </label>
        <div className="space-y-2">
          {types.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                onChange(t.value, reason || '')
                setShowCustomType(false)
              }}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                type === t.value
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-foreground">{t.label}</div>
                  <div className="text-sm text-muted-foreground">{t.description}</div>
                </div>
                {type === t.value && <CheckCircleIcon className="w-5 h-5 text-blue-600" />}
              </div>
            </button>
          ))}

          {/* Custom Type Option */}
          {!showCustomType ? (
            <button
              onClick={() => setShowCustomType(true)}
              className="w-full text-left p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-all text-muted-foreground hover:text-blue-600"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">➕</span>
                <span className="font-medium">Create Custom Type</span>
              </div>
            </button>
          ) : (
            <div className="p-4 rounded-lg border-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20">
              <label className="block text-sm font-medium text-foreground mb-2">
                Custom Appointment Type
              </label>
              <input
                type="text"
                value={customTypeName}
                onChange={(e) => setCustomTypeName(e.target.value)}
                placeholder="e.g., Physical Therapy, Dental Cleaning, Vision Screening..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateCustomType}
                  disabled={!customTypeName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Create & Use
                </button>
                <button
                  onClick={() => {
                    setShowCustomType(false)
                    setCustomTypeName('')
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {type && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Specific Details
          </label>
          <textarea
            value={reason || ''}
            onChange={(e) => onChange(type, e.target.value)}
            placeholder={selectedType?.placeholder || 'Provide specific details about this appointment...'}
            rows={3}
            className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {type === 'other' ? 'Required - please describe what this appointment is for' : 'Optional - add any specific concerns or details'}
          </p>
        </div>
      )}
    </div>
  )
}

function LocationStep({
  location,
  onChange
}: {
  location?: string
  onChange: (location: string) => void
}) {
  const isAutoPopulated = location && location.includes('\n')

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground">Appointment Location</h3>
      <p className="text-sm text-muted-foreground">
        {isAutoPopulated
          ? 'Location auto-filled from provider information. You can edit or add details below.'
          : 'Where will the appointment take place?'}
      </p>

      {isAutoPopulated && (
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800 dark:text-green-200">
            <span className="font-semibold">Location auto-populated</span> from provider's office address
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          <MapPinIcon className="w-4 h-4 inline mr-1" />
          Address or Location
        </label>
        <textarea
          value={location || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., 123 Medical Plaza, Suite 200, City, State ZIP"
          rows={5}
          className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Add suite number, building name, floor, parking instructions, or any other location details
        </p>
      </div>

      {/* Smart-context map - only loads when user clicks "View Map" */}
      {location && (
        <div className="mt-4">
          <LocationMap
            address={location}
            title="Appointment Location"
            showDirections={true}
          />
        </div>
      )}
    </div>
  )
}

function TransportationStep({
  requiresDriver,
  assignedDriverId,
  pickupTime,
  familyMembers,
  onChange
}: {
  requiresDriver: boolean
  assignedDriverId?: string
  pickupTime?: Date
  familyMembers: Array<{ userId: string; name: string; email: string }>
  onChange: (requiresDriver: boolean, assignedDriverId?: string, pickupTime?: Date) => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground">Transportation</h3>
      <p className="text-sm text-muted-foreground">
        Does this appointment require transportation assistance?
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(false)}
          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
            !requiresDriver
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="font-semibold text-foreground">No Transportation Needed</div>
        </button>
        <button
          onClick={() => onChange(true, assignedDriverId, pickupTime)}
          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
            requiresDriver
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="font-semibold text-foreground flex items-center gap-2">
            <TruckIcon className="w-5 h-5" />
            Needs Driver
          </div>
        </button>
      </div>

      {requiresDriver && (
        <div className="space-y-4 mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Assign Driver
            </label>
            <select
              value={assignedDriverId || ''}
              onChange={(e) => onChange(true, e.target.value, pickupTime)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a family member...</option>
              {familyMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Pickup Time
            </label>
            <input
              type="time"
              value={pickupTime ? pickupTime.toTimeString().slice(0, 5) : ''}
              onChange={(e) => {
                const time = e.target.value
                const dateTime = time ? new Date(`1970-01-01T${time}`) : undefined
                onChange(true, assignedDriverId, dateTime)
              }}
              className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function NotesStep({
  notes,
  onChange
}: {
  notes?: string
  onChange: (notes: string) => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground">Additional Notes</h3>
      <p className="text-sm text-muted-foreground">
        Any special instructions or reminders for this appointment?
      </p>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          <DocumentTextIcon className="w-4 h-4 inline mr-1" />
          Notes (Optional)
        </label>
        <textarea
          value={notes || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., Bring insurance card, fasting required, prepare list of medications..."
          rows={5}
          className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

function FamilyConfirmationStep({
  familyMember,
  appointmentData,
  confirmed,
  onChange
}: {
  familyMember: { name: string }
  appointmentData: Partial<AppointmentData>
  confirmed: boolean
  onChange: (confirmed: boolean) => void
}) {
  const appointmentDate = appointmentData.dateTime
    ? appointmentData.dateTime.toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    : 'Not set'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-foreground">Confirm with Family Member</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Before scheduling, please confirm this appointment works for {familyMember.name}
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3 mb-4">
          <InformationCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Appointment Summary
            </h4>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <div>
                <span className="font-medium">Family Member:</span> {familyMember.name}
              </div>
              <div>
                <span className="font-medium">Date & Time:</span> {appointmentDate}
              </div>
              {appointmentData.location && (
                <div>
                  <span className="font-medium">Location:</span> {appointmentData.location.split('\n')[0]}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-blue-200 dark:border-blue-700 pt-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => onChange(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm text-blue-900 dark:text-blue-100 group-hover:text-blue-700 dark:group-hover:text-blue-200">
              I have confirmed that this appointment time and details work for{' '}
              <span className="font-semibold">{familyMember.name}</span> and they are aware of this appointment.
            </span>
          </label>
        </div>
      </div>

      {!confirmed && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <span className="font-semibold">Important:</span> Please confirm with {familyMember.name} before proceeding to ensure they are available and prepared for this appointment.
            </div>
          </div>
        </div>
      )}

      {confirmed && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800 dark:text-green-200">
              <span className="font-semibold">Great!</span> You can now proceed to review and schedule the appointment.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewStep({
  appointmentData,
  familyMember,
  providers,
  familyMembers
}: {
  appointmentData: Partial<AppointmentData>
  familyMember: { name: string }
  providers: Array<{ id: string; name: string; specialty?: string }>
  familyMembers: Array<{ userId: string; name: string; email: string }>
}) {
  const provider = providers.find((p) => p.id === appointmentData.providerId)
  const driver = familyMembers.find((m) => m.userId === appointmentData.assignedDriverId)

  const appointmentTypes = {
    'routine-checkup': 'Routine Checkup',
    'follow-up': 'Follow-up Visit',
    specialist: 'Specialist Consultation',
    lab: 'Lab Work / Tests',
    other: 'Other'
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">Review Appointment Details</h3>
        <p className="text-muted-foreground">
          Please verify all information before scheduling
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-4">
        <div>
          <div className="text-xs text-muted-foreground uppercase mb-1">Patient</div>
          <div className="font-semibold text-foreground">{familyMember.name}</div>
        </div>

        {appointmentData.providerId && (
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">Provider</div>
            <div className="font-semibold text-foreground">
              {provider?.name || 'Not selected'}
            </div>
            {provider?.specialty && (
              <div className="text-sm text-muted-foreground">{provider.specialty}</div>
            )}
          </div>
        )}

        <div>
          <div className="text-xs text-muted-foreground uppercase mb-1">Date & Time</div>
          <div className="font-semibold text-foreground">
            {appointmentData.dateTime
              ? appointmentData.dateTime.toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })
              : 'Not set'}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground uppercase mb-1">Type</div>
          <div className="font-semibold text-foreground">
            {appointmentData.type ? appointmentTypes[appointmentData.type] : 'Not set'}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground uppercase mb-1">Reason</div>
          <div className="font-semibold text-foreground">
            {appointmentData.reason || 'Not specified'}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground uppercase mb-1">Location</div>
          <div className="font-semibold text-foreground">
            {appointmentData.location || 'Not specified'}
          </div>
        </div>

        {appointmentData.requiresDriver && (
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">Transportation</div>
            <div className="font-semibold text-foreground">
              Driver: {driver?.name || 'Not assigned'}
            </div>
            {appointmentData.pickupTime && (
              <div className="text-sm text-muted-foreground">
                Pickup: {appointmentData.pickupTime.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            )}
          </div>
        )}

        {appointmentData.notes && (
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">Notes</div>
            <div className="text-sm text-foreground">{appointmentData.notes}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function ConfirmationStep({
  familyMember,
  onClose
}: {
  familyMember: { name: string }
  onClose: () => void
}) {
  return (
    <div className="text-center py-8 space-y-6">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
        <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
      </div>

      <div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Appointment Scheduled Successfully!
        </h3>
        <p className="text-muted-foreground">
          {familyMember.name}'s appointment has been added to the calendar
        </p>
      </div>

      <button
        onClick={onClose}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Done
      </button>
    </div>
  )
}
