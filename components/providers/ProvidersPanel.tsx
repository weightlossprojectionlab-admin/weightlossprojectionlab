'use client'

/**
 * Providers list — the single source for browsing / adding / removing
 * healthcare providers. Rendered standalone at /providers AND inside the
 * Medical hub's "Providers" tab, so both stay in sync (no duplicated logic).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProviders } from '@/hooks/useProviders'
import { ProviderCard } from '@/components/providers/ProviderCard'
import { useLockedAction } from '@/hooks/useLockedAction'
import { LockClosedIcon } from '@heroicons/react/24/solid'
import type { Provider } from '@/types/medical'

export function ProvidersPanel() {
  const router = useRouter()
  const { providers, loading, deleteProvider } = useProviders()
  const [filterType, setFilterType] = useState<string>('all')
  // Feature-access gate — read-only subscribers can browse but not add/remove.
  const addProviderLock = useLockedAction()
  const removeProviderLock = useLockedAction()

  const handleDelete = async (provider: Provider) => {
    if (removeProviderLock.isLocked) {
      removeProviderLock.onLockedClick()
      return
    }
    if (confirm(`Delete ${provider.name}? This action cannot be undone.`)) {
      await deleteProvider(provider.id)
    }
  }

  const filteredProviders = providers.filter(p =>
    filterType === 'all' ? true : p.type === filterType
  )
  const providerTypes = Array.from(new Set(providers.map(p => p.type)))
  const addProvider = addProviderLock.isLocked
    ? addProviderLock.onLockedClick
    : () => router.push('/providers/new')

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={addProvider}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors inline-flex items-center gap-2"
        >
          {addProviderLock.isLocked ? (
            <>
              <LockClosedIcon className="w-4 h-4" />
              Paused — Add Provider
            </>
          ) : (
            '+ Add Provider'
          )}
        </button>
      </div>

      {/* Filters */}
      {providerTypes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-primary text-white'
                : 'bg-card text-foreground border-2 border-border hover:border-border'
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
                  ? 'bg-primary text-white'
                  : 'bg-card text-foreground border-2 border-border hover:border-border'
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
          <p className="text-muted-foreground dark:text-muted-foreground">Loading providers...</p>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border-2 border-border">
          <p className="text-muted-foreground dark:text-muted-foreground mb-4">
            {filterType === 'all'
              ? 'No providers added yet'
              : `No ${filterType.replace('_', ' ')} providers found`}
          </p>
          <button
            onClick={addProvider}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors inline-flex items-center gap-2"
          >
            {addProviderLock.isLocked ? (
              <>
                <LockClosedIcon className="w-4 h-4" />
                Paused — Add Provider
              </>
            ) : (
              'Add Your First Provider'
            )}
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
    </div>
  )
}
