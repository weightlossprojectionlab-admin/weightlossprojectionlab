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
      isRedeemed ? 'bg-muted border-border' :
      isAvailable ? 'bg-card border-accent ring-2 ring-blue-100' :
      'bg-card border-border opacity-75'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground mb-1">{perk.title}</h3>
          {perk.description && (
            <p className="text-sm text-muted-foreground">{perk.description}</p>
          )}
        </div>
        <GiftIcon className={`h-8 w-8 flex-shrink-0 ml-3 ${
          isRedeemed ? 'text-muted-foreground' : 'text-accent-dark'
        }`} />
      </div>

      {/* Sponsor */}
      {perk.sponsorName && (
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-xs text-muted-foreground">Sponsored by</span>
          <span className="text-sm font-semibold text-foreground">{perk.sponsorName}</span>
        </div>
      )}

      {/* Value/Discount */}
      {perk.value && (
        <div className="bg-gradient-to-r from-accent-light to-purple-50 dark:from-purple-900/30 dark:to-indigo-900/20 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-accent-dark font-medium mb-1">Perk Value</div>
              <div className="text-2xl font-bold text-accent-dark">{perk.value}</div>
            </div>
            {perk.discountCode && (
              <div className="text-right">
                <div className="text-xs text-primary-dark font-medium mb-1">Code</div>
                <div className="font-mono text-sm font-bold text-purple-900 dark:text-purple-200">{perk.discountCode}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Requirements */}
      {perk.xpRequired && (
        <div className="flex items-center space-x-2 mb-3 text-sm">
          <TagIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Requires {perk.xpRequired.toLocaleString()} XP</span>
        </div>
      )}

      {/* Expiration */}
      {perk.expiresAt && (
        <div className="flex items-center space-x-2 mb-4 text-sm">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className={isExpired ? 'text-error-dark' : 'text-muted-foreground'}>
            {isExpired ? 'Expired' : 'Expires'} {formatTimestamp(perk.expiresAt)}
          </span>
        </div>
      )}

      {/* Status Badge */}
      <div className="mb-4">
        {isRedeemed ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
            ✓ Redeemed
          </span>
        ) : isExpired ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-error-light text-error-dark">
            Expired
          </span>
        ) : !isEligible ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-warning-dark dark:text-yellow-300">
            Not Eligible Yet
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-light text-success-dark">
            Available
          </span>
        )}
      </div>

      {/* Action Button */}
      {isAvailable && onRedeem && (
        <button
          onClick={() => onRedeem(perkId)}
          className="w-full bg-accent-dark text-white px-4 py-2 rounded-lg font-medium hover:bg-accent-dark transition-colors"
        >
          Redeem Perk
        </button>
      )}

      {!isEligible && !isRedeemed && !isExpired && perk.xpRequired && (
        <div className="text-xs text-muted-foreground text-center">
          Keep earning XP to unlock this perk!
        </div>
      )}
    </div>
  );
}
