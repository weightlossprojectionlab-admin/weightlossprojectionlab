'use client'

/**
 * Provider Directory Filters
 *
 * Phase B slice 6: client-side filter bar for /find-a-provider. Two
 * controls: a free-text search input (matches name, slug, or location)
 * and a practice-type radio group. Both pieces of state live in the
 * URL via searchParams so the page can be deep-linked, bookmarked,
 * and back/forward navigated.
 *
 * The page is a server component that reads the same searchParams and
 * filters the tenant list before rendering. This component only owns
 * the inputs — the table is server-rendered.
 */

import { useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FRANCHISE_PRACTICE_TYPES } from '@/lib/franchise-plans'

export default function ProviderDirectoryFilters() {
  const router = useRouter()
  const pathname = usePathname() || '/find-a-provider'
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentQuery = searchParams?.get('q') ?? ''
  const currentType = searchParams?.get('type') ?? ''

  const updateSearch = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="provider-search"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Search by name or location
        </label>
        <input
          id="provider-search"
          type="search"
          defaultValue={currentQuery}
          onChange={e => updateSearch('q', e.target.value)}
          placeholder="e.g. Little Care Bears, New Jersey"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by practice type
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateSearch('type', '')}
            aria-pressed={currentType === ''}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition ${
              currentType === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {FRANCHISE_PRACTICE_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => updateSearch('type', t)}
              aria-pressed={currentType === t}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition ${
                currentType === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isPending && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Updating results…</p>
      )}
    </div>
  )
}
