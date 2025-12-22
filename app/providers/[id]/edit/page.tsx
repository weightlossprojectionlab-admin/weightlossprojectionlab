/**
 * Provider Edit Page
 *
 * Edit an existing healthcare provider
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProviders } from '@/hooks/useProviders'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import toast from 'react-hot-toast'
import { PROVIDER_SPECIALTIES, PROVIDER_TITLES } from '@/types/providers'

export default function ProviderEditPage() {
  return (
    <AuthGuard>
      <ProviderEditContent />
    </AuthGuard>
  )
}

function ProviderEditContent() {
  const params = useParams()
  const router = useRouter()
  const providerId = params.id as string
  const { providers, loading: providersLoading, updateProvider } = useProviders()

  const provider = providers.find(p => p.id === providerId)

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    name: '',
    specialty: '',
    customSpecialty: '',
    facility: '',
    phone: '',
    fax: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  })

  useEffect(() => {
    if (provider) {
      setFormData({
        title: '', // Title field not in Provider type, leaving empty
        name: provider.name,
        specialty: provider.specialty || '',
        customSpecialty: PROVIDER_SPECIALTIES.includes(provider.specialty as any || '') ? '' : provider.specialty || '',
        facility: provider.organization || '',
        phone: provider.phone || '',
        fax: provider.fax || '',
        email: provider.email || '',
        website: provider.website || '',
        address: provider.address || '',
        city: provider.city || '',
        state: provider.state || '',
        zipCode: provider.zipCode || ''
      })
    }
  }, [provider])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Provider name is required')
      return
    }

    try {
      setLoading(true)

      const finalSpecialty = formData.specialty === 'Other'
        ? formData.customSpecialty
        : formData.specialty

      // Build update data, only including non-empty values
      const updateData: Record<string, any> = {
        name: formData.name
      }

      // Add optional fields only if they have values
      if (formData.title?.trim()) updateData.title = formData.title
      if (finalSpecialty?.trim()) updateData.specialty = finalSpecialty
      if (formData.facility?.trim()) updateData.facility = formData.facility
      if (formData.phone?.trim()) updateData.phone = formData.phone
      if (formData.fax?.trim()) updateData.fax = formData.fax
      if (formData.email?.trim()) updateData.email = formData.email
      if (formData.website?.trim()) updateData.website = formData.website
      if (formData.address?.trim()) updateData.address = formData.address
      if (formData.city?.trim()) updateData.city = formData.city
      if (formData.state?.trim()) updateData.state = formData.state
      if (formData.zipCode?.trim()) updateData.zipCode = formData.zipCode

      await updateProvider(providerId, updateData)
      toast.success('Provider updated successfully!')
      router.push(`/providers/${providerId}`)
    } catch (error) {
      console.error('Error updating provider:', error)
      toast.error('Failed to update provider')
    } finally {
      setLoading(false)
    }
  }

  if (providersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Loading..." backHref={`/providers/${providerId}`} />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse bg-card rounded-lg p-8 h-64" />
        </div>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Provider Not Found" backHref="/providers" />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-card rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              The provider you're trying to edit doesn't exist.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Edit Provider"
        subtitle={provider.name}
        backHref={`/providers/${providerId}`}
      />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-card rounded-lg p-6 space-y-6">
          {/* Title & Name */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Title
              </label>
              <select
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">None</option>
                {PROVIDER_TITLES.map(title => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-foreground mb-2">
                Provider Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., Smith, Johnson"
                required
              />
            </div>
          </div>

          {/* Specialty */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Specialty
            </label>
            <select
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select specialty</option>
              {PROVIDER_SPECIALTIES.map(specialty => (
                <option key={specialty} value={specialty}>{specialty}</option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Custom Specialty */}
          {formData.specialty === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Custom Specialty
              </label>
              <input
                type="text"
                value={formData.customSpecialty}
                onChange={(e) => setFormData({ ...formData, customSpecialty: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter custom specialty"
              />
            </div>
          )}

          {/* Facility */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Facility/Practice Name
            </label>
            <input
              type="text"
              value={formData.facility}
              onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., City Medical Center"
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Fax
              </label>
              <input
                type="tel"
                value={formData.fax}
                onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="(555) 123-4568"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="provider@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Street Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="NJ"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="12345"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/providers/${providerId}`)}
              className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
