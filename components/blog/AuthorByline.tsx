import Link from 'next/link'
import type { BlogAuthor } from '@/lib/blog-authors'

function formatDate(iso?: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return ''
  }
}

/**
 * Compact byline for the top of a post: "By <name> · <role> · <date>".
 * Reinforces the E-E-A-T Experience/Authoritativeness signals.
 */
export function AuthorByline({ author, datePublished, dateModified }: {
  author: BlogAuthor
  datePublished?: string
  dateModified?: string
}) {
  const published = formatDate(datePublished)
  const updated = dateModified && dateModified !== datePublished ? formatDate(dateModified) : ''
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-green-500 text-sm font-bold text-white">
        {author.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
      <div>
        <div className="text-foreground">
          By{' '}
          <Link href={author.url} className="font-semibold hover:underline">
            {author.name}
          </Link>
          <span className="text-muted-foreground"> · {author.role}</span>
        </div>
        {published && (
          <div className="text-xs">
            {published}
            {updated && <span> · Updated {updated}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Full author bio card for the bottom of a post — the explicit "Experience"
 * statement Google's YMYL raters look for.
 */
export function AuthorBio({ author }: { author: BlogAuthor }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-green-500 text-lg font-bold text-white">
          {author.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <div className="font-semibold text-foreground">{author.name}</div>
          <div className="mb-2 text-sm text-muted-foreground">{author.role}</div>
          <p className="text-sm leading-relaxed text-muted-foreground">{author.bio}</p>
        </div>
      </div>
    </div>
  )
}
