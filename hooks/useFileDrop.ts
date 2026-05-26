/**
 * useFileDrop — drag-and-drop file handling for any zone.
 *
 * Encapsulates the three React drag events (onDragOver / onDragLeave /
 * onDrop) plus an `isDragging` state for visual feedback. Returns a
 * spread-friendly `dropHandlers` object that the consumer applies to
 * whichever element it wants to act as a drop target.
 *
 * Designed for parity with the file-input + camera-capture path: the
 * `onFile` callback receives the same `File` you'd get from
 * `input.files?.[0]`, so consumers can route both the change handler
 * and the drop handler through one shared processor.
 *
 * Why this lives in hooks/ rather than baked into each component:
 *   - MedicationLabelCapture, RecipeMediaUpload, ApplicationForm,
 *     MediaLibrary, BrandingEditor, etc. all reimplement the same
 *     `isDragging` + handlers pattern. One primitive keeps the UX
 *     consistent (counter-event behavior, type-rejection toasts,
 *     edge-leaving semantics).
 *   - A shared hook also makes it trivial to add features once
 *     (multi-file drop, type-whitelist UI hint, drop-zone outline
 *     theming) without sweeping every consumer.
 */

'use client'

import { useCallback, useState } from 'react'
import type { DragEvent as ReactDragEvent } from 'react'
import toast from 'react-hot-toast'

interface UseFileDropOptions {
  /** Called once per drop with the first dropped file. */
  onFile: (file: File) => void | Promise<void>
  /**
   * MIME-type prefix the drop should accept (e.g. `'image/'`).
   * A dropped file whose `file.type` does not start with this prefix
   * triggers `rejectMessage` and is not passed to `onFile`.
   * Pass an empty string to accept any type.
   */
  acceptPrefix?: string
  /**
   * Toast shown when a file is rejected by the `acceptPrefix` check.
   * Phrased for the most common case; consumers can override for
   * domain-specific surfaces (e.g. "Please drop a PDF").
   */
  rejectMessage?: string
}

interface UseFileDropReturn {
  /** True between onDragOver and the next onDragLeave-outside / onDrop. */
  isDragging: boolean
  /**
   * Spread these onto the drop-target element:
   *   <div {...dropHandlers}>…</div>
   */
  dropHandlers: {
    onDragOver: (e: ReactDragEvent<HTMLElement>) => void
    onDragLeave: (e: ReactDragEvent<HTMLElement>) => void
    onDrop: (e: ReactDragEvent<HTMLElement>) => void
  }
}

export function useFileDrop({
  onFile,
  acceptPrefix = 'image/',
  rejectMessage = 'Please drop an image file',
}: UseFileDropOptions): UseFileDropReturn {
  const [isDragging, setIsDragging] = useState(false)

  const onDragOver = useCallback((e: ReactDragEvent<HTMLElement>) => {
    // Preventing default on dragOver is what tells the browser this
    // element accepts drops. Without it, the drop event never fires.
    e.preventDefault()
    if (!isDragging) setIsDragging(true)
  }, [isDragging])

  const onDragLeave = useCallback((e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault()
    // dragLeave fires every time the pointer crosses a child element
    // boundary, not just when it exits the drop zone entirely. Compare
    // pointer coords against the target's bounding rect so the dragging
    // outline doesn't flicker as the user drags over nested elements.
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const left = e.clientX < rect.left
    const right = e.clientX >= rect.right
    const top = e.clientY < rect.top
    const bottom = e.clientY >= rect.bottom
    if (left || right || top || bottom) {
      setIsDragging(false)
    }
  }, [])

  const onDrop = useCallback((e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (acceptPrefix && !file.type.startsWith(acceptPrefix)) {
      toast.error(rejectMessage)
      return
    }
    onFile(file)
  }, [onFile, acceptPrefix, rejectMessage])

  return {
    isDragging,
    dropHandlers: { onDragOver, onDragLeave, onDrop },
  }
}
