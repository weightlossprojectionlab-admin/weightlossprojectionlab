/**
 * Stripe Checkout Cancelled Landing Page
 *
 * Stripe redirects franchise prospects here when they abandon the checkout
 * (back button, close tab and return, explicit cancel). URL shape:
 *   /franchise/payment-cancelled?tenant=<firestoreDocId>
 *
 * Reassures the customer that no charge was made, reminds them their
 * existing payment-link email is still valid for 24 hours, and provides
 * a contact email for questions. Does NOT auto-resend the payment link
 * (that would require admin auth — the existing payment-link API is
 * super-admin only).
 *
 * Publicly accessible. Tenant lookup soft-fails to generic copy.
 */

import Link from 'next/link'
import type { Metadata } from 'next'
import { XCircleIcon } from '@heroicons/react/24/outline'
import { getTenantById } from '@/lib/tenant-server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Payment Cancelled — Wellness Projection Lab',
  description: 'Your franchise setup payment was cancelled. No charge was made.',
}

interface PageProps {
  searchParams: Promise<{ tenant?: string }>
}

export default async function PaymentCancelledPage({ searchParams }: PageProps) {
  const { tenant: tenantId } = await searchParams

  // Soft lookup — page renders even if this fails
  const tenant = tenantId ? await getTenantById(tenantId) : null
  const businessName = tenant?.name || 'your franchise'
  const adminEmail = tenant?.contact?.adminEmail

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 sm:p-12">
          {/* Cancelled icon */}
          <div className="mx-auto w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6">
            <XCircleIcon className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">
            Payment Cancelled
          </h1>

          <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-2">
            No charge was made.
          </p>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
            Your setup for <strong className="text-gray-700 dark:text-gray-300">{businessName}</strong>{' '}
            is still pending.
          </p>

          {/* What to do next */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Ready to try again?</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Your original payment link is still valid for 24 hours
              {adminEmail && (
                <>
                  {' '}— check your inbox at{' '}
                  <strong className="text-gray-900 dark:text-gray-100">{adminEmail}</strong>
                </>
              )}
              . Just click the &ldquo;Complete Payment&rdquo; button in that email to return to the
              checkout page.
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              If your link has expired or you can&apos;t find the email, contact us and we&apos;ll
              send you a fresh one.
            </p>
          </div>

          {/* Support */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Have questions before you proceed? We&apos;re happy to help.
            </p>
            <a
              href="mailto:wellnessprojectionlab@gmail.com?subject=Franchise%20Setup%20Question"
              className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm"
            >
              Contact Support
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          <Link href="/franchise" className="hover:text-gray-600 dark:hover:text-gray-300">
            Learn more about Wellness Projection Lab franchises
          </Link>
        </p>
      </div>
    </main>
  )
}
