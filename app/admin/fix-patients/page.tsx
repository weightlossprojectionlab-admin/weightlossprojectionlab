'use client'

/**
 * Admin Page: Fix Patient Data
 *
 * UI for fixing incorrect patient records:
 * 1. Percy Rice (percyrice) - Update name and date of birth
 * 2. Darlene Rice - Change type from 'pet' to 'human'
 */

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePatients } from '@/hooks/usePatients'
import { medicalOperations } from '@/lib/medical-operations'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import { PatientProfile } from '@/types/medical'

interface PatientFix {
  patientId: string | null
  currentName: string
  targetName: string
  currentType: 'human' | 'pet'
  targetType: 'human' | 'pet'
  currentDOB: string
  targetDOB: string
  reason: string
}

export default function FixPatientsPage() {
  const { user } = useAuth()
  const { patients, loading: patientsLoading, refetch } = usePatients()
  const [fixing, setFixing] = useState<string | null>(null)
  const [fixes, setFixes] = useState<PatientFix[]>([])

  // Scan for issues when patients load
  useState(() => {
    if (!patientsLoading && patients.length > 0) {
      const foundFixes: PatientFix[] = []

      patients.forEach((patient) => {
        // Check for percyrice -> Percy Rice
        if (patient.name.toLowerCase() === 'percyrice') {
          foundFixes.push({
            patientId: patient.id,
            currentName: patient.name,
            targetName: 'Percy Rice',
            currentType: patient.type,
            targetType: 'human',
            currentDOB: patient.dateOfBirth,
            targetDOB: '1970-11-23',
            reason: 'Incorrect name format and missing birth date'
          })
        }

        // Check for Darlene Rice with wrong type
        if (patient.name === 'Darlene Rice' && patient.type === 'pet') {
          foundFixes.push({
            patientId: patient.id,
            currentName: patient.name,
            targetName: patient.name,
            currentType: patient.type,
            targetType: 'human',
            currentDOB: patient.dateOfBirth,
            targetDOB: '1972-12-23',
            reason: 'Incorrect patient type (should be human, not pet)'
          })
        }
      })

      setFixes(foundFixes)
    }
  })

  const handleFix = async (fix: PatientFix) => {
    if (!fix.patientId) {
      toast.error('Patient ID not found')
      return
    }

    setFixing(fix.patientId)

    try {
      const updates: Partial<PatientProfile> = {}

      if (fix.currentName !== fix.targetName) {
        updates.name = fix.targetName
      }

      if (fix.currentType !== fix.targetType) {
        updates.type = fix.targetType
      }

      if (fix.currentDOB !== fix.targetDOB) {
        updates.dateOfBirth = fix.targetDOB
      }

      await medicalOperations.patients.updatePatient(fix.patientId, updates)

      toast.success(`✅ Fixed ${fix.targetName}`)

      // Refresh patients list
      await refetch()

      // Remove this fix from the list
      setFixes(fixes.filter(f => f.patientId !== fix.patientId))
    } catch (error) {
      console.error('Error fixing patient:', error)
      toast.error('Failed to fix patient data')
    } finally {
      setFixing(null)
    }
  }

  const handleFixAll = async () => {
    for (const fix of fixes) {
      if (fix.patientId) {
        await handleFix(fix)
      }
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              🔧 Fix Patient Data
            </h1>
            <p className="text-muted-foreground">
              Scan and fix incorrect patient records
            </p>
          </div>

          {/* Loading State */}
          {patientsLoading && (
            <div className="bg-card rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Scanning patient records...</p>
            </div>
          )}

          {/* No Issues Found */}
          {!patientsLoading && fixes.length === 0 && (
            <div className="bg-success-light dark:bg-green-900/20 border-2 border-success rounded-lg p-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <h3 className="font-bold text-success-dark dark:text-green-200">
                    All Patient Records Look Good!
                  </h3>
                  <p className="text-sm text-success-dark dark:text-green-300">
                    No issues found with patient data.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Issues Found */}
          {!patientsLoading && fixes.length > 0 && (
            <>
              <div className="bg-warning-light dark:bg-yellow-900/20 border-2 border-warning-dark dark:border-yellow-600 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="font-bold text-warning-dark dark:text-yellow-200">
                      Found {fixes.length} Issue{fixes.length > 1 ? 's' : ''}
                    </h3>
                    <p className="text-sm text-warning-dark dark:text-yellow-300">
                      Review and fix the patient records below
                    </p>
                  </div>
                </div>
              </div>

              {/* Fix All Button */}
              <div className="mb-6">
                <button
                  onClick={handleFixAll}
                  disabled={fixing !== null}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔧 Fix All Issues
                </button>
              </div>

              {/* Issues List */}
              <div className="space-y-4">
                {fixes.map((fix, index) => (
                  <div
                    key={index}
                    className="bg-card rounded-lg border-2 border-border p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-1">
                          {fix.currentName}
                        </h3>
                        <p className="text-sm text-error">{fix.reason}</p>
                      </div>
                      <button
                        onClick={() => handleFix(fix)}
                        disabled={fixing !== null}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {fixing === fix.patientId ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            Fixing...
                          </span>
                        ) : (
                          '🔧 Fix This'
                        )}
                      </button>
                    </div>

                    <div className="space-y-3 text-sm">
                      {/* Name Change */}
                      {fix.currentName !== fix.targetName && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-muted-foreground text-xs">Current Name</label>
                            <p className="font-mono text-error">{fix.currentName}</p>
                          </div>
                          <div>
                            <label className="text-muted-foreground text-xs">New Name</label>
                            <p className="font-mono text-success">{fix.targetName}</p>
                          </div>
                        </div>
                      )}

                      {/* Type Change */}
                      {fix.currentType !== fix.targetType && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-muted-foreground text-xs">Current Type</label>
                            <p className="font-mono text-error capitalize">{fix.currentType}</p>
                          </div>
                          <div>
                            <label className="text-muted-foreground text-xs">New Type</label>
                            <p className="font-mono text-success capitalize">{fix.targetType}</p>
                          </div>
                        </div>
                      )}

                      {/* DOB Change */}
                      {fix.currentDOB !== fix.targetDOB && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-muted-foreground text-xs">Current Birth Date</label>
                            <p className="font-mono text-error">
                              {new Date(fix.currentDOB).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <label className="text-muted-foreground text-xs">New Birth Date</label>
                            <p className="font-mono text-success">
                              {new Date(fix.targetDOB).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Back Button */}
          <div className="mt-8">
            <a
              href="/patients"
              className="text-primary hover:text-primary-hover font-medium"
            >
              ← Back to Patients
            </a>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
