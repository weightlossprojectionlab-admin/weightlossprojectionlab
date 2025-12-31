/**
 * SymptomLogger Component
 * Log and track pet symptoms for veterinary diagnosis
 */

'use client'

import { useState } from 'react'
import { useSymptomLogs } from '@/hooks/useSymptomLogs'
import { useAuth } from '@/hooks/useAuth'
import { PatientProfile } from '@/types/medical'
import { SymptomLog, SPECIES_SYMPTOMS, EMERGENCY_SYMPTOMS } from '@/types/pet-symptoms'
import { format, parseISO } from 'date-fns'
import { logger } from '@/lib/logger'

interface SymptomLoggerProps {
  patient: PatientProfile
}

export function SymptomLogger({ patient }: SymptomLoggerProps) {
  const { user } = useAuth()
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'mild' | 'moderate' | 'severe'>('all')
  const [showResolved, setShowResolved] = useState(false)

  const {
    symptomLogs,
    loading,
    getSymptomSummary,
    getSymptomPatterns,
    getUnresolvedSymptoms,
    getSevereSymptoms,
    resolveSymptom
  } = useSymptomLogs({
    userId: user?.uid || '',
    petId: patient.id,
    petSpecies: patient.species,
    autoFetch: true,
    realtime: true
  })

  const summary = getSymptomSummary()
  const patterns = getSymptomPatterns()
  const unresolvedSymptoms = getUnresolvedSymptoms()
  const severeSymptoms = getSevereSymptoms()

  // Get species-specific symptoms
  const speciesSymptoms = SPECIES_SYMPTOMS[patient.species || 'Other'] || SPECIES_SYMPTOMS.Other
  const emergencySymptoms = EMERGENCY_SYMPTOMS[patient.species || 'Other'] || []

  // Filter logs
  const filteredLogs = symptomLogs.filter(log => {
    if (!showResolved && log.resolved) return false
    if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false
    return true
  })

  // Helper: Get severity color
  const getSeverityColor = (severity: 'mild' | 'moderate' | 'severe'): string => {
    switch (severity) {
      case 'mild':
        return 'text-success'
      case 'moderate':
        return 'text-warning'
      case 'severe':
        return 'text-error'
      default:
        return 'text-muted-foreground'
    }
  }

  // Helper: Get severity emoji
  const getSeverityEmoji = (severity: 'mild' | 'moderate' | 'severe'): string => {
    switch (severity) {
      case 'mild':
        return '🟢'
      case 'moderate':
        return '🟡'
      case 'severe':
        return '🔴'
      default:
        return '⚪'
    }
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🩺</span>
          <h3 className="text-lg font-semibold text-foreground">Symptom Tracker</h3>
        </div>
        <p className="text-sm text-muted-foreground">Loading symptoms...</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🩺</span>
            <h3 className="text-lg font-semibold text-foreground">Symptom Tracker</h3>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Log Symptom
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Last 7 Days</p>
            <p className="text-2xl font-bold text-foreground">{summary.symptomsLast7Days}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Unresolved</p>
            <p className="text-2xl font-bold text-warning">{summary.unresolvedSymptoms}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Severe</p>
            <p className="text-2xl font-bold text-error">{summary.urgentSymptoms}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Logged</p>
            <p className="text-2xl font-bold text-foreground">{summary.totalSymptoms}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex gap-2">
            {(['all', 'mild', 'moderate', 'severe'] as const).map(severity => (
              <button
                key={severity}
                onClick={() => setFilterSeverity(severity)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterSeverity === severity
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {severity === 'all' ? 'All' : severity.charAt(0).toUpperCase() + severity.slice(1)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
            />
            Show Resolved
          </label>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {/* Severe Symptoms Alert */}
        {severeSymptoms.length > 0 && (
          <div className="mb-4 p-4 bg-error/10 border-2 border-error/30 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔴</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-error">Severe Symptoms Logged</p>
                <ul className="mt-2 space-y-1">
                  {severeSymptoms.map(symptom => (
                    <li key={symptom.id} className="text-xs text-error/80">
                      • {symptom.symptomName} - {format(parseISO(symptom.occurredAt), 'MMM d, h:mm a')}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-error/80 mt-2">
                  ⚠️ Consider contacting your veterinarian if symptoms persist or worsen.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Symptom Patterns */}
        {patterns.length > 0 && (
          <div className="mb-4 p-4 bg-warning/10 border-2 border-warning/30 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-warning">Recurring Patterns Detected</p>
                <ul className="mt-2 space-y-1">
                  {patterns.slice(0, 3).map(pattern => (
                    <li key={pattern.symptomType} className="text-xs text-warning/80">
                      • {pattern.symptomType} - {pattern.occurrenceCount} times
                      {pattern.escalating && ' (severity increasing ⚠️)'}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-warning/80 mt-2">
                  Recurring symptoms may indicate an underlying condition. Discuss with your vet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Symptom Logs */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-3 block">🩺</span>
            <p className="text-sm text-muted-foreground mb-4">
              {symptomLogs.length === 0
                ? 'No symptoms logged yet'
                : 'No symptoms match your filters'}
            </p>
            {symptomLogs.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Log First Symptom
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map(symptom => {
              const isEmergency = emergencySymptoms.includes(symptom.symptomType)

              return (
                <div
                  key={symptom.id}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    symptom.resolved
                      ? 'border-border bg-muted/20 opacity-70'
                      : symptom.severity === 'severe'
                      ? 'border-error/30 bg-error/5'
                      : symptom.severity === 'moderate'
                      ? 'border-warning/30 bg-warning/5'
                      : 'border-success/30 bg-success/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getSeverityEmoji(symptom.severity)}</span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{symptom.symptomName}</h4>
                            {isEmergency && (
                              <span className="text-xs bg-error text-error-foreground px-2 py-0.5 rounded-full font-medium">
                                EMERGENCY
                              </span>
                            )}
                            {symptom.resolved && (
                              <span className="text-xs bg-success text-success-foreground px-2 py-0.5 rounded-full font-medium">
                                Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(symptom.occurredAt), 'MMM d, yyyy • h:mm a')}
                          </p>
                          {symptom.duration && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Duration: {symptom.duration} minutes
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${getSeverityColor(symptom.severity)}`}>
                            {symptom.severity}
                          </span>
                        </div>
                      </div>

                      {/* Notes */}
                      {symptom.notes && (
                        <p className="text-sm text-foreground mt-2 p-2 bg-muted/30 rounded">
                          {symptom.notes}
                        </p>
                      )}

                      {/* Context */}
                      {(symptom.beforeActivity || symptom.triggerSuspected) && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {symptom.beforeActivity && <p>Before: {symptom.beforeActivity}</p>}
                          {symptom.triggerSuspected && <p>Trigger: {symptom.triggerSuspected}</p>}
                        </div>
                      )}

                      {/* Treatment */}
                      {symptom.treatmentGiven && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Treatment: {symptom.treatmentGiven}
                        </p>
                      )}

                      {/* Actions */}
                      {!symptom.resolved && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => resolveSymptom(symptom.id, 'Symptom resolved naturally')}
                            className="px-3 py-1.5 bg-success text-success-foreground rounded text-xs font-medium hover:bg-success/90"
                          >
                            Mark Resolved
                          </button>
                          {symptom.severity === 'severe' && !symptom.vetVisitScheduled && (
                            <button
                              className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90"
                            >
                              Schedule Vet
                            </button>
                          )}
                        </div>
                      )}

                      {/* Resolution */}
                      {symptom.resolved && symptom.resolvedAt && (
                        <p className="text-xs text-success mt-2">
                          ✅ Resolved {format(parseISO(symptom.resolvedAt), 'MMM d, h:mm a')}
                          {symptom.resolutionNotes && ` - ${symptom.resolutionNotes}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Most Common Symptom */}
        {summary.mostCommonSymptom && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Most common symptom: <span className="font-semibold text-foreground">{summary.mostCommonSymptom.name}</span> ({summary.mostCommonSymptom.count} times)
            </p>
          </div>
        )}
      </div>

      {/* Add Modal Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-6 py-4">
              <h2 className="text-xl font-semibold text-foreground">Log Symptom</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Common symptoms for {patient.species}s:
              </p>
              <div className="space-y-2">
                {speciesSymptoms.map(symptom => (
                  <button
                    key={symptom.type}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-center justify-between ${
                      symptom.urgent
                        ? 'border-error bg-error/5 hover:border-error/70'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <span className="font-medium text-foreground">{symptom.name}</span>
                    {symptom.urgent && (
                      <span className="text-xs bg-error text-error-foreground px-2 py-0.5 rounded-full">
                        URGENT
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full px-4 py-2 border-2 border-border rounded-lg font-medium hover:bg-muted/50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
