'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMenu } from '@/contexts/MenuContext'
import { useLazyAuth } from '@/hooks/useLazyAuth'
import { signOut } from '@/lib/auth'
import { XMarkIcon } from '@heroicons/react/24/outline'
import {
  HomeIcon,
  CameraIcon,
  ChartBarIcon,
  PhotoIcon,
  BookOpenIcon,
  ShoppingBagIcon,
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  GiftIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  HeartIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface MenuItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

/**
 * App menu drawer - slide-out navigation
 * Provides access to all app features organized by category
 */
export function AppMenu() {
  const { isOpen, closeMenu } = useMenu()
  const { user } = useLazyAuth()
  const pathname = usePathname()
  const router = useRouter()

  const menuSections: MenuSection[] = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
        { name: 'Profile', href: '/profile', icon: UserCircleIcon },
      ],
    },
    {
      title: 'Health',
      items: [
        { name: 'Medical Info', href: '/medical', icon: HeartIcon },
        { name: 'Family Members', href: '/patients', icon: UserGroupIcon },
        { name: 'Medications', href: '/medications', icon: BeakerIcon },
      ],
    },
    {
      title: 'Tracking',
      items: [
        { name: 'Log Meal', href: '/log-meal', icon: CameraIcon },
        { name: 'Log Steps', href: '/log-steps', icon: ChartBarIcon },
        { name: 'Progress', href: '/progress', icon: ChartBarIcon },
        { name: 'Gallery', href: '/gallery', icon: PhotoIcon },
      ],
    },
    {
      title: 'Food',
      items: [
        { name: 'Recipes', href: '/recipes', icon: BookOpenIcon },
        { name: 'Discover', href: '/discover', icon: MagnifyingGlassIcon },
        { name: 'Shopping List', href: '/shopping', icon: ShoppingBagIcon },
        { name: 'Kitchen Inventory', href: '/inventory', icon: ArchiveBoxIcon },
      ],
    },
    {
      title: 'Engage',
      items: [
        { name: 'Missions', href: '/missions', icon: ChartBarIcon },
        { name: 'Groups', href: '/groups', icon: UserGroupIcon },
        { name: 'Perks', href: '/perks', icon: GiftIcon },
        { name: 'Coaching', href: '/coaching', icon: AcademicCapIcon },
      ],
    },
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
      closeMenu()
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  // Don't render on auth or onboarding pages
  if (pathname?.startsWith('/auth') || pathname?.startsWith('/onboarding')) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-full bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                {user?.email?.[0].toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeMenu}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="overflow-y-auto h-[calc(100%-130px)] p-4">
          {menuSections.map((section) => (
            <div key={section.title} className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
                {section.title}
              </h3>
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      onClick={closeMenu}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  )
}
