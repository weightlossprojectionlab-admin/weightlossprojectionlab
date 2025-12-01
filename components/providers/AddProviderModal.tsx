/**
 * Add/Edit Provider Modal
 *
 * Modal component for adding new healthcare providers or editing existing ones.
 * Includes comprehensive form fields for contact info, specialty, and address.
 */

'use client'

import { useState, useEffect } from 'react'
import { PROVIDER_TITLES, PROVIDER_SPECIALTIES } from '@/types/providers'
import type { HealthcareProvider } from '@/types/providers'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

interface AddProviderModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
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

export function AddProviderModal({
  isOpen,
  onClose,
  patientId,
  provider,
  onSuccess
}: AddProviderModalProps) {
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

  // Pre-populate fields when editing
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
    } else {
      // Reset form when adding new
      resetForm()
    }
  }, [provider, isOpen])

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
        source: 'manual' as const
      }

      const endpoint = provider
        ? `/api/patients/${patientId}/providers/${provider.id}`
        : `/api/patients/${patientId}/providers`

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

      toast.success(provider ? 'Provider updated successfully' : 'Provider added successfully')

      resetForm()
      onSuccess()
      onClose()
    } catch (error: any) {
      logger.error('[AddProviderModal] Error saving provider', error)
      toast.error(error.message || 'Failed to save provider')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {provider ? 'Edit Provider' : 'Add Healthcare Provider'}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Title
                  </label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">None</option>
                    {PROVIDER_TITLES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., John Smith"
                    required
                    className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Specialty */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Specialty *
                </label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  required
                  className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select specialty...</option>
                  {PROVIDER_SPECIALTIES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Custom Specialty (shown when "Other" is selected) */}
              {specialty === 'Other' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Specify Specialty *
                  </label>
                  <input
                    type="text"
                    value={customSpecialty}
                    onChange={(e) => setCustomSpecialty(e.target.value)}
                    placeholder="e.g., Sports Medicine"
                    required
                    className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}
            </div>

            {/* Contact Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="provider@example.com"
                    className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Phone and Fax */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fax
                    </label>
                    <input
                      type="tel"
                      value={fax}
                      onChange={(e) => handleFaxChange(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Facility/Practice Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Facility / Practice</h3>

              <div className="space-y-4">
                {/* Facility Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Facility Name
                  </label>
                  <input
                    type="text"
                    value={facility}
                    onChange={(e) => setFacility(e.target.value)}
                    placeholder="e.g., City Medical Center"
                    className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="123 Main Street"
                    className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      State
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select state...</option>
                      {US_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="12345"
                      maxLength={10}
                      className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Additional Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or special instructions..."
                rows={4}
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Saving...' : provider ? 'Update Provider' : 'Add Provider'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
