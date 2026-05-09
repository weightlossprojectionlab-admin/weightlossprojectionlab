'use client'

/**
 * WriteGate — global click/submit interceptor for read-only mode.
 *
 * Mounted once under AuthGuard. When the subscription is read-only,
 * intercepts clicks on `[data-write="true"]` elements and form
 * submits, routing them through handleWriteLocked() (owners → toast
 * + /pricing redirect; family members → informational toast and
 * stay put).
 *
 * Polarity: default-allow, opt-IN to block. A button that performs
 * a write declares itself with `data-write="true"`. Reads,
 * navigation, modal close, filter chips, plan selectors, etc. all
 * pass through unaffected — they don't need to know the gate
 * exists.
 *
 * Why opt-in instead of opt-out: paused users still need to
 * navigate, close modals, view different tabs, and especially
 * REACH /pricing to reactivate. Default-block-everything risks
 * breaking those happy paths if a single `data-readonly-allow` is
 * forgotten on any of the dozens of safe buttons in the app.
 * Default-allow + write-mark localizes the risk: forget the marker
 * on one write button and the HTTP layer catches the actual write
 * (toast on submit instead of toast on click — same UX, slightly
 * less pre-emptive). Forget a navigation marker and… nothing
 * breaks, because there isn't one.
 *
 * For a form submission, the form itself can carry data-write so
 * the entire submit is intercepted, regardless of which control
 * fired it.
 *
 * The HTTP-layer guards (lib/api-client.ts +
 * lib/firebase-operations.ts + lib/owner-subscription-guard.ts on
 * the server) remain the authoritative defense. WriteGate is the
 * UX layer that prevents users from getting half-way through a
 * write flow before failing.
 */

import { useEffect } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { isSubscriptionTerminated } from '@/lib/subscription-utils'
import { handleWriteLocked } from '@/lib/access-guards'

function isWriteTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('[data-write="true"]') !== null
}

export function WriteGate() {
  const { subscription } = useSubscription()
  const locked = isSubscriptionTerminated(subscription)

  useEffect(() => {
    if (typeof document === 'undefined') return

    // Toggle a class on <html> so the global CSS can paint every
    // [data-write="true"] element with the paused style — opacity,
    // not-allowed cursor, lock-icon badge — without each component
    // having to render its own locked-state JSX. Authors mark a
    // button as a write with one attribute; the visual is free.
    document.documentElement.classList.toggle('subscription-paused', locked)

    if (!locked) return

    const onClick = (event: MouseEvent) => {
      if (!isWriteTarget(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      handleWriteLocked()
    }

    const onSubmit = (event: SubmitEvent) => {
      // A form is intercepted only if it explicitly opts in. Login,
      // search, and filter forms shouldn't be blocked on read-only.
      const form = event.target as Element | null
      if (!isWriteTarget(form)) return
      event.preventDefault()
      event.stopPropagation()
      handleWriteLocked()
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('submit', onSubmit, true)

    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('submit', onSubmit, true)
      document.documentElement.classList.remove('subscription-paused')
    }
  }, [locked])

  return null
}
