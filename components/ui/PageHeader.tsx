import Link from 'next/link'
import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  subtitle?: string
  className?: string
}

/**
 * Reusable page header component with consistent styling
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Log Meal"
 *   backHref="/dashboard"
 *   actions={<button>Save</button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  backHref,
  backLabel = '← Back',
  actions,
  subtitle,
  className = ''
}: PageHeaderProps) {
  return (
    <header className={`page-header ${className}`}>
      <div className="page-header-content">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {backHref && (
            <Link
              href={backHref}
              className="page-back-button flex-shrink-0"
              aria-label="Go back"
            >
              {backLabel}
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="page-title truncate">{title}</h1>
            {subtitle && (
              <p className="text-caption mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}

/**
 * Simplified page header for pages without back button or actions
 *
 * @example
 * ```tsx
 * <SimplePageHeader title="Dashboard" />
 * ```
 */
export function SimplePageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="page-header">
      <div className="page-header-content">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="text-caption mt-1">{subtitle}</p>}
        </div>
      </div>
    </header>
  )
}

/**
 * Page header with tabs for multi-section pages
 *
 * @example
 * ```tsx
 * <TabbedPageHeader
 *   title="Settings"
 *   tabs={[
 *     { label: 'Profile', href: '/settings/profile' },
 *     { label: 'Account', href: '/settings/account' }
 *   ]}
 *   activeTab="Profile"
 * />
 * ```
 */
interface Tab {
  label: string
  href: string
  icon?: ReactNode
}

interface TabbedPageHeaderProps {
  title: string
  tabs: Tab[]
  activeTab: string
  backHref?: string
  actions?: ReactNode
}

export function TabbedPageHeader({
  title,
  tabs,
  activeTab,
  backHref,
  actions
}: TabbedPageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-content">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {backHref && (
            <Link
              href={backHref}
              className="page-back-button flex-shrink-0"
              aria-label="Go back"
            >
              ← Back
            </Link>
          )}
          <h1 className="page-title">{title}</h1>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={`
                  flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                  ${activeTab === tab.label
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:border-muted-dark hover:text-gray-900 dark:text-gray-100'
                  }
                `}
                aria-current={activeTab === tab.label ? 'page' : undefined}
              >
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
