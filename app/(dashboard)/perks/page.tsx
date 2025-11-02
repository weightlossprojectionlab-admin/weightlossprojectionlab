// Sponsor Perks Dashboard Page
// PRD Reference: Sponsor Perks System (PRD v1.3.7)
// Feature-flagged: NEXT_PUBLIC_PERKS_ENABLED

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { timestampToDate } from '@/lib/timestamp';
import PerkCard from '@/components/perks/PerkCard';
import RedemptionForm from '@/components/perks/RedemptionForm';
import EligibilityBadge from '@/components/perks/EligibilityBadge';
import type { Perk } from '@/types/perks';
import { logger } from '@/lib/logger'

const PERKS_ENABLED = process.env.NEXT_PUBLIC_PERKS_ENABLED === 'true';
const XP_THRESHOLD = 10000; // 10K XP required for perks

export default function PerksPage() {
  const { user } = useAuth();
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);
  const [showRedemptionForm, setShowRedemptionForm] = useState(false);

  // TODO: Replace with actual data fetching
  const userXP = 0; // Get from user profile
  const perks: Perk[] = [];
  const redeemedPerkIds: string[] = [];
  const isLoading = false;
  const error = null;

  const isEligible = userXP >= XP_THRESHOLD;

  const handleRedeem = async (perkId: string) => {
    const perk = perks.find(p => p.perkId === perkId);
    if (perk) {
      setSelectedPerk(perk);
      setShowRedemptionForm(true);
    }
  };

  const handleRedeemSubmit = async (perkId: string, email: string) => {
    logger.debug('Redeem perk:', { perkId, email });
    // TODO: Implement Firebase function to process redemption
    // This would create a redemption record and trigger webhook to sponsor

    return {
      success: true,
      message: 'Perk redeemed successfully! Check your email for details.'
    };
  };

  const handleCancelRedemption = () => {
    setShowRedemptionForm(false);
    setSelectedPerk(null);
  };

  // Feature flag check
  if (!PERKS_ENABLED) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg p-8 max-w-md text-center">
          <div className="text-yellow-600 dark:text-yellow-400 text-5xl mb-4">🎁</div>
          <h2 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mb-2">Perks Coming Soon!</h2>
          <p className="text-yellow-700 dark:text-yellow-100">
            Sponsor perks are currently disabled. Check back later for exclusive rewards from our partners!
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-dark mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading perks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-error-light border border-error rounded-lg p-4">
          <h2 className="text-error-dark font-semibold mb-2">Error Loading Perks</h2>
          <p className="text-error-dark">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Sponsor Perks</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Exclusive rewards and discounts from our partners</p>
      </div>

      {/* Eligibility Badge */}
      <div className="mb-6">
        <EligibilityBadge
          currentXP={userXP}
          requiredXP={XP_THRESHOLD}
          isEligible={isEligible}
          compact={false}
        />
      </div>

      {/* Redemption Form Modal */}
      {showRedemptionForm && selectedPerk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-2xl w-full">
            <button
              onClick={handleCancelRedemption}
              className="absolute -top-2 -right-2 bg-white dark:bg-gray-900 rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <RedemptionForm
              perk={selectedPerk}
              onRedeem={handleRedeemSubmit}
              onCancel={handleCancelRedemption}
            />
          </div>
        </div>
      )}

      {/* Perks Grid */}
      {perks.length > 0 ? (
        <div className="space-y-6">
          {/* Available Perks */}
          {perks.some(p => !redeemedPerkIds.includes(p.perkId) && (!p.expiresAt || timestampToDate(p.expiresAt) > new Date())) && (
            <div>
              <h2 className="text-xl font-bold mb-4">Available Perks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {perks
                  .filter(p => !redeemedPerkIds.includes(p.perkId) && (!p.expiresAt || timestampToDate(p.expiresAt) > new Date()))
                  .map((perk) => (
                    <PerkCard
                      key={perk.perkId}
                      perk={perk}
                      isEligible={isEligible}
                      isRedeemed={false}
                      onRedeem={handleRedeem}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Redeemed Perks */}
          {redeemedPerkIds.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Redeemed Perks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {perks
                  .filter(p => redeemedPerkIds.includes(p.perkId))
                  .map((perk) => (
                    <PerkCard
                      key={perk.perkId}
                      perk={perk}
                      isEligible={isEligible}
                      isRedeemed={true}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-gray-600 dark:text-gray-400 text-6xl mb-4">🎁</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No Perks Available</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isEligible
              ? 'Check back soon for new perks from our sponsors!'
              : `Earn ${(XP_THRESHOLD - userXP).toLocaleString()} more XP to unlock sponsor perks!`}
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">About Sponsor Perks</h3>
        <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
          <li>• Earn {XP_THRESHOLD.toLocaleString()} XP to unlock sponsor perks</li>
          <li>• Perks include discounts, free trials, and exclusive offers from our partners</li>
          <li>• Each perk can only be redeemed once</li>
          <li>• Redemption details will be sent to your email</li>
          <li>• Some perks may have expiration dates</li>
        </ul>
      </div>
    </div>
  );
}
