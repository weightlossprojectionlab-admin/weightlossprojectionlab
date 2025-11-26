'use client'

/**
 * Search Filter Component
 *
 * Search bar with category filter for shopping list
 */

import { useState } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { ProductCategory } from '@/types/shopping'

interface SearchFilterProps {
  onSearch: (query: string) => void
  onFilterCategory: (category: ProductCategory | 'all') => void
  selectedCategory?: ProductCategory | 'all'
  className?: string
}

const CATEGORIES: Array<{ value: ProductCategory | 'all'; label: string; emoji: string }> = [
  { value: 'all', label: 'All Categories', emoji: '🛒' },
  { value: 'produce', label: 'Produce', emoji: '🥬' },
  { value: 'meat', label: 'Meat', emoji: '🥩' },
  { value: 'dairy', label: 'Dairy', emoji: '🥛' },
  { value: 'bakery', label: 'Bakery', emoji: '🥖' },
  { value: 'deli', label: 'Deli', emoji: '🧀' },
  { value: 'eggs', label: 'Eggs', emoji: '🥚' },
  { value: 'herbs', label: 'Herbs', emoji: '🌿' },
  { value: 'seafood', label: 'Seafood', emoji: '🐟' },
  { value: 'frozen', label: 'Frozen', emoji: '🧊' },
  { value: 'pantry', label: 'Pantry', emoji: '🥫' },
  { value: 'beverages', label: 'Beverages', emoji: '🥤' },
  { value: 'other', label: 'Other', emoji: '📦' },
]

export function SearchFilter({
  onSearch,
  onFilterCategory,
  selectedCategory = 'all',
  className = '',
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch(query)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    onSearch('')
  }

  const handleCategorySelect = (category: ProductCategory | 'all') => {
    onFilterCategory(category)
    setShowCategoryFilter(false)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground dark:text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search shopping list..."
          className="w-full pl-10 pr-10 py-2 bg-background border border-border dark:border-gray-600 rounded-lg text-foreground dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="relative">
        <button
          onClick={() => setShowCategoryFilter(!showCategoryFilter)}
          className="flex items-center gap-2 px-3 py-2 bg-background border border-border dark:border-gray-600 rounded-lg hover:bg-background transition-colors"
          aria-label="Filter by category"
        >
          <FunnelIcon className="h-5 w-5 text-muted-foreground dark:text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {CATEGORIES.find(c => c.value === selectedCategory)?.label || 'All Categories'}
          </span>
          {selectedCategory !== 'all' && (
            <span className="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 text-xs rounded-full">
              Filter active
            </span>
          )}
        </button>

        {/* Category Dropdown */}
        {showCategoryFilter && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowCategoryFilter(false)}
            />

            {/* Dropdown */}
            <div className="absolute z-20 mt-2 w-64 bg-background border border-border dark:border-gray-600 rounded-lg shadow-lg overflow-hidden max-h-96 overflow-y-auto">
              {CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  onClick={() => handleCategorySelect(category.value)}
                  className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors ${
                    selectedCategory === category.value ? 'bg-secondary-light dark:bg-blue-900/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{category.emoji}</span>
                    <span className="font-medium text-foreground dark:text-white">
                      {category.label}
                    </span>
                    {selectedCategory === category.value && (
                      <span className="ml-auto text-secondary">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
