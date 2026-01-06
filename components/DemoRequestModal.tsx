/**
 * Demo Request Modal Component
 *
 * Reusable modal for capturing demo requests from marketing pages
 * Mobile-responsive with multi-step wizard
 */

'use client'

import { useState } from 'react'
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { NameInput } from '@/components/form/NameInput'
import type { CreateDemoRequestInput, CompanySize, PreferredTime, Urgency } from '@/types/demo-requests'

interface DemoRequestModalProps {
  isOpen: boolean
  onClose: () => void
  source: string // e.g., "blog/patients", "blog/dashboard"
}

export function DemoRequestModal({ isOpen, onClose, source }: DemoRequestModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CreateDemoRequestInput>({
    name: '',
    email: '',
    phone: '',
    company: '',
    companySize: undefined,
    role: '',
    preferredDate: '',
    preferredTime: undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    useCase: '',
    currentSolution: '',
    urgency: 'medium',
    source,
    utmParams: {
      utm_source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
      utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
      utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
    }
  })

  const handleInputChange = (field: keyof CreateDemoRequestInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields')
      return
    }

    // Email validation
    const emailRegex = /^[\w\-.]+@[\w\-.]+\.[a-z]{2,}$/i
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit demo request')
      }

      setSubmitted(true)
      toast.success('Demo request submitted successfully!')
    } catch (error) {
      console.error('Error submitting demo request:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit demo request')
    } finally {
      setLoading(false)
    }
  }

  const resetAndClose = () => {
    setStep(1)
    setSubmitted(false)
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      companySize: undefined,
      role: '',
      preferredDate: '',
      preferredTime: undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      useCase: '',
      currentSolution: '',
      urgency: 'medium',
      source,
      utmParams: {}
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-border">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Schedule a Demo</h2>
            <p className="text-sm text-muted-foreground mt-1">
              See WLPL in action - personalized for your needs
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Request Received!</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Thank you for your interest in WLPL. We'll review your request and contact you within 24 hours to schedule your personalized demo.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Check your email ({formData.email}) for confirmation details.
            </p>
            <button
              onClick={resetAndClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Progress Indicator */}
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Step {step} of 3</span>
                <span className="text-xs text-muted-foreground">{Math.round((step / 3) * 100)}% Complete</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6">
              {/* Step 1: Contact Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>

                  <NameInput
                    value={formData.name}
                    onChange={(name) => handleInputChange('name', name)}
                    label="Full Name"
                    placeholder="John Doe"
                    required
                    className=""
                  />

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Company/Organization
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      placeholder="Acme Healthcare"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Company Size
                    </label>
                    <select
                      value={formData.companySize || ''}
                      onChange={(e) => handleInputChange('companySize', e.target.value as CompanySize)}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    >
                      <option value="">Select size</option>
                      <option value="solo">Just me</option>
                      <option value="2-10">2-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-1000">201-1000 employees</option>
                      <option value="1000+">1000+ employees</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Your Role
                    </label>
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      placeholder="e.g., Family Caregiver, Healthcare Provider"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Demo Preferences */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Demo Preferences</h3>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={formData.preferredDate}
                      onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Preferred Time
                    </label>
                    <select
                      value={formData.preferredTime || ''}
                      onChange={(e) => handleInputChange('preferredTime', e.target.value as PreferredTime)}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    >
                      <option value="">Select time</option>
                      <option value="morning">Morning (9 AM - 12 PM)</option>
                      <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                      <option value="evening">Evening (5 PM - 8 PM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Timezone
                    </label>
                    <input
                      type="text"
                      value={formData.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      placeholder="Auto-detected"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      What brings you to WLPL?
                    </label>
                    <textarea
                      value={formData.useCase}
                      onChange={(e) => handleInputChange('useCase', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      placeholder="e.g., Managing health for elderly parents, tracking family nutrition, etc."
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Additional Context */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Additional Context</h3>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      What are you using today?
                    </label>
                    <input
                      type="text"
                      value={formData.currentSolution}
                      onChange={(e) => handleInputChange('currentSolution', e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                      placeholder="e.g., MyFitnessPal, Excel spreadsheets, nothing yet"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      How urgent is your need?
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['low', 'medium', 'high'] as Urgency[]).map((urgencyLevel) => (
                        <button
                          key={urgencyLevel}
                          type="button"
                          onClick={() => handleInputChange('urgency', urgencyLevel)}
                          className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                            formData.urgency === urgencyLevel
                              ? 'bg-blue-600 text-white'
                              : 'bg-secondary text-foreground hover:bg-secondary-dark'
                          }`}
                        >
                          {urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      By submitting this form, you agree to our Privacy Policy and consent to be contacted about WLPL services.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                {step > 1 ? (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="px-6 py-3 text-foreground hover:bg-secondary rounded-lg transition-colors font-medium"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    onClick={resetAndClose}
                    className="px-6 py-3 text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    Cancel
                  </button>
                )}

                {step < 3 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 && (!formData.name || !formData.email)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !formData.name || !formData.email}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
