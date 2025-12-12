/**
 * Family Directory Page
 *
 * List all family members/caregivers with access to shared patients
 * Filter options: by patient, role, availability
 * Search by name
 * Card grid layout with quick contact buttons
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { CaregiverCard, CaregiverCardSkeleton } from '@/components/family/CaregiverCard'
import AuthGuard from '@/components/auth/AuthGuard'
import type { CaregiverCardData, AvailabilityStatus } from '@/types/caregiver'
import type { FamilyRole } from '@/types/medical'

export default function FamilyDirectoryPage() {
  return (
    <AuthGuard>
      <DirectoryContent />
    </AuthGuard>
  )
}

function DirectoryContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [caregivers, setCaregivers] = useState<CaregiverCardData[]>([])
  const [filteredCaregivers, setFilteredCaregivers] = useState<CaregiverCardData[]>([])

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<FamilyRole | 'all'>('all')
  const [selectedAvailability, setSelectedAvailability] = useState<
    AvailabilityStatus | 'all'
  >('all')

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchCaregivers = async () => {
      setLoading(true)
      try {
        // TODO: Replace with actual API call
        // const response = await fetch('/api/family/caregivers')
        // const data = await response.json()

        // Mock data for demonstration
        const mockData: CaregiverCardData[] = [
          {
            id: '1',
            name: 'John Smith',
            photo: undefined,
            role: 'account_owner',
            relationship: 'Self',
            availabilityStatus: 'available',
            patientsAccess: ['patient1', 'patient2'],
            patientNames: ['Mom', 'Dad'],
            email: 'john@example.com',
            phone: '(555) 123-4567',
            lastActive: new Date().toISOString(),
            professionalTitle: undefined
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            photo: undefined,
            role: 'co_admin',
            relationship: 'Spouse',
            availabilityStatus: 'busy',
            patientsAccess: ['patient1'],
            patientNames: ['Mom'],
            email: 'sarah@example.com',
            phone: '(555) 234-5678',
            lastActive: new Date(Date.now() - 3600000).toISOString(),
            professionalTitle: undefined
          },
          {
            id: '3',
            name: 'Mary Wilson',
            photo: undefined,
            role: 'caregiver',
            relationship: 'Daughter',
            availabilityStatus: 'available',
            patientsAccess: ['patient2'],
            patientNames: ['Dad'],
            email: 'mary@example.com',
            phone: '(555) 345-6789',
            lastActive: new Date(Date.now() - 86400000).toISOString(),
            professionalTitle: 'Registered Nurse'
          }
        ]

        setCaregivers(mockData)
        setFilteredCaregivers(mockData)
      } catch (error) {
        console.error('Error fetching caregivers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCaregivers()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = [...caregivers]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((caregiver) =>
        caregiver.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Patient filter
    if (selectedPatient !== 'all') {
      filtered = filtered.filter((caregiver) =>
        caregiver.patientsAccess.includes(selectedPatient)
      )
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter((caregiver) => caregiver.role === selectedRole)
    }

    // Availability filter
    if (selectedAvailability !== 'all') {
      filtered = filtered.filter(
        (caregiver) => caregiver.availabilityStatus === selectedAvailability
      )
    }

    setFilteredCaregivers(filtered)
  }, [searchQuery, selectedPatient, selectedRole, selectedAvailability, caregivers])

  // Get unique patients for filter dropdown
  const uniquePatients = Array.from(
    new Set(caregivers.flatMap((c) => c.patientsAccess))
  )
  const patientNamesMap = caregivers.reduce((acc, c) => {
    c.patientsAccess.forEach((id, idx) => {
      if (!acc[id]) {
        acc[id] = c.patientNames[idx] || 'Unknown'
      }
    })
    return acc
  }, {} as Record<string, string>)

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Caregivers"
        subtitle="View and connect with all family members and caregivers"
      />

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-6 bg-card border-2 border-border rounded-xl p-4">
          <div className="grid md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Search by name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Patient Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Filter by patient
              </label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="all">All Patients</option>
                {uniquePatients.map((patientId) => (
                  <option key={patientId} value={patientId}>
                    {patientNamesMap[patientId]}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Filter by role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as FamilyRole | 'all')}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="all">All Roles</option>
                <option value="account_owner">Account Owner</option>
                <option value="co_admin">Co-Admin</option>
                <option value="caregiver">Caregiver</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {/* Availability Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Filter by availability
              </label>
              <select
                value={selectedAvailability}
                onChange={(e) =>
                  setSelectedAvailability(e.target.value as AvailabilityStatus | 'all')
                }
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="away">Away</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(searchQuery || selectedPatient !== 'all' || selectedRole !== 'all' || selectedAvailability !== 'all') && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    Search: {searchQuery}
                    <button
                      onClick={() => setSearchQuery('')}
                      className="hover:text-primary-hover"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedPatient !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    Patient: {patientNamesMap[selectedPatient]}
                    <button
                      onClick={() => setSelectedPatient('all')}
                      className="hover:text-primary-hover"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedRole !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    Role: {selectedRole.replace('_', ' ')}
                    <button
                      onClick={() => setSelectedRole('all')}
                      className="hover:text-primary-hover"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedAvailability !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    Status: {selectedAvailability}
                    <button
                      onClick={() => setSelectedAvailability('all')}
                      className="hover:text-primary-hover"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedPatient('all')
                    setSelectedRole('all')
                    setSelectedAvailability('all')
                  }}
                  className="text-sm text-primary hover:text-primary-hover"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredCaregivers.length} of {caregivers.length} family members
        </div>

        {/* Caregiver Cards */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CaregiverCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredCaregivers.length === 0 ? (
          <div className="text-center py-12 bg-card border-2 border-border rounded-xl">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-foreground mb-2">No family members found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedPatient !== 'all' || selectedRole !== 'all' || selectedAvailability !== 'all'
                ? 'Try adjusting your filters'
                : 'Invite family members to get started'}
            </p>
            <button
              onClick={() => router.push('/family')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Invite Caregiver
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCaregivers.map((caregiver) => (
              <CaregiverCard key={caregiver.id} caregiver={caregiver} showQuickActions />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
