import { ReactNode } from 'react'

/**
 * Shared presentational shell for a subscription plan card.
 *
 * WHY THIS EXISTS: the plan-card layout was copy-pasted across surfaces
 * (the public /pricing grid + the in-app UpgradeModal). Each copy owned its
 * own flex/alignment rules, so a fix in one surface silently left the other
 * misaligned — the "I thought we fixed the button alignment" bug. This shell
 * owns the ONE thing both surfaces must agree on: the column layout where the
 * feature list grows to push every card's CTA onto a shared baseline, plus the
 * floating badge chip. Alignment now lives in a single place.
 *
 * WHAT IT DOESN'T OWN: content. The header (name/price/seats/description), the
 * feature list (the public page shows the full catalog with deep-links; the
 * modal shows a condensed set), and the CTA (different labels + click logic)
 * are passed as slots, because those legitimately differ per surface. Same
 * visual primitive, different content — see memory:feedback_semantic_intent.
 */
export interface PlanCardProps {
  /** Emphasis treatment — primary border + shadow (the "popular"/suggested look). */
  highlighted?: boolean
  /** Background tint for user-state (current plan, trialing). Defaults to bg-card. */
  tintClassName?: string
  /** Floating chip on the card's top edge. Pass null/undefined for none. */
  badge?: { label: string; className: string } | null
  /** Top block: name, price, seats, description — surface-specific. */
  header: ReactNode
  /** Feature list. Grows to fill, pushing the CTA to a shared baseline. */
  features: ReactNode
  /** Call-to-action button — surface-specific label + handler. */
  cta: ReactNode
  /** Extra classes merged onto the card (e.g. a hover affordance). */
  className?: string
}

export function PlanCard({
  highlighted = false,
  tintClassName = 'bg-card',
  badge,
  header,
  features,
  cta,
  className = '',
}: PlanCardProps) {
  return (
    <div
      className={`relative rounded-lg border-2 p-4 sm:p-6 flex flex-col h-full ${
        highlighted ? 'border-primary shadow-lg' : 'border-border'
      } ${tintClassName} ${className}`}
    >
      {/* nowrap via inline style rather than a Tailwind class: it can't be
          dropped, so the badge never wraps to two lines over the icon. (A
          nowrap class used in only this file once silently failed to generate
          in dev, wrapping the pill — the inline style sidesteps that entirely.) */}
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span
            style={{ whiteSpace: 'nowrap' }}
            className={`px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
      )}

      {header}

      {/* Features grow so every card's CTA lands on the same baseline. This is
          the shared alignment contract — owned here, never re-implemented in a
          single surface again. */}
      <div className="flex-grow">{features}</div>

      {cta}
    </div>
  )
}
