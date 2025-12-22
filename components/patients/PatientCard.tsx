/**
 * Family Member Card Component
 *
 * Displays a family member profile card with basic information
 * Used in family member list views
 */

'use client'

import { PatientProfile, WeightLog } from '@/types/medical'
import Link from 'next/link'
import { UserIcon, CalendarIcon, HeartIcon, BellAlertIcon, ArrowRightIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
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
  onQuickLogVitals?: () => void // AI Supervisor - Quick log vitals
}

export function PatientCard({ patient, showActions = false, onEdit, onDelete, mode = 'view', onQuickLogVitals }: PatientCardProps) {
  const router = useRouter()
  const { setSelectedPatient } = useAccount()

  // Check if this is a caregiver access patient (not owned)
  const isCaregiverAccess = (patient as any)._source === 'caregiver'
  const caregiverRole = (patient as any)._caregiverRole || 'caregiver' // Get the caregiver's role

  // State for tracking overdue actions
  const [overdueActions, setOverdueActions] = useState<string[]>([])
  const [hasUpcomingAppointment, setHasUpcomingAppointment] = useState(false)
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

        // Check for upcoming appointments
        const appointments = await medicalOperations.appointments.getAppointments({ patientId: patient.id })
        const now = new Date()
        const upcomingAppointments = appointments.filter(apt => {
          const aptDate = new Date(apt.dateTime)
          const hoursUntil = (aptDate.getTime() - now.getTime()) / (1000 * 60 * 60)
          return apt.status === 'scheduled' && hoursUntil > 0 && hoursUntil <= 24
        })

        if (upcomingAppointments.length > 0) {
          setHasUpcomingAppointment(true)
          upcomingAppointments.forEach(apt => {
            const aptDate = new Date(apt.dateTime)
            const hoursUntil = Math.round((aptDate.getTime() - now.getTime()) / (1000 * 60 * 60))

            // Check if appointment is today or tomorrow
            const isToday = aptDate.toDateString() === now.toDateString()
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const isTomorrow = aptDate.toDateString() === tomorrow.toDateString()

            if (hoursUntil <= 2) {
              actions.push(`Appointment with ${apt.providerName} in ${hoursUntil}h`)
            } else if (isToday) {
              actions.push(`Appointment with ${apt.providerName} today at ${aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`)
            } else if (isTomorrow) {
              actions.push(`Appointment with ${apt.providerName} tomorrow at ${aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`)
            } else {
              actions.push(`Appointment with ${apt.providerName} on ${aptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`)
            }
          })
        } else {
          setHasUpcomingAppointment(false)
        }

        // TODO: Add more checks here:
        // - Medication reminders (if patient has medications scheduled)
        // - Vital sign checks (if patient has other vitals tracking enabled)

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
      'self': 'bg-primary-light text-primary-dark font-bold',
      'spouse': 'bg-pink-100 text-pink-900 border-pink-400 font-bold',
      'parent': 'bg-blue-100 text-blue-900 border-blue-400 font-bold',
      'child': 'bg-green-100 text-green-900 border-green-400 font-bold',
      'sibling': 'bg-yellow-100 text-yellow-900 border-yellow-400 font-bold',
      'grandparent': 'bg-indigo-100 text-indigo-900 border-indigo-400 font-bold',
      'pet': 'bg-orange-100 text-orange-900 border-orange-400 font-bold'
    }
    return colors[relationship] || 'bg-gray-100 text-gray-900 font-bold'
  }

  const handleSelectAccount = () => {
    // Store selected patient in context and navigate to their dashboard
    setSelectedPatient(patient)
    router.push(`/patients/${patient.id}`)
  }

  return (
    <div className={`bg-card rounded-lg border-2 p-6 hover:shadow-md transition-all relative ${
      overdueActions.length > 0
        ? 'border-warning-dark hover:border-warning-dark'
        : 'border-border hover:border-purple-300'
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
          <div
            onClick={(e) => {
              if (hasUpcomingAppointment) {
                e.preventDefault()
                e.stopPropagation()
                router.push('/calendar')
              }
            }}
            className={`mb-3 bg-warning-light border-2 border-warning-dark rounded-lg p-3 ${
              hasUpcomingAppointment ? 'cursor-pointer hover:bg-warning-light/80 transition-colors' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <BellAlertIcon className="w-5 h-5 text-warning-dark flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-warning-dark">
                    Action Needed
                  </p>
                  {hasUpcomingAppointment && (
                    <span className="text-xs font-medium text-primary hover:text-primary-dark">
                      View Calendar →
                    </span>
                  )}
                </div>
                <ul className="text-xs text-foreground space-y-1">
                  {overdueActions.map((action, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-warning-dark"></span>
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
          <div className="mb-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium">Caregiver Access</span>
            <span className="text-blue-500">({getRoleLabel(caregiverRole)})</span>
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
                <UserIcon className="w-8 h-8 text-primary" />
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
          <div
            onClick={(e) => {
              if (hasUpcomingAppointment) {
                e.preventDefault()
                e.stopPropagation()
                router.push('/calendar')
              }
            }}
            className={`mb-3 bg-warning-light border-2 border-warning-dark rounded-lg p-3 ${
              hasUpcomingAppointment ? 'cursor-pointer hover:bg-warning-light/80 transition-colors' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <BellAlertIcon className="w-5 h-5 text-warning-dark flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-warning-dark">
                    Action Needed
                  </p>
                  {hasUpcomingAppointment && (
                    <span className="text-xs font-medium text-primary hover:text-primary-dark">
                      View Calendar →
                    </span>
                  )}
                </div>
                <ul className="text-xs text-foreground space-y-1">
                  {overdueActions.map((action, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-warning-dark"></span>
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
          <div className="mb-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium">Caregiver Access</span>
            <span className="text-blue-500">({getRoleLabel(caregiverRole)})</span>
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
                <UserIcon className="w-8 h-8 text-primary" />
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

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          {onQuickLogVitals && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onQuickLogVitals()
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-success text-white rounded-lg hover:bg-success-dark transition-colors font-medium text-sm"
              title="Quick log vitals with AI guidance"
            >
              <ClipboardDocumentListIcon className="w-5 h-5" />
              <span>Vitals</span>
            </button>
          )}
          <button
            onClick={handleSelectAccount}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
          >
            <span>View Dashboard</span>
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
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
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-purple-50 rounded-lg transition-colors"
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
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-error hover:bg-error-light rounded-lg transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}
