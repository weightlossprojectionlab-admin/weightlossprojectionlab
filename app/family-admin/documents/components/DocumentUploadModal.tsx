/**
 * Document Upload Modal
 *
 * Centralized document upload with patient selection
 */

'use client'

import { useState } from 'react'
import { XMarkIcon, ArrowUpTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  name: string
  type: string
  photo?: string
}

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  patients: Patient[]
  preSelectedPatientId?: string
}

export default function DocumentUploadModal({
  isOpen,
  onClose,
  patients,
  preSelectedPatientId
}: DocumentUploadModalProps) {
  const router = useRouter()
  const [selectedPatient, setSelectedPatient] = useState<string>(preSelectedPatientId || '')

  if (!isOpen) return null

  console.log('DocumentUploadModal - patients:', patients)

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatient(patientId)
    // Navigate to patient page to upload document
    router.push(`/patients/${patientId}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-card rounded-lg shadow-xl max-w-2xl w-full border-2 border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                <ArrowUpTrayIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Upload Document</h2>
                <p className="text-sm text-muted-foreground">
                  Select a family member to upload documents for
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {patients.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No family members found
                </h3>
                <p className="text-muted-foreground">
                  You need to have family members to upload documents
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patients.map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => handlePatientSelect(patient.id)}
                    className="flex items-center gap-4 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary-light/20 transition-all text-left"
                  >
                    {patient.photo ? (
                      <img
                        src={patient.photo}
                        alt={patient.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
                        <span className="text-primary font-semibold text-2xl">
                          {patient.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">
                        {patient.name}
                      </h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {patient.type}
                      </p>
                    </div>
                    <ArrowUpTrayIcon className="w-6 h-6 text-primary" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary-dark transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
