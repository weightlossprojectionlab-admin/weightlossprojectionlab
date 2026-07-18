import Link from 'next/link'
import { getSeriesForSlug } from '@/lib/blog-series'

/**
 * Series navigator — renders "Part N of M", the full ordered list of posts in
 * the cluster (current one highlighted), and prev/next links. Interlinks the
 * cluster for topical authority and keeps readers moving through the journey.
 *
 * Pass the current post's slug; it resolves the series from the registry.
 */
export function SeriesNav({ slug, variant = 'top' }: { slug: string; variant?: 'top' | 'bottom' }) {
  const found = getSeriesForSlug(slug)
  if (!found) return null
  const { series, index } = found
  const total = series.parts.length
  const prev = index > 0 ? series.parts[index - 1] : null
  const next = index < total - 1 ? series.parts[index + 1] : null

  if (variant === 'top') {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Part {index + 1} of {total} · {series.title}
        </div>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold text-foreground mb-1">{series.title}</h2>
      <p className="text-sm text-muted-foreground mb-4">{series.description}</p>
      <ol className="space-y-2 mb-6">
        {series.parts.map((part, i) => (
          <li key={part.slug} className="flex items-start gap-3">
            <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              i === index
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            }`}>
              {i + 1}
            </span>
            {i === index ? (
              <span className="text-sm font-semibold text-foreground">{part.title} <span className="text-muted-foreground font-normal">(you are here)</span></span>
            ) : (
              <Link href={`/blog/${part.slug}`} className="text-sm text-emerald-700 dark:text-emerald-300 hover:underline">
                {part.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <div className="grid sm:grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
        {prev ? (
          <Link href={`/blog/${prev.slug}`} className="group rounded-lg border border-border p-3 hover:border-emerald-300 transition-colors">
            <div className="text-xs text-muted-foreground">← Previous</div>
            <div className="font-medium text-emerald-700 dark:text-emerald-300 group-hover:underline">{prev.title}</div>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/blog/${next.slug}`} className="group rounded-lg border border-border p-3 sm:text-right hover:border-emerald-300 transition-colors">
            <div className="text-xs text-muted-foreground">Read next →</div>
            <div className="font-medium text-emerald-700 dark:text-emerald-300 group-hover:underline">{next.title}</div>
            {next.teaser && <div className="mt-1 text-xs text-muted-foreground">{next.teaser}</div>}
          </Link>
        ) : <span />}
      </div>
    </section>
  )
}
