'use client'

/**
 * PlanDetailModal — opened from the Current Plan badge on /profile
 * (and reusable from anywhere a user might want a deeper look at
 * what they're paying for).
 *
 * Three jobs:
 *   1. Show what the user's plan actually includes (the same feature
 *      list /pricing shows for that tier — sourced from lib/plan-details
 *      so the two surfaces never drift).
 *   2. Surface the Manage Subscription path for active subscribers
 *      (Customer Portal — change plan, update card, cancel). The
 *      pricing/profile semantic three-state CTA narrowed the profile
 *      footer to trialing-only; this modal restores the active-user
 *      management path in a contextually correct place — next to
 *      the plan info, not as a generic page footer.
 *   3. Surface the Reactivate path for terminated users (until the
 *      limited-access + FOMO architecture ships).
 *
 * The modal is intentionally read-only for plan content — feature
 * editing (price + copy) lives in lib/plan-details.ts. This component
 * just renders.
 */

import { useState } from 'react'
import Link from 'next/link'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { getPlanById } from '@/lib/plan-details'
import {
  hasActiveSubscription,
  isSubscriptionTerminated,
} from '@/lib/subscription-utils'
import type { UserSubscription, SubscriptionPlan } from '@/types'

export interface PlanDetailModalProps {
  isOpen: boolean
  onClose: () => void
  /** The user's current subscription record. Drives the included
   *  features list, the price banner, and which CTA renders. */
  subscription: UserSubscription | null | undefined
}

export function PlanDetailModal({ isOpen, onClose, subscription }: PlanDetailModalProps) {
  const [openingPortal, setOpeningPortal] = useState(false)

  if (!isOpen) return null

  const plan = subscription?.plan ? getPlanById(subscription.plan as SubscriptionPlan) : null
  const interval = subscription?.billingInterval as 'monthly' | 'yearly' | undefined
  const isActive = hasActiveSubscription(subscription)
  const isTerminated = isSubscriptionTerminated(subscription)

  // Price line — only meaningful when we have a real plan + interval.
  // For terminated users this still shows the previous tier's price so
  // they remember what they're reactivating.
  const priceForInterval = plan && interval
    ? interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
    : null

  const handleOpenPortal = async () => {
    setOpeningPortal(true)
    try {
      const { createPortalSession } = await import('@/lib/stripe-client')
      await createPortalSession(window.location.href)
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to open subscription management. Please try again.'
      toast.error(message)
      setOpeningPortal(false)
    }
    // No setOpeningPortal(false) on success — Stripe redirects away.
  }

  return (
    // Bottom-sheet on phone, centered modal on desktop. z-[80] sits
    // above the standard app chrome but below toast (z-[100]+).
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !openingPortal) onClose()
      }}
    >
      <div className="bg-card text-foreground w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[92vh]">
        {/* Drag handle on phone */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <header className="px-5 pt-3 pb-4 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {isTerminated ? 'Previous plan' : 'Current plan'}
            </p>
            <h2 className="text-lg font-bold mt-0.5 truncate">
              {plan?.name ?? 'Free'}
            </h2>
            {priceForInterval !== null && (
              <p className="text-sm text-muted-foreground mt-0.5">
                ${priceForInterval}
                <span className="text-xs">/{interval === 'yearly' ? 'yr' : 'mo'}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={openingPortal}
            className="p-1.5 rounded-full active:bg-muted disabled:opacity-40 flex-shrink-0"
            aria-label="Close plan details"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </header>

        {/* Body — plan description + included features */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {plan ? (
            <>
              <p className="text-sm text-foreground/85 leading-relaxed">
                {plan.description}
              </p>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Included in {plan.name}
                </h3>
                <ul className="space-y-1.5">
                  {plan.features
                    .filter((f) => f.included)
                    .map((f) => (
                      <li key={f.name} className="flex items-start gap-2 text-sm">
                        <CheckIcon className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span>{f.name}</span>
                      </li>
                    ))}
                </ul>
              </div>

              {/* Excluded list — only render when there are gaps,
                  pointing the user at the next-tier upgrade reasons. */}
              {plan.features.some((f) => !f.included) && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Not included
                  </h3>
                  <ul className="space-y-1.5">
                    {plan.features
                      .filter((f) => !f.included)
                      .map((f) => (
                        <li
                          key={f.name}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="w-4 flex-shrink-0 mt-0.5 text-center">—</span>
                          <span>{f.name}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No paid plan on this account yet. Pick one below to get started.
            </p>
          )}
        </div>

        {/* Footer — context-aware CTA */}
        <footer className="border-t border-border px-5 py-3 bg-card flex flex-col sm:flex-row gap-2">
          {/* Active subscriber → Manage Subscription via Customer Portal.
              This is the only place the Manage button lives now after
              the profile-page footer was narrowed to trialing-only. */}
          {isActive && subscription?.stripeCustomerId && (
            <button
              type="button"
              onClick={handleOpenPortal}
              disabled={openingPortal}
              className="flex-1 min-h-[44px] py-2 rounded-lg bg-primary text-white text-sm font-semibold active:bg-primary-hover disabled:opacity-40"
            >
              {openingPortal ? 'Opening…' : 'Manage Subscription'}
            </button>
          )}

          {/* Terminated subscriber → /pricing to reactivate. Customer
              Portal can't bring back a deleted sub. */}
          {isTerminated && (
            <Link
              href="/pricing"
              className="flex-1 min-h-[44px] py-2 rounded-lg bg-primary text-white text-sm font-semibold active:bg-primary-hover text-center inline-flex items-center justify-center"
            >
              Reactivate Subscription
            </Link>
          )}

          {/* Active or trialing → also offer "View all plans" so the
              user can compare against upgrade options without leaving
              this surface to a side-panel. */}
          {(isActive || subscription?.status === 'trialing') && (
            <Link
              href="/pricing"
              className="flex-1 min-h-[44px] py-2 rounded-lg border border-border text-sm font-medium text-foreground active:bg-muted text-center inline-flex items-center justify-center"
            >
              View all plans
            </Link>
          )}

          {/* Fallback close button — covers states where neither CTA
              renders (e.g., free tier with no subscription record). */}
          {!isActive && !isTerminated && subscription?.status !== 'trialing' && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] py-2 rounded-lg border border-border text-sm font-medium text-foreground active:bg-muted"
            >
              Close
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
