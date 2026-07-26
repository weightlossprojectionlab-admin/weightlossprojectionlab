'use client'

/**
 * DictationModal — a focused, guided voice-capture overlay.
 *
 * Generic on purpose (title / coaching / example props, and an onComplete that
 * hands back the finalized segments) so any field can use it — first the manual
 * meal-log ingredient input, and the vitals wizard can adopt it next to retire
 * its inline Web Speech copy. Built on ResponsiveModal (mobile sheet / desktop
 * dialog) and the shared useSpeechDictation hook.
 *
 * Why a modal beats an inline pulsing mic:
 * - Live transcript so the user sees words appear and catches misfires.
 * - Coaching ("speak slowly, pause between items") that measurably improves
 *   accuracy — and, because a pause finalizes a segment, naturally yields one
 *   segment per item.
 * - Big, forgiving correction controls: Undo last · Clear · Redo. The field is
 *   never touched until Done, so Cancel discards cleanly.
 */

import { useEffect, useState } from 'react'
import {
  MicrophoneIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { ResponsiveModal, ModalFooter, ModalButton } from '@/components/ui/ResponsiveModal'
import { useSpeechDictation } from '@/hooks/useSpeechDictation'

/**
 * Merge a newly-finalized spoken segment into the running list.
 *
 * Mobile Web Speech (Android Chrome) emits cascading partial "finals" for one
 * utterance — "3/4" → "3/4 cup" → "3/4 cup olive" → "3/4 cup olive oil" — each
 * flagged isFinal. Appending them all yields duplicate fragment chips. When the
 * incoming text and the previous segment are prefix-related (the same utterance
 * refining), replace the previous with the longer text; only a genuinely new,
 * non-overlapping phrase becomes a new item. Comparison is trimmed + lowercased.
 */
function mergeSpokenSegment(prev: string[], text: string): string[] {
  const incoming = text.trim()
  if (!incoming) return prev
  if (prev.length > 0) {
    const last = prev[prev.length - 1]
    const a = last.toLowerCase()
    const b = incoming.toLowerCase()
    if (b.startsWith(a) || a.startsWith(b)) {
      const next = prev.slice(0, -1)
      next.push(incoming.length >= last.length ? incoming : last)
      return next
    }
  }
  return [...prev, incoming]
}

interface DictationModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the finalized spoken segments (one per pause). Empty array is
   *  never passed — Done is disabled until there's something to return. */
  onComplete: (segments: string[]) => void
  title?: string
  coachingText?: string
  example?: string
}

export default function DictationModal({
  isOpen,
  onClose,
  onComplete,
  title = 'Speak your ingredients',
  coachingText = 'Speak slowly and clearly. Pause between each ingredient.',
  example = 'Try: “two eggs” … pause … “one tablespoon butter”',
}: DictationModalProps) {
  const [segments, setSegments] = useState<string[]>([])

  const { isSupported, isListening, interimTranscript, start, stop, toggle } =
    useSpeechDictation({
      onResult: (text) => setSegments((prev) => mergeSpokenSegment(prev, text)),
    })

  // Reset on open, stop on close — but DON'T auto-start. The user taps the mic
  // to begin when they're ready, so no words are clipped and the mic-permission
  // prompt is tied to an explicit gesture.
  useEffect(() => {
    if (isOpen) {
      setSegments([])
    } else {
      stop()
    }
  }, [isOpen, stop])

  const undoLast = () => setSegments((s) => s.slice(0, -1))
  const clearAll = () => setSegments([]) // keeps listening
  const redo = () => {
    // Full restart: fresh recognition session + empty transcript.
    stop()
    setSegments([])
    start()
  }

  const handleDone = () => {
    stop()
    if (segments.length > 0) onComplete(segments)
    onClose()
  }

  const hasContent = segments.length > 0 || interimTranscript.trim().length > 0

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <ModalFooter align="between">
          <ModalButton variant="secondary" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton variant="primary" onClick={handleDone} disabled={segments.length === 0}>
            Done{segments.length > 0 ? ` (${segments.length})` : ''}
          </ModalButton>
        </ModalFooter>
      }
    >
      {!isSupported ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Voice input isn’t available in this browser. You can type your ingredients instead.
        </p>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{coachingText}</p>

          {/* Quiet-place reminder — only before/while paused, when they can
              still act on it. Background noise is the top cause of garble. */}
          {!isListening && (
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <span aria-hidden="true">🔇</span>
              Find a quiet spot — a TV, music, or nearby voices can garble the words.
            </p>
          )}

          {/* Big tap-to-pause/resume mic */}
          <button
            type="button"
            onClick={toggle}
            aria-label={isListening ? 'Pause listening' : 'Start recording'}
            aria-pressed={isListening}
            className={`mx-auto flex items-center justify-center w-20 h-20 rounded-full transition-colors ${
              isListening
                ? 'bg-error text-white animate-pulse'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            <MicrophoneIcon className="w-9 h-9" aria-hidden="true" />
          </button>
          <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
            {isListening
              ? 'Listening…'
              : segments.length > 0
                ? 'Paused — tap the mic to continue'
                : 'Tap the mic to start recording'}
          </p>

          {/* Live transcript: finalized segments as chips + interim ghost text */}
          <div className="min-h-[3rem] flex flex-wrap gap-2 justify-center items-center">
            {segments.map((seg, i) => (
              <span
                key={`${seg}-${i}`}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                {seg}
              </span>
            ))}
            {interimTranscript && (
              <span className="text-sm italic text-muted-foreground">{interimTranscript}…</span>
            )}
            {!hasContent && (
              <span className="text-sm text-muted-foreground">{example}</span>
            )}
          </div>

          {/* Correction controls */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={undoLast}
              disabled={segments.length === 0}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-border text-sm text-foreground hover:bg-muted disabled:opacity-40"
            >
              <ArrowUturnLeftIcon className="w-4 h-4" aria-hidden="true" /> Undo
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={segments.length === 0}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-border text-sm text-foreground hover:bg-muted disabled:opacity-40"
            >
              <TrashIcon className="w-4 h-4" aria-hidden="true" /> Clear
            </button>
            <button
              type="button"
              onClick={redo}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-border text-sm text-foreground hover:bg-muted"
            >
              <ArrowPathIcon className="w-4 h-4" aria-hidden="true" /> Redo
            </button>
          </div>
        </div>
      )}
    </ResponsiveModal>
  )
}
