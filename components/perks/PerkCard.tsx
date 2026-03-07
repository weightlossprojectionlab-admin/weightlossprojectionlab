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
  layout?: 'vertical' | 'horizontal';
}

export default function PerkCard({ perk, isEligible = false, isRedeemed = false, onRedeem, layout = 'vertical' }: PerkCardProps) {
  const isExpired = perk.expiresAt ? timestampToDate(perk.expiresAt) < new Date() : false;
  const isAvailable = !isRedeemed && !isExpired && isEligible;
  const perkId = perk.id || perk.perkId;

  // Horizontal layout (like admin page)
  if (layout === 'horizontal') {
    return (
      <div className={`border rounded-lg transition-all hover:shadow-md p-6 ${
        isRedeemed ? 'bg-muted border-border' :
        isAvailable ? 'bg-card border-accent' :
        'bg-card border-border opacity-75'
      }`}>
        <div className="flex items-start gap-6">
          {/* Image Section */}
          {perk.imageUrl ? (
            <div className="relative flex-shrink-0 w-48 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={perk.imageUrl}
                alt={perk.title}
                className="w-full h-full object-cover"
              />
              {perk.partnerLogo && (
                <div className="absolute top-2 right-2 bg-white rounded-lg p-1.5 shadow-md">
                  <img
                    src={perk.partnerLogo}
                    alt={perk.sponsorName || perk.partnerName}
                    className="h-6 w-auto object-contain"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-shrink-0">
              <GiftIcon className={`h-12 w-12 ${
                isRedeemed ? 'text-muted-foreground' : 'text-accent-dark'
              }`} />
            </div>
          )}

          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-foreground mb-1">{perk.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {perk.sponsorName || perk.partnerName} • {perk.category || 'General'}
                </p>
              </div>
              {/* Status Badge */}
              <div className="flex-shrink-0">
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
            </div>

            {perk.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{perk.description}</p>
            )}

            {/* Tags Row */}
            <div className="flex items-center gap-3 flex-wrap mb-4">
              {perk.value && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-accent-light to-purple-50 dark:from-purple-900/30 dark:to-indigo-900/20 text-accent-dark">
                  {perk.value}
                </span>
              )}
              {perk.xpRequired && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-light dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                  {perk.xpRequired.toLocaleString()} XP
                </span>
              )}
              {perk.discountCode && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-secondary-dark font-mono">
                  {perk.discountCode}
                </span>
              )}
              {perk.expiresAt && (
                <span className={`text-xs ${isExpired ? 'text-error-dark' : 'text-muted-foreground'}`}>
                  {isExpired ? 'Expired' : 'Expires'} {formatTimestamp(perk.expiresAt)}
                </span>
              )}
            </div>

            {/* Action Button */}
            {isAvailable && onRedeem && (
              <button
                onClick={() => onRedeem(perkId)}
                className="px-6 py-2 bg-accent-dark text-white rounded-lg font-medium hover:bg-accent-dark/90 transition-colors"
              >
                Redeem Perk
              </button>
            )}

            {!isEligible && !isRedeemed && !isExpired && perk.xpRequired && (
              <p className="text-xs text-muted-foreground">
                Keep earning XP to unlock this perk!
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vertical layout (original design)
  return (
    <div className={`border rounded-lg overflow-hidden transition-all hover:shadow-md ${
      isRedeemed ? 'bg-muted border-border' :
      isAvailable ? 'bg-card border-accent ring-2 ring-blue-100' :
      'bg-card border-border opacity-75'
    }`}>
      {/* Perk Image */}
      {perk.imageUrl && (
        <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800">
          <img
            src={perk.imageUrl}
            alt={perk.title}
            className="w-full h-full object-cover"
          />
          {perk.partnerLogo && (
            <div className="absolute top-2 right-2 bg-white rounded-lg p-2 shadow-md">
              <img
                src={perk.partnerLogo}
                alt={perk.sponsorName || perk.partnerName}
                className="h-8 w-auto object-contain"
              />
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-1">{perk.title}</h3>
            {perk.description && (
              <p className="text-sm text-muted-foreground">{perk.description}</p>
            )}
          </div>
          {!perk.imageUrl && (
            <GiftIcon className={`h-8 w-8 flex-shrink-0 ml-3 ${
              isRedeemed ? 'text-muted-foreground' : 'text-accent-dark'
            }`} />
          )}
        </div>

        {/* Sponsor */}
        {(perk.sponsorName || perk.partnerName) && (
          <div className="flex items-center space-x-2 mb-3">
            {perk.partnerLogo && !perk.imageUrl && (
              <img
                src={perk.partnerLogo}
                alt={perk.sponsorName || perk.partnerName}
                className="h-6 w-auto object-contain"
              />
            )}
            <span className="text-xs text-muted-foreground">Sponsored by</span>
            <span className="text-sm font-semibold text-foreground">{perk.sponsorName || perk.partnerName}</span>
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
    </div>
  );
}
