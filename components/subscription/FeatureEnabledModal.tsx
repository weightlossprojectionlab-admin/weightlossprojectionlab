/**
 * Feature Enabled Modal
 *
 * Shows after a feature is successfully enabled (either directly or after upgrade).
 * Celebrates the unlock and guides user to next steps.
 */

'use client'

import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/solid'
import type { FeaturePreference } from '@/types'

interface FeatureEnabledModalProps {
  isOpen: boolean
  onClose: () => void
  feature: FeaturePreference
  wasUpgradeRequired: boolean
}

const FEATURE_ONBOARDING: Record<FeaturePreference, {
  title: string
  icon: string
  description: string
  nextSteps: { title: string; description: string; emoji: string }[]
}> = {
  'health_medical': {
    title: 'Health & Medical Tracking Enabled!',
    icon: '💊',
    description: 'You can now track medications, vitals, appointments, and health records.',
    nextSteps: [
      {
        emoji: '💊',
        title: 'Add Your Medications',
        description: 'Track dosages, schedules, and refill reminders'
      },
      {
        emoji: '📊',
        title: 'Log Your Vitals',
        description: 'Monitor blood pressure, glucose, heart rate, and more'
      },
      {
        emoji: '📅',
        title: 'Schedule Appointments',
        description: 'Manage healthcare provider visits and follow-ups'
      }
    ]
  },
  'body_fitness': {
    title: 'Body & Fitness Tracking Enabled!',
    icon: '💪',
    description: 'You can now track weight, exercise, and body composition goals.',
    nextSteps: [
      {
        emoji: '⚖️',
        title: 'Log Your Weight',
        description: 'Track your weight and see progress over time'
      },
      {
        emoji: '🏃',
        title: 'Record Exercise',
        description: 'Log workouts and physical activities'
      },
      {
        emoji: '🎯',
        title: 'Set Fitness Goals',
        description: 'Define targets and track your progress'
      }
    ]
  },
  'nutrition_kitchen': {
    title: 'Nutrition & Kitchen Enabled!',
    icon: '🍎',
    description: 'You can now plan meals, discover recipes, and manage your kitchen.',
    nextSteps: [
      {
        emoji: '📸',
        title: 'Scan Your Meals',
        description: 'Use WPL Vision™ to analyze food with AI'
      },
      {
        emoji: '📖',
        title: 'Discover Recipes',
        description: 'Browse thousands of healthy recipes'
      },
      {
        emoji: '🛒',
        title: 'Create Shopping Lists',
        description: 'Plan meals and generate smart shopping lists'
      }
    ]
  },
  'caregiving': {
    title: 'Caregiving Enabled!',
    icon: '🤲',
    description: 'You can now manage household duties and coordinate care for family members.',
    nextSteps: [
      {
        emoji: '📋',
        title: 'Assign Household Duties',
        description: 'Delegate tasks to caregivers and family members'
      },
      {
        emoji: '🔔',
        title: 'Set Reminders',
        description: 'Get notified when duties are due or overdue'
      },
      {
        emoji: '👥',
        title: 'Invite Caregivers',
        description: 'Add external caregivers to help manage care'
      }
    ]
  }
}

export function FeatureEnabledModal({
  isOpen,
  onClose,
  feature,
  wasUpgradeRequired
}: FeatureEnabledModalProps) {
  if (!isOpen) return null

  const featureInfo = FEATURE_ONBOARDING[feature]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-scale-in">
        {/* Celebration Header */}
        <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-8 text-white rounded-t-2xl overflow-hidden">
          {/* Confetti effect */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-300 rounded-full animate-confetti-1"></div>
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-pink-300 rounded-full animate-confetti-2"></div>
            <div className="absolute top-0 left-3/4 w-2 h-2 bg-blue-300 rounded-full animate-confetti-3"></div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4">
              <CheckCircleIcon className="w-20 h-20 text-white animate-bounce-once" />
            </div>
            <div className="text-6xl mb-4">{featureInfo.icon}</div>
            <h2 className="text-3xl font-bold mb-2">{featureInfo.title}</h2>
            <p className="text-green-100">{featureInfo.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {wasUpgradeRequired && (
            <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-900">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="font-semibold">Subscription upgraded successfully!</span>
              </div>
              <p className="text-sm text-purple-700 mt-1">
                Your new features are now active and ready to use.
              </p>
            </div>
          )}

          <h3 className="font-bold text-gray-900 mb-4 text-lg">Get Started:</h3>
          <div className="space-y-4">
            {featureInfo.nextSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="text-3xl flex-shrink-0">{step.emoji}</div>
                <div>
                  <div className="font-semibold text-gray-900">{step.title}</div>
                  <div className="text-sm text-gray-600">{step.description}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Let's Go! 🚀
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce-once {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes confetti-1 {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(300px) rotate(360deg); opacity: 0; }
        }
        @keyframes confetti-2 {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(280px) rotate(-360deg); opacity: 0; }
        }
        @keyframes confetti-3 {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(320px) rotate(180deg); opacity: 0; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .animate-bounce-once {
          animation: bounce-once 0.6s ease-in-out;
        }
        .animate-confetti-1 {
          animation: confetti-1 2s ease-out infinite;
        }
        .animate-confetti-2 {
          animation: confetti-2 2.2s ease-out infinite;
        }
        .animate-confetti-3 {
          animation: confetti-3 1.8s ease-out infinite;
        }
      `}</style>
    </div>
  )
}
