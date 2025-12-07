/**
 * Enhanced Add/Edit Provider Modal with Multi-Member Assignment
 *
 * Allows assigning a provider to multiple family members at once
 */

'use client'

import { useState, useEffect } from 'react'
import { PROVIDER_TITLES, PROVIDER_SPECIALTIES } from '@/types/providers'
import type { HealthcareProvider } from '@/types/providers'
import type { PatientProfile } from '@/types/medical'
import { FamilyMemberMultiSelect } from './FamilyMemberMultiSelect'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

interface AddProviderModalEnhancedProps {
  isOpen: boolean
  onClose: () => void
  patients: PatientProfile[] // All family members
  defaultPatientId?: string // Pre-select this patient
  provider?: HealthcareProvider // If editing
  onSuccess: () => void
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
] as const

export function AddProviderModalEnhanced({
  isOpen,
  onClose,
  patients,
  defaultPatientId,
  provider,
  onSuccess
}: AddProviderModalEnhancedProps) {
  const [loading, setLoading] = useState(false)

  // Form fields
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [customSpecialty, setCustomSpecialty] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [fax, setFax] = useState('')
  const [facility, setFacility] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [notes, setNotes] = useState('')

  // Multi-member selection
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([])

  // Pre-populate fields when editing or when default patient is provided
  useEffect(() => {
    if (provider) {
      setTitle(provider.title || '')
      setName(provider.name)

      // Check if specialty is in the predefined list
      if (PROVIDER_SPECIALTIES.includes(provider.specialty as any)) {
        setSpecialty(provider.specialty)
        setCustomSpecialty('')
      } else {
        setSpecialty('Other')
        setCustomSpecialty(provider.specialty)
      }

      setEmail(provider.email || '')
      setPhone(provider.phone || '')
      setFax(provider.fax || '')
      setFacility(provider.facility || '')
      setStreet(provider.address?.street || '')
      setCity(provider.address?.city || '')
      setState(provider.address?.state || '')
      setZip(provider.address?.zip || '')
      setNotes(provider.notes || '')

      // Set selected patients from provider's patientIds
      setSelectedPatientIds(provider.patientIds || (provider.patientId ? [provider.patientId] : []))
    } else {
      // Reset form when adding new
      resetForm()

      // Pre-select default patient if provided
      if (defaultPatientId) {
        setSelectedPatientIds([defaultPatientId])
      }
    }
  }, [provider, defaultPatientId, isOpen])

  const resetForm = () => {
    setTitle('')
    setName('')
    setSpecialty('')
    setCustomSpecialty('')
    setEmail('')
    setPhone('')
    setFax('')
    setFacility('')
    setStreet('')
    setCity('')
    setState('')
    setZip('')
    setNotes('')
    setSelectedPatientIds([])
  }

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')

    if (cleaned.length <= 3) {
      return cleaned
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneNumber(value))
  }

  const handleFaxChange = (value: string) => {
    setFax(formatPhoneNumber(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!name.trim()) {
      toast.error('Provider name is required')
      return
    }

    if (!specialty) {
      toast.error('Please select a specialty')
      return
    }

    if (specialty === 'Other' && !customSpecialty.trim()) {
      toast.error('Please specify the specialty')
      return
    }

    if (selectedPatientIds.length === 0) {
      toast.error('Please select at least one family member')
      return
    }

    setLoading(true)

    try {
      const finalSpecialty = specialty === 'Other' ? customSpecialty.trim() : specialty

      const payload = {
        name: name.trim(),
        title: title || undefined,
        specialty: finalSpecialty,
        email: email.trim() || undefined,
        phone: phone || undefined,
        fax: fax || undefined,
        facility: facility.trim() || undefined,
        address: (street || city || state || zip) ? {
          street: street.trim() || undefined,
          city: city.trim() || undefined,
          state: state || undefined,
          zip: zip.trim() || undefined
        } : undefined,
        notes: notes.trim() || undefined,
        source: 'manual' as const,
        patientIds: selectedPatientIds, // Multi-member assignment
        patientId: selectedPatientIds[0] // Legacy field - use first patient
      }

      // Use the first patient's endpoint for creating
      const primaryPatientId = selectedPatientIds[0]
      const endpoint = provider
        ? `/api/patients/${primaryPatientId}/providers/${provider.id}`
        : `/api/patients/${primaryPatientId}/providers`

      const method = provider ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save provider')
      }

      const assignedNames = patients
        .filter(p => selectedPatientIds.includes(p.id))
        .map(p => p.name)
        .join(', ')

      toast.success(
        provider
          ? 'Provider updated successfully'
          : `Provider added for ${assignedNames}`
      )

      resetForm()
      onSuccess()
      onClose()
    } catch (error: any) {
      logger.error('[AddProviderModalEnhanced] Error saving provider', error)
      toast.error(error.message || 'Failed to save provider')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {provider ? 'Edit Provider' : 'Add Healthcare Provider'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Family Member Assignment */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Assign to Family Members <span className="text-red-500">*</span>
            </label>
            <FamilyMemberMultiSelect
              patients={patients}
              selectedPatientIds={selectedPatientIds}
              onChange={setSelectedPatientIds}
              disabled={loading}
              placeholder="Select family members for this provider..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Select all family members who see this provider
            </p>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Title
              </label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
              >
                <option value="">Select...</option>
                {PROVIDER_TITLES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                placeholder="e.g., Smith, Johnson"
                className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Specialty */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Specialty <span className="text-red-500">*</span>
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
              required
            >
              <option value="">Select specialty...</option>
              {PROVIDER_SPECIALTIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {specialty === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Specify Specialty <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
                disabled={loading}
                placeholder="Enter specialty"
                className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
                required
              />
            </div>
          )}

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="provider@example.com"
                className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                disabled={loading}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Fax
              </label>
              <input
                type="tel"
                value={fax}
                onChange={(e) => handleFaxChange(e.target.value)}
                disabled={loading}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Facility/Practice
              </label>
              <input
                type="text"
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                disabled={loading}
                placeholder="Medical Center"
                className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              disabled={loading}
              placeholder="123 Main St"
              className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                placeholder="City"
                className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
              >
                <option value="">Select...</option>
                {US_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                disabled={loading}
                placeholder="12345"
                maxLength={10}
                className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              placeholder="Additional notes..."
              rows={3}
              className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border-2 border-border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : provider ? 'Update Provider' : 'Add Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
