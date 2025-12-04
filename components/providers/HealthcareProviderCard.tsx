/**
 * Healthcare Provider Card Component
 *
 * Displays a list of healthcare providers for a patient with communication capabilities
 * Includes provider details, contact information, communication history, and actions
 */

'use client'

import { useState, useEffect } from 'react'
import { HealthcareProvider, ProviderCommunication } from '@/types/providers'
import { providerOperations, communicationOperations } from '@/lib/provider-operations'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import ConfirmModal from '@/components/ui/ConfirmModal'
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  PrinterIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  FolderIcon
} from '@heroicons/react/24/outline'

interface HealthcareProviderCardProps {
  patientId: string
  patientName: string
  onSendReport?: (providerId: string) => void
}

export function HealthcareProviderCard({
  patientId,
  patientName,
  onSendReport
}: HealthcareProviderCardProps) {
  const [providers, setProviders] = useState<HealthcareProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingProviderId, setDeletingProviderId] = useState<string | null>(null)
  const [providerToDelete, setProviderToDelete] = useState<HealthcareProvider | null>(null)
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null)
  const [communications, setCommunications] = useState<Record<string, ProviderCommunication[]>>({})
  const [loadingCommunications, setLoadingCommunications] = useState<string | null>(null)
  const [sendingAction, setSendingAction] = useState<string | null>(null)

  // Fetch providers
  const fetchProviders = async () => {
    if (!patientId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const fetchedProviders = await providerOperations.getProviders(patientId)
      setProviders(fetchedProviders)
      logger.debug('[HealthcareProviderCard] Providers loaded', { count: fetchedProviders.length })
    } catch (error) {
      logger.error('[HealthcareProviderCard] Error fetching providers', error as Error)
      toast.error('Failed to load healthcare providers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [patientId])

  // Fetch communications for a provider
  const fetchCommunications = async (providerId: string) => {
    if (communications[providerId]) {
      // Already loaded
      return
    }

    try {
      setLoadingCommunications(providerId)
      const providerComms = await communicationOperations.getProviderCommunications(providerId)
      setCommunications(prev => ({
        ...prev,
        [providerId]: providerComms
      }))
    } catch (error) {
      logger.error('[HealthcareProviderCard] Error fetching communications', error as Error)
      toast.error('Failed to load communication history')
    } finally {
      setLoadingCommunications(null)
    }
  }

  // Toggle expanded provider
  const handleToggleExpanded = async (providerId: string) => {
    if (expandedProviderId === providerId) {
      setExpandedProviderId(null)
    } else {
      setExpandedProviderId(providerId)
      await fetchCommunications(providerId)
    }
  }

  // Handle delete
  const handleDeleteClick = (provider: HealthcareProvider) => {
    setProviderToDelete(provider)
  }

  const handleConfirmDelete = async () => {
    if (!providerToDelete) return

    try {
      setDeletingProviderId(providerToDelete.id)
      await providerOperations.deleteProvider(providerToDelete.id)
      toast.success('Provider removed')
      await fetchProviders()
    } catch (error: any) {
      logger.error('[HealthcareProviderCard] Error deleting provider', error)
      toast.error('Failed to remove provider')
    } finally {
      setDeletingProviderId(null)
      setProviderToDelete(null)
    }
  }

  // Handle phone call
  const handleCall = async (provider: HealthcareProvider) => {
    if (!provider.phone) {
      toast.error('No phone number available')
      return
    }

    try {
      // Log the communication
      await communicationOperations.logCommunication({
        patientId,
        providerId: provider.id,
        providerName: provider.name,
        type: 'call',
        sentBy: 'current-user', // TODO: Get from auth context
        sentAt: new Date(),
        status: 'completed'
      })

      // Open phone dialer
      window.location.href = `tel:${provider.phone}`

      toast.success('Call logged')

      // Refresh communications if expanded
      if (expandedProviderId === provider.id) {
        await fetchCommunications(provider.id)
      }

      // Refresh provider list to update last contact
      await fetchProviders()
    } catch (error) {
      logger.error('[HealthcareProviderCard] Error logging call', error as Error)
      toast.error('Failed to log call')
    }
  }

  // Handle email
  const handleEmail = (provider: HealthcareProvider) => {
    if (!provider.email) {
      toast.error('No email address available')
      return
    }

    if (onSendReport) {
      onSendReport(provider.id)
    } else {
      // Fallback to mailto
      window.location.href = `mailto:${provider.email}?subject=Health Update for ${patientName}`
    }
  }

  // Handle quick actions
  const handleQuickAction = async (
    provider: HealthcareProvider,
    actionType: 'health_summary' | 'records'
  ) => {
    if (!provider.email) {
      toast.error('No email address available for this provider')
      return
    }

    try {
      setSendingAction(`${provider.id}-${actionType}`)

      // Log the communication
      await communicationOperations.logCommunication({
        patientId,
        providerId: provider.id,
        providerName: provider.name,
        type: 'email',
        sentBy: 'current-user', // TODO: Get from auth context
        sentAt: new Date(),
        subject: actionType === 'health_summary'
          ? `Health Summary for ${patientName}`
          : `Medical Records Request for ${patientName}`,
        status: 'sent',
        attachments: [{
          type: actionType === 'health_summary' ? 'health_report' : 'document',
          name: actionType === 'health_summary' ? 'Health Summary' : 'Medical Records'
        }]
      })

      toast.success(
        actionType === 'health_summary'
          ? 'Health summary request queued'
          : 'Records request sent'
      )

      // Refresh communications if expanded
      if (expandedProviderId === provider.id) {
        await fetchCommunications(provider.id)
      }

      // Refresh provider list
      await fetchProviders()
    } catch (error) {
      logger.error('[HealthcareProviderCard] Error sending quick action', error as Error)
      toast.error('Failed to send request')
    } finally {
      setSendingAction(null)
    }
  }

  // Format date
  const formatDate = (date: Date | any): string => {
    if (!date) return 'Never'

    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date)
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  // Format time
  const formatTime = (date: Date | any): string => {
    if (!date) return ''

    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date)
      return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })
    } catch {
      return ''
    }
  }

  // Get contact type icon
  const getContactTypeIcon = (type: 'email' | 'call' | 'fax') => {
    switch (type) {
      case 'email':
        return <EnvelopeIcon className="w-3 h-3" />
      case 'call':
        return <PhoneIcon className="w-3 h-3" />
      case 'fax':
        return <PrinterIcon className="w-3 h-3" />
    }
  }

  // Get status color
  const getStatusColor = (status: ProviderCommunication['status']) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'text-green-600 dark:text-green-400'
      case 'completed':
        return 'text-blue-600 dark:text-blue-400'
      case 'failed':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-muted-foreground'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Provider Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Healthcare Providers</h2>
        <button
          onClick={() => toast('Add Provider modal coming soon')}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
        >
          Add Provider
        </button>
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No healthcare providers added yet</p>
          <p className="text-sm mt-2">Add providers to track communications and share health information</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => {
            const isExpanded = expandedProviderId === provider.id
            const providerComms = communications[provider.id] || []
            const isLoadingComms = loadingCommunications === provider.id

            return (
              <div
                key={provider.id}
                className="bg-background rounded-lg p-4 border-2 border-border hover:border-primary/30 transition-colors"
              >
                {/* Provider Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <UserIcon className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">
                        {provider.title && `${provider.title} `}
                        {provider.name}
                      </h3>
                    </div>
                    <p className="text-sm text-primary font-medium">{provider.specialty}</p>
                    {provider.facility && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <BuildingOfficeIcon className="w-4 h-4" />
                        <span>{provider.facility}</span>
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteClick(provider)}
                    disabled={deletingProviderId === provider.id}
                    className="text-error hover:text-error-dark text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingProviderId === provider.id ? (
                      'Deleting...'
                    ) : (
                      <TrashIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Contact Information */}
                <div className="space-y-2 mb-3">
                  {provider.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <EnvelopeIcon className="w-4 h-4" />
                      <a
                        href={`mailto:${provider.email}`}
                        className="text-primary hover:underline"
                      >
                        {provider.email}
                      </a>
                    </div>
                  )}
                  {provider.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <PhoneIcon className="w-4 h-4" />
                      <a
                        href={`tel:${provider.phone}`}
                        className="text-primary hover:underline"
                      >
                        {provider.phone}
                      </a>
                    </div>
                  )}
                  {provider.fax && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <PrinterIcon className="w-4 h-4" />
                      <span>{provider.fax}</span>
                    </div>
                  )}
                </div>

                {/* Last Contact */}
                {provider.lastContactDate && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 p-2 bg-muted/50 rounded">
                    <ClockIcon className="w-4 h-4" />
                    <span>
                      Last contact: {formatDate(provider.lastContactDate)} via{' '}
                      <span className="font-medium capitalize">{provider.lastContactType}</span>
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Edit Button */}
                  <button
                    onClick={() => toast('Edit Provider modal coming soon')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>

                  {/* Email Button */}
                  {provider.email && (
                    <button
                      onClick={() => handleEmail(provider)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg transition-colors"
                    >
                      <EnvelopeIcon className="w-4 h-4" />
                      Email
                    </button>
                  )}

                  {/* Call Button */}
                  {provider.phone && (
                    <button
                      onClick={() => handleCall(provider)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg transition-colors"
                    >
                      <PhoneIcon className="w-4 h-4" />
                      Call
                    </button>
                  )}

                  {/* Quick Action: Send Health Summary */}
                  {provider.email && (
                    <button
                      onClick={() => handleQuickAction(provider, 'health_summary')}
                      disabled={sendingAction === `${provider.id}-health_summary`}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                      {sendingAction === `${provider.id}-health_summary` ? 'Sending...' : 'Send Health Summary'}
                    </button>
                  )}

                  {/* Quick Action: Send Records */}
                  {provider.email && (
                    <button
                      onClick={() => handleQuickAction(provider, 'records')}
                      disabled={sendingAction === `${provider.id}-records`}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FolderIcon className="w-4 h-4" />
                      {sendingAction === `${provider.id}-records` ? 'Sending...' : 'Send Records'}
                    </button>
                  )}
                </div>

                {/* Communication History Toggle */}
                <button
                  onClick={() => handleToggleExpanded(provider.id)}
                  className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors pt-3 border-t border-border"
                >
                  <span className="font-medium">Communication History</span>
                  {isExpanded ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </button>

                {/* Communication History (Collapsible) */}
                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    {isLoadingComms ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : providerComms.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No communication history yet
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {providerComms.map((comm) => (
                          <div
                            key={comm.id}
                            className="bg-muted/50 rounded p-3 text-sm"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {getContactTypeIcon(comm.type)}
                                </span>
                                <span className="font-medium capitalize text-foreground">
                                  {comm.type}
                                </span>
                                <span className={`text-xs ${getStatusColor(comm.status)}`}>
                                  {comm.status}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(comm.sentAt)}
                              </span>
                            </div>

                            {comm.subject && (
                              <p className="text-foreground font-medium mb-1">
                                {comm.subject}
                              </p>
                            )}

                            {comm.message && (
                              <p className="text-muted-foreground text-xs line-clamp-2">
                                {comm.message}
                              </p>
                            )}

                            {comm.callNotes && (
                              <p className="text-muted-foreground text-xs">
                                Notes: {comm.callNotes}
                              </p>
                            )}

                            {comm.attachments && comm.attachments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {comm.attachments.map((attachment, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-background rounded text-xs"
                                  >
                                    {attachment.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {comm.sentByName && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Sent by {comm.sentByName} at {formatTime(comm.sentAt)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {provider.notes && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground italic">
                      Notes: {provider.notes}
                    </p>
                  </div>
                )}

                {/* Added Date */}
                <p className="text-xs text-muted-foreground mt-3">
                  Added {formatDate(provider.addedAt)}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!providerToDelete}
        onClose={() => setProviderToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Healthcare Provider"
        message={`Are you sure you want to remove ${providerToDelete?.name} from the provider list?\n\nThis will not delete communication history, but the provider will no longer appear in the list.`}
        confirmText="Remove Provider"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
