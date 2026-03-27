'use client'

import AuthGuard from '@/components/auth/AuthGuard'
import { useReferral } from '@/hooks/useReferral'
import { ReferralShareSection } from '@/components/referrals/ReferralShareSection'
import { GiftIcon } from '@heroicons/react/24/outline'

export default function ReferralsPage() {
  return (
    <AuthGuard>
      <ReferralsContent />
    </AuthGuard>
  )
}

function ReferralsContent() {
  const { referralUrl, loading } = useReferral()

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Referrals</h1>
        <p className="text-muted-foreground mt-1">Refer friends and earn real money!</p>
      </div>

      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 rounded-full p-3">
            <GiftIcon className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">Earn 10% on every paid signup</h2>
            <p className="text-white/90 text-sm">
              Share your unique link with friends, family, or your audience.
              You earn 10% commission for every person who subscribes, and they get 7% off their first month.
            </p>
          </div>
        </div>
      </div>

      {/* Share Section */}
      {referralUrl ? (
        <ReferralShareSection referralUrl={referralUrl} discountPercent={7} />
      ) : (
        <div className="bg-card rounded-lg border border-border p-6 text-center">
          <p className="text-muted-foreground">Unable to load your referral link. Please try again later.</p>
        </div>
      )}
    </div>
  )
}
