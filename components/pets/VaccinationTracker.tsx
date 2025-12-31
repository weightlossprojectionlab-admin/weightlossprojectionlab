/**
 * VaccinationTracker Component
 * Shows vaccination records and upcoming due dates for pet dashboard
 */

'use client'

import { useState, useEffect } from 'react'
import { useVaccinations } from '@/hooks/useVaccinations'
import { useParasitePrevention } from '@/hooks/useParasitePrevention'
import { useAuth } from '@/hooks/useAuth'
import { PatientProfile } from '@/types/medical'
import { VaccinationRecord, ParasitePreventionRecord, SPECIES_VACCINES } from '@/types/pet-vaccinations'
import { format, parseISO, differenceInDays } from 'date-fns'
import { logger } from '@/lib/logger'
import { VaccinationForm } from './VaccinationForm'
import { ParasitePreventionForm } from './ParasitePreventionForm'
import toast from 'react-hot-toast'

interface VaccinationTrackerProps {
  patient: PatientProfile
}

export function VaccinationTracker({ patient }: VaccinationTrackerProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'vaccinations' | 'prevention'>('vaccinations')
  const [showAddModal, setShowAddModal] = useState(false)

  const {
    vaccinations,
    loading: vaccinationsLoading,
    createVaccination,
    getVaccinationStatus,
    getOverdueVaccinations,
    getDueSoonVaccinations
  } = useVaccinations({
    userId: user?.uid || '',
    petId: patient.id,
    autoFetch: true,
    realtime: true
  })

  const {
    preventionRecords,
    loading: preventionLoading,
    createPreventionRecord,
    getPreventionStatus,
    getOverduePrevention,
    getDueSoonPrevention
  } = useParasitePrevention({
    userId: user?.uid || '',
    petId: patient.id,
    autoFetch: true,
    realtime: true
  })

  const vaccinationStatus = getVaccinationStatus()
  const preventionStatus = getPreventionStatus()
  const overdueVaccinations = getOverdueVaccinations()
  const dueSoonVaccinations = getDueSoonVaccinations()
  const overduePrevention = getOverduePrevention()
  const dueSoonPrevention = getDueSoonPrevention()

  // Get species-specific vaccine recommendations
  const speciesVaccines = SPECIES_VACCINES[patient.species || 'Other'] || SPECIES_VACCINES.Other

  // Helper: Get status emoji
  const getStatusEmoji = (status: VaccinationRecord['status']): string => {
    switch (status) {
      case 'current':
        return '✅'
      case 'due-soon':
        return '🟡'
      case 'overdue':
        return '🔴'
      case 'expired':
        return '⚠️'
      default:
        return '⏳'
    }
  }

  // Helper: Get prevention status emoji
  const getPreventionStatusEmoji = (status: ParasitePreventionRecord['status']): string => {
    switch (status) {
      case 'given':
        return '✅'
      case 'due-soon':
        return '🟡'
      case 'overdue':
        return '🔴'
      case 'skipped':
        return '⏭️'
      default:
        return '⏳'
    }
  }

  // Helper: Get days until due
  const getDaysUntilDue = (dueDate: string): number => {
    return differenceInDays(parseISO(dueDate), new Date())
  }

  if (vaccinationsLoading && preventionLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">💉</span>
          <h3 className="text-lg font-semibold text-foreground">Vaccinations & Prevention</h3>
        </div>
        <p className="text-sm text-muted-foreground">Loading records...</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💉</span>
            <h3 className="text-lg font-semibold text-foreground">Vaccinations & Prevention</h3>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Add Record
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('vaccinations')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'vaccinations'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            Vaccinations
            {vaccinationStatus.overdue > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-error text-error-foreground rounded-full text-xs">
                {vaccinationStatus.overdue}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('prevention')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'prevention'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            Parasite Prevention
            {preventionStatus.overdueCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-error text-error-foreground rounded-full text-xs">
                {preventionStatus.overdueCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {activeTab === 'vaccinations' ? (
          <>
            {/* Overdue Alerts */}
            {overdueVaccinations.length > 0 && (
              <div className="mb-4 p-4 bg-error/10 border-2 border-error/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔴</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-error">Overdue Vaccinations</p>
                    <ul className="mt-2 space-y-1">
                      {overdueVaccinations.map(vaccine => (
                        <li key={vaccine.id} className="text-xs text-error/80">
                          • {vaccine.vaccineName} - {Math.abs(getDaysUntilDue(vaccine.nextDueDate || vaccine.expirationDate))} days overdue
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Due Soon Alerts */}
            {dueSoonVaccinations.length > 0 && (
              <div className="mb-4 p-4 bg-warning/10 border-2 border-warning/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🟡</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-warning">Due Soon</p>
                    <ul className="mt-2 space-y-1">
                      {dueSoonVaccinations.map(vaccine => (
                        <li key={vaccine.id} className="text-xs text-warning/80">
                          • {vaccine.vaccineName} - Due in {getDaysUntilDue(vaccine.nextDueDate || vaccine.expirationDate)} days
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Vaccination Records */}
            {vaccinations.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block">💉</span>
                <p className="text-sm text-muted-foreground mb-4">No vaccination records yet</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Add First Vaccination
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {vaccinations.map(vaccine => (
                  <div
                    key={vaccine.id}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      vaccine.status === 'current'
                        ? 'border-success/30 bg-success/5'
                        : vaccine.status === 'due-soon'
                        ? 'border-warning/30 bg-warning/5'
                        : vaccine.status === 'overdue'
                        ? 'border-error/30 bg-error/5'
                        : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getStatusEmoji(vaccine.status)}</span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-foreground">{vaccine.vaccineName}</h4>
                            <p className="text-sm text-muted-foreground">
                              Administered: {format(parseISO(vaccine.administeredDate), 'MMM d, yyyy')}
                            </p>
                            {vaccine.administeredBy && (
                              <p className="text-xs text-muted-foreground mt-1">
                                By: {vaccine.administeredBy}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {vaccine.nextDueDate && (
                              <p className="text-sm font-medium text-foreground">
                                Next Due: {format(parseISO(vaccine.nextDueDate), 'MMM d, yyyy')}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires: {format(parseISO(vaccine.expirationDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        {vaccine.hadReaction && (
                          <div className="mt-2 p-2 bg-warning/10 rounded">
                            <p className="text-xs text-warning font-medium">
                              ⚠️ Had reaction ({vaccine.reactionType})
                            </p>
                            {vaccine.reactionNotes && (
                              <p className="text-xs text-muted-foreground mt-1">{vaccine.reactionNotes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommended Vaccines */}
            {vaccinations.length < speciesVaccines.length && (
              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Recommended Vaccines for {patient.species}s
                </h4>
                <div className="space-y-2">
                  {speciesVaccines.map(vaccine => {
                    const hasVaccine = vaccinations.some(v => v.vaccineType === vaccine.name)
                    if (hasVaccine) return null

                    return (
                      <div key={vaccine.name} className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{vaccine.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {vaccine.required ? '✅ Required' : '⚪ Optional'} • Every {vaccine.frequencyYears} year{vaccine.frequencyYears > 1 ? 's' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90"
                        >
                          Add
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Parasite Prevention Tab */}
            {/* Overdue Prevention */}
            {overduePrevention.length > 0 && (
              <div className="mb-4 p-4 bg-error/10 border-2 border-error/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔴</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-error">Overdue Prevention</p>
                    <ul className="mt-2 space-y-1">
                      {overduePrevention.map(prevention => (
                        <li key={prevention.id} className="text-xs text-error/80">
                          • {prevention.productName} - {Math.abs(getDaysUntilDue(prevention.nextDueDate))} days overdue
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Status */}
            <div className="mb-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">This Month</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {preventionStatus.givenThisMonth ? '✅ Prevention given' : '⏳ Prevention not given yet'}
                  </p>
                </div>
                {preventionStatus.nextDueDate && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">Next Due</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(preventionStatus.nextDueDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Prevention Records */}
            {preventionRecords.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-3 block">🐛</span>
                <p className="text-sm text-muted-foreground mb-4">No prevention records yet</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Log First Dose
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {preventionRecords.map(prevention => (
                  <div
                    key={prevention.id}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      prevention.status === 'given'
                        ? 'border-success/30 bg-success/5'
                        : prevention.status === 'due-soon'
                        ? 'border-warning/30 bg-warning/5'
                        : prevention.status === 'overdue'
                        ? 'border-error/30 bg-error/5'
                        : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getPreventionStatusEmoji(prevention.status)}</span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-foreground">{prevention.productName}</h4>
                            <p className="text-sm text-muted-foreground">
                              Given: {format(parseISO(prevention.administeredDate), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {prevention.preventionType.join(', ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              Next: {format(parseISO(prevention.nextDueDate), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {prevention.frequency}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Modal Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-6 py-4">
              <h2 className="text-xl font-semibold text-foreground">
                Add {activeTab === 'vaccinations' ? 'Vaccination' : 'Prevention'} Record
              </h2>
            </div>
            <div className="px-6 py-4">
              {activeTab === 'vaccinations' ? (
                <VaccinationForm
                  species={patient.species || 'Other'}
                  petName={patient.name}
                  onSubmit={async (data) => {
                    await createVaccination(data)
                    toast.success('Vaccination record added successfully!')
                    setShowAddModal(false)
                  }}
                  onCancel={() => setShowAddModal(false)}
                />
              ) : (
                <ParasitePreventionForm
                  species={patient.species || 'Other'}
                  petName={patient.name}
                  onSubmit={async (data) => {
                    await createPreventionRecord(data)
                    toast.success('Prevention record added successfully!')
                    setShowAddModal(false)
                  }}
                  onCancel={() => setShowAddModal(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
