/**
 * New Appointment Page
 * Schedule a new medical appointment
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAppointments } from '@/hooks/useAppointments'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useFamilyMembers } from '@/hooks/useFamilyMembers'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import toast from 'react-hot-toast'
import { UserIcon } from '@heroicons/react/24/outline'

export default function NewAppointmentPage() {
  return (
    <AuthGuard>
      <NewAppointmentContent />
    </AuthGuard>
  )
}

function NewAppointmentContent() {
  const router = useRouter()
  const { user } = useAuth()
  const { createAppointment } = useAppointments()
  const { patients } = usePatients()
  const { providers } = useProviders()
  const [loading, setLoading] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState('')

  // Fetch family members for selected patient
  const { familyMembers } = useFamilyMembers({
    patientId: selectedPatientId,
    autoFetch: !!selectedPatientId
  })

  const [formData, setFormData] = useState({
    patientId: '',
    providerId: '',
    dateTime: '',
    type: 'routine-checkup' as 'routine-checkup' | 'follow-up' | 'specialist' | 'lab' | 'other',
    reason: '',
    notes: '',
    location: '',
    status: 'scheduled' as 'scheduled' | 'confirmed' | 'cancelled' | 'completed',
    // Transportation fields
    requiresDriver: false,
    assignedDriverId: '',
    pickupTime: ''
  })

  // Update selectedPatientId when patient changes
  useEffect(() => {
    setSelectedPatientId(formData.patientId)
  }, [formData.patientId])

  // Get selected patient for pronoun
  const selectedPatient = patients.find(p => p.id === formData.patientId)
  const getPatientPronoun = () => {
    if (!selectedPatient) return 'them'
    if (selectedPatient.type === 'pet') return 'them'
    if (selectedPatient.gender === 'male') return 'him'
    if (selectedPatient.gender === 'female') return 'her'
    return 'them'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const patient = patients.find(p => p.id === formData.patientId)
      const provider = providers.find(p => p.id === formData.providerId)

      if (!patient || !provider) {
        throw new Error('Patient or provider not found')
      }

      // Find assigned driver if selected
      const assignedDriver = formData.assignedDriverId
        ? familyMembers.find(m => m.userId === formData.assignedDriverId)
        : null

      const appointmentData = {
        userId: user?.uid || '',
        patientId: formData.patientId,
        patientName: patient.name,
        providerId: formData.providerId,
        providerName: provider.name,
        specialty: provider.specialty,
        dateTime: new Date(formData.dateTime).toISOString(),
        type: formData.type,
        reason: formData.reason,
        notes: formData.notes || undefined,
        location: formData.location || undefined,
        status: formData.status,
        // Source tracking
        createdFrom: 'manual' as const,
        // Transportation fields
        requiresDriver: formData.requiresDriver,
        assignedDriverId: assignedDriver?.userId,
        assignedDriverName: assignedDriver?.name,
        driverStatus: formData.requiresDriver
          ? (formData.assignedDriverId ? 'pending' as const : 'not-needed' as const)
          : 'not-needed' as const,
        pickupTime: formData.pickupTime ? new Date(formData.pickupTime).toISOString() : undefined,
        updatedAt: new Date().toISOString()
      }

      const newAppointment = await createAppointment(appointmentData)
      toast.success('Appointment scheduled successfully')

      if (formData.requiresDriver && assignedDriver) {
        toast.success(`Driver request sent to ${assignedDriver.name}`)
      }

      router.push(`/appointments/${newAppointment.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule appointment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title="Schedule Appointment"
        subtitle="Book a new medical appointment"
        backHref="/appointments"
      />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Patient *
              </label>
              <select
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              >
                <option value="">Select a patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} ({patient.relationship})
                  </option>
                ))}
              </select>
              {patients.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  No patients found. <a href="/patients/new" className="text-purple-600 hover:underline">Add a patient first</a>
                </p>
              )}
            </div>

            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider *
              </label>
              <select
                value={formData.providerId}
                onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              >
                <option value="">Select a provider</option>
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} - {provider.specialty}
                  </option>
                ))}
              </select>
              {providers.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  No providers found. <a href="/providers/new" className="text-purple-600 hover:underline">Add a provider first</a>
                </p>
              )}
            </div>

            {/* Date and Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.dateTime}
                onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Visit *
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Annual checkup, Follow-up, Sick visit"
                required
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              />
            </div>

            {/* Appointment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Appointment Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              >
                <option value="routine-checkup">Routine Checkup</option>
                <option value="follow-up">Follow-up</option>
                <option value="specialist">Specialist Visit</option>
                <option value="lab">Lab Work</option>
                <option value="urgent-care">Urgent Care</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location (Optional)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Office address or telehealth"
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              />
            </div>

            {/* Transportation Question */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Does this patient need transportation?
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, requiresDriver: false, assignedDriverId: '', pickupTime: '' })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                    !formData.requiresDriver
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  No, they can drive themselves
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, requiresDriver: true })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                    formData.requiresDriver
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {formData.patientId ? `Who can take ${getPatientPronoun()}?` : 'Yes, needs a driver'}
                </button>
              </div>
            </div>

            {/* Driver Selection - only shown if transportation needed */}
            {formData.requiresDriver && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium">
                  <UserIcon className="w-5 h-5" />
                  <span>Assign a Family Member</span>
                </div>

                {familyMembers.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No family members with appointment permissions found for this patient.
                  </p>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Who will drive? *
                      </label>
                      <select
                        value={formData.assignedDriverId}
                        onChange={(e) => setFormData({ ...formData, assignedDriverId: e.target.value })}
                        required={formData.requiresDriver}
                        className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                      >
                        <option value="">Select a driver</option>
                        {familyMembers.map(member => (
                          <option key={member.id} value={member.userId}>
                            {member.name} ({member.relationship})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        This person will receive a notification to accept or decline
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Pickup Time (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.pickupTime}
                        onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        When should the driver pick up the patient?
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Any additional information or preparation needed..."
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || patients.length === 0 || providers.length === 0}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Scheduling...' : 'Schedule Appointment'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
