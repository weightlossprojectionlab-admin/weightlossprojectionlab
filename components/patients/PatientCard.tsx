/**
 * PatientCard Component
 *
 * Displays a patient profile card with basic information
 * Used in patient list views
 */

'use client'

import { PatientProfile } from '@/types/medical'
import Link from 'next/link'
import { UserIcon, CalendarIcon, HeartIcon } from '@heroicons/react/24/outline'

interface PatientCardProps {
  patient: PatientProfile
  showActions?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function PatientCard({ patient, showActions = false, onEdit, onDelete }: PatientCardProps) {
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

  // Get relationship badge color
  const getRelationshipColor = (relationship: string): string => {
    const colors: Record<string, string> = {
      'self': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'spouse': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
      'parent': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'child': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'sibling': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      'grandparent': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'pet': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    }
    return colors[relationship] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-md">
      <Link href={`/patients/${patient.id}`} className="block">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center overflow-hidden">
              {patient.photo ? (
                <img
                  src={patient.photo}
                  alt={patient.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              )}
            </div>

            {/* Name and Info */}
            <div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100">
                {patient.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRelationshipColor(patient.relationship)}`}>
                  {patient.relationship}
                </span>
                {patient.type === 'pet' && patient.species && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {patient.species}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
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

      {/* Actions */}
      {showActions && (onEdit || onDelete) && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onEdit && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onEdit()
              }}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
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
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}
