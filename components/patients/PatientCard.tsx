/**
 * Family Member Card Component
 *
 * Displays a family member profile card with basic information
 * Used in family member list views
 */

'use client'

import { PatientProfile, WeightLog } from '@/types/medical'
import Link from 'next/link'
import { UserIcon, CalendarIcon, HeartIcon, BellAlertIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { getRoleLabel } from '@/lib/family-roles'
import { useState, useEffect } from 'react'
import { shouldShowWeightReminder } from '@/lib/weight-reminder-logic'
import { medicalOperations } from '@/lib/medical-operations'
import { useRouter } from 'next/navigation'
import { useAccount } from '@/contexts/AccountContext'

interface PatientCardProps {
  patient: PatientProfile
  showActions?: boolean
  onEdit?: () => void
  onDelete?: () => void
  mode?: 'view' | 'select' // 'select' mode shows "View Dashboard" button
}

export function PatientCard({ patient, showActions = false, onEdit, onDelete, mode = 'view' }: PatientCardProps) {
  const router = useRouter()
  const { setSelectedPatient } = useAccount()

  // Check if this is a caregiver access patient (not owned)
  const isCaregiverAccess = (patient as any)._source === 'caregiver'
  const caregiverRole = (patient as any)._caregiverRole || 'caregiver' // Get the caregiver's role

  // State for tracking overdue actions
  const [overdueActions, setOverdueActions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Calculate age from date of birth
  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const age = calculateAge(patient.dateOfBirth)

  // Check for overdue actions
  useEffect(() => {
    const checkOverdueActions = async () => {
      const actions: string[] = []

      try {
        // Only check weight logs if patient has weight check-in frequency set
        if (patient.weightCheckInFrequency) {
          const weightLogs = await medicalOperations.weightLogs.getWeightLogs(patient.id)
          const lastWeightLog = weightLogs && weightLogs.length > 0 ? weightLogs[0] : null
          const weightReminder = shouldShowWeightReminder(lastWeightLog, patient.weightCheckInFrequency)

          if (weightReminder.shouldShow && weightReminder.isOverdue) {
            const frequencyLabel = patient.weightCheckInFrequency === 'biweekly' ? 'bi-weekly' : patient.weightCheckInFrequency
            actions.push(`${frequencyLabel.charAt(0).toUpperCase() + frequencyLabel.slice(1)} weight check-in overdue`)
          } else if (weightReminder.shouldShow) {
            const frequencyLabel = patient.weightCheckInFrequency === 'biweekly' ? 'bi-weekly' : patient.weightCheckInFrequency
            actions.push(`${frequencyLabel.charAt(0).toUpperCase() + frequencyLabel.slice(1)} weight check-in due soon`)
          }
        }

        // TODO: Add more checks here:
        // - Medication reminders (if patient has medications scheduled)
        // - Vital sign checks (if patient has other vitals tracking enabled)
        // - Appointment reminders

        setOverdueActions(actions)
      } catch (error) {
        console.error('Error checking overdue actions for patient:', error)
      } finally {
        setLoading(false)
      }
    }

    checkOverdueActions()
  }, [patient.id, patient.weightCheckInFrequency])

  // Get relationship badge color
  const getRelationshipColor = (relationship: string): string => {
    const colors: Record<string, string> = {
      'self': 'bg-primary-light text-primary-dark',
      'spouse': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
      'parent': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'child': 'bg-green-100 text-success-dark dark:bg-green-900/30 dark:text-green-300',
      'sibling': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      'grandparent': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'pet': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    }
    return colors[relationship] || 'bg-muted text-foreground'
  }

  const handleSelectAccount = () => {
    // Store selected patient in context and navigate to their dashboard
    setSelectedPatient(patient)
    router.push(`/patients/${patient.id}`)
  }

  return (
    <div className={`bg-card rounded-lg border-2 p-6 hover:shadow-md transition-all relative ${
      overdueActions.length > 0
        ? 'border-warning-dark dark:border-yellow-600 hover:border-warning-dark dark:hover:border-yellow-500'
        : 'border-border hover:border-purple-300 dark:hover:border-purple-700'
    }`}>
      {/* Notification Badge */}
      {overdueActions.length > 0 && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="relative">
            <div className="bg-error text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-sm font-bold">{overdueActions.length}</span>
            </div>
            <BellAlertIcon className="absolute inset-0 w-8 h-8 text-error animate-ping opacity-75" />
          </div>
        </div>
      )}

      {mode === 'view' ? (
        <Link href={`/patients/${patient.id}`} className="block">
        {/* Overdue Actions Alert */}
        {overdueActions.length > 0 && (
          <div className="mb-3 bg-warning-light dark:bg-yellow-900/20 border-2 border-warning-dark dark:border-yellow-600 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <BellAlertIcon className="w-5 h-5 text-warning-dark dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-warning-dark dark:text-yellow-500 mb-1">
                  Action Needed
                </p>
                <ul className="text-xs text-foreground space-y-1">
                  {overdueActions.map((action, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-warning-dark dark:bg-yellow-500"></span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Caregiver Access Badge */}
        {isCaregiverAccess && (
          <div className="mb-3 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium">Caregiver Access</span>
            <span className="text-blue-500 dark:text-blue-400">({getRoleLabel(caregiverRole)})</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center overflow-hidden">
              {patient.photo ? (
                <img
                  src={patient.photo}
                  alt={patient.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-8 h-8 text-primary dark:text-purple-400" />
              )}
            </div>

            {/* Name and Info */}
            <div>
              <h3 className="font-bold text-xl text-foreground">
                {patient.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRelationshipColor(patient.relationship)}`}>
                  {patient.relationship}
                </span>
                {patient.type === 'pet' && patient.species && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                    {patient.species}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {/* Age / DOB */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            <span>
              {patient.type === 'human' ? `${age} years old` : `Born ${new Date(patient.dateOfBirth).toLocaleDateString()}`}
            </span>
          </div>

          {/* Type-specific info */}
          {patient.type === 'human' && patient.gender && (
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              <span className="capitalize">{patient.gender}</span>
            </div>
          )}

          {patient.type === 'pet' && patient.breed && (
            <div className="flex items-center gap-2">
              <HeartIcon className="w-4 h-4" />
              <span>{patient.breed}</span>
            </div>
          )}

          {patient.type === 'pet' && patient.microchipNumber && (
            <div className="text-xs">
              <span className="font-medium">Microchip:</span> {patient.microchipNumber}
            </div>
          )}
        </div>
      </Link>
      ) : (
        <div>
        {/* Overdue Actions Alert */}
        {overdueActions.length > 0 && (
          <div className="mb-3 bg-warning-light dark:bg-yellow-900/20 border-2 border-warning-dark dark:border-yellow-600 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <BellAlertIcon className="w-5 h-5 text-warning-dark dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-warning-dark dark:text-yellow-500 mb-1">
                  Action Needed
                </p>
                <ul className="text-xs text-foreground space-y-1">
                  {overdueActions.map((action, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-warning-dark dark:bg-yellow-500"></span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Caregiver Access Badge */}
        {isCaregiverAccess && (
          <div className="mb-3 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium">Caregiver Access</span>
            <span className="text-blue-500 dark:text-blue-400">({getRoleLabel(caregiverRole)})</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center overflow-hidden">
              {patient.photo ? (
                <img
                  src={patient.photo}
                  alt={patient.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-8 h-8 text-primary dark:text-purple-400" />
              )}
            </div>

            {/* Name and Info */}
            <div>
              <h3 className="font-bold text-xl text-foreground">
                {patient.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRelationshipColor(patient.relationship)}`}>
                  {patient.relationship}
                </span>
                {patient.type === 'pet' && patient.species && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                    {patient.species}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          {/* Age / DOB */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            <span>
              {patient.type === 'human' ? `${calculateAge(patient.dateOfBirth)} years old` : `Born ${new Date(patient.dateOfBirth).toLocaleDateString()}`}
            </span>
          </div>

          {/* Type-specific info */}
          {patient.type === 'human' && patient.gender && (
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              <span className="capitalize">{patient.gender}</span>
            </div>
          )}

          {patient.type === 'pet' && patient.breed && (
            <div className="flex items-center gap-2">
              <HeartIcon className="w-4 h-4" />
              <span>{patient.breed}</span>
            </div>
          )}

          {patient.type === 'pet' && patient.microchipNumber && (
            <div className="text-xs">
              <span className="font-medium">Microchip:</span> {patient.microchipNumber}
            </div>
          )}
        </div>

        {/* Select Account Button */}
        <button
          onClick={handleSelectAccount}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
        >
          <span>View Dashboard</span>
          <ArrowRightIcon className="w-5 h-5" />
        </button>
      </div>
      )}

      {/* Actions */}
      {showActions && (onEdit || onDelete) && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          {onEdit && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onEdit()
              }}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-primary dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onDelete()
              }}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-error dark:hover:text-red-400 hover:bg-error-light dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}
