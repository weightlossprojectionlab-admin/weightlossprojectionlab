'use client'

/**
 * InventoryItemEditModal
 *
 * Tabbed editor for an inventory item. Three tabs:
 *  - Details (working) — category, on-hand quantity, unit-of-measure
 *  - UPC (stub) — current barcode + deep-link to /admin/barcodes
 *  - Image (stub) — current image + deep-link to /admin/barcodes
 *
 * UPC and Image tabs are intentional skeletons today. The lookup +
 * assignment infrastructure lives in the deferred memory
 * `project_inventory_edit_lookup` — when that ships, those tabs get
 * real lookup pickers backed by `product_database` (the same source
 * /admin/barcodes curates), creating a single source of truth across
 * /inventory, /admin/recipes, and /admin/barcodes.
 *
 * Pack-size (case / unit / each) is also part of the deferred memory.
 */

import { useState, useEffect } from 'react'
import { XMarkIcon, ArchiveBoxIcon, QrCodeIcon, PhotoIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import type { ProductCategory, QuantityUnit, ShoppingItem } from '@/types/shopping'

const CATEGORY_OPTIONS: { value: ProductCategory; label: string; emoji: string }[] = [
  { value: 'produce', label: 'Produce', emoji: '🥬' },
  { value: 'meat', label: 'Meat', emoji: '🥩' },
  { value: 'dairy', label: 'Dairy', emoji: '🥛' },
  { value: 'bakery', label: 'Bakery', emoji: '🥖' },
  { value: 'deli', label: 'Deli', emoji: '🧀' },
  { value: 'eggs', label: 'Eggs', emoji: '🥚' },
  { value: 'herbs', label: 'Herbs', emoji: '🌿' },
  { value: 'spices', label: 'Spices', emoji: '🧂' },
  { value: 'seafood', label: 'Seafood', emoji: '🐟' },
  { value: 'frozen', label: 'Frozen', emoji: '🧊' },
  { value: 'pantry', label: 'Pantry', emoji: '🥫' },
  { value: 'beverages', label: 'Beverages', emoji: '🥤' },
  { value: 'condiments', label: 'Condiments', emoji: '🍯' },
  { value: 'baby', label: 'Baby', emoji: '🍼' },
  { value: 'pet-food', label: 'Pet Food', emoji: '🐾' },
  { value: 'pet-supplies', label: 'Pet Supplies', emoji: '🦴' },
  { value: 'other', label: 'Other', emoji: '📦' },
]

const UNIT_OPTIONS: { value: QuantityUnit; group: string; label?: string }[] = [
  { value: 'count', group: 'Count' },
  { value: 'each', group: 'Count', label: 'ea' },
  { value: 'bunch', group: 'Count' },
  { value: 'head', group: 'Count' },
  { value: 'bag', group: 'Count' },
  { value: 'package', group: 'Count' },
  { value: 'can', group: 'Count' },
  { value: 'bottle', group: 'Count' },
  { value: 'container', group: 'Count' },
  { value: 'lbs', group: 'Weight' },
  { value: 'oz', group: 'Weight' },
  { value: 'g', group: 'Weight' },
  { value: 'kg', group: 'Weight' },
  { value: 'fl oz', group: 'Volume' },
  { value: 'cup', group: 'Volume' },
  { value: 'tbsp', group: 'Volume' },
  { value: 'tsp', group: 'Volume' },
  { value: 'ml', group: 'Volume' },
  { value: 'l', group: 'Volume' },
  { value: 'gal', group: 'Volume' },
  { value: 'qt', group: 'Volume' },
  { value: 'pt', group: 'Volume' },
]

type Tab = 'details' | 'upc' | 'image'

interface InventoryItemEditModalProps {
  item: ShoppingItem
  isOpen: boolean
  onClose: () => void
  onSave: (updates: { category?: ProductCategory; quantity?: number; unit?: QuantityUnit }) => Promise<void>
}

export function InventoryItemEditModal({ item, isOpen, onClose, onSave }: InventoryItemEditModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [category, setCategory] = useState<ProductCategory>(item.category)
  const [quantity, setQuantity] = useState<number>(item.quantity ?? 1)
  const [unit, setUnit] = useState<QuantityUnit | undefined>(item.unit)
  const [saving, setSaving] = useState(false)

  // Re-sync state when the modal opens for a different item.
  useEffect(() => {
    if (isOpen) {
      setCategory(item.category)
      setQuantity(item.quantity ?? 1)
      setUnit(item.unit)
      setActiveTab('details')
    }
  }, [isOpen, item.id, item.category, item.quantity, item.unit])

  if (!isOpen) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates: { category?: ProductCategory; quantity?: number; unit?: QuantityUnit } = {}
      if (category !== item.category) updates.category = category
      if (quantity !== item.quantity) updates.quantity = quantity
      if (unit !== item.unit) updates.unit = unit
      if (Object.keys(updates).length > 0) {
        await onSave(updates)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                aria-hidden="true"
                className="h-10 w-10 object-cover rounded border border-border flex-shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                <ArchiveBoxIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">{item.productName}</h2>
              {item.brand && <p className="text-xs text-muted-foreground truncate">{item.brand}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] hover:bg-muted rounded-full transition-colors flex-shrink-0"
          >
            <XMarkIcon className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex border-b border-border px-2">
          {([
            { id: 'details' as Tab, label: 'Details', icon: ArchiveBoxIcon },
            { id: 'upc' as Tab, label: 'UPC', icon: QrCodeIcon },
            { id: 'image' as Tab, label: 'Image', icon: PhotoIcon },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="form-input w-full"
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.emoji} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* On-hand quantity */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">On-hand quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(0, quantity - 1))}
                    aria-label="Decrease quantity"
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-muted hover:bg-gray-200 dark:hover:bg-gray-700 text-foreground text-xl font-bold transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="form-input w-24 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-primary text-white hover:bg-primary-hover text-xl font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Unit of measure */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Unit of measure</label>
                <select
                  value={unit || ''}
                  onChange={(e) => setUnit((e.target.value || undefined) as QuantityUnit | undefined)}
                  className="form-input w-full"
                >
                  <option value="">— Not set —</option>
                  {(['Count', 'Weight', 'Volume'] as const).map(group => (
                    <optgroup key={group} label={group}>
                      {UNIT_OPTIONS.filter(u => u.group === group).map(u => (
                        <option key={u.value} value={u.value}>{u.label || u.value}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Pricing — three read-only tier slots (Unit / Pack /
                  Case), each populated by the receipt-OCR apply flow
                  routing prices into the matching tier (lib/apply
                  -receipt-prices.ts). Em-dash placeholder when a tier
                  hasn't been captured yet so the user can see the
                  full price-tier structure of the item at a glance. */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Pricing
                </label>
                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {([
                    { label: 'Unit Price', value: item.unitPriceCents, tier: 'U' as const },
                    { label: 'Pack Price', value: item.packPriceCents, tier: 'P' as const },
                    { label: 'Case Price', value: item.casePriceCents, tier: 'C' as const },
                  ]).map((row) => {
                    const has = typeof row.value === 'number' && row.value > 0
                    const isCurrentTier = (item.packTier ?? 'U') === row.tier
                    return (
                      <div
                        key={row.tier}
                        className={`flex items-center justify-between px-3 py-2 ${
                          isCurrentTier ? 'bg-primary/5' : 'bg-card'
                        }`}
                      >
                        <span className="text-sm text-foreground">
                          {row.label}
                          {isCurrentTier && (
                            <span className="ml-2 text-[10px] font-semibold text-primary uppercase tracking-wide">
                              this tier
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            has ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {has ? `$${((row.value as number) / 100).toFixed(2)}` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Captured from receipt scans. The highlighted row matches this item&apos;s pack tier.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'upc' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Current barcode</label>
                <p className="text-sm text-foreground font-mono bg-muted px-3 py-2 rounded">
                  {item.barcode || <span className="text-muted-foreground italic font-sans">No barcode on this item</span>}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                  UPC lookup + scan-to-link is coming
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Soon you'll be able to scan a barcode here, look it up against the global product
                  catalog, and link this item to a canonical entry. Today, UPC management lives in the
                  catalog admin.
                </p>
                {item.barcode ? (
                  <Link
                    href={`/admin/barcodes/${item.barcode}/edit`}
                    className="btn btn-primary"
                  >
                    Edit in catalog
                  </Link>
                ) : (
                  <Link href="/admin/barcodes" className="btn btn-secondary">
                    Open catalog
                  </Link>
                )}
              </div>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Current image</label>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="h-32 w-32 object-cover rounded-lg border border-border"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center border border-border">
                    <PhotoIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                  Image lookup + assignment is coming
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Soon you'll be able to search the product catalog for this item and pull its image,
                  or upload your own. Today, product images are managed alongside UPC entries.
                </p>
                {item.barcode ? (
                  <Link
                    href={`/admin/barcodes/${item.barcode}/edit`}
                    className="btn btn-primary"
                  >
                    Manage in catalog
                  </Link>
                ) : (
                  <Link href="/admin/barcodes" className="btn btn-secondary">
                    Open catalog
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || activeTab !== 'details'}
            className="btn btn-primary"
            title={activeTab !== 'details' ? 'Saving available on the Details tab' : 'Save changes'}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
