'use client'

/**
 * useSpeechDictation — a small, reusable wrapper around the Web Speech API
 * (SpeechRecognition), extracted from the proven inline implementation in
 * SupervisedVitalsWizard so voice input can be dropped into any field.
 *
 * First consumer: the manual meal-log ingredient field (dictate an ingredient
 * list instead of thumb-typing). The vitals wizard can adopt this hook later to
 * delete its inline copy — a separate cleanup, not bundled here.
 *
 * Design notes:
 * - Feature-detected after mount so unsupported browsers (notably Firefox)
 *   simply render nothing — typing always remains the fallback. The detection
 *   runs in an effect to avoid an SSR/hydration mismatch.
 * - `onResult` fires once per FINALIZED speech segment with the trimmed text,
 *   so the consumer decides how to append it (we never mutate their field).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSpeechDictationOptions {
  /** Called with each finalized transcript segment (already trimmed). */
  onResult?: (finalText: string) => void
  /** BCP-47 language tag. Defaults to en-US. */
  lang?: string
  /** Keep listening across pauses until explicitly stopped. Default true. */
  continuous?: boolean
}

interface UseSpeechDictation {
  /** True only after mount, and only where the browser supports the API. */
  isSupported: boolean
  isListening: boolean
  /** Live, not-yet-finalized words for a real-time display. Cleared when a
   *  segment finalizes (emitted via onResult) and when listening stops. */
  interimTranscript: string
  /** Last recognition error code (e.g. 'not-allowed', 'no-speech'), or null. */
  error: string | null
  start: () => void
  stop: () => void
  toggle: () => void
}

export function useSpeechDictation(
  { onResult, lang = 'en-US', continuous = true }: UseSpeechDictationOptions = {},
): UseSpeechDictation {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  // Keep the latest onResult without re-creating the recognition instance.
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  // Feature-detect after mount (server render + first client render both see
  // false → no hydration mismatch; the effect flips it on capable browsers).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSupported(Boolean(SR))
  }, [])

  const stop = useCallback(() => {
    const rec = recognitionRef.current
    if (rec) {
      try {
        rec.stop()
      } catch {
        /* stop() throws if not started — safe to ignore */
      }
    }
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const start = useCallback(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setError('unsupported')
      return
    }

    // Always start a FRESH instance: each session's result list restarts at
    // index 0, and a per-instance `lastFinalIndex` guarantees every finalized
    // segment is emitted exactly once. (Reusing an instance + iterating from
    // event.resultIndex re-emits already-final segments — the "repeating input"
    // bug — because onresult re-fires over prior finals as new interims arrive.)
    const rec = new SR()
    rec.continuous = continuous
    rec.interimResults = true
    rec.lang = lang

    let lastFinalIndex = 0
    rec.onresult = (event: any) => {
      // Finalized results are contiguous from the front; interims trail. Emit
      // each NEW final exactly once (advancing lastFinalIndex), and collect the
      // trailing interims for the live display.
      let interim = ''
      for (let i = lastFinalIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const text = (result[0]?.transcript || '').trim()
          if (text) onResultRef.current?.(text)
          lastFinalIndex = i + 1
        } else {
          interim += result[0]?.transcript || ''
        }
      }
      setInterimTranscript(interim.trim())
    }
    rec.onerror = (event: any) => {
      // Ignore a stale instance's late callback (e.g. after Redo swapped it).
      if (recognitionRef.current !== rec) return
      setError(event?.error || 'speech-error')
      setIsListening(false)
      setInterimTranscript('')
    }
    rec.onend = () => {
      if (recognitionRef.current !== rec) return
      setIsListening(false)
      setInterimTranscript('')
    }
    recognitionRef.current = rec

    setError(null)
    setInterimTranscript('')
    try {
      rec.start()
      setIsListening(true)
    } catch {
      // start() throws if it's already running — ignore.
    }
  }, [continuous, lang])

  const toggle = useCallback(() => {
    if (isListening) stop()
    else start()
  }, [isListening, start, stop])

  // Stop listening if the consumer unmounts (e.g. modal closes).
  useEffect(() => {
    return () => {
      const rec = recognitionRef.current
      if (rec) {
        try {
          rec.stop()
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

  return { isSupported, isListening, interimTranscript, error, start, stop, toggle }
}
