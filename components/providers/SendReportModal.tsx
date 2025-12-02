/**
 * Send Report Modal
 *
 * Modal component for composing and sending health reports via email to healthcare providers
 * Includes provider selection, report date selection, email templates, and attachment options
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { EMAIL_TEMPLATES } from '@/types/providers'
import type { HealthcareProvider } from '@/types/providers'
import toast from 'react-hot-toast'

interface SendReportModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  patientName: string
  preSelectedProviderId?: string
  preSelectedReportDate?: string
}

type EmailTemplate = 'health_summary' | 'records_request' | 'follow_up'

interface ReportDate {
  value: string // YYYY-MM-DD
  label: string
}

interface AttachmentOptions {
  healthSummary: boolean
  medicationList: boolean
  recentDocuments: boolean
  vitalsChart: boolean
}

const MANUAL_ENTRY_VALUE = '__manual__'

export function SendReportModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  preSelectedProviderId,
  preSelectedReportDate
}: SendReportModalProps) {
  const { user } = useAuth()

  // Form state
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    preSelectedProviderId || MANUAL_ENTRY_VALUE
  )
  const [manualEmail, setManualEmail] = useState('')
  const [selectedReportDate, setSelectedReportDate] = useState<string>(
    preSelectedReportDate || ''
  )
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('health_summary')
  const [customMessage, setCustomMessage] = useState('')
  const [attachments, setAttachments] = useState<AttachmentOptions>({
    healthSummary: true, // Always included for health summary template
    medicationList: false,
    recentDocuments: false,
    vitalsChart: false
  })

  // Data state
  const [providers, setProviders] = useState<HealthcareProvider[]>([])
  const [availableDates, setAvailableDates] = useState<ReportDate[]>([])
  const [documentCount, setDocumentCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)

  // Fetch providers and available report dates on mount
  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      setFetchingData(true)
      try {
        // Fetch providers
        const providersRes = await fetch(`/api/patients/${patientId}/providers`)
        if (providersRes.ok) {
          const providersData = await providersRes.json()
          setProviders(providersData.providers || [])
        }

        // Fetch available report dates
        const reportsRes = await fetch(`/api/patients/${patientId}/health-reports`)
        if (reportsRes.ok) {
          const reportsData = await reportsRes.json()
          const dates: ReportDate[] = reportsData.reports?.map((report: any) => ({
            value: report.reportDate,
            label: formatReportDateLabel(report.reportDate)
          })) || []

          // Add common date options if not already present
          const today = new Date().toISOString().split('T')[0]
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

          if (!dates.find(d => d.value === today)) {
            dates.unshift({ value: today, label: 'Today' })
          }
          if (!dates.find(d => d.value === yesterday)) {
            dates.splice(1, 0, { value: yesterday, label: 'Yesterday' })
          }

          setAvailableDates(dates)

          // Set default date
          if (!selectedReportDate && dates.length > 0) {
            setSelectedReportDate(dates[0].value)
          }

          // Get document count for recent documents
          setDocumentCount(reportsData.documentCount || 0)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load providers and reports')
      } finally {
        setFetchingData(false)
      }
    }

    fetchData()
  }, [isOpen, patientId, selectedReportDate])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProviderId(preSelectedProviderId || MANUAL_ENTRY_VALUE)
      setManualEmail('')
      setSelectedReportDate(preSelectedReportDate || '')
      setSelectedTemplate('health_summary')
      setCustomMessage('')
      setAttachments({
        healthSummary: true,
        medicationList: false,
        recentDocuments: false,
        vitalsChart: false
      })
    }
  }, [isOpen, preSelectedProviderId, preSelectedReportDate])

  // Auto-check health summary when template is health_summary
  useEffect(() => {
    if (selectedTemplate === 'health_summary') {
      setAttachments(prev => ({ ...prev, healthSummary: true }))
    }
  }, [selectedTemplate])

  if (!isOpen) return null

  const formatReportDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    const yesterday = new Date(Date.now() - 86400000)

    today.setHours(0, 0, 0, 0)
    yesterday.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)

    if (date.getTime() === today.getTime()) return 'Today'
    if (date.getTime() === yesterday.getTime()) return 'Yesterday'

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getRecipientEmail = (): string => {
    if (selectedProviderId === MANUAL_ENTRY_VALUE) {
      return manualEmail
    }
    const provider = providers.find(p => p.id === selectedProviderId)
    return provider?.email || ''
  }

  const getProviderInfo = () => {
    if (selectedProviderId === MANUAL_ENTRY_VALUE) {
      return { name: 'Provider', title: '' }
    }
    const provider = providers.find(p => p.id === selectedProviderId)
    return {
      name: provider?.name || 'Provider',
      title: provider?.title || ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const recipientEmail = getRecipientEmail()
    if (!recipientEmail) {
      toast.error('Please provide a recipient email address')
      return
    }

    if (!selectedReportDate) {
      toast.error('Please select a report date')
      return
    }

    // Validate attachments
    const selectedAttachments = Object.entries(attachments)
      .filter(([_, checked]) => checked)
      .map(([key]) => key)

    if (selectedAttachments.length === 0) {
      toast.error('Please select at least one attachment')
      return
    }

    setLoading(true)
    try {
      const providerInfo = getProviderInfo()
      const response = await fetch(`/api/patients/${patientId}/send-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientEmail,
          providerId: selectedProviderId === MANUAL_ENTRY_VALUE ? null : selectedProviderId,
          providerName: providerInfo.name,
          providerTitle: providerInfo.title,
          reportDate: selectedReportDate,
          template: selectedTemplate,
          customMessage,
          attachments: selectedAttachments,
          patientName,
          senderName: user?.displayName || user?.email?.split('@')[0] || 'User'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send report')
      }

      toast.success('Report sent successfully!')
      onClose()
    } catch (error: any) {
      console.error('Error sending report:', error)
      toast.error(error.message || 'Failed to send report')
    } finally {
      setLoading(false)
    }
  }

  const toggleAttachment = (key: keyof AttachmentOptions) => {
    // Prevent unchecking health summary if template is health_summary
    if (key === 'healthSummary' && selectedTemplate === 'health_summary' && attachments.healthSummary) {
      return
    }

    setAttachments(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              Send Health Report
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {fetchingData ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Name Display */}
              <div className="px-4 py-3 bg-primary-light border-2 border-primary-light rounded-lg">
                <span className="text-sm text-muted-foreground">Sending report for:</span>
                <span className="text-primary-dark font-medium ml-2">
                  {patientName}
                </span>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Provider *
                </label>
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                  required
                >
                  <option value={MANUAL_ENTRY_VALUE}>Enter email manually</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.title ? `${provider.title} ` : ''}{provider.name}
                      {provider.specialty ? ` - ${provider.specialty}` : ''}
                      {provider.email ? ` (${provider.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Manual Email Entry */}
              {selectedProviderId === MANUAL_ENTRY_VALUE && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                    placeholder="provider@example.com"
                  />
                </div>
              )}

              {/* Auto-filled Email Display */}
              {selectedProviderId !== MANUAL_ENTRY_VALUE && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <div className="w-full px-4 py-2 border-2 border-border rounded-lg bg-muted text-muted-foreground">
                    {getRecipientEmail() || 'No email on file'}
                  </div>
                  {!getRecipientEmail() && (
                    <p className="text-xs text-warning-dark mt-1">
                      This provider has no email address. Please select "Enter email manually" instead.
                    </p>
                  )}
                </div>
              )}

              {/* Report Date Selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Report Date *
                </label>
                <select
                  value={selectedReportDate}
                  onChange={(e) => setSelectedReportDate(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                  required
                >
                  {availableDates.length === 0 && (
                    <option value="">No reports available</option>
                  )}
                  {availableDates.map(date => (
                    <option key={date.value} value={date.value}>
                      {date.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email Template Selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Template *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('health_summary')}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedTemplate === 'health_summary'
                        ? 'border-primary bg-primary-light text-primary-dark'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <div className="font-medium">{EMAIL_TEMPLATES.HEALTH_SUMMARY.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Comprehensive health summary with vitals and tracking
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('records_request')}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedTemplate === 'records_request'
                        ? 'border-primary bg-primary-light text-primary-dark'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <div className="font-medium">{EMAIL_TEMPLATES.RECORDS_REQUEST.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Request medical records from provider
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('follow_up')}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedTemplate === 'follow_up'
                        ? 'border-primary bg-primary-light text-primary-dark'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <div className="font-medium">{EMAIL_TEMPLATES.FOLLOW_UP.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Follow-up communication with provider
                    </div>
                  </button>
                </div>
              </div>

              {/* Attachment Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Attachments *
                </label>
                <div className="space-y-2 border-2 border-border rounded-lg p-3">
                  <label className="flex items-center gap-3 p-2 hover:bg-background rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachments.healthSummary}
                      onChange={() => toggleAttachment('healthSummary')}
                      disabled={selectedTemplate === 'health_summary'}
                      className="w-4 h-4 text-primary rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-foreground">
                      Health Summary Report
                      {selectedTemplate === 'health_summary' && (
                        <span className="text-xs text-muted-foreground ml-2">(Required for Health Summary template)</span>
                      )}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-background rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachments.medicationList}
                      onChange={() => toggleAttachment('medicationList')}
                      className="w-4 h-4 text-primary rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-foreground">Current Medication List</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-background rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachments.recentDocuments}
                      onChange={() => toggleAttachment('recentDocuments')}
                      className="w-4 h-4 text-primary rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-foreground">
                      Recent Documents
                      {documentCount > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">({documentCount} available)</span>
                      )}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-background rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachments.vitalsChart}
                      onChange={() => toggleAttachment('vitalsChart')}
                      className="w-4 h-4 text-primary rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-foreground">Vitals Chart (Last 30 days)</span>
                  </label>
                </div>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Custom Message (Optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                  placeholder="Add a personal note or additional context for the provider..."
                />
              </div>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading || !getRecipientEmail() || !selectedReportDate}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Sending...' : 'Send Report'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
