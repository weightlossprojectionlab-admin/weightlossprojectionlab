'use client'

/**
 * Rate Card editor (agency-side, owner-only).
 *
 * The per-DutyCategory à-la-carte prices for anything a family's CarePackage
 * doesn't cover. Seeded from DEFAULT_RATE_CARD via the gated
 * GET /api/tenant/[tenantId]/rate-card; the agency adjusts to their market and
 * saves (PUT). Rates edit in whole dollars; stored in cents.
 */

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import type { PricingUnit, RateCardItem } from '@/types/tenant'
import { DUTY_CATEGORY_LABEL } from '@/lib/duty-categories'

const UNIT_SUFFIX: Record<PricingUnit, string> = {
  hourly: '/ hr',
  flat: '/ visit',
  per_unit: '/ unit',
  mileage: '/ mi',
}

const toDollars = (cents: number) => (cents / 100).toFixed(0)
const toCents = (d: string) => {
  const n = parseFloat(d)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0
}

interface Props {
  tenantId: string
}

export default function RateCardEditor({ tenantId }: Props) {
  const [items, setItems] = useState<RateCardItem[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function authedFetch(url: string, method: string, body?: unknown): Promise<Response> {
    if (!auth?.currentUser) throw new Error('You are not signed in.')
    const token = await auth.currentUser.getIdToken()
    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-CSRF-Token': getCSRFToken(),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  }

  async function load() {
    try {
      const res = await authedFetch(`/api/tenant/${tenantId}/rate-card`, 'GET')
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.data?.rateCard) setItems(json.data.rateCard)
    } catch (err) {
      logger.error('[RateCardEditor] load failed', err as Error)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  function setRate(index: number, dollars: string) {
    setItems(prev =>
      prev ? prev.map((it, i) => (i === index ? { ...it, defaultRate: toCents(dollars) } : it)) : prev
    )
  }

  async function save() {
    if (!items) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await authedFetch(`/api/tenant/${tenantId}/rate-card`, 'PUT', { rateCard: items })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.data?.rateCard) {
        setItems(json.data.rateCard)
        setMessage({ type: 'success', text: 'Rate card saved.' })
      } else {
        setMessage({ type: 'error', text: json?.error || 'Save failed.' })
      }
    } catch (err) {
      logger.error('[RateCardEditor] save failed', err as Error)
      setMessage({ type: 'error', text: 'Save failed.' })
    } finally {
      setBusy(false)
    }
  }

  if (!items) {
    return (
      <section className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading rate card&hellip;</p>
      </section>
    )
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Rate card</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Per-task prices for anything a family&rsquo;s package doesn&rsquo;t cover. Seeded from market
          rates &mdash; adjust to your area.
        </p>
      </div>

      {message && (
        <div
          role="alert"
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {items.map((it, i) => (
          <li key={it.category} className="flex items-center gap-3 py-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {DUTY_CATEGORY_LABEL[it.category]}
                {it.requiresCareTier && (
                  <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    Care
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                market ${toDollars(it.rateRange[0])}&ndash;{toDollars(it.rateRange[1])} {UNIT_SUFFIX[it.unit]}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-gray-500 dark:text-gray-400">$</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`${DUTY_CATEGORY_LABEL[it.category]} rate in dollars`}
                value={toDollars(it.defaultRate)}
                onChange={e => setRate(i, e.target.value)}
                className="w-20 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 text-right text-gray-900 dark:text-gray-100"
              />
              <span className="w-12 text-sm text-gray-500 dark:text-gray-400">{UNIT_SUFFIX[it.unit]}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save rate card'}
        </button>
      </div>
    </section>
  )
}
