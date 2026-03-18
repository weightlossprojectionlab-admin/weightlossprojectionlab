/**
 * User Guides Page
 * Comprehensive guides for all WPL features
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { DocCard } from '@/components/docs/DocCard'
import {
  ShoppingCartIcon,
  ChartBarIcon,
  TrendingUpIcon,
  BadgeCheckIcon,
  UsersIcon,
  HeartIcon,
  UserCircleIcon,
  ClipboardCheckIcon,
  WifiOffIcon,
  BookOpenIcon,
  ShoppingBagIcon,
  QrcodeIcon,
  DownloadIcon,
  BellIcon,
} from '@/components/docs/DocIcons'

export const metadata: Metadata = {
  title: 'User Guides | Wellness Projection Lab',
  description: 'Comprehensive user guides for all Wellness Projection Lab features including meal tracking, family management, and health monitoring.',
}

export default function UserGuidesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/docs"
            className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2 mb-6"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Documentation
          </Link>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">User Guides</h1>
          <p className="text-xl text-gray-600 max-w-3xl">
            Comprehensive guides to help you master every feature of Wellness Projection Lab
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Core Features */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Core Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <DocCard
                href="/docs/user-guides/meal-tracking"
                icon={<ShoppingCartIcon />}
                title="Meal Tracking"
                description="Learn how to track meals with AI-powered analysis, photo logging, and nutritional insights"
                accentColor="blue"
              />
              <DocCard
                href="/docs/user-guides/weight-logging"
                icon={<ChartBarIcon />}
                title="Weight Logging"
                description="Track weight changes over time with visual charts and trend analysis"
                accentColor="green"
              />
              <DocCard
                href="/docs/user-guides/progress-tracking"
                icon={<TrendingUpIcon />}
                title="Progress Tracking"
                description="Monitor your health journey with comprehensive charts, statistics, and insights"
                accentColor="purple"
              />
              <DocCard
                href="/docs/user-guides/goals"
                icon={<BadgeCheckIcon />}
                title="Goal Setting"
                description="Set realistic health goals and track your progress towards achieving them"
                accentColor="orange"
              />
            </div>
          </section>

          {/* Family & Patient Management */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Family & Patient Management</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <DocCard
                href="/docs/user-guides/family-setup"
                icon={<UsersIcon />}
                title="Family Account Setup"
                description="Create and manage family members, set up patient profiles, and control access"
                accentColor="pink"
              />
              <DocCard
                href="/docs/user-guides/caregiver-mode"
                icon={<HeartIcon />}
                title="Caregiver Mode"
                description="Learn how to manage health data for loved ones as a caregiver"
                accentColor="teal"
              />
              <DocCard
                href="/docs/user-guides/patient-profiles"
                icon={<UserCircleIcon />}
                title="Patient Profiles"
                description="Set up detailed patient profiles with medical history, medications, and providers"
                accentColor="indigo"
              />
              <DocCard
                href="/docs/user-guides/household-duties"
                icon={<ClipboardCheckIcon />}
                title="Household Duties"
                description="Manage and assign household tasks like laundry, shopping, and cleaning"
                accentColor="yellow"
              />
            </div>
          </section>

          {/* Advanced Features */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Advanced Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DocCard
                href="/docs/user-guides/offline-mode"
                icon={<WifiOffIcon className="w-5 h-5" />}
                title="Offline Mode"
                description="Use WPL without internet connection"
                accentColor="gray"
                size="small"
              />
              <DocCard
                href="/docs/user-guides/recipes"
                icon={<BookOpenIcon className="w-5 h-5" />}
                title="Recipes & Meal Planning"
                description="Browse recipes and plan meals"
                accentColor="red"
                size="small"
              />
              <DocCard
                href="/docs/user-guides/shopping"
                icon={<ShoppingBagIcon className="w-5 h-5" />}
                title="Shopping Lists"
                description="Create and manage shopping lists"
                accentColor="green"
                size="small"
              />
              <DocCard
                href="/docs/user-guides/barcode-scanning"
                icon={<QrcodeIcon className="w-5 h-5" />}
                title="Barcode Scanning"
                description="Scan products for nutrition info"
                accentColor="blue"
                size="small"
              />
              <DocCard
                href="/docs/user-guides/data-export"
                icon={<DownloadIcon className="w-5 h-5" />}
                title="Data Export"
                description="Download your health data"
                accentColor="purple"
                size="small"
              />
              <DocCard
                href="/docs/user-guides/notifications"
                icon={<BellIcon className="w-5 h-5" />}
                title="Notifications"
                description="Manage reminders and alerts"
                accentColor="orange"
                size="small"
              />
            </div>
          </section>

          {/* Support Banner */}
          <section>
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-10 text-white text-center">
              <h2 className="text-2xl font-bold mb-3">Can't find what you're looking for?</h2>
              <p className="text-purple-100 mb-6">
                Our support team is here to help with any questions
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/support"
                  className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
                >
                  Contact Support
                </Link>
                <Link
                  href="/docs"
                  className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  Browse All Docs
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
