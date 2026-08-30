'use client'

/**
 * Care Package Builder (white-label).
 *
 * Lets a franchise owner build tiered retainer packages to price THEIR OWN
 * clients, then generate a branded, client-facing proposal link. Encodes the
 * retainer-pricing playbook as smart defaults (see lib/care-packages.ts):
 * a quick-start that derives Anchor/Core/Growth from either a target Core price
 * or the agency's Floor Number.
 *
 * Auth wall is the parent <TenantAuthGuard>. All mutations go through the
 * tenant packages/proposals API (admin SDK), so this component never touches
 * Firestore directly. Money is entered in whole dollars and stored in cents.
 */

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { getCSRFToken } from '@/lib/csrf'
import {
  deriveTiersFromCore,
  deriveTiersFromFloor,
  formatMoney,
  dollarsToCents,
  centsToDollars,
  sortPackages,
  TIER_META,
  TIER_ORDER,
} from '@/lib/care-packages'
import type { CarePackage, CarePackageTier, RateCardItem } from '@/types/tenant'
import type { DutyCategory } from '@/types/household-duties'
import { DUTY_CATEGORY_LABEL, ALL_DUTY_CATEGORIES } from '@/lib/duty-categories'
import { DEFAULT_RATE_CARD, estimateVisit, getRateCard, type EstimateTask } from '@/lib/rate-card'

interface Props {
  tenantId: string
  initialPackages: CarePackage[]
}

interface DraftForm {
  id?: string
  name: string
  tier: CarePackageTier | ''
  priceDollars: string
  included: string // one per line
  excluded: string // one per line
  includedCategories: DutyCategory[] // structured coverage — powers the estimate
  visitsPerMonth: string
  responseTimeHours: string
  active: boolean
}

const EMPTY_DRAFT: DraftForm = {
  name: '',
  tier: '',
  priceDollars: '',
  included: '',
  excluded: '',
  includedCategories: [],
  visitsPerMonth: '',
  responseTimeHours: '',
  active: true,
}

// A representative visit used only to preview a package's coverage live in the
// builder — "covers ~$X of a sample visit; ~$Y billed on top."
const SAMPLE_VISIT: EstimateTask[] = [
  { category: 'cleaning_bathroom', quantity: 1 },
  { category: 'laundry', quantity: 2 },
  { category: 'meal_preparation', quantity: 1 },
  { category: 'grocery_shopping', quantity: 1, passThroughCents: 6000 },
]

// Smart-default deliverables per tier (playbook: concrete, capped, and
// "Not included" made explicit). Inlined — the builder is the only consumer.
const TIER_TEMPLATE: Record<
  CarePackageTier,
  { included: string[]; excluded: string[]; visitsPerMonth: number; responseTimeHours: number }
> = {
  anchor: {
    included: ['Monthly care check-in call', 'Shared care plan', 'Email support'],
    excluded: ['In-home visits', 'After-hours support'],
    visitsPerMonth: 0,
    responseTimeHours: 48,
  },
  core: {
    included: ['Everything in Anchor', 'Weekly check-ins', '2 in-home visits / month', 'Priority scheduling'],
    excluded: ['24/7 on-call line'],
    visitsPerMonth: 2,
    responseTimeHours: 24,
  },
  growth: {
    included: ['Everything in Core', 'Weekly in-home visits', '24/7 on-call line', 'Family coordination'],
    excluded: [],
    visitsPerMonth: 4,
    responseTimeHours: 4,
  },
}

export default function CarePackageBuilder({ tenantId, initialPackages }: Props) {
  const [packages, setPackages] = useState<CarePackage[]>(sortPackages(initialPackages))
  const [draft, setDraft] = useState<DraftForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Quick-start state
  const [framing, setFraming] = useState<'core' | 'floor'>('core')
  const [quickAmount, setQuickAmount] = useState('')

  // Proposal state
  const [clientName, setClientName] = useState('')
  const [proposalUrl, setProposalUrl] = useState<string | null>(null)
  // The agency's rate card — powers the live coverage/estimate preview. Falls
  // back to the shipped defaults until the gated fetch lands.
  const [rateCard, setRateCard] = useState<RateCardItem[]>(DEFAULT_RATE_CARD)

  async function authedFetch(url: string, method: string, body?: any): Promise<Response> {
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

  async function refetch() {
    try {
      const res = await authedFetch(`/api/tenant/${tenantId}/packages`, 'GET')
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.data?.packages) setPackages(sortPackages(json.data.packages))
    } catch (err) {
      logger.error('[CarePackageBuilder] refetch failed', err as Error)
    }
  }

  async function loadRateCard() {
    try {
      const res = await authedFetch(`/api/tenant/${tenantId}/rate-card`, 'GET')
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.data?.rateCard) setRateCard(getRateCard(json.data.rateCard))
    } catch (err) {
      logger.error('[CarePackageBuilder] rate-card load failed', err as Error)
    }
  }

  // Load packages + rate card client-side on mount so the owner's pricing is
  // fetched behind the gated GET (verifyTenantAdminAuth) rather than server-
  // rendered into the RSC payload. initialPackages is empty — thin server shell.
  useEffect(() => {
    void refetch()
    void loadRateCard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  function draftToPayload(d: DraftForm) {
    const toList = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)
    return {
      name: d.name.trim(),
      tier: d.tier || undefined,
      monthlyPrice: dollarsToCents(Number(d.priceDollars || 0)),
      currency: 'usd',
      included: toList(d.included),
      excluded: toList(d.excluded),
      includedCategories: d.includedCategories,
      caps: {
        visitsPerMonth: d.visitsPerMonth ? Number(d.visitsPerMonth) : undefined,
        responseTimeHours: d.responseTimeHours ? Number(d.responseTimeHours) : undefined,
      },
      active: d.active,
      order: d.tier ? TIER_META[d.tier].order : undefined,
    }
  }

  // ── Quick-start: derive & create the three tiers ──
  async function handleQuickStart() {
    const amount = Number(quickAmount)
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Enter a positive amount to generate tiers.' })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const cents = dollarsToCents(amount)
      const tiers = framing === 'core' ? deriveTiersFromCore(cents) : deriveTiersFromFloor(cents)
      for (const tier of TIER_ORDER) {
        const tpl = TIER_TEMPLATE[tier]
        const res = await authedFetch(`/api/tenant/${tenantId}/packages`, 'POST', {
          name: TIER_META[tier].label,
          tier,
          monthlyPrice: tiers[tier],
          currency: 'usd',
          included: tpl.included,
          excluded: tpl.excluded,
          caps: { visitsPerMonth: tpl.visitsPerMonth, responseTimeHours: tpl.responseTimeHours },
          active: true,
          order: TIER_META[tier].order,
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j?.error || `Failed to create ${tier} (${res.status})`)
        }
      }
      await refetch()
      setQuickAmount('')
      setMessage({ type: 'success', text: 'Created Anchor, Core, and Growth tiers. Edit any of them below.' })
    } catch (err) {
      logger.error('[CarePackageBuilder] quick-start failed', err as Error)
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not generate tiers.' })
    } finally {
      setBusy(false)
    }
  }

  // ── Save (create or update) a single package from the draft form ──
  async function handleSaveDraft() {
    if (!draft) return
    if (!draft.name.trim()) {
      setMessage({ type: 'error', text: 'Package name is required.' })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const payload = draftToPayload(draft)
      const res = draft.id
        ? await authedFetch(`/api/tenant/${tenantId}/packages/${draft.id}`, 'PATCH', payload)
        : await authedFetch(`/api/tenant/${tenantId}/packages`, 'POST', payload)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || `Save failed (${res.status})`)
      }
      await refetch()
      setDraft(null)
      setMessage({ type: 'success', text: 'Package saved.' })
    } catch (err) {
      logger.error('[CarePackageBuilder] save failed', err as Error)
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(pkg: CarePackage) {
    if (!confirm(`Delete the "${pkg.name}" package?`)) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await authedFetch(`/api/tenant/${tenantId}/packages/${pkg.id}`, 'DELETE')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || `Delete failed (${res.status})`)
      }
      await refetch()
      setMessage({ type: 'success', text: 'Package deleted.' })
    } catch (err) {
      logger.error('[CarePackageBuilder] delete failed', err as Error)
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleGenerateProposal() {
    setBusy(true)
    setMessage(null)
    setProposalUrl(null)
    try {
      const res = await authedFetch(`/api/tenant/${tenantId}/proposals`, 'POST', {
        clientName: clientName.trim() || undefined,
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || `Could not generate proposal (${res.status})`)
      setProposalUrl(j?.data?.url || null)
      setMessage({ type: 'success', text: 'Proposal link ready. Share it with your client.' })
    } catch (err) {
      logger.error('[CarePackageBuilder] proposal failed', err as Error)
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not generate proposal.' })
    } finally {
      setBusy(false)
    }
  }

  function startEdit(pkg: CarePackage) {
    setDraft({
      id: pkg.id,
      name: pkg.name,
      tier: pkg.tier || '',
      priceDollars: String(centsToDollars(pkg.monthlyPrice)),
      included: (pkg.included || []).join('\n'),
      excluded: (pkg.excluded || []).join('\n'),
      includedCategories: pkg.includedCategories || [],
      visitsPerMonth: pkg.caps?.visitsPerMonth != null ? String(pkg.caps.visitsPerMonth) : '',
      responseTimeHours: pkg.caps?.responseTimeHours != null ? String(pkg.caps.responseTimeHours) : '',
      active: pkg.active !== false,
    })
    setProposalUrl(null)
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Care packages</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Build the tiered plans you offer families, then generate a branded proposal to send them.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Quick start ── */}
      {packages.length === 0 && (
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Quick start</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              We&rsquo;ll build three tiers for you using the retainer-pricing playbook. You can edit everything after.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="radio" name="framing" checked={framing === 'core'} onChange={() => setFraming('core')} />
              I know my target monthly price (Core)
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="radio" name="framing" checked={framing === 'floor'} onChange={() => setFraming('floor')} />
              Start from my floor number
            </label>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {framing === 'core' ? 'Target monthly price ($)' : 'Floor number ($/client/month)'}
              </label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={quickAmount}
                onChange={e => setQuickAmount(e.target.value)}
                placeholder={framing === 'core' ? '1200' : '700'}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={handleQuickStart}
              disabled={busy}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Create three tiers
            </button>
          </div>
        </section>
      )}

      {/* ── Package list ── */}
      {packages.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map(pkg => (
            <div
              key={pkg.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{pkg.name}</h3>
                  {pkg.tier && (
                    <span className="text-xs uppercase tracking-wide text-gray-400">{TIER_META[pkg.tier].label}</span>
                  )}
                </div>
                {pkg.active === false && (
                  <span className="text-xs rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-gray-500">
                    inactive
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatMoney(pkg.monthlyPrice, pkg.currency)}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              {pkg.included?.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {pkg.included.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-green-600" aria-hidden>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(pkg)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(pkg)}
                  disabled={busy}
                  className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Add / edit form ── */}
      {draft ? (
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {draft.id ? 'Edit package' : 'New package'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tier</label>
              <select
                value={draft.tier}
                onChange={e => setDraft({ ...draft, tier: e.target.value as CarePackageTier | '' })}
                className={inputClass}
              >
                <option value="">— none —</option>
                {TIER_ORDER.map(t => (
                  <option key={t} value={t}>
                    {TIER_META[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Monthly price ($)
              </label>
              <input
                type="number"
                min="0"
                value={draft.priceDollars}
                onChange={e => setDraft({ ...draft, priceDollars: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="pkg-active"
                type="checkbox"
                checked={draft.active}
                onChange={e => setDraft({ ...draft, active: e.target.checked })}
              />
              <label htmlFor="pkg-active" className="text-sm text-gray-700 dark:text-gray-300">
                Active (shown on proposals)
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Included (one per line)
              </label>
              <textarea
                rows={4}
                value={draft.included}
                onChange={e => setDraft({ ...draft, included: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Not included (one per line)
              </label>
              <textarea
                rows={4}
                value={draft.excluded}
                onChange={e => setDraft({ ...draft, excluded: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Covered categories
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Which duty categories this plan includes. Anything unchecked is billed à la carte from the rate card.
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_DUTY_CATEGORIES.map(cat => {
                  const on = draft.includedCategories.includes(cat)
                  return (
                    <button
                      key={cat}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          includedCategories: on
                            ? draft.includedCategories.filter(c => c !== cat)
                            : [...draft.includedCategories, cat],
                        })
                      }
                      className={`inline-flex items-center min-h-[44px] px-3 rounded-full border text-sm transition-colors ${
                        on
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {DUTY_CATEGORY_LABEL[cat]}
                    </button>
                  )
                })}
              </div>
              {(() => {
                const est = estimateVisit(SAMPLE_VISIT, rateCard, {
                  includedCategories: draft.includedCategories,
                })
                const fmt = (c: number) => `$${(c / 100).toFixed(0)}`
                return (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300" data-testid="coverage-preview">
                    <span className="font-medium">Sample visit:</span> covers{' '}
                    <span className="font-semibold text-green-700 dark:text-green-300">
                      {fmt(est.coveredValueCents)}
                    </span>{' '}
                    of the work &middot;{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {fmt(est.totalBillableCents)}
                    </span>{' '}
                    billed on top.
                  </p>
                )
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visits / month
              </label>
              <input
                type="number"
                min="0"
                value={draft.visitsPerMonth}
                onChange={e => setDraft({ ...draft, visitsPerMonth: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Response time (hours)
              </label>
              <input
                type="number"
                min="0"
                value={draft.responseTimeHours}
                onChange={e => setDraft({ ...draft, responseTimeHours: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save package
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY_DRAFT })}
          className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-400"
        >
          + Add a package
        </button>
      )}

      {/* ── Generate proposal ── */}
      {packages.some(p => p.active !== false) && (
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Generate a client proposal</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Freezes your active packages into a branded, shareable link.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client name (optional)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="The Rivera family"
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateProposal}
              disabled={busy}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Generate proposal link
            </button>
          </div>
          {proposalUrl && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300 break-all font-mono">{proposalUrl}</p>
              <a
                href={proposalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Preview proposal →
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
