/**
 * New Patient Page
 * Form to create a new patient profile
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePatients } from '@/hooks/usePatients'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import { DriverLicenseScanner } from '@/components/family/DriverLicenseScanner'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function NewPatientPage() {
  return (
    <AuthGuard>
      <NewPatientContent />
    </AuthGuard>
  )
}

function NewPatientContent() {
  const router = useRouter()
  const { createPatient } = usePatients()
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    type: 'human' as 'human' | 'pet',
    dateOfBirth: '',
    relationship: 'self',
    gender: '',
    species: '',
    breed: ''
  })

  const handleScanComplete = (scannedData: any) => {
    setFormData({
      ...formData,
      name: scannedData.name,
      dateOfBirth: scannedData.dateOfBirth,
      gender: scannedData.gender || '',
      type: 'human' // Driver's licenses are for humans
    })
    toast.success('Information auto-filled from license!')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data: any = {
        name: formData.name,
        type: formData.type,
        dateOfBirth: new Date(formData.dateOfBirth).toISOString(),
        relationship: formData.relationship
      }

      if (formData.type === 'human') {
        // Only include gender if it's not empty
        if (formData.gender) {
          data.gender = formData.gender
        }
      } else {
        data.species = formData.species
        if (formData.breed) data.breed = formData.breed
      }

      const newPatient = await createPatient(data)
      toast.success(`${newPatient.name} added successfully`)
      router.push(`/patients/${newPatient.id}`)
    } catch (error: any) {
      console.error('Failed to create patient:', error)
      toast.error(error.message || 'Failed to create family member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title="Add Family Member"
        subtitle="Create a new family member profile"
        backHref="/patients"
      />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Scan License Button - Outside Form */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl"
          >
            <DocumentTextIcon className="w-6 h-6" />
            <div className="text-left">
              <div className="font-semibold">Scan Driver's License</div>
              <div className="text-sm text-purple-100">Auto-fill information from ID</div>
            </div>
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Member Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'human' })}
                  className={`p-4 rounded-lg border-2 font-medium transition-colors ${
                    formData.type === 'human'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  👤 Human
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'pet' })}
                  className={`p-4 rounded-lg border-2 font-medium transition-colors ${
                    formData.type === 'pet'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  🐾 Pet
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date of Birth *
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              />
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Relationship *
              </label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              >
                <option value="self">Self</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="sibling">Sibling</option>
                <option value="grandparent">Grandparent</option>
                <option value="pet">Pet</option>
              </select>
            </div>

            {/* Human-specific fields */}
            {formData.type === 'human' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            )}

            {/* Pet-specific fields */}
            {formData.type === 'pet' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Species *
                  </label>
                  <input
                    type="text"
                    value={formData.species}
                    onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                    placeholder="e.g., Dog, Cat, Bird"
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Breed (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    placeholder="e.g., Golden Retriever, Persian"
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                  />
                </div>
              </>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Creating...' : 'Create Family Member'}
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

        {/* Driver's License Scanner Modal */}
        <DriverLicenseScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScanComplete={handleScanComplete}
        />
      </main>
    </div>
  )
}
