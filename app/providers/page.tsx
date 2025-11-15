/**
 * Providers List Page
 *
 * View and manage all healthcare providers
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProviders } from '@/hooks/useProviders'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProviderCard } from '@/components/providers/ProviderCard'
import AuthGuard from '@/components/auth/AuthGuard'
import type { Provider } from '@/types/medical'

export default function ProvidersPage() {
  return (
    <AuthGuard>
      <ProvidersContent />
    </AuthGuard>
  )
}

function ProvidersContent() {
  const router = useRouter()
  const { providers, loading, deleteProvider } = useProviders()
  const [filterType, setFilterType] = useState<string>('all')

  const handleDelete = async (provider: Provider) => {
    if (confirm(`Delete ${provider.name}? This action cannot be undone.`)) {
      await deleteProvider(provider.id)
    }
  }

  const filteredProviders = providers.filter(p =>
    filterType === 'all' ? true : p.type === filterType
  )

  const providerTypes = Array.from(new Set(providers.map(p => p.type)))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title="Healthcare Providers"
        subtitle="Manage doctors, specialists, pharmacies, and more"
        actions={
          <button
            onClick={() => router.push('/providers/new')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            + Add Provider
          </button>
        }
      />

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        {providerTypes.length > 0 && (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              All ({providers.length})
            </button>
            {providerTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filterType === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                ({providers.filter(p => p.type === type).length})
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading providers...</p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {filterType === 'all'
                ? 'No providers added yet'
                : `No ${filterType.replace('_', ' ')} providers found`}
            </p>
            <button
              onClick={() => router.push('/providers/new')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add Your First Provider
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map(provider => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onView={(p) => router.push(`/providers/${p.id}`)}
                onEdit={(p) => router.push(`/providers/${p.id}/edit`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
