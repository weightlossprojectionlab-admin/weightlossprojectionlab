/**
 * Provider Detail Page
 *
 * View detailed information about a specific healthcare provider
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useProviders } from '@/hooks/useProviders'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  GlobeAltIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function ProviderDetailPage() {
  return (
    <AuthGuard>
      <ProviderDetailContent />
    </AuthGuard>
  )
}

function ProviderDetailContent() {
  const params = useParams()
  const router = useRouter()
  const providerId = params.id as string
  const { providers, loading, deleteProvider } = useProviders()

  const provider = providers.find(p => p.id === providerId)

  const handleDelete = async () => {
    if (!provider) return

    if (confirm(`Are you sure you want to delete ${provider.name}?`)) {
      try {
        await deleteProvider(providerId)
        toast.success('Provider deleted successfully')
        router.push('/providers')
      } catch (error) {
        toast.error('Failed to delete provider')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <PageHeader title="Loading..." backHref="/providers" />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse bg-white dark:bg-gray-900 rounded-lg p-8 h-64" />
        </div>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <PageHeader title="Provider Not Found" backHref="/providers" />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              The provider you're looking for doesn't exist.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title={provider.name}
        subtitle={provider.specialty || provider.type}
        backHref="/providers"
      />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => router.push(`/providers/${providerId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PencilIcon className="w-5 h-5" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
            Delete
          </button>
        </div>

        {/* Provider Info Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8 space-y-6">
          {/* Basic Info */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {provider.name}
            </h2>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                {provider.type}
              </span>
              {provider.isPrimary && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                  Primary Provider
                </span>
              )}
            </div>
          </div>

          {/* Specialty */}
          {provider.specialty && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Specialty
              </h3>
              <p className="text-gray-900 dark:text-gray-100">{provider.specialty}</p>
            </div>
          )}

          {/* Organization */}
          {provider.organization && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Organization
              </h3>
              <p className="text-gray-900 dark:text-gray-100">{provider.organization}</p>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Contact Information
            </h3>

            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPinIcon className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-gray-900 dark:text-gray-100">{provider.address}</p>
                <p className="text-gray-900 dark:text-gray-100">
                  {provider.city}, {provider.state} {provider.zipCode}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3">
              <PhoneIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <a
                href={`tel:${provider.phone}`}
                className="text-purple-600 dark:text-purple-400 hover:underline"
              >
                {provider.phone}
              </a>
            </div>

            {/* Fax */}
            {provider.fax && (
              <div className="flex items-center gap-3">
                <PhoneIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-900 dark:text-gray-100">
                  Fax: {provider.fax}
                </span>
              </div>
            )}

            {/* Email */}
            {provider.email && (
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <a
                  href={`mailto:${provider.email}`}
                  className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {provider.email}
                </a>
              </div>
            )}

            {/* Website */}
            {provider.website && (
              <div className="flex items-center gap-3">
                <GlobeAltIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {provider.website}
                </a>
              </div>
            )}
          </div>

          {/* Additional Info */}
          {(provider.npi || provider.notes) && (
            <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Additional Information
              </h3>

              {provider.npi && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    NPI Number
                  </h4>
                  <p className="text-gray-900 dark:text-gray-100 font-mono">{provider.npi}</p>
                </div>
              )}

              {provider.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Notes
                  </h4>
                  <p className="text-gray-900 dark:text-gray-100">{provider.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
