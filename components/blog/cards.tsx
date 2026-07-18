import Link from 'next/link'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

/**
 * Shared blog card primitives — extracted from the per-post inline copies so
 * new posts stop duplicating them. Neutral accent (works for any post/cluster).
 */

export function ProblemCard({ icon, title, description }: {
  icon?: React.ReactNode; title: string; description: string
}) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

export function FeatureCard({ icon, title, description }: {
  icon?: React.ReactNode; title: string; description: string
}) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-emerald-300 hover:shadow-lg transition-all">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

export function UseCaseCard({ icon, title, description }: {
  icon?: React.ReactNode; title: string; description: string
}) {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-6 hover:border-emerald-300 hover:shadow-lg transition-all">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

export function RelatedLink({ href, title, description }: {
  href: string; title: string; description: string
}) {
  return (
    <Link href={href} className="bg-card rounded-lg border-2 border-border p-4 hover:border-emerald-300 hover:shadow-lg transition-all block">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}

export function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-left">
      <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  )
}

/**
 * Numbered "how it works" step. The ordinal lives IN the heading text so NLP /
 * AI Overviews parse the sequence chronologically.
 */
export function HowToStep({ step, icon, label, description }: {
  step: number; icon?: React.ReactNode; label: string; description: string
}) {
  return (
    <li className="bg-card rounded-xl border-2 border-border p-5 text-center list-none">
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-sm font-bold mb-3">
        {step}
      </div>
      {icon && <div className="flex justify-center mb-2">{icon}</div>}
      <h3 className="font-semibold text-foreground mb-1">
        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{step}.</span> {label}
      </h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </li>
  )
}
