'use client'

/**
 * Store Picker Component
 *
 * Dropdown to select a store for shopping list organization
 * Shows most recently visited stores
 */

import { useState, useRef, useEffect } from 'react'
import { MapPinIcon, ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { Store } from '@/types/shopping'

interface StorePickerProps {
  stores: Store[]
  selectedStoreId?: string
  onSelectStore: (storeId: string | undefined) => void
  onAddStore?: (storeName: string) => Promise<void>
  className?: string
}

export function StorePicker({
  stores,
  selectedStoreId,
  onSelectStore,
  onAddStore,
  className = '',
}: StorePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showAddStore, setShowAddStore] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')
  const [adding, setAdding] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowAddStore(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (storeId: string | undefined) => {
    onSelectStore(storeId)
    setIsOpen(false)
  }

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStoreName.trim() || !onAddStore) return

    try {
      setAdding(true)
      await onAddStore(newStoreName.trim())
      setNewStoreName('')
      setShowAddStore(false)
      setIsOpen(false)
    } catch (error) {
      console.error('Error adding store:', error)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-background border border-border dark:border-gray-600 rounded-lg hover:bg-background transition-colors"
        aria-label="Select store"
      >
        <MapPinIcon className="h-5 w-5 text-muted-foreground dark:text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {selectedStore ? selectedStore.name : 'All Stores'}
        </span>
        <ChevronDownIcon className={`h-4 w-4 text-muted-foreground dark:text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-2 w-64 bg-background border border-border dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          {!showAddStore ? (
            <>
              {/* Store List */}
              <div className="max-h-64 overflow-y-auto">
                {/* All Stores Option */}
                <button
                  onClick={() => handleSelect(undefined)}
                  className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors ${
                    !selectedStoreId ? 'bg-secondary-light dark:bg-blue-900/30' : ''
                  }`}
                >
                  <div className="font-medium text-foreground dark:text-white">
                    All Stores
                  </div>
                  <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Show all items
                  </div>
                </button>

                {/* Divider */}
                {stores.length > 0 && (
                  <div className="border-t border-border my-1" />
                )}

                {/* Recent Stores */}
                {stores.map(store => (
                  <button
                    key={store.id}
                    onClick={() => handleSelect(store.id)}
                    className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors ${
                      selectedStoreId === store.id ? 'bg-secondary-light dark:bg-blue-900/30' : ''
                    }`}
                  >
                    <div className="font-medium text-foreground dark:text-white">
                      {store.name}
                    </div>
                    {store.lastVisitedAt && (
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                        Last visited {new Date(store.lastVisitedAt).toLocaleDateString()}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Add Store Button */}
              {onAddStore && (
                <>
                  <div className="border-t border-border" />
                  <button
                    onClick={() => setShowAddStore(true)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-secondary hover:bg-muted transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Add New Store</span>
                  </button>
                </>
              )}
            </>
          ) : (
            /* Add Store Form */
            <form onSubmit={handleAddStore} className="p-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Store Name
              </label>
              <input
                type="text"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="e.g., Walmart, Kroger"
                className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-background dark:bg-gray-700 text-foreground dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                disabled={adding}
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStore(false)
                    setNewStoreName('')
                  }}
                  className="flex-1 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                  disabled={adding}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newStoreName.trim() || adding}
                  className="flex-1 px-3 py-2 text-sm bg-secondary hover:bg-secondary-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
