/**
 * Stripe Checkout Success Landing Page
 *
 * Stripe redirects franchise prospects here after they successfully pay
 * the setup fee. URL shape:
 *   /franchise/payment-success?tenant=<firestoreDocId>&session_id=<csId>
 *
 * This page is intentionally STATIC reassurance — it does NOT poll the
 * webhook or attempt to log the user in. The webhook (handleFranchiseSetupPaid)
 * runs asynchronously in the next 1-15 seconds; the magic-link sign-in email
 * arrives shortly after. We just confirm the payment was received and tell
 * the user to check their inbox.
 *
 * The page is publicly accessible (no auth required) because the customer
 * has not signed in yet. Tenant lookup soft-fails so a Firestore hiccup
 * doesn't show an error to a customer who just paid us $3,000.
 */

import Link from 'next/link'
import type { Metadata } from 'next'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { getTenantById } from '@/lib/tenant-server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Payment Received — Wellness Projection Lab',
  description: 'Your franchise setup payment has been received.',
}

interface PageProps {
  searchParams: Promise<{ tenant?: string; session_id?: string }>
}

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const { tenant: tenantId } = await searchParams

  // Soft lookup — page renders even if this fails
  const tenant = tenantId ? await getTenantById(tenantId) : null
  const businessName = tenant?.name || 'your franchise'
  const adminEmail = tenant?.contact?.adminEmail
  const subdomainUrl = tenant?.slug
    ? `https://${tenant.slug}.wellnessprojectionlab.com`
    : null

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 sm:p-12">
          {/* Success icon */}
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">
            Payment Received
          </h1>

          <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-8">
            Thank you for completing your setup payment for{' '}
            <strong className="text-gray-900 dark:text-gray-100">{businessName}</strong>.
          </p>

          {/* What happens next */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              What happens next
            </h2>
            <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <div>
                  We&apos;re activating your platform now. This usually takes under a minute.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <div>
                  You&apos;ll receive a sign-in email
                  {adminEmail && (
                    <>
                      {' '}at <strong className="text-gray-900 dark:text-gray-100">{adminEmail}</strong>
                    </>
                  )}{' '}
                  with a one-click link to access your dashboard.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div>
                  From your dashboard you can edit your branding, invite staff, and start
                  onboarding your client families.
                </div>
              </li>
            </ol>
          </div>

          {/* Subdomain reminder */}
          {subdomainUrl && (
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your platform will be live at:</p>
              <p className="text-base font-semibold text-green-700 dark:text-green-400 break-all">
                {subdomainUrl.replace(/^https?:\/\//, '')}
              </p>
            </div>
          )}

          {/* Support */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Didn&apos;t receive the email within 5 minutes? Check your spam folder, or contact
              us at{' '}
              <a
                href="mailto:wellnessprojectionlab@gmail.com"
                className="text-green-700 dark:text-green-400 underline hover:no-underline"
              >
                wellnessprojectionlab@gmail.com
              </a>
              .
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          <Link href="/" className="hover:text-gray-600 dark:hover:text-gray-300">
            Return to Wellness Projection Lab
          </Link>
        </p>
      </div>
    </main>
  )
}
