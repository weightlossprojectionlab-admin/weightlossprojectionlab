// AI Coach Plan Component
// PRD Reference: aisa_motivational_coaching (PRD v1.3.7)
// Displays the user's weekly AI-generated coaching plan

'use client';

import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { AICoachPlan as AICoachPlanType } from '@/schemas/firestore/users';
import { timestampToDate, formatTimestamp } from '@/lib/timestamp';

interface AICoachPlanProps {
  plan: AICoachPlanType | null;
}

export default function AICoachPlan({ plan }: AICoachPlanProps) {
  if (!plan) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center py-8">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Plan</h3>
          <p className="text-sm text-gray-600">
            Activate your AI coach to receive personalized weekly plans
          </p>
        </div>
      </div>
    );
  }

  const currentDate = new Date();
  const planEndDate = timestampToDate(plan.endDate);
  const isExpired = currentDate > planEndDate;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Your Weekly Plan</h3>
          <p className="text-sm text-gray-600">
            {formatTimestamp(plan.startDate)} - {formatTimestamp(plan.endDate)}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          isExpired ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
        }`}>
          {isExpired ? 'Expired' : 'Active'}
        </span>
      </div>

      {/* Daily Actions */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Daily Actions</h4>
        {plan.dailyActions && plan.dailyActions.length > 0 ? (
          <ul className="space-y-3">
            {plan.dailyActions.map((action, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{action}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No daily actions assigned</p>
        )}
      </div>

      {/* Motivational Message */}
      {plan.motivationalMessage && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-sm text-blue-900 italic">&ldquo;{plan.motivationalMessage}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Goal Focus */}
      {plan.goalFocus && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">This Week&apos;s Focus</h4>
          <p className="text-sm text-gray-900">{plan.goalFocus}</p>
        </div>
      )}

      {/* Generation Info */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <ClockIcon className="h-4 w-4" />
          <span>Generated {formatTimestamp(plan.generatedAt)}</span>
        </div>
        {plan.confidence && (
          <span>Confidence: {Math.round(plan.confidence * 100)}%</span>
        )}
      </div>
    </div>
  );
}
