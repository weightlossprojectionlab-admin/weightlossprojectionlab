/**
 * Patients List Page
 * Displays all patients for the current user
 */

'use client'

import { useState } from 'react'
import { usePatients } from '@/hooks/usePatients'
import { PatientCard } from '@/components/patients/PatientCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'

export default function PatientsPage() {
  return (
    <AuthGuard>
      <PatientsContent />
    </AuthGuard>
  )
}

function PatientsContent() {
  const { patients, loading, error } = usePatients()
  const [filter, setFilter] = useState<'all' | 'human' | 'pet'>('all')

  const filteredPatients = patients.filter(p => {
    if (filter === 'all') return true
    return p.type === filter
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title="Patients"
        subtitle="Manage health records for family members and pets"
        actions={
          <Link
            href="/patients/new"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            Add Patient
          </Link>
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            All ({patients.length})
          </button>
          <button
            onClick={() => setFilter('human')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'human'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Humans ({patients.filter(p => p.type === 'human').length})
          </button>
          <button
            onClick={() => setFilter('pet')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pet'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Pets ({patients.filter(p => p.type === 'pet').length})
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            <p className="font-medium">Error loading patients</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPatients.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {filter === 'all' ? 'No Patients Yet' : `No ${filter}s Found`}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start tracking health records by adding your first patient
            </p>
            <Link
              href="/patients/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              Add Your First Patient
            </Link>
          </div>
        )}

        {/* Patient Grid */}
        {!loading && !error && filteredPatients.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map(patient => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
