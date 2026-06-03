'use client'

import type { ReactNode } from 'react'
import { useSubscription } from '@/hooks/useSubscription'

/**
 * Renders its children ONLY for non-subscribers (logged-out or free plan).
 *
 * Signup / "Start Free" / "start your trial" conversion CTAs are meaningless
 * to someone already on a paid plan or trial — they have nothing to start.
 * Wrap any such in-app CTA in this gate so subscribers never see it.
 *
 * It's a client component, so it works even inside server-rendered pages
 * (e.g. the recipe detail page) — they just render it with children.
 *
 * Single source for the subscriber check across every conversion surface.
 */
export function NonSubscriberOnly({ children }: { children: ReactNode }) {
  const { plan } = useSubscription()
  const isSubscriber = !!plan && plan !== 'free'
  if (isSubscriber) return null
  return <>{children}</>
}
