/**
 * Patient Access Matrix
 *
 * Table/grid showing which family members can access which patients
 * Color-coded by permission level with click-to-edit functionality
 */

'use client'

import { useState } from 'react'
import type { FamilyMember, PatientProfile, FamilyMemberPermissions } from '@/types/medical'
import { getPermissionLevelName } from '@/lib/family-permissions'

interface PatientAccessMatrixProps {
  members: FamilyMember[]
  patients: PatientProfile[]
  onEditMemberPatientAccess?: (member: FamilyMember, patient: PatientProfile) => void
  currentUserRole?: string
}

type PermissionLevel = 'none' | 'view' | 'caregiver' | 'full'

export function PatientAccessMatrix({
  members,
  patients,
  onEditMemberPatientAccess,
  currentUserRole
}: PatientAccessMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<{
    memberId: string
    patientId: string
  } | null>(null)

  // Only show accepted members
  const activeMembers = members.filter(m => m.status === 'accepted')

  // Determine permission level based on granted permissions
  const getPermissionLevel = (permissions: FamilyMemberPermissions): PermissionLevel => {
    const grantedCount = Object.values(permissions).filter(Boolean).length
    const totalCount = Object.keys(permissions).length

    if (grantedCount === 0) return 'none'
    if (grantedCount === totalCount) return 'full'
    if (grantedCount <= 3) return 'view'
    return 'caregiver'
  }

  // Get color classes for permission level
  const getLevelColor = (level: PermissionLevel, isSelected: boolean): string => {
    const baseClasses = 'transition-all duration-200'
    const selectedRing = isSelected ? 'ring-2 ring-primary ring-offset-2' : ''

    switch (level) {
      case 'full':
        return `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 ${baseClasses} ${selectedRing}`
      case 'caregiver':
        return `bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 ${baseClasses} ${selectedRing}`
      case 'view':
        return `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 ${baseClasses} ${selectedRing}`
      case 'none':
        return `bg-gray-100 text-gray-400 dark:bg-gray-900/30 dark:text-gray-500 ${baseClasses} ${selectedRing}`
    }
  }

  // Get icon for permission level
  const getLevelIcon = (level: PermissionLevel): string => {
    switch (level) {
      case 'full':
        return '✓✓'
      case 'caregiver':
        return '✓'
      case 'view':
        return '👁'
      case 'none':
        return '—'
    }
  }

  // Check if member has access to patient
  const memberHasAccess = (member: FamilyMember, patientId: string): boolean => {
    return member.patientsAccess.includes(patientId)
  }

  const handleCellClick = (member: FamilyMember, patient: PatientProfile) => {
    if (!onEditMemberPatientAccess) return

    setSelectedCell({
      memberId: member.id,
      patientId: patient.id
    })

    onEditMemberPatientAccess(member, patient)
  }

  if (activeMembers.length === 0 || patients.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border-2 border-border">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <p className="mt-4 text-muted-foreground">
          {activeMembers.length === 0
            ? 'No family members to display'
            : 'No patients to display'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="bg-card rounded-lg border-2 border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Access Level Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded flex items-center justify-center bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-sm">
              ✓✓
            </span>
            <span className="text-sm text-foreground">Full Access</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded flex items-center justify-center bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-sm">
              ✓
            </span>
            <span className="text-sm text-foreground">Caregiver</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded flex items-center justify-center bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-sm">
              👁
            </span>
            <span className="text-sm text-foreground">View Only</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded flex items-center justify-center bg-gray-100 text-gray-400 dark:bg-gray-900/30 dark:text-gray-500 text-sm">
              —
            </span>
            <span className="text-sm text-foreground">No Access</span>
          </div>
        </div>
        {onEditMemberPatientAccess && (
          <p className="mt-3 text-xs text-muted-foreground">
            Click any cell to view/edit permissions for that member + patient combination
          </p>
        )}
      </div>

      {/* Matrix Table */}
      <div className="bg-card rounded-lg border-2 border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted dark:bg-gray-900/50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b-2 border-border sticky left-0 bg-muted dark:bg-gray-900/50 z-10">
                  Family Member
                </th>
                {patients.map(patient => (
                  <th
                    key={patient.id}
                    className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b-2 border-border min-w-[120px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      {patient.photo ? (
                        <img
                          src={patient.photo}
                          alt={patient.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-light dark:bg-purple-900/20 flex items-center justify-center">
                          <span className="text-primary dark:text-purple-400 font-semibold text-xs">
                            {patient.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-xs">{patient.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeMembers.map((member, memberIndex) => {
                const permissionLevel = getPermissionLevel(member.permissions)

                return (
                  <tr
                    key={member.id}
                    className={`${
                      memberIndex % 2 === 0
                        ? 'bg-background'
                        : 'bg-muted/30 dark:bg-gray-900/20'
                    } hover:bg-primary-light/20 dark:hover:bg-purple-900/10 transition-colors`}
                  >
                    {/* Member Name Column (Sticky) */}
                    <td className="px-4 py-3 border-b border-border sticky left-0 bg-inherit z-10">
                      <div className="flex items-center gap-3">
                        {member.photo ? (
                          <img
                            src={member.photo}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary-light dark:bg-purple-900/20 flex items-center justify-center">
                            <span className="text-primary dark:text-purple-400 font-semibold text-xs">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.familyRole?.replace('_', ' ') || 'caregiver'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Patient Access Cells */}
                    {patients.map(patient => {
                      const hasAccess = memberHasAccess(member, patient.id)
                      const level = hasAccess ? permissionLevel : 'none'
                      const isSelected =
                        selectedCell?.memberId === member.id &&
                        selectedCell?.patientId === patient.id

                      return (
                        <td
                          key={patient.id}
                          className="px-4 py-3 border-b border-border text-center"
                        >
                          <button
                            onClick={() => handleCellClick(member, patient)}
                            disabled={!onEditMemberPatientAccess}
                            className={`w-full h-12 rounded-lg font-semibold text-sm flex items-center justify-center gap-1 ${getLevelColor(
                              level,
                              isSelected
                            )} ${
                              onEditMemberPatientAccess
                                ? 'cursor-pointer hover:scale-105'
                                : 'cursor-default'
                            } disabled:cursor-not-allowed`}
                            title={`${member.name} → ${patient.name}: ${
                              hasAccess ? getPermissionLevelName(member.permissions) : 'No Access'
                            }`}
                          >
                            <span className="text-lg">{getLevelIcon(level)}</span>
                            {hasAccess && (
                              <span className="hidden md:inline text-xs">
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                              </span>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border-2 border-border p-4">
          <p className="text-sm text-muted-foreground">Total Members</p>
          <p className="text-2xl font-bold text-foreground">{activeMembers.length}</p>
        </div>
        <div className="bg-card rounded-lg border-2 border-border p-4">
          <p className="text-sm text-muted-foreground">Total Patients</p>
          <p className="text-2xl font-bold text-foreground">{patients.length}</p>
        </div>
        <div className="bg-card rounded-lg border-2 border-border p-4">
          <p className="text-sm text-muted-foreground">Access Grants</p>
          <p className="text-2xl font-bold text-foreground">
            {activeMembers.reduce((sum, member) => sum + member.patientsAccess.length, 0)}
          </p>
        </div>
      </div>
    </div>
  )
}
