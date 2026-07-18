import Link from 'next/link'

/**
 * Final call-to-action band. Per the content strategy, `primaryHref` should
 * point at the SPECIFIC in-app action the post is about (e.g. /dashboard,
 * /inventory, vitals reminders) — not just /pricing — so each article guides
 * the reader toward the feature that solves their problem.
 */
export function CtaBand({
  title,
  subtitle,
  primaryHref,
  primaryLabel,
  secondaryHref = '/pricing',
  secondaryLabel = 'See Plans',
}: {
  title: string
  subtitle: string
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
}) {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl p-12 text-center text-white">
      <h2 className="text-4xl font-bold mb-4">{title}</h2>
      <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">{subtitle}</p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href={primaryHref}
          className="px-8 py-4 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
        >
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="px-8 py-4 border-2 border-white/50 text-white rounded-lg hover:bg-white/10 transition-colors font-semibold"
        >
          {secondaryLabel}
        </Link>
      </div>
      <p className="text-sm text-blue-200 mt-6">
        No credit card required &bull; 7-day free trial &bull; Cancel anytime
      </p>
      <div className="flex items-center justify-center gap-6 mt-8 text-sm flex-wrap">
        <Link href="/security" className="text-white/90 hover:text-white underline">Security</Link>
        <Link href="/hipaa" className="text-white/90 hover:text-white underline">HIPAA Practices</Link>
        <Link href="/privacy" className="text-white/90 hover:text-white underline">Privacy Policy</Link>
        <Link href="/support" className="text-white/90 hover:text-white underline">Help Center</Link>
      </div>
    </section>
  )
}
