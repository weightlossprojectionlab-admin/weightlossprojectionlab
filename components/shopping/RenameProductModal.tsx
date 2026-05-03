'use client'

/**
 * Rename Product Modal
 *
 * Two trigger paths share this UI:
 *
 *  - Scan-time: a barcode lookup returned an empty or "Unknown Product"
 *    name. We prompt the user to supply a real name BEFORE the item gets
 *    added to inventory/shopping list.
 *  - Inline edit: a row in /inventory or /shopping still shows
 *    "Unknown Product" because someone scanned it before naming was
 *    available. A pencil icon next to the name opens the same modal.
 *
 * On submit, the modal POSTs to /api/products/[barcode]/name. The
 * endpoint guards: only overwrites empty / placeholder names, writes an
 * edit_history entry. The modal hands the new name back via onConfirm
 * so the caller can update its local state.
 *
 * The "this affects everyone" copy is non-negotiable: writing to
 * product_database changes what every other user sees on this UPC, so
 * we make the consequence explicit before the user clicks Save.
 */

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { getAdminAuthToken } from '@/lib/admin/api'

interface RenameProductModalProps {
  isOpen: boolean
  onClose: () => void
  barcode: string
  imageUrl?: string
  /** Existing name on the doc (typically empty or "Unknown Product"). */
  currentName?: string
  /**
   * Called with the user-supplied name AFTER the server has accepted
   * and persisted it. Caller is responsible for updating its local
   * shopping/inventory state with the new name.
   */
  onConfirmed: (newName: string) => void
}

export function RenameProductModal({
  isOpen,
  onClose,
  barcode,
  imageUrl,
  currentName,
  onConfirmed,
}: RenameProductModalProps) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Pre-fill if there's something other than the placeholder. Avoids
      // the user having to retype "Unknown Product" if they wanted that.
      const seed =
        currentName && currentName.toLowerCase() !== 'unknown product'
          ? currentName
          : ''
      setName(seed)
    }
  }, [isOpen, currentName])

  if (!isOpen) return null

  const trimmed = name.trim()
  const canSubmit = trimmed.length > 0 && trimmed.length <= 200 && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const token = await getAdminAuthToken().catch(() => null)
      const response = await fetch(`/api/products/${encodeURIComponent(barcode)}/name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: trimmed }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message = data?.error || 'Could not save the product name.'
        toast.error(message)
        logger.warn('[Rename] save failed', { barcode, status: response.status, message })
        return
      }

      onConfirmed(data?.productName || trimmed)
      onClose()
    } catch (e) {
      const err = e as Error
      logger.error('[Rename] save threw', err, { barcode })
      toast.error(err.message || 'Could not save the product name.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-foreground mb-1">Name this product</h2>
        <p className="text-sm text-muted-foreground mb-4">
          We don&apos;t have a name for this barcode yet. What is it?
        </p>

        <div className="flex items-center gap-3 mb-4 p-3 bg-background rounded-lg">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
          ) : (
            <div className="w-14 h-14 bg-muted dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
              📦
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Barcode</p>
            <p className="text-sm font-mono text-foreground truncate">{barcode}</p>
          </div>
        </div>

        <label className="block text-sm font-medium text-foreground mb-2" htmlFor="rename-name-input">
          Product name
        </label>
        <input
          id="rename-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Heinz Tomato Ketchup"
          maxLength={200}
          autoFocus
          className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-3"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) handleSubmit()
          }}
        />

        <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-4">
          <strong>Heads up:</strong> this sets the name globally for this barcode.
          Everyone who scans it from now on will see the name you enter. Saved to your
          edit history.
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-muted rounded-lg hover:bg-gray-200 transition-colors font-medium text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Save name'}
          </button>
        </div>
      </div>
    </div>
  )
}
