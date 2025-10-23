'use client'

import { useAdminAuth } from '@/hooks/useAdminAuth'
import {
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

export default function CoachingAdminPage() {
  const { isAdmin } = useAdminAuth()

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-red-700 dark:text-red-300">
            You do not have permission to access coaching administration.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Coaching Administration</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage coach applications, strikes, and payouts
        </p>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-8 mb-8">
        <div className="flex items-start gap-4">
          <ClockIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-200 mb-2">
              Feature Under Development
            </h2>
            <p className="text-yellow-800 dark:text-yellow-300 mb-4">
              The coaching administration system is currently under development. This page will provide tools to manage coach applications, performance, and payouts.
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Implementation requires new Firestore collections: <code>coach_applications</code>, <code>coach_strikes</code>, <code>coach_payouts</code>
            </p>
          </div>
        </div>
      </div>

      {/* Planned Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <AcademicCapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Coach Applications</h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Review pending coach applications</li>
            <li>• Approve or reject with reasons</li>
            <li>• View coach credentials and experience</li>
            <li>• Background check verification</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strike Management</h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Add strikes for policy violations</li>
            <li>• View strike history per coach</li>
            <li>• Automatic suspension at 3 strikes</li>
            <li>• Strike appeals and reviews</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payout Management</h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Review pending payouts</li>
            <li>• Approve bulk payouts</li>
            <li>• View payout history</li>
            <li>• Handle payment disputes</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Active Coaches</h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• View all active coaches</li>
            <li>• Coach performance metrics</li>
            <li>• Client satisfaction ratings</li>
            <li>• Revenue and earnings stats</li>
          </ul>
        </div>
      </div>

      {/* Implementation Guide */}
      <div className="bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-6">
        <h3 className="text-lg font-semibold text-accent-dark mb-4">Implementation Checklist</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <input type="checkbox" disabled className="mt-1" />
            <div>
              <div className="font-medium text-accent-dark">Create Firestore Collections</div>
              <div className="text-sm text-accent-dark opacity-80">
                Add <code>coach_applications</code>, <code>coach_strikes</code>, <code>coach_payouts</code> collections with security rules
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <input type="checkbox" disabled className="mt-1" />
            <div>
              <div className="font-medium text-accent-dark">Build Coach Application Flow</div>
              <div className="text-sm text-accent-dark opacity-80">
                Create public coach application form and admin review interface
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <input type="checkbox" disabled className="mt-1" />
            <div>
              <div className="font-medium text-accent-dark">Implement Strike System</div>
              <div className="text-sm text-accent-dark opacity-80">
                Track violations, auto-suspend at 3 strikes, handle appeals
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <input type="checkbox" disabled className="mt-1" />
            <div>
              <div className="font-medium text-accent-dark">Build Payout System</div>
              <div className="text-sm text-accent-dark opacity-80">
                Calculate earnings, generate payout queue, integrate with payment processor (Stripe/PayPal)
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <input type="checkbox" disabled className="mt-1" />
            <div>
              <div className="font-medium text-accent-dark">Create Admin UI</div>
              <div className="text-sm text-accent-dark opacity-80">
                Build this page with application queue, strike management, and payout approval
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRD Reference */}
      <div className="mt-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>PRD Reference:</strong> coaching_readiness_system (PRD v1.3.7) - See <code>PHASE3_ARCHITECTURE.md</code> and <code>ADMIN_SETUP.md</code> for detailed specifications
        </p>
      </div>
    </div>
  )
}
