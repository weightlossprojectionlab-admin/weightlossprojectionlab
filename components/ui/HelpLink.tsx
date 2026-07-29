import Link from 'next/link'

/**
 * The standard "?" help affordance — a circular icon button that links to a
 * user guide. Single source for the question-mark help icon that PageHeader
 * (via `helpRoute`) and pages with custom headers (recipes, profile) all
 * render; previously the same SVG + Link markup was inlined at each site.
 */
export function HelpLink({
  href,
  label = 'Help documentation',
  title = 'View help guide',
  className = '',
}: {
  href: string
  label?: string
  title?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ${className}`}
      aria-label={label}
      title={title}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </Link>
  )
}
