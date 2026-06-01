'use client'

import Link from 'next/link'
import { NonSubscriberOnly } from '@/components/subscription/NonSubscriberOnly'

/**
 * "Start Free" marketing banner for the recipe pages. A signup conversion
 * hook, so it's shown only to non-subscribers (the NonSubscriberOnly gate).
 * Single source for both /recipes and /recipes/[id] — pass the page's own
 * headline via `text`.
 */
export function StartFreeBanner({ text }: { text: string }) {
  return (
    <NonSubscriberOnly>
      <div className="bg-gradient-to-r from-primary to-accent text-white py-3 px-4 text-center">
        <p className="text-sm font-medium">
          ✨ {text}{' '}
          <Link href="/auth" className="text-white underline font-bold hover:opacity-80">
            Start Free →
          </Link>
        </p>
      </div>
    </NonSubscriberOnly>
  )
}
