// Risk Score Display Component
// PRD Reference: trust_safety_moderation (PRD v1.3.7)
// Visual display of risk score and contributing signals

'use client';

import { ExclamationTriangleIcon, ShieldCheckIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import type { RiskScoreResult } from '@/types/trust-safety';

interface RiskScoreDisplayProps {
  assessment: RiskScoreResult;
  showDetails?: boolean;
}

export default function RiskScoreDisplay({ assessment, showDetails = true }: RiskScoreDisplayProps) {
  const { score, signals, recommendation, confidence } = assessment;

  const getRiskLevel = (score: number): { label: string; color: string; bgColor: string; icon: any } => {
    if (score >= 70) {
      return {
        label: 'High Risk',
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        icon: ExclamationTriangleIcon
      };
    } else if (score >= 40) {
      return {
        label: 'Medium Risk',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200',
        icon: ShieldExclamationIcon
      };
    } else {
      return {
        label: 'Low Risk',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        icon: ShieldCheckIcon
      };
    }
  };

  const riskLevel = getRiskLevel(score);
  const RiskIcon = riskLevel.icon;

  return (
    <div className={`border rounded-lg p-6 ${riskLevel.bgColor}`}>
      {/* Header with Score */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <RiskIcon className={`h-10 w-10 ${riskLevel.color}`} />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Risk Assessment</h3>
            <p className={`text-sm font-semibold ${riskLevel.color}`}>{riskLevel.label}</p>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-4xl font-bold ${riskLevel.color}`}>{score}</div>
          <div className="text-xs text-gray-500">/ 100</div>
        </div>
      </div>

      {/* Score Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 70 ? 'bg-red-500' :
              score >= 40 ? 'bg-orange-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low (0-39)</span>
          <span>Medium (40-69)</span>
          <span>High (70-100)</span>
        </div>
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Recommended Action
              </div>
              <div className="text-base font-semibold text-gray-900 capitalize">
                {recommendation.replace(/_/g, ' ')}
              </div>
            </div>
            {confidence !== undefined && (
              <div className="text-right ml-4">
                <div className="text-xs text-gray-500 mb-1">Confidence</div>
                <div className="text-lg font-bold text-gray-900">
                  {Math.round(confidence * 100)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contributing Signals */}
      {showDetails && signals && signals.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Contributing Factors</h4>
          <div className="space-y-2">
            {signals
              .sort((a, b) => b.weight - a.weight)
              .map((signal, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {signal.signal.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-sm font-bold ${
                      signal.weight >= 30 ? 'text-red-600' :
                      signal.weight >= 15 ? 'text-orange-600' :
                      'text-yellow-600'
                    }`}>
                      +{signal.weight}
                    </span>
                  </div>
                  {signal.description && (
                    <p className="text-xs text-gray-600">{signal.description}</p>
                  )}
                </div>
              ))}
          </div>

          {/* Auto-Resolve Eligibility */}
          {confidence !== undefined && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs font-semibold text-blue-900">
                {confidence >= 0.8 ? '✓' : '⚠'} Auto-Resolution Eligibility
              </div>
              <div className="text-xs text-blue-800 mt-1">
                {confidence >= 0.8
                  ? 'Case meets threshold for automatic resolution (≥80% confidence)'
                  : `Case requires manual review (confidence: ${Math.round(confidence * 100)}%)`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
