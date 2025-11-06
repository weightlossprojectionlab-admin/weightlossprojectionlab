'use client'

import { useState } from 'react'
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import type { HealthConditionQuestionnaire, HealthConditionQuestion } from '@/lib/health-condition-questions'

interface HealthConditionModalProps {
  questionnaire: HealthConditionQuestionnaire
  isOpen: boolean
  onClose: () => void
  onSave: (conditionKey: string, responses: Record<string, any>) => void
  existingResponses?: Record<string, any>
}

export default function HealthConditionModal({
  questionnaire,
  isOpen,
  onClose,
  onSave,
  existingResponses = {}
}: HealthConditionModalProps) {
  const [responses, setResponses] = useState<Record<string, any>>(existingResponses)
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const handleInputChange = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }))
    // Clear error when user starts typing
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[questionId]
        return newErrors
      })
    }
  }

  const handleMultiselectChange = (questionId: string, optionValue: string) => {
    const current = responses[questionId] || []
    const updated = current.includes(optionValue)
      ? current.filter((v: string) => v !== optionValue)
      : [...current, optionValue]
    setResponses(prev => ({ ...prev, [questionId]: updated }))
  }

  const validateResponses = (): boolean => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    questionnaire.questions.forEach(question => {
      if (question.required && !responses[question.id]) {
        newErrors[question.id] = 'This field is required'
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const handleSave = () => {
    if (validateResponses()) {
      onSave(questionnaire.conditionKey, responses)
      onClose()
    }
  }

  const renderQuestion = (question: HealthConditionQuestion) => {
    const hasError = !!errors[question.id]

    return (
      <div key={question.id} className="space-y-2">
        <div className="flex items-start justify-between">
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {question.question}
            {question.required && <span className="text-error ml-1">*</span>}
          </label>
          {question.tooltip && (
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(question.id)}
              onMouseLeave={() => setShowTooltip(null)}
              className="relative text-primary hover:text-primary-hover"
              aria-label="Why WLPL asks this"
            >
              <InformationCircleIcon className="w-4 h-4" />
              {showTooltip === question.id && (
                <div className="absolute z-50 right-0 top-6 w-64 bg-white dark:bg-gray-800 border-2 border-primary rounded-lg p-3 shadow-lg">
                  <p className="text-xs font-semibold text-primary mb-1">Why WLPL asks this:</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300">{question.tooltip}</p>
                </div>
              )}
            </button>
          )}
        </div>

        {question.type === 'select' && (
          <select
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`form-input w-full ${hasError ? 'border-error' : ''}`}
          >
            <option value="">Select an option...</option>
            {question.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {question.type === 'multiselect' && (
          <div className="grid grid-cols-1 gap-2">
            {question.options?.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleMultiselectChange(question.id, option.value)}
                className={`px-3 py-2 rounded-lg border-2 text-left text-sm transition-all ${
                  responses[question.id]?.includes(option.value)
                    ? 'border-primary bg-purple-100 dark:bg-purple-900/20 text-primary font-medium'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {question.type === 'text' && (
          <input
            type="text"
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className={`form-input w-full ${hasError ? 'border-error' : ''}`}
          />
        )}

        {question.type === 'number' && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={question.min}
              max={question.max}
              value={responses[question.id] || ''}
              onChange={(e) => handleInputChange(question.id, parseFloat(e.target.value))}
              placeholder={question.placeholder}
              className={`form-input flex-1 ${hasError ? 'border-error' : ''}`}
            />
            {question.unit && (
              <span className="text-sm text-gray-600 dark:text-gray-400">{question.unit}</span>
            )}
          </div>
        )}

        {question.type === 'date' && (
          <input
            type="date"
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`form-input w-full ${hasError ? 'border-error' : ''}`}
          />
        )}

        {hasError && (
          <p className="text-xs text-error">{errors[question.id]}</p>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-primary bg-purple-100 dark:bg-purple-900/20 px-2 py-1 rounded">
                Guided by WLPL
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {questionnaire.conditionName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {questionnaire.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body - Scrollable Questions */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* "You're Safe" message */}
          <div className="bg-purple-100 dark:bg-purple-900/20 border-2 border-primary rounded-lg p-4">
            <h4 className="font-bold text-primary-dark dark:text-primary-light mb-1">You're Safe</h4>
            <p className="text-sm text-primary-dark dark:text-primary-light">
              WLPL uses this information to protect you from unsafe meal suggestions. Your responses help create personalized dietary guidelines.
            </p>
          </div>

          {/* Questions */}
          {questionnaire.questions.map(renderQuestion)}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
          >
            Teach WLPL About My {questionnaire.conditionName.split(' ')[0]}
          </button>
        </div>
      </div>
    </div>
  )
}
