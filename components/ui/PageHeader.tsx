import Link from 'next/link'
import { ReactNode } from 'react'
import { MenuButton } from './MenuButton'
import { SwitchAccountButton } from './SwitchAccountButton'
import { NotificationBell } from './NotificationBell'
import { HouseholdSwitcher } from './HouseholdSwitcher'

interface PageHeaderProps {
  title: string
  backHref?: string
  backLabel?: string
  backButton?: boolean
  actions?: ReactNode
  subtitle?: ReactNode
  className?: string
  showMenu?: boolean
  helpRoute?: string
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
  backButton,
  actions,
  subtitle,
  className = '',
  showMenu = true,
  helpRoute
}: PageHeaderProps) {
  return (
    <header className={`page-header ${className}`}>
      <div className="page-header-content">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {(backHref || backButton) && backHref && (
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
              <div className="text-caption mt-1">{subtitle}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {helpRoute && (
            <Link
              href={helpRoute}
              className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Help documentation"
              title="View help guide"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
          )}
          {actions}
          <HouseholdSwitcher />
          <NotificationBell />
          <SwitchAccountButton />
          {showMenu && <MenuButton />}
        </div>
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
export function SimplePageHeader({ title, subtitle, showMenu = true }: { title: string; subtitle?: ReactNode; showMenu?: boolean }) {
  return (
    <header className="page-header">
      <div className="page-header-content">
        <div className="flex-1">
          <h1 className="page-title">{title}</h1>
          {subtitle && <div className="text-caption mt-1">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <HouseholdSwitcher />
          <NotificationBell />
          <SwitchAccountButton />
          {showMenu && <MenuButton />}
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
  showMenu?: boolean
}

export function TabbedPageHeader({
  title,
  tabs,
  activeTab,
  backHref,
  actions,
  showMenu = true
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
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
          <HouseholdSwitcher />
          <NotificationBell />
          <SwitchAccountButton />
          {showMenu && <MenuButton />}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border">
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
                    : 'border-transparent text-muted-foreground hover:border-muted-dark hover:text-foreground'
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
