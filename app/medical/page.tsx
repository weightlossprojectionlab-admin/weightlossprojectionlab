/**
 * Medical Records Dashboard
 *
 * Overview of all medical records: patients, providers, appointments
 */

'use client'

import { useRouter } from 'next/navigation'
import { useMedicalDashboard } from '@/hooks/useMedicalDashboard'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import {
  UserGroupIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  PlusIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

export default function MedicalDashboardPage() {
  return (
    <AuthGuard>
      <MedicalDashboardContent />
    </AuthGuard>
  )
}

function MedicalDashboardContent() {
  const router = useRouter()
  const {
    patients,
    providers,
    upcomingAppointments,
    recentAppointments,
    totalPatients,
    totalProviders,
    totalAppointments,
    loading
  } = useMedicalDashboard()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Medical Info"
        subtitle="Manage health information for you or your family"
      />

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground dark:text-muted-foreground">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard
                icon={<UserGroupIcon className="w-6 h-6" />}
                title="Family Members"
                count={totalPatients}
                color="purple"
                onClick={() => router.push('/patients')}
                actionLabel="View All"
              />
              <StatCard
                icon={<BuildingOffice2Icon className="w-6 h-6" />}
                title="Providers"
                count={totalProviders}
                color="blue"
                onClick={() => router.push('/providers')}
                actionLabel="View All"
              />
              <StatCard
                icon={<CalendarDaysIcon className="w-6 h-6" />}
                title="Appointments"
                count={totalAppointments}
                color="green"
                onClick={() => router.push('/appointments')}
                actionLabel="View All"
              />
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-foreground mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <ActionButton
                  icon={<PlusIcon className="w-5 h-5" />}
                  label="Add Family Member"
                  onClick={() => router.push('/patients/new')}
                />
                <ActionButton
                  icon={<PlusIcon className="w-5 h-5" />}
                  label="Add Provider"
                  onClick={() => router.push('/providers/new')}
                />
                <ActionButton
                  icon={<PlusIcon className="w-5 h-5" />}
                  label="Schedule Appointment"
                  onClick={() => router.push('/appointments/new')}
                />
                <ActionButton
                  icon={<CalendarIcon className="w-5 h-5" />}
                  label="View Calendar"
                  onClick={() => router.push('/calendar')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Appointments */}
              <div className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Upcoming Appointments
                </h2>
                {upcomingAppointments.length === 0 ? (
                  <p className="text-muted-foreground dark:text-muted-foreground text-sm">
                    No upcoming appointments
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.map(apt => (
                      <div
                        key={apt.id}
                        onClick={() => router.push(`/appointments/${apt.id}`)}
                        className="p-3 bg-background rounded-lg hover:bg-muted dark:hover:bg-gray-750 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {apt.patientName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {apt.providerName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-primary dark:text-purple-400">
                              {formatDate(apt.dateTime)}
                            </p>
                            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                              {formatTime(apt.dateTime)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Family Members */}
              <div className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Family Members
                </h2>
                {patients.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-3">
                      No family members added yet
                    </p>
                    <button
                      onClick={() => router.push('/patients/new')}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm"
                    >
                      Add Your First Family Member
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patients.slice(0, 5).map(patient => (
                      <div
                        key={patient.id}
                        onClick={() => router.push(`/patients/${patient.id}`)}
                        className="p-3 bg-background rounded-lg hover:bg-muted dark:hover:bg-gray-750 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {patient.name}
                            </p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {patient.relationship}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-primary-light dark:bg-purple-900/20 text-primary-dark dark:text-purple-400 rounded capitalize">
                            {patient.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  title: string
  count: number
  color: 'purple' | 'blue' | 'green'
  onClick: () => void
  actionLabel: string
}

function StatCard({ icon, title, count, color, onClick, actionLabel }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-primary-light dark:bg-purple-900/20 text-primary dark:text-purple-400',
    blue: 'bg-blue-100 text-secondary',
    green: 'bg-green-100 dark:bg-green-900/20 text-success dark:text-green-400'
  }

  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-foreground">{count}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        className="w-full px-4 py-2 text-sm bg-background text-foreground rounded-lg hover:bg-muted dark:hover:bg-gray-750 transition-colors"
      >
        {actionLabel}
      </button>
    </div>
  )
}

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-card border-2 border-border rounded-lg hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
    >
      <div className="p-2 bg-primary-light dark:bg-purple-900/20 text-primary dark:text-purple-400 rounded-lg">
        {icon}
      </div>
      <span className="font-medium text-foreground">{label}</span>
    </button>
  )
}
