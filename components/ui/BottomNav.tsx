'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  CameraIcon,
  UserCircleIcon,
  ArchiveBoxIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  CameraIcon as CameraIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  ArchiveBoxIcon as ArchiveBoxIconSolid,
  UsersIcon as UsersIconSolid
} from '@heroicons/react/24/solid'
import { useUIConfig } from '@/hooks/useUIConfig'

// Icon mapping for dynamic tabs
const iconMap: Record<string, {
  outline: React.ComponentType<{ className?: string }>
  solid: React.ComponentType<{ className?: string }>
}> = {
  home: { outline: HomeIcon, solid: HomeIconSolid },
  camera: { outline: CameraIcon, solid: CameraIconSolid },
  user: { outline: UserCircleIcon, solid: UserCircleIconSolid },
  users: { outline: UsersIcon, solid: UsersIconSolid },
  archive: { outline: ArchiveBoxIcon, solid: ArchiveBoxIconSolid }
}

/**
 * Bottom navigation bar for mobile app - DYNAMIC based on User Mode
 * Shows on mobile/tablet, hidden on desktop
 *
 * Features:
 * - Adapts to user mode (Single/Household/Caregiver)
 * - Fixed at bottom of screen
 * - 4 main navigation items (based on UNIFIED PRD)
 * - Active state indication
 * - Accessible labels
 * - Safe area insets for notched devices
 *
 * User Modes:
 * - Single: [Home, Log, Kitchen, Profile]
 * - Household: [Home, Log, Kitchen, Family]
 * - Caregiver: [Family, Log, Home, Kitchen] (Family first!)
 *
 * @example
 * ```tsx
 * <BottomNav />
 * ```
 */
export function BottomNav() {
  const pathname = usePathname()
  const { config, loading } = useUIConfig()

  // Don't show on auth, onboarding, or admin pages
  const shouldHide = pathname?.startsWith('/auth') ||
                     pathname?.startsWith('/onboarding') ||
                     pathname?.startsWith('/admin')

  if (shouldHide) {
    return null
  }

  // Show loading state or fallback during initial load
  if (loading || !config) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
        <div className="flex items-center justify-around h-16">
          <div className="animate-pulse flex space-x-4 w-full justify-around">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-6 w-6 bg-muted rounded" />
                <div className="h-3 w-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16">
        {config.tabs.map((tab) => {
          const isActive = pathname === tab.href ||
                          (tab.href !== '/dashboard' && pathname?.startsWith(tab.href))

          // Get icon components
          const icons = iconMap[tab.icon] || iconMap.home
          const Icon = isActive ? icons.solid : icons.outline

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`
                flex flex-col items-center justify-center flex-1 h-full
                transition-colors duration-200
                ${isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-6 w-6" />
              <span className={`text-xs mt-1 font-medium ${isActive ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/**
 * Spacer component to prevent content from being hidden behind the bottom nav
 * Add this at the bottom of scrollable content
 *
 * @example
 * ```tsx
 * <div className="container">
 *   <Content />
 *   <BottomNavSpacer />
 * </div>
 * ```
 */
export function BottomNavSpacer() {
  return <div className="h-16" aria-hidden="true" />
}
