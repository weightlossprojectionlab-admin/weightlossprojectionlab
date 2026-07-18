import type { BlogSource } from '@/lib/blog-post'

/**
 * Authoritative sources / citations block. For YMYL health content, linking out
 * to reputable sources (NIH/MedlinePlus, CDC, AHA) is a real E-E-A-T trust
 * signal. Fed by the post's CONFIG.citations (same list drives schema `citation`).
 * External links open in a new tab; dofollow so the citation passes trust.
 */
export function Sources({ items }: { items?: BlogSource[] }) {
  if (!items?.length) return null
  return (
    <section aria-label="Sources" className="mt-12 border-t border-border pt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Sources</h2>
      <ul className="space-y-1 text-sm">
        {items.map(s => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 dark:text-emerald-300 underline"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
