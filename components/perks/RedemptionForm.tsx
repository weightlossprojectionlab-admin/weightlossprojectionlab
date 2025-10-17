// Redemption Form Component
// PRD Reference: Sponsor Perks System (PRD v1.3.7)
// Form for redeeming sponsor perks

'use client';

import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import type { SponsorPerk } from '@/types/perks';

interface RedemptionFormProps {
  perk: SponsorPerk;
  onRedeem: (perkId: string, email: string) => Promise<{ success: boolean; message: string }>;
  onCancel?: () => void;
}

export default function RedemptionForm({ perk, onRedeem, onCancel }: RedemptionFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await onRedeem(perk.id, email);
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Redeem Perk</h3>
        <p className="text-sm text-gray-600">{perk.title}</p>
      </div>

      {/* Perk Details */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        {perk.value && (
          <div className="mb-2">
            <span className="text-sm text-blue-700 font-medium">Value: </span>
            <span className="text-lg font-bold text-blue-900">{perk.value}</span>
          </div>
        )}
        {perk.sponsorName && (
          <div>
            <span className="text-sm text-blue-700">Provided by {perk.sponsorName}</span>
          </div>
        )}
      </div>

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Redemption details will be sent to this email
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-yellow-800">
              By redeeming this perk, you agree to receive emails from {perk.sponsorName || 'the sponsor'}.
              You can unsubscribe at any time.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={isLoading || !email}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isLoading || !email
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Redeeming...' : 'Redeem Now'}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
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
          result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start space-x-3">
            {result.success ? (
              <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
            ) : (
              <XCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold mb-1 ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.success ? 'Success!' : 'Error'}
              </h4>
              <p className={`text-sm ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>
            </div>
          </div>

          {result.success && onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Done
            </button>
          )}

          {!result.success && (
            <button
              onClick={() => setResult(null)}
              className="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
