/**
 * New Provider Page
 *
 * Form to add a new healthcare provider
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useProviders } from '@/hooks/useProviders'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import type { ProviderType } from '@/types/medical'
import type { ExtractedProviderInfo } from '@/lib/ocr-provider'
import { CameraIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const ProviderScanner = dynamic(() => import('@/components/providers/ProviderScanner').then(mod => ({ default: mod.ProviderScanner })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>,
  ssr: false
})

export default function NewProviderPage() {
  return (
    <AuthGuard>
      <NewProviderContent />
    </AuthGuard>
  )
}

function NewProviderContent() {
  const router = useRouter()
  const { createProvider } = useProviders({ autoFetch: false })
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const [formData, setFormData] = useState({
    type: 'physician' as ProviderType,
    name: '',
    specialty: '',
    organization: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    npi: '',
    isPrimary: false,
    notes: ''
  })

  const handleScanComplete = (info: ExtractedProviderInfo) => {
    // Pre-fill form with extracted information
    setFormData(prev => ({
      ...prev,
      name: info.name || prev.name,
      specialty: info.specialty || prev.specialty,
      type: info.type || prev.type,
      phone: info.phone || prev.phone,
      email: info.email || prev.email,
      address: info.address || prev.address,
      city: info.city || prev.city,
      state: info.state || prev.state,
      zipCode: info.zipCode || prev.zipCode,
      npi: info.npiNumber || prev.npi,
      notes: prev.notes || `Scanned from document (${Math.round(info.confidence * 100)}% confidence)`
    }))

    toast.success('Provider information extracted! Please review and edit as needed.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('[Provider Form] Submitting data:', formData)
      const newProvider = await createProvider(formData)
      toast.success(`${newProvider.name} added successfully`)
      router.push(`/providers/${newProvider.id}`)
    } catch (error: any) {
      console.error('[Provider Form] Error:', error)
      toast.error(error.message || 'Failed to create provider')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Add Provider"
        subtitle="Add a new healthcare provider"
        backHref="/providers"
      />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-card rounded-lg shadow-sm p-8">
          {/* Scan Document Button */}
          <div className="mb-6 pb-6 border-b border-border">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium"
            >
              <CameraIcon className="w-6 h-6" />
              <div className="text-left">
                <div className="font-semibold">Scan Provider Document</div>
                <div className="text-sm text-blue-100">Auto-fill from business card or appointment card</div>
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Provider Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Provider Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ProviderType })}
                required
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground"
              >
                <option value="physician">Physician</option>
                <option value="specialist">Specialist</option>
                <option value="dentist">Dentist</option>
                <option value="veterinarian">Veterinarian</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="lab">Laboratory</option>
                <option value="imaging_center">Imaging Center</option>
                <option value="urgent_care">Urgent Care</option>
                <option value="hospital">Hospital</option>
                <option value="therapy">Therapy</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Provider Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground"
                placeholder="Dr. Jane Smith"
              />
            </div>

            {/* Specialty */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Specialty
              </label>
              <input
                type="text"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground"
                placeholder="Cardiology"
              />
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Organization/Practice
              </label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground"
                placeholder="General Hospital"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Street Address *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground"
                placeholder="123 Medical Plaza"
              />
            </div>

            {/* City, State, ZIP */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-foreground mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  State *
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  required
                  maxLength={2}
                  className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground"
                  placeholder="CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground"
                  placeholder="90210"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email (Optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground"
                placeholder="contact@provider.com"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Website (Optional)
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground"
                placeholder="https://www.provider.com"
              />
            </div>

            {/* Primary Provider */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPrimary"
                checked={formData.isPrimary}
                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                className="w-4 h-4 text-primary rounded focus:ring-purple-500"
              />
              <label htmlFor="isPrimary" className="text-sm text-foreground">
                Set as primary provider
              </label>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Adding...' : 'Add Provider'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Scanner Modal */}
      {showScanner && (
        <ProviderScanner
          onExtracted={handleScanComplete}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
