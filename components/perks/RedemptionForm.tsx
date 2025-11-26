// Redemption Form Component
// PRD Reference: Sponsor Perks System (PRD v1.3.7)
// Form for redeeming sponsor perks

'use client';

import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Spinner } from '@/components/ui/Spinner';
import type { Perk } from '@/types/perks';

interface RedemptionFormProps {
  perk: Perk;
  onRedeem: (perkId: string, email: string) => Promise<{ success: boolean; message: string }>;
  onCancel?: () => void;
}

export default function RedemptionForm({ perk, onRedeem, onCancel }: RedemptionFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const perkId = perk.id || perk.perkId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await onRedeem(perkId, email);
      setResult(response);

      if (response.success) {
        // Clear form on success
        setTimeout(() => {
          onCancel?.();
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to redeem perk. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground mb-2">Redeem Perk</h3>
        <p className="text-sm text-muted-foreground">{perk.title}</p>
      </div>

      {/* Perk Details */}
      <div className="bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-4 mb-6">
        {perk.value && (
          <div className="mb-2">
            <span className="text-sm text-accent-dark font-medium">Value: </span>
            <span className="text-lg font-bold text-accent-dark">{perk.value}</span>
          </div>
        )}
        {perk.sponsorName && (
          <div>
            <span className="text-sm text-accent-dark">Provided by {perk.sponsorName}</span>
          </div>
        )}
      </div>

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Redemption details will be sent to this email
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-warning-light border border-warning-light rounded-lg p-3 mb-4">
            <p className="text-xs text-warning-dark">
              By redeeming this perk, you agree to receive emails from {perk.sponsorName || 'the sponsor'}.
              You can unsubscribe at any time.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={isLoading || !email}
              className={`flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isLoading || !email
                  ? 'bg-muted-dark text-muted-foreground cursor-not-allowed'
                  : 'bg-accent-dark text-white hover:bg-accent-dark'
              } ${isLoading ? 'cursor-wait' : ''}`}
            >
              {isLoading && <Spinner size="sm" />}
              <span>{isLoading ? 'Redeeming...' : 'Redeem Now'}</span>
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Result Message */}
      {result && (
        <div className={`rounded-lg p-4 ${
          result.success ? 'bg-success-light border border-success' : 'bg-error-light border border-error'
        }`}>
          <div className="flex items-start space-x-3">
            {result.success ? (
              <CheckCircleIcon className="h-6 w-6 text-success-dark flex-shrink-0" />
            ) : (
              <XCircleIcon className="h-6 w-6 text-error-dark flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold mb-1 ${
                result.success ? 'text-success-dark' : 'text-error-dark'
              }`}>
                {result.success ? 'Success!' : 'Error'}
              </h4>
              <p className={`text-sm ${
                result.success ? 'text-success-dark' : 'text-error-dark'
              }`}>
                {result.message}
              </p>
            </div>
          </div>

          {result.success && onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 w-full bg-success text-white px-4 py-2 rounded-lg font-medium hover:bg-success transition-colors"
            >
              Done
            </button>
          )}

          {!result.success && (
            <button
              onClick={() => setResult(null)}
              className="mt-4 w-full bg-error-dark text-white px-4 py-2 rounded-lg font-medium hover:bg-error-dark transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
