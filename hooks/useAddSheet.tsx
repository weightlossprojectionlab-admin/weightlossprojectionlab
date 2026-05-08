'use client'

/**
 * useAddSheet — DRY wrapper around AddToShoppingListSheet.
 *
 * Both /shopping and /inventory (and future surfaces) need the same
 * "open a qty + on-hand sheet, run an action on confirm" flow but each
 * surface has its own action (add to list / add to inventory / etc.).
 * This hook owns the open/close state + the rendered sheet, callers
 * supply only the per-open config (which includes the onConfirm
 * callback that performs the surface-specific write).
 *
 * Usage:
 *   const { openSheet, sheet } = useAddSheet()
 *   // ...
 *   openSheet({
 *     productName: 'Olive oil',
 *     inventoryMatch: foundRow ?? null,
 *     submitLabel: 'Add to inventory',
 *     qtyQuestion: 'How many are you adding?',
 *     onConfirm: async (qty) => { ... }
 *   })
 *   // ...
 *   return <>{...page}; {sheet}</>
 */

import { useState, type ReactNode } from 'react'
import {
  AddToShoppingListSheet,
  type AddToShoppingListSheetProps,
} from '@/components/shopping/AddToShoppingListSheet'

export type AddSheetConfig = Omit<AddToShoppingListSheetProps, 'isOpen' | 'onClose'>

export function useAddSheet(): {
  openSheet: (config: AddSheetConfig) => void
  closeSheet: () => void
  sheet: ReactNode
  isOpen: boolean
} {
  const [config, setConfig] = useState<AddSheetConfig | null>(null)

  const openSheet = (next: AddSheetConfig) => setConfig(next)
  const closeSheet = () => setConfig(null)

  const sheet = config ? (
    <AddToShoppingListSheet
      isOpen
      onClose={closeSheet}
      onConfirm={config.onConfirm}
      productName={config.productName}
      brand={config.brand}
      imageUrl={config.imageUrl}
      editableName={config.editableName}
      barcode={config.barcode}
      inventoryMatch={config.inventoryMatch}
      initialQuantity={config.initialQuantity}
      qtyQuestion={config.qtyQuestion}
      submitLabel={config.submitLabel}
    />
  ) : null

  return { openSheet, closeSheet, sheet, isOpen: !!config }
}
