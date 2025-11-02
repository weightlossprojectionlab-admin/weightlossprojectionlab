'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  CameraIcon,
  ChartBarIcon,
  BookOpenIcon,
  UserCircleIcon,
  ShoppingBagIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  CameraIcon as CameraIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
  ArchiveBoxIcon as ArchiveBoxIconSolid
} from '@heroicons/react/24/solid'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  activeIcon: React.ComponentType<{ className?: string }>
  label: string
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    activeIcon: HomeIconSolid,
    label: 'Home',
  },
  {
    name: 'Log Meal',
    href: '/log-meal',
    icon: CameraIcon,
    activeIcon: CameraIconSolid,
    label: 'Log',
  },
  {
    name: 'Shopping',
    href: '/shopping',
    icon: ShoppingBagIcon,
    activeIcon: ShoppingBagIconSolid,
    label: 'Shop',
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: ArchiveBoxIcon,
    activeIcon: ArchiveBoxIconSolid,
    label: 'Kitchen',
  },
  {
    name: 'Recipes',
    href: '/recipes',
    icon: BookOpenIcon,
    activeIcon: BookOpenIconSolid,
    label: 'Recipes',
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: UserCircleIcon,
    activeIcon: UserCircleIconSolid,
    label: 'Profile',
  },
]

/**
 * Bottom navigation bar for mobile app
 * Shows on mobile/tablet, hidden on desktop
 *
 * Features:
 * - Fixed at bottom of screen
 * - 6 main navigation items
 * - Active state indication
 * - Accessible labels
 * - Safe area insets for notched devices
 *
 * @example
 * ```tsx
 * <BottomNav />
 * ```
 */
export function BottomNav() {
  const pathname = usePathname()

  // Don't show on auth, onboarding, or admin pages
  const shouldHide = pathname?.startsWith('/auth') ||
                     pathname?.startsWith('/onboarding') ||
                     pathname?.startsWith('/admin')

  if (shouldHide) {
    return null
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
                          (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          const Icon = isActive ? item.activeIcon : item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center flex-1 h-full
                transition-colors duration-200
                ${isActive
                  ? 'text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }
              `}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-6 w-6" />
              <span className={`text-xs mt-1 font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
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
