// Coaching Dashboard Page
// PRD Reference: coaching_readiness_system, aisa_motivational_coaching (PRD v1.3.7)
// TODO: Link to PRD v1.3.7 § coaching_readiness_system

'use client';

import { useCoaching, isEligibleForCoaching, hasActiveAICoach } from '@/hooks/useCoaching';
import { useAuth } from '@/hooks/useAuth';  // Assuming existing auth hook
import CoachingStatus from '@/components/coaching/CoachingStatus';
import AICoachPlan from '@/components/coaching/AICoachPlan';
import CoachingProgress from '@/components/coaching/CoachingProgress';

export default function CoachingPage() {
  const { user } = useAuth();
  const coachingData = useCoaching(user?.uid || null);

  if (coachingData.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading coaching data...</p>
        </div>
      </div>
    );
  }

  if (coachingData.error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Coaching Data</h2>
          <p className="text-red-600">{coachingData.error.message}</p>
        </div>
      </div>
    );
  }

  // Not eligible for coaching yet
  if (!isEligibleForCoaching(coachingData)) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">
            🎯 Coaching Unlocking Soon!
          </h2>
          <p className="text-blue-800 mb-4">
            Keep logging your progress to unlock personalized AI coaching.
          </p>
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <span className="font-medium mr-2">Current Streak:</span>
              <span>{coachingData.status?.streakDays || 0} days</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium mr-2">Weight Logs:</span>
              <span>{coachingData.status?.weightLogCount || 0} / 10</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium mr-2">Adherence:</span>
              <span>{Math.round((coachingData.status?.adherence || 0) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has active AI coach plan
  if (hasActiveAICoach(coachingData)) {
    const { aiCoachPlan, progress, status } = coachingData;

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your AI Coach</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Card */}
          <div className="lg:col-span-1">
            <CoachingStatus
              status={status || null}
              isEligible={isEligibleForCoaching(coachingData)}
              hasActiveCoach={hasActiveAICoach(coachingData)}
            />
          </div>

          {/* Plan Card */}
          <div className="lg:col-span-2">
            <AICoachPlan plan={aiCoachPlan || null} />
          </div>
        </div>

        {/* Progress Card */}
        <div className="mt-6">
          <CoachingProgress
            status={status || null}
            weeklyCompletionRate={(progress?.actionRate || 0) * 100}
            totalInteractions={coachingData.actions.length}
          />
        </div>

        {/* Pending Nudges/Actions */}
        {coachingData.actions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Upcoming Reminders</h2>
            <div className="space-y-2">
              {coachingData.actions.map((nudge) => (
                <div key={nudge.nudgeId} className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-sm text-gray-900">{nudge.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Eligible but no active plan
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-green-900 mb-4">
          🎉 Coaching Unlocked!
        </h2>
        <p className="text-green-800 mb-4">
          You're eligible for AI coaching. A personalized 7-day plan will be created for you shortly.
        </p>
        <p className="text-sm text-green-700">
          Check back soon to see your customized action plan.
        </p>
      </div>
    </div>
  );
}
