// Perk Card Component
// PRD Reference: Sponsor Perks System (PRD v1.3.7)
// Displays individual sponsor perk information

'use client';

import { GiftIcon, TagIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { timestampToDate, formatTimestamp } from '@/lib/timestamp';
import type { Perk } from '@/types/perks';

interface PerkCardProps {
  perk: Perk;
  isEligible?: boolean;
  isRedeemed?: boolean;
  onRedeem?: (perkId: string) => void;
}

export default function PerkCard({ perk, isEligible = false, isRedeemed = false, onRedeem }: PerkCardProps) {
  const isExpired = perk.expiresAt ? timestampToDate(perk.expiresAt) < new Date() : false;
  const isAvailable = !isRedeemed && !isExpired && isEligible;
  const perkId = perk.id || perk.perkId;

  return (
    <div className={`border rounded-lg p-5 transition-all hover:shadow-md ${
      isRedeemed ? 'bg-gray-50 border-gray-200' :
      isAvailable ? 'bg-white border-blue-200 ring-2 ring-blue-100' :
      'bg-white border-gray-200 opacity-75'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{perk.title}</h3>
          {perk.description && (
            <p className="text-sm text-gray-600">{perk.description}</p>
          )}
        </div>
        <GiftIcon className={`h-8 w-8 flex-shrink-0 ml-3 ${
          isRedeemed ? 'text-gray-400' : 'text-blue-600'
        }`} />
      </div>

      {/* Sponsor */}
      {perk.sponsorName && (
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-xs text-gray-500">Sponsored by</span>
          <span className="text-sm font-semibold text-gray-900">{perk.sponsorName}</span>
        </div>
      )}

      {/* Value/Discount */}
      {perk.value && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-700 font-medium mb-1">Perk Value</div>
              <div className="text-2xl font-bold text-blue-900">{perk.value}</div>
            </div>
            {perk.discountCode && (
              <div className="text-right">
                <div className="text-xs text-purple-700 font-medium mb-1">Code</div>
                <div className="font-mono text-sm font-bold text-purple-900">{perk.discountCode}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Requirements */}
      {perk.xpRequired && (
        <div className="flex items-center space-x-2 mb-3 text-sm">
          <TagIcon className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">Requires {perk.xpRequired.toLocaleString()} XP</span>
        </div>
      )}

      {/* Expiration */}
      {perk.expiresAt && (
        <div className="flex items-center space-x-2 mb-4 text-sm">
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          <span className={isExpired ? 'text-red-600' : 'text-gray-600'}>
            {isExpired ? 'Expired' : 'Expires'} {formatTimestamp(perk.expiresAt)}
          </span>
        </div>
      )}

      {/* Status Badge */}
      <div className="mb-4">
        {isRedeemed ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
            ✓ Redeemed
          </span>
        ) : isExpired ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Expired
          </span>
        ) : !isEligible ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Not Eligible Yet
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Available
          </span>
        )}
      </div>

      {/* Action Button */}
      {isAvailable && onRedeem && (
        <button
          onClick={() => onRedeem(perkId)}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Redeem Perk
        </button>
      )}

      {!isEligible && !isRedeemed && !isExpired && perk.xpRequired && (
        <div className="text-xs text-gray-500 text-center">
          Keep earning XP to unlock this perk!
        </div>
      )}
    </div>
  );
}
