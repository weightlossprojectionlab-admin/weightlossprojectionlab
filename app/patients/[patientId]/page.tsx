/**
 * Family Member Detail Page with Health Tracking
 * Displays family member information and allows logging/viewing health data
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { medicalOperations } from '@/lib/medical-operations'
import { useVitals } from '@/hooks/useVitals'
import { usePatientPermissions } from '@/hooks/usePatientPermissions'
import { useFamilyMembers } from '@/hooks/useFamilyMembers'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useInvitations } from '@/hooks/useInvitations'
import { useUserProfile } from '@/hooks/useUserProfile'
import { PatientProfile, VitalType, VitalSign, VitalUnit, FamilyMember, FamilyMemberPermissions, PatientDocument, PatientMedication } from '@/types/medical'
import { VitalLogForm } from '@/components/vitals/VitalLogForm'
import { VitalTrendChart } from '@/components/vitals/VitalTrendChart'
import DailyVitalsSummary from '@/components/vitals/DailyVitalsSummary'
import VitalsHistory from '@/components/vitals/VitalsHistory'
import VitalReminderPrompt from '@/components/vitals/VitalReminderPrompt'
import VitalQuickLogModal from '@/components/vitals/VitalQuickLogModal'
import { FamilyMemberCard } from '@/components/family/FamilyMemberCard'
import { PermissionsMatrix } from '@/components/family/PermissionsMatrix'
import { InviteModal } from '@/components/family/InviteModal'
import { MealLogForm } from '@/components/patients/MealLogForm'
import { StepLogForm } from '@/components/patients/StepLogForm'
import { MedicationForm } from '@/components/patients/MedicationForm'
import { MedicationList } from '@/components/patients/MedicationList'
import { AIHealthReport } from '@/components/patients/AIHealthReport'
import DocumentUpload from '@/components/patients/DocumentUpload'
import DocumentDetailModal from '@/components/documents/DocumentDetailModal'
import PDFViewerModal from '@/components/documents/PDFViewerModal'
import MedicationDetailModal from '@/components/health/MedicationDetailModal'
import { RecipeView } from '@/components/patients/RecipeView'
import { PageHeader } from '@/components/ui/PageHeader'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { AppointmentList } from '@/components/appointments/AppointmentList'
import { ChartBarIcon, ShieldCheckIcon, ChevronDownIcon, ChevronUpIcon, ScaleIcon, CameraIcon, FireIcon, StarIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import AuthGuard from '@/components/auth/AuthGuard'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { calculateAge } from '@/lib/age-utils'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import SupervisedVitalsWizard from '@/components/wizards/SupervisedVitalsWizard'
import VitalsSummaryModal from '@/components/wizards/VitalsSummaryModal'
import AppointmentWizard from '@/components/wizards/AppointmentWizard'
import { transformWizardDataToVitals, hasAnyVitalMeasurement } from '@/lib/vitals-wizard-transform'
import { useAuth } from '@/hooks/useAuth'
import { useAppointments } from '@/hooks/useAppointments'
import { useProviders } from '@/hooks/useProviders'
import { useVitalSchedules } from '@/hooks/useVitalSchedules'

export default function PatientDetailPage() {
  return (
    <AuthGuard>
      <PatientDetailContent />
    </AuthGuard>
  )
}

function PatientDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const patientId = params.patientId as string

  // Get tab from query parameter, default to 'vitals'
  const tabParam = searchParams.get('tab') as 'vitals' | 'meals' | 'steps' | 'medications' | null

  const [patient, setPatient] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVitalType, setSelectedVitalType] = useState<VitalType>('blood_pressure')
  const [editingVital, setEditingVital] = useState<VitalSign | null>(null)
  const [deletingVital, setDeletingVital] = useState<{ id: string; type: string } | null>(null)
  const [showFamilyAccess, setShowFamilyAccess] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [editPermissions, setEditPermissions] = useState<FamilyMemberPermissions | null>(null)
  const [showVitalsModal, setShowVitalsModal] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<any>(null)
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<PatientDocument | null>(null)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)
  const [pdfViewerName, setPdfViewerName] = useState<string>('')
  const [medications, setMedications] = useState<PatientMedication[]>([])
  const [loadingMedications, setLoadingMedications] = useState(false)
  const [selectedMedication, setSelectedMedication] = useState<PatientMedication | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'vitals' | 'meals' | 'steps' | 'medications' | 'recipes' | 'appointments'>(tabParam || 'vitals')
  const [fixingStartWeight, setFixingStartWeight] = useState(false)
  const [showVitalsWizard, setShowVitalsWizard] = useState(false)
  const [showVitalsSummary, setShowVitalsSummary] = useState(false)
  const [summaryVitals, setSummaryVitals] = useState<VitalSign[]>([])
  const [summaryMood, setSummaryMood] = useState<string | undefined>(undefined)
  const [summaryMoodNotes, setSummaryMoodNotes] = useState<string | undefined>(undefined)
  const [showAppointmentWizard, setShowAppointmentWizard] = useState(false)
  const [showAllMedications, setShowAllMedications] = useState(false)
  const [showQuickLogModal, setShowQuickLogModal] = useState(false)
  const [quickLogVitalType, setQuickLogVitalType] = useState<VitalType | null>(null)

  const { user } = useAuth()
  const { vitals, loading: vitalsLoading, logVital, updateVital, deleteVital, refetch } = useVitals({
    patientId,
    autoFetch: true
  })
  const { createAppointment } = useAppointments()
  const { providers, refetch: refetchProviders } = useProviders()
  const { createSchedule } = useVitalSchedules({ patientId, autoFetch: false })

  const {
    role,
    isOwner,
    canLogVitals,
    canViewVitals,
    canEditProfile,
    canEditMedications,
    canUploadDocuments,
    canDeleteDocuments,
    loading: permissionsLoading
  } = usePatientPermissions(patientId)

  const { familyMembers, loading: familyMembersLoading, updateMemberPermissions, removeMember } = useFamilyMembers({
    patientId
  })

  const { role: adminRole } = useAdminAuth()
  const { profile: userProfile, loading: profileLoading, refetch: refetchProfile } = useUserProfile()

  const isPrimaryPatient = userProfile?.preferences?.primaryPatientId === patientId

  // Helper to get display name for a user ID
  const getDisplayName = (userId: string): string => {
    // Check if it's the current user
    if (userProfile?.uid === userId) {
      return 'You'
    }

    // Check if it's a family member
    const familyMember = familyMembers.find(member => member.userId === userId)
    if (familyMember) {
      return familyMember.name || familyMember.email
    }

    // Check if it's the patient's owner
    if (patient && patient.userId === userId) {
      return patient.name || 'Owner'
    }

    // Fallback to showing the userId (trimmed)
    return userId.substring(0, 8) + '...'
  }

  // Fetch patient-specific health data for overview cards
  const {
    todayMeals,
    weightData,
    stepsData,
    loading: healthDataLoading
  } = useDashboardData(patientId, patient?.userId)

  // Calculate statistics from raw data using patient's goals
  const patientProfileForStats = patient ? {
    goals: patient.goals,
    profile: {
      currentWeight: patient.goals?.startWeight // Fallback if no weight logs
    }
  } : null

  const {
    nutritionSummary,
    weightTrend,
    activitySummary: stepsSummary
  } = useDashboardStats(todayMeals, weightData, stepsData, patientProfileForStats)

  // Handler to set this patient as primary
  const handleSetAsPrimary = async () => {
    try {
      const response = await fetch('/api/user-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            ...userProfile?.preferences,
            primaryPatientId: patientId
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      await refetchProfile()
      toast.success(`${patient?.name} is now your primary family member`)
    } catch (error: any) {
      logger.error('[PatientDetail] Error setting primary family member', error)
      toast.error(error.message || 'Failed to set primary family member')
    }
  }

  // Handler to fix missing start weight
  const handleFixStartWeight = async () => {
    if (!patient) return

    setFixingStartWeight(true)
    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('Not authenticated')
      }

      const token = await user.getIdToken()
      const response = await fetch(`/api/patients/${patientId}/fix-start-weight`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fix start weight')
      }

      // Refresh patient data to show updated weight
      const updatedPatient = await medicalOperations.patients.getPatient(patientId)
      setPatient(updatedPatient)

      toast.success(result.message || 'Starting weight updated successfully!')
      logger.info('[PatientDetail] Start weight fixed', result)
    } catch (error: any) {
      logger.error('[PatientDetail] Error fixing start weight', error)
      toast.error(error.message || 'Failed to fix starting weight')
    } finally {
      setFixingStartWeight(false)
    }
  }

  // Fetch patient details
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true)
        const data = await medicalOperations.patients.getPatient(patientId)
        console.log('[PatientDetail] Fetched patient data:', {
          patientId,
          patientName: data?.name,
          hasPreferences: !!data?.preferences,
          vitalReminders: data?.preferences?.vitalReminders
        })
        setPatient(data)
      } catch (error: any) {
        logger.error('[PatientDetail] Error fetching patient', error)
        toast.error('Failed to load family member details')
      } finally {
        setLoading(false)
      }
    }

    fetchPatient()
  }, [patientId])

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoadingDocuments(true)
      const docs = await medicalOperations.documents.getDocuments(patientId)
      setDocuments(docs)
    } catch (error: any) {
      logger.error('[PatientDetail] Error fetching documents', error)
    } finally {
      setLoadingDocuments(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [patientId])

  // Fetch medications using API
  const fetchMedications = async () => {
    if (!patientId) {
      setLoadingMedications(false)
      return
    }

    try {
      setLoadingMedications(true)
      const response = await medicalOperations.medications.getMedications(patientId)
      setMedications(response)
      logger.debug('[PatientDetail] Medications loaded', {
        count: response.length,
        patientId
      })
    } catch (error: any) {
      logger.error('[PatientDetail] Error fetching medications', error)
    } finally {
      setLoadingMedications(false)
    }
  }

  useEffect(() => {
    fetchMedications()
  }, [patientId])

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member)
    setEditPermissions(member.permissions)
  }

  const handleSavePermissions = async () => {
    if (!editingMember || !editPermissions) return

    try {
      await updateMemberPermissions(editingMember.id, editPermissions)
      setEditingMember(null)
      setEditPermissions(null)
      toast.success('Permissions updated successfully')
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleRemove = async (member: FamilyMember) => {
    if (confirm(`Remove ${member.name}'s access to ${patient?.name}?`)) {
      await removeMember(member.id)
      toast.success('Family member access removed')
    }
  }

  const handleLogVital = async (data: any) => {
    try {
      logger.debug('[PatientDetail] Before logVital', { vitalsCount: vitals.length })

      if (editingVital) {
        // Update existing vital
        await updateVital(editingVital.id, {
          value: data.value,
          recordedAt: data.recordedAt,
          notes: data.notes
        })
        toast.success('Vital sign updated successfully')
        setEditingVital(null)
      } else {
        // Create new vital
        const newVital = await logVital(data)
        logger.debug('[PatientDetail] After logVital', { vitalsCount: vitals.length, newVital })
        toast.success('Vital sign logged successfully')
      }

      await refetch()
      logger.debug('[PatientDetail] After refetch', { vitalsCount: vitals.length })
      setShowVitalsModal(false)
    } catch (error: any) {
      // Error toast already shown in logVital
      logger.error('[PatientDetail] Error in handleLogVital', error)
    }
  }

  const handleEditVital = (vital: VitalSign) => {
    setEditingVital(vital)
    setShowVitalsModal(true)
  }

  const handleDeleteVitalClick = (vitalId: string, vitalType: string) => {
    setDeletingVital({ id: vitalId, type: vitalType })
  }

  const confirmDeleteVital = async () => {
    if (!deletingVital) return

    try {
      // Find the vital being deleted for audit trail
      const vitalToDelete = vitals.find(v => v.id === deletingVital.id)

      await deleteVital(deletingVital.id)

      // Audit trail: Log the deletion
      if (vitalToDelete && patient) {
        logger.info('[PatientDetail] Vital deleted - audit trail', {
          entityType: 'vital_sign',
          entityId: deletingVital.id,
          entityName: `${deletingVital.type} - ${vitalToDelete.value}`,
          patientId: patient.id,
          patientName: patient.name,
          action: 'deleted',
          performedBy: user?.uid || 'unknown',
          performedByName: userProfile?.displayName || userProfile?.email || 'Unknown',
          deletedData: vitalToDelete
        })
      }

      toast.success('Vital sign deleted successfully')
      await refetch()
      setDeletingVital(null)
    } catch (error: any) {
      toast.error('Failed to delete vital sign')
      logger.error('[PatientDetail] Error deleting vital', error)
    }
  }

  // RBAC: User can manage family if they're the owner OR an admin
  const canManageFamily = isOwner || adminRole === 'admin'

  const vitalTypes: VitalType[] = [
    'blood_pressure',
    'blood_sugar',
    'pulse_oximeter',
    'temperature',
    'weight'
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">Family member not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={patient.name}
        subtitle={
          <div className="flex items-center gap-2">
            <span className="capitalize">
              {patient.type && `${patient.type} • `}
              {patient.relationship?.replace(/-/g, ' ')}
            </span>
            {role && !isOwner && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                <ShieldCheckIcon className="w-3 h-3" />
                Family Access
              </span>
            )}
          </div>
        }
        backHref="/patients"
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Quick Actions */}
          <aside className="w-full lg:w-64 flex-shrink-0 mb-6 lg:mb-0">
            <div className="lg:sticky lg:top-4">
              <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-2">
                  <button
                    onClick={() => {
                      setActiveTab('info')
                      // Scroll to content on mobile, do nothing on desktop
                      setTimeout(() => {
                        document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                    }}
                    className={`w-full aspect-square lg:aspect-auto p-3 lg:px-4 lg:py-3 rounded-lg transition-colors flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 ${
                      activeTab === 'info'
                        ? 'bg-primary text-white'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                    style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}
                  >
                    <span style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }} className="lg:text-xl">ℹ️</span>
                    <span className="text-center lg:text-left leading-tight font-medium">Patient Info</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('meals')
                      setTimeout(() => {
                        document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                    }}
                    className={`w-full aspect-square lg:aspect-auto p-3 lg:px-4 lg:py-3 rounded-lg transition-colors flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 ${
                      activeTab === 'meals'
                        ? 'bg-primary text-white'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                    style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}
                  >
                    <span style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }} className="lg:text-xl">📸</span>
                    <span className="text-center lg:text-left leading-tight font-medium">Log Meal</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('medications')
                      setTimeout(() => {
                        document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                    }}
                    className={`w-full aspect-square lg:aspect-auto p-3 lg:px-4 lg:py-3 rounded-lg transition-colors flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 ${
                      activeTab === 'medications'
                        ? 'bg-primary text-white'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                    style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}
                  >
                    <span style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }} className="lg:text-xl">💊</span>
                    <span className="text-center lg:text-left leading-tight font-medium">Medications</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowVitalsWizard(true)
                    }}
                    className="w-full aspect-square lg:aspect-auto p-3 lg:px-4 lg:py-3 rounded-lg transition-colors flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 bg-muted hover:bg-muted/80 text-foreground"
                    style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}
                  >
                    <span style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }} className="lg:text-xl">🩺</span>
                    <span className="text-center lg:text-left leading-tight font-medium">Vitals</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAppointmentWizard(true)
                    }}
                    className="w-full aspect-square lg:aspect-auto p-3 lg:px-4 lg:py-3 rounded-lg transition-colors flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 bg-muted hover:bg-muted/80 text-foreground"
                    style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}
                  >
                    <span style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }} className="lg:text-xl">➕</span>
                    <span className="text-center lg:text-left leading-tight font-medium">Schedule Appointment</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('steps')
                      setTimeout(() => {
                        document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                    }}
                    className={`w-full aspect-square lg:aspect-auto p-3 lg:px-4 lg:py-3 rounded-lg transition-colors flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 ${
                      activeTab === 'steps'
                        ? 'bg-primary text-white'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                    style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}
                  >
                    <span style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }} className="lg:text-xl">🚶</span>
                    <span className="text-center lg:text-left leading-tight font-medium">Log Steps</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('appointments')
                      setTimeout(() => {
                        document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                    }}
                    className={`w-full aspect-square lg:aspect-auto p-3 lg:px-4 lg:py-3 rounded-lg transition-colors flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 ${
                      activeTab === 'appointments'
                        ? 'bg-primary text-white'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                    style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}
                  >
                    <span style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }} className="lg:text-xl">📅</span>
                    <span className="text-center lg:text-left leading-tight font-medium">Appointments</span>
                  </button>
                  <Link
                    href={`/shopping?memberId=${patientId}`}
                    className="w-full aspect-square lg:aspect-auto p-3 lg:px-4 lg:py-3 rounded-lg transition-colors flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 bg-muted hover:bg-muted/80 text-foreground"
                    style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}
                  >
                    <span style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }} className="lg:text-xl">🛒</span>
                    <span className="text-center lg:text-left leading-tight font-medium">Shopping List</span>
                  </Link>
                  <button
                    onClick={() => {
                      setActiveTab('recipes')
                      setTimeout(() => {
                        document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                    }}
                    className={`w-full aspect-square lg:aspect-auto p-3 lg:px-4 lg:py-3 rounded-lg transition-colors flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 ${
                      activeTab === 'recipes'
                        ? 'bg-primary text-white'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                    style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}
                  >
                    <span style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }} className="lg:text-xl">🍽️</span>
                    <span className="text-center lg:text-left leading-tight font-medium">Recipes for {patient.name}</span>
                  </button>
                  {canUploadDocuments && (
                    <button
                      onClick={() => setShowDocumentUpload(!showDocumentUpload)}
                      className="w-full aspect-square lg:aspect-auto p-3 lg:px-4 lg:py-3 rounded-lg transition-colors flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 bg-muted hover:bg-muted/80 text-foreground"
                      style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}
                    >
                      <DocumentTextIcon style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }} className="w-8 h-8 lg:w-5 lg:h-5" />
                      <span className="text-center lg:text-left leading-tight font-medium">Upload Documents</span>
                    </button>
                  )}
                </div>

                {/* Document Upload Form */}
                {showDocumentUpload && canUploadDocuments && (
                  <div className="mt-4">
                    <DocumentUpload
                      patientId={patientId}
                      onSuccess={() => {
                        setShowDocumentUpload(false)
                        fetchDocuments()
                        toast.success('Document uploaded!')
                      }}
                      onCancel={() => setShowDocumentUpload(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div id="main-content" className="flex-1 min-w-0">
            {/* Mobile Tab Navigation - Only visible on small screens */}
            <div className="lg:hidden mb-6 overflow-x-auto pb-2 -mx-4 px-4">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'info'
                      ? 'bg-primary text-white'
                      : 'bg-card border border-border text-foreground'
                  }`}
                >
                  ℹ️ Info
                </button>
                <button
                  onClick={() => setActiveTab('vitals')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'vitals'
                      ? 'bg-primary text-white'
                      : 'bg-card border border-border text-foreground'
                  }`}
                >
                  🩺 Vitals
                </button>
                <button
                  onClick={() => setActiveTab('meals')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'meals'
                      ? 'bg-primary text-white'
                      : 'bg-card border border-border text-foreground'
                  }`}
                >
                  📸 Meals
                </button>
                <button
                  onClick={() => setActiveTab('steps')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'steps'
                      ? 'bg-primary text-white'
                      : 'bg-card border border-border text-foreground'
                  }`}
                >
                  🚶 Steps
                </button>
                <button
                  onClick={() => setActiveTab('medications')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'medications'
                      ? 'bg-primary text-white'
                      : 'bg-card border border-border text-foreground'
                  }`}
                >
                  💊 Meds
                </button>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'appointments'
                      ? 'bg-primary text-white'
                      : 'bg-card border border-border text-foreground'
                  }`}
                >
                  📅 Appointments
                </button>
                <button
                  onClick={() => setActiveTab('recipes')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'recipes'
                      ? 'bg-primary text-white'
                      : 'bg-card border border-border text-foreground'
                  }`}
                >
                  🍽️ Recipes
                </button>
              </div>
            </div>

        {/* Vital Reminder Prompt - Shows when vitals are due today */}
        {canLogVitals && user && patient && (() => {
          // DEBUG: Log what we're passing to VitalReminderPrompt
          console.log('[PatientPage] ==== VitalReminderPrompt Debug ====')
          console.log('[PatientPage] Patient object:', patient)
          console.log('[PatientPage] Patient preferences:', patient.preferences)
          console.log('[PatientPage] Vital reminders:', patient.preferences?.vitalReminders)
          console.log('[PatientPage] Vital reminders stringified:', JSON.stringify(patient.preferences?.vitalReminders, null, 2))
          console.log('[PatientPage] Vitals count:', vitals.length)
          console.log('[PatientPage] ===============================')

          // Check if any reminders are enabled
          const enabledReminders = Object.entries(patient.preferences?.vitalReminders || {})
            .filter(([_, config]) => (config as any)?.enabled)
          console.log('[PatientPage] Enabled reminders:', enabledReminders)

          return (
            <VitalReminderPrompt
              patientId={patientId}
              patientName={patient.name}
              vitals={vitals}
              userPreferences={patient.preferences}
              onLogVitalsClick={() => setShowVitalsWizard(true)}
              onLogSpecificVital={(vitalType) => {
                setQuickLogVitalType(vitalType)
                setShowQuickLogModal(true)
              }}
              onDisableReminder={async (vitalType) => {
                // Update patient's vital reminders
                const currentReminders = patient.preferences?.vitalReminders as any
                const updatedReminders = {
                  ...currentReminders,
                  [vitalType]: {
                    enabled: false,
                    frequency: currentReminders?.[vitalType]?.frequency || 'daily'
                  }
                }

                const authToken = await auth.currentUser?.getIdToken()
                const response = await fetch(`/api/patients/${patientId}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                  },
                  body: JSON.stringify({
                    ...patient,
                    preferences: {
                      ...patient.preferences,
                      vitalReminders: updatedReminders
                    }
                  })
                })

                if (!response.ok) {
                  throw new Error('Failed to update patient vital reminders')
                }

                // Refresh patient data
                const result = await response.json()
                setPatient(result.data)
              }}
            />
          )
        })()}

        {/* Health Overview Cards - Desktop only, always visible */}
        {canViewVitals && (
          <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Weight Progress Card */}
            <div className="bg-card rounded-lg shadow-sm p-4 border-l-4 border-primary">
              <div className="flex items-center gap-2 mb-2">
                <ScaleIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Weight</h3>
              </div>
              {healthDataLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-20 mb-1"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              ) : weightTrend && weightTrend.current > 0 ? (
                <>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {weightTrend.current.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">lbs</span>
                  </div>
                  {weightTrend.change !== 0 && (
                    <p className={`text-xs font-medium ${
                      weightTrend.change < 0 ? 'text-success' : 'text-error'
                    }`}>
                      {weightTrend.change > 0 ? '+' : ''}{weightTrend.change.toFixed(1)} lbs
                    </p>
                  )}
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(weightTrend.goalProgress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {weightTrend.goalProgress.toFixed(0)}% to goal
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-2">No data yet</p>
                  {/* Show fix button if patient has no startWeight but is owner */}
                  {isOwner && !patient?.goals?.startWeight && (
                    <button
                      onClick={handleFixStartWeight}
                      disabled={fixingStartWeight}
                      className="w-full text-xs px-2 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors disabled:opacity-50"
                    >
                      {fixingStartWeight ? 'Retrieving...' : '🔧 Retrieve Starting Weight'}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Today's Nutrition Card */}
            <div className="bg-card rounded-lg shadow-sm p-4 border-l-4 border-success">
              <div className="flex items-center gap-2 mb-2">
                <FireIcon className="w-5 h-5 text-success" />
                <h3 className="font-semibold text-foreground text-sm">Today's Calories</h3>
              </div>
              {healthDataLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-20 mb-1"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              ) : nutritionSummary ? (
                <>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {nutritionSummary.todayCalories}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">
                      / {nutritionSummary.goalCalories}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full"
                      style={{ width: `${Math.min((nutritionSummary.todayCalories / nutritionSummary.goalCalories) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">P: </span>
                      <span className="font-medium">{Math.round(nutritionSummary.macros.protein ?? 0)}g</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">C: </span>
                      <span className="font-medium">{Math.round(nutritionSummary.macros.carbs ?? 0)}g</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">F: </span>
                      <span className="font-medium">{Math.round(nutritionSummary.macros.fat ?? 0)}g</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>

            {/* Activity Summary Card */}
            <div className="bg-card rounded-lg shadow-sm p-4 border-l-4 border-accent">
              <div className="flex items-center gap-2 mb-2">
                <CameraIcon className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-foreground text-sm">Activity</h3>
              </div>
              {healthDataLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-20 mb-1"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              ) : stepsSummary ? (
                <>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {stepsSummary.todaySteps?.toLocaleString() || 0}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">steps</span>
                  </div>
                  {stepsSummary.goalSteps > 0 && (
                    <>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${Math.min(((stepsSummary.todaySteps || 0) / stepsSummary.goalSteps) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round(((stepsSummary.todaySteps || 0) / stepsSummary.goalSteps) * 100)}% of {stepsSummary.goalSteps.toLocaleString()} goal
                      </p>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>

            {/* Recent Trends Card */}
            <div className="bg-card rounded-lg shadow-sm p-4 border-l-4 border-secondary">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="w-5 h-5 text-secondary" />
                <h3 className="font-semibold text-foreground text-sm">Trends</h3>
              </div>
              {healthDataLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              ) : stepsSummary && weightTrend && nutritionSummary ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">7-day avg</span>
                    <span className="font-medium text-foreground">
                      {stepsSummary.weeklyAverage?.toLocaleString() || 0} steps
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className={`font-medium ${
                      weightTrend.change < 0 ? 'text-success' : weightTrend.change > 0 ? 'text-error' : 'text-muted-foreground'
                    }`}>
                      {weightTrend.change !== 0
                        ? `${weightTrend.change > 0 ? '+' : ''}${weightTrend.change.toFixed(1)} lbs`
                        : 'Stable'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Today's calories</span>
                    <span className="font-medium text-foreground">
                      {nutritionSummary.todayCalories || 0}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No trend data yet</p>
              )}
            </div>
          </div>
        )}

        {/* Main Content - Switches based on activeTab */}
        <div className="space-y-6">
          {/* Show content based on active tab */}
          {activeTab === 'vitals' && (
            <>
              {/* Quick Action Reminder - Use wizard instead of inline form (DRY) */}
              {canLogVitals && !vitals.length && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <span className="text-4xl">🩺</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Start Tracking Vitals
                      </h3>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                        Use the "Vitals" quick action to record vital signs with our guided wizard.
                      </p>
                      <button
                        onClick={() => setShowVitalsWizard(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Log Vitals Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Vitals Summary Report */}
              {patient && vitals.length > 0 && (
                <DailyVitalsSummary
                  vitals={vitals}
                  patientName={patient.name}
                  patientId={patient.id}
                  caregivers={familyMembers.map(member => ({
                    id: member.id,
                    name: member.name,
                    relationship: member.relationship,
                    userId: member.userId
                  }))}
                />
              )}

              {/* Chart */}
              <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">
                      {selectedVitalType.replace('_', ' ')} Trend
                    </h2>
                  </div>
                  <select
                    value={selectedVitalType}
                    onChange={(e) => setSelectedVitalType(e.target.value as VitalType)}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg bg-card text-foreground"
                  >
                    {vitalTypes.map(type => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                {vitalsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : vitals.filter(v => v.type === selectedVitalType).length > 0 ? (
                  <VitalTrendChart vitals={vitals} type={selectedVitalType} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <p className="text-muted-foreground mb-4">
                      No {selectedVitalType.replace('_', ' ')} readings yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Use the "Vitals" quick action to add readings
                    </p>
                  </div>
                )}
              </div>

              {/* Vitals History Table with Filters */}
              <VitalsHistory
                vitals={vitals}
                onEdit={handleEditVital}
                onDelete={handleDeleteVitalClick}
                canEdit={canLogVitals || isOwner}
                getDisplayName={getDisplayName}
              />
            </>
          )}

          {activeTab === 'meals' && canLogVitals && (
            <div className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">
                Log Meals
              </h2>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-6 border-2 border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <CameraIcon className="w-12 h-12 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-2">
                        AI-Powered Meal Logging
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Use our advanced meal logger with AI photo analysis, nutrition tracking, and barcode scanning for {patient.name}
                      </p>
                      <Link
                        href={`/log-meal?patientId=${patientId}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
                      >
                        <CameraIcon className="w-5 h-5" />
                        Log Meal with AI
                      </Link>
                    </div>
                  </div>
                </div>

                <details className="bg-card rounded-lg border border-border">
                  <summary className="px-4 py-3 cursor-pointer hover:bg-muted transition-colors font-medium text-foreground">
                    Quick Text Entry (Simple)
                  </summary>
                  <div className="px-4 pb-4">
                    <MealLogForm
                      patientId={patientId}
                      onSuccess={refetch}
                    />
                  </div>
                </details>
              </div>
            </div>
          )}

          {activeTab === 'steps' && canLogVitals && (
            <div className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">
                Log Steps
              </h2>
              <StepLogForm
                patientId={patientId}
                onSuccess={refetch}
              />
            </div>
          )}

          {activeTab === 'medications' && (
            <div className="space-y-6">
              {/* Medication Management */}
              <div className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Medications
                </h2>
                {canEditMedications ? (
                  <>
                    <MedicationForm
                      patientId={patientId}
                      onSuccess={() => {
                        fetchMedications()
                        toast.success('Medication added successfully')
                      }}
                    />
                    <div className="mt-6 pt-6 border-t border-border">
                      <h3 className="font-semibold text-foreground mb-4">Current Medications</h3>
                      <MedicationList
                        patientId={patientId}
                        patientOwnerId={patient?.userId}
                        medications={medications}
                        loading={loadingMedications}
                        onMedicationUpdated={fetchMedications}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      You don't have permission to manage medications for this patient.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Contact the account owner to request access.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Schedule Appointment - Uses Wizard */}
              <div className="bg-card rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">
                    Schedule New Appointment
                  </h2>
                  <button
                    onClick={() => setShowAppointmentWizard(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Schedule Appointment
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use the appointment wizard to ensure all details are captured accurately.
                </p>
              </div>

              {/* Appointment List */}
              <div className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  {patient.name}'s Appointments
                </h2>
                <AppointmentList patientId={patientId} />
              </div>
            </div>
          )}

          {/* Patient Info Tab */}
          {activeTab === 'recipes' && (
            <RecipeView patientId={patientId} patientName={patient.name} />
          )}

          {activeTab === 'info' && (
          <div className="overflow-y-auto max-h-[calc(100vh-200px)] space-y-6">
            {/* AI Health Report */}
            {patient && (
              <AIHealthReport
                patient={patient}
                medications={medications}
                vitals={vitals}
                documents={documents}
                todayMeals={todayMeals || []}
                weightData={weightData || []}
                stepsData={stepsData || []}
              />
            )}

            <div className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">
                Family Member Information
              </h2>
              <div className="space-y-3 text-sm">
                {patient.type === 'pet' && (
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-medium capitalize">{patient.type}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Relationship:</span>
                  <span className="ml-2 font-medium capitalize">{patient.relationship}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date of Birth:</span>
                  <span className="ml-2 font-medium">
                    {new Date(patient.dateOfBirth).toLocaleDateString()}
                  </span>
                </div>
                {patient.gender && (
                  <div>
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="ml-2 font-medium capitalize">{patient.gender}</span>
                  </div>
                )}
                {patient.species && (
                  <div>
                    <span className="text-muted-foreground">Species:</span>
                    <span className="ml-2 font-medium">{patient.species}</span>
                  </div>
                )}
                {patient.breed && (
                  <div>
                    <span className="text-muted-foreground">Breed:</span>
                    <span className="ml-2 font-medium">{patient.breed}</span>
                  </div>
                )}
              </div>

              {/* Set as Primary Button */}
              {isOwner && (
                <div className="mt-6 pt-6 border-t border-border">
                  <button
                    onClick={handleSetAsPrimary}
                    disabled={isPrimaryPatient}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isPrimaryPatient
                        ? 'bg-primary/20 text-primary cursor-default'
                        : 'bg-muted hover:bg-primary/10 text-foreground'
                    }`}
                  >
                    {isPrimaryPatient ? (
                      <StarIconSolid className="w-5 h-5" />
                    ) : (
                      <StarIcon className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">
                      {isPrimaryPatient ? 'Primary Patient' : 'Set as Primary Patient'}
                    </span>
                  </button>
                  {!isPrimaryPatient && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      This patient will be shown by default in your dashboard
                    </p>
                  )}
                </div>
              )}

              {/* Access Level Info */}
              {!isOwner && role === 'family' && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <ShieldCheckIcon className="w-4 h-4 text-secondary" />
                    Your Permissions
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">View Vitals</span>
                      <span className={canViewVitals ? 'text-success' : 'text-muted-foreground'}>
                        {canViewVitals ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Vitals</span>
                      <span className={canLogVitals ? 'text-success' : 'text-muted-foreground'}>
                        {canLogVitals ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Edit Profile</span>
                      <span className={canEditProfile ? 'text-success' : 'text-muted-foreground'}>
                        {canEditProfile ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Family Access (Owners Only) */}
              {isOwner && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Family Access
                    </h3>
                    <button
                      onClick={() => setShowFamilyAccess(!showFamilyAccess)}
                      className="text-muted-foreground hover:text-foreground dark:hover:text-gray-300"
                    >
                      {showFamilyAccess ? (
                        <ChevronUpIcon className="w-5 h-5" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowFamilyAccess(!showFamilyAccess)}
                    className="w-full px-4 py-2 bg-primary-light text-primary-dark rounded-lg hover:bg-primary-light dark:hover:bg-purple-900/30 transition-colors text-sm font-medium"
                  >
                    {familyMembers.length === 0
                      ? 'Manage Family Access'
                      : `${familyMembers.length} Family Member${familyMembers.length > 1 ? 's' : ''}`}
                  </button>

                  {/* Collapsible Family Members List */}
                  {showFamilyAccess && (
                    <div className="mt-4 space-y-3 animate-in slide-in-from-top duration-200">
                      {/* Invite Button */}
                      {canManageFamily && (
                        <button
                          onClick={() => setShowInviteModal(true)}
                          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
                        >
                          + Invite Caregiver
                        </button>
                      )}

                      {familyMembersLoading ? (
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground text-center py-4">
                          Loading...
                        </p>
                      ) : familyMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground text-center py-4">
                          No family members have access yet
                        </p>
                      ) : (
                        familyMembers.map(member => (
                          <div
                            key={member.id}
                            className="bg-background rounded-lg p-3 border border-border"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-medium text-sm text-foreground">
                                  {member.name}
                                </p>
                                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                  {member.email}
                                </p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                member.status === 'accepted'
                                  ? 'bg-green-100 text-success-dark dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {member.status}
                              </span>
                            </div>
                            {canManageFamily && (
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => handleEdit(member)}
                                  className="flex-1 px-2 py-1 text-xs bg-primary-light text-primary-dark rounded hover:bg-primary-light dark:hover:bg-purple-900/30"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleRemove(member)}
                                  className="px-2 py-1 text-xs text-error hover:bg-error-light dark:hover:bg-red-900/20 rounded"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
          {/* End Main Content Area */}
          </div>

          {/* Right Sidebar - Recent Data */}
          <aside className="w-full lg:w-80 flex-shrink-0 mt-6 lg:mt-0">
          <div className="lg:sticky lg:top-4 space-y-4">
            {/* Recent Meals - Hide on mobile when Meals tab is active to avoid duplication */}
            <div className={`bg-card rounded-lg shadow-sm border border-border p-4 ${activeTab === 'meals' ? 'hidden lg:block' : ''}`}>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CameraIcon className="w-5 h-5 text-primary" />
                Recent Meals
              </h3>
              {todayMeals && todayMeals.length > 0 ? (
                <div className="space-y-2">
                  {todayMeals.slice(0, 5).map((meal: any) => (
                    <div
                      key={meal.id}
                      onClick={() => setSelectedMeal(meal)}
                      className="flex gap-2 p-2 bg-muted rounded hover:bg-muted/80 transition-colors cursor-pointer"
                    >
                      {/* Meal Photo */}
                      {meal.photoUrl && (
                        <img
                          src={meal.photoUrl}
                          alt={meal.mealType}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      )}

                      {/* Meal Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize text-sm">{meal.mealType}</span>
                          <span className="text-xs text-muted-foreground">
                            {meal.calories || 0} cal
                          </span>
                        </div>
                        {meal.description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {meal.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <Link
                    href={`/log-meal?patientId=${patientId}`}
                    className="block text-center text-sm text-primary hover:text-primary-dark font-medium mt-3"
                  >
                    Log New Meal →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No meals logged yet</p>
                  <Link
                    href={`/log-meal?patientId=${patientId}`}
                    className="text-sm text-primary hover:text-primary-dark font-medium"
                  >
                    Log First Meal →
                  </Link>
                </div>
              )}
            </div>

            {/* Current Medications - Hide on mobile when Medications tab is active to avoid duplication */}
            <div className={`bg-card rounded-lg shadow-sm border border-border p-4 ${activeTab === 'medications' ? 'hidden lg:block' : ''}`}>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="text-lg">💊</span>
                Current Medications
              </h3>
              {loadingMedications ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : medications && medications.length > 0 ? (
                <div className="space-y-2">
                  {(showAllMedications ? medications : medications.slice(0, 5)).map((med) => (
                    <button
                      key={med.id}
                      onClick={() => setSelectedMedication(med)}
                      className="w-full text-left text-sm p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{med.name}</span>
                        {med.prescribedFor && (
                          <span className="text-xs text-purple-600 dark:text-purple-400 capitalize">
                            {med.prescribedFor}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {med.strength} {med.dosageForm}
                        </p>
                        {med.frequency && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground truncate">
                              {med.frequency}
                            </p>
                          </>
                        )}
                      </div>
                      {med.addedBy && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Logged by: {getDisplayName(med.addedBy)}
                        </p>
                      )}
                    </button>
                  ))}
                  {medications.length > 5 && (
                    <button
                      onClick={() => setShowAllMedications(!showAllMedications)}
                      className="w-full text-xs text-center text-primary hover:text-primary-hover font-medium pt-2 transition-colors"
                    >
                      {showAllMedications ? 'Show less' : `+${medications.length - 5} more medications`}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No medications logged yet</p>
              )}
            </div>

            {/* Recent Documents */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-secondary" />
                Recent Documents
              </h3>
              {loadingDocuments ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.slice(0, 5).map((doc) => (
                    <div key={doc.id} className="border border-border rounded-lg overflow-hidden">
                      {/* Document Header */}
                      <div className="p-3 bg-muted">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm truncate">{doc.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {doc.category.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          <span className="capitalize">{doc.fileType}</span>
                        </div>
                      </div>

                      {/* OCR Status & Extracted Text */}
                      <div className="p-3 bg-background">
                        {doc.ocrStatus === 'processing' && (
                          <div className="flex items-center justify-between gap-2 text-xs mb-2">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                              <span>Processing document...</span>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await medicalOperations.documents.updateDocument(patientId, doc.id, {
                                    ocrStatus: 'pending'
                                  })
                                  toast.success('Document status reset')
                                  fetchDocuments()
                                } catch (error) {
                                  toast.error('Failed to reset document')
                                }
                              }}
                              className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            >
                              Stop
                            </button>
                          </div>
                        )}

                        {doc.ocrStatus === 'failed' && (
                          <div className="text-xs text-red-600 dark:text-red-400 mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                            Failed to extract text from document
                          </div>
                        )}

                        {doc.extractedText && (
                          <div className="mb-3">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Extracted Text:</div>
                            <pre className="text-xs bg-muted p-2 rounded font-mono whitespace-pre-wrap overflow-hidden max-h-32 text-foreground">
                              {doc.extractedText.length > 200
                                ? `${doc.extractedText.substring(0, 200)}...`
                                : doc.extractedText}
                            </pre>
                            {doc.extractedText.length > 200 && (
                              <button
                                onClick={() => setSelectedDocument(doc)}
                                className="text-xs text-primary hover:text-primary-dark mt-1"
                              >
                                Show more
                              </button>
                            )}
                          </div>
                        )}

                        {!doc.extractedText && doc.ocrStatus !== 'processing' && doc.ocrStatus !== 'failed' && (
                          <p className="text-xs text-muted-foreground mb-3">No extracted text available</p>
                        )}

                        {/* Document Actions */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedDocument(doc)}
                            className="flex-1 min-w-[100px] text-xs px-3 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-center font-medium flex items-center justify-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                          <a
                            href={doc.originalUrl}
                            download={doc.fileName || doc.name}
                            className="flex-1 min-w-[80px] text-xs px-2 py-1.5 bg-muted hover:bg-muted/80 transition-colors rounded text-foreground text-center"
                            onClick={(e) => {
                              // For Firebase Storage URLs, open in new tab instead of download
                              if (doc.originalUrl.includes('firebasestorage')) {
                                e.preventDefault()
                                window.open(doc.originalUrl, '_blank')
                              }
                            }}
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                  {documents.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground pt-1">
                      +{documents.length - 5} more documents
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No documents yet</p>
                  {canUploadDocuments && (
                    <button
                      onClick={() => setShowDocumentUpload(true)}
                      className="text-sm text-primary hover:text-primary-dark font-medium"
                    >
                      Upload First Document →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Meal Detail Modal */}
      {selectedMeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground capitalize">{selectedMeal.mealType}</h2>
                <button
                  onClick={() => setSelectedMeal(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Meal Photos - Large */}
              {selectedMeal.photoUrl && (
                <div className="mb-6">
                  {/* Main Photo */}
                  <img
                    src={selectedMeal.photoUrl}
                    alt={selectedMeal.mealType}
                    className="w-full h-auto max-h-96 rounded-lg object-cover mb-3"
                  />

                  {/* Additional Photos */}
                  {selectedMeal.additionalPhotos && selectedMeal.additionalPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedMeal.additionalPhotos.map((photoUrl: string, idx: number) => (
                        <img
                          key={idx}
                          src={photoUrl}
                          alt={`${selectedMeal.mealType} - photo ${idx + 2}`}
                          className="w-full h-32 rounded object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Open in new tab for full view
                            window.open(photoUrl, '_blank')
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Meal Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Calories</div>
                    <div className="text-2xl font-bold text-foreground">{selectedMeal.calories || 0}</div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Logged</div>
                    <div className="text-sm font-medium text-foreground">
                      {new Date(selectedMeal.loggedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Macros */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-muted p-3 rounded text-center">
                    <div className="text-xs text-muted-foreground">Protein</div>
                    <div className="text-lg font-bold text-foreground">{selectedMeal.protein || 0}g</div>
                  </div>
                  <div className="bg-muted p-3 rounded text-center">
                    <div className="text-xs text-muted-foreground">Carbs</div>
                    <div className="text-lg font-bold text-foreground">{selectedMeal.carbs || 0}g</div>
                  </div>
                  <div className="bg-muted p-3 rounded text-center">
                    <div className="text-xs text-muted-foreground">Fat</div>
                    <div className="text-lg font-bold text-foreground">{selectedMeal.fat || 0}g</div>
                  </div>
                  <div className="bg-muted p-3 rounded text-center">
                    <div className="text-xs text-muted-foreground">Fiber</div>
                    <div className="text-lg font-bold text-foreground">{selectedMeal.fiber || 0}g</div>
                  </div>
                </div>

                {/* Description */}
                {selectedMeal.description && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">Description</div>
                    <div className="text-sm text-foreground">{selectedMeal.description}</div>
                  </div>
                )}

                {/* Food Items */}
                {selectedMeal.foodItems && selectedMeal.foodItems.length > 0 && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">Food Items</div>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedMeal.foodItems.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-foreground">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vitals History Modal */}
      {showVitalsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Vitals History</h2>
                <button
                  onClick={() => setShowVitalsModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Group vitals by type */}
              {(() => {
                const vitalsByType = new Map<string, any[]>()
                vitals.forEach((vital: any) => {
                  if (!vitalsByType.has(vital.type)) {
                    vitalsByType.set(vital.type, [])
                  }
                  vitalsByType.get(vital.type)?.push(vital)
                })

                // Sort each group by date descending
                vitalsByType.forEach((vitalsArray) => {
                  vitalsArray.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
                })

                return (
                  <div className="space-y-6">
                    {Array.from(vitalsByType.entries()).map(([type, typeVitals]) => (
                      <div key={type} className="border border-border rounded-lg p-4">
                        <h3 className="font-semibold text-foreground mb-3 capitalize">
                          {type.replace('_', ' ')}
                        </h3>
                        <div className="space-y-2">
                          {typeVitals.map((vital: any) => {
                            const displayValue = typeof vital.value === 'object'
                              ? `${vital.value.systolic}/${vital.value.diastolic}`
                              : vital.value

                            return (
                              <div key={vital.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                <span className="text-sm font-medium text-foreground">
                                  {displayValue} {vital.unit}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(vital.recordedAt).toLocaleString()}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingMember && editPermissions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Edit Permissions
                  </h2>
                  <p className="text-muted-foreground">
                    {editingMember.name} - {patient?.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingMember(null)
                    setEditPermissions(null)
                  }}
                  className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <PermissionsMatrix
                permissions={editPermissions}
                onChange={setEditPermissions}
              />

              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
                <button
                  onClick={handleSavePermissions}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Save Permissions
                </button>
                <button
                  onClick={() => {
                    setEditingMember(null)
                    setEditPermissions(null)
                  }}
                  className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </main>

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        preSelectedPatientId={patientId}
      />

      {/* Document Detail Modal */}
      {selectedDocument && (
        <DocumentDetailModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onDelete={fetchDocuments}
          canDelete={canDeleteDocuments}
        />
      )}

      {/* PDF Viewer Modal */}
      {pdfViewerUrl && (
        <PDFViewerModal
          pdfUrl={pdfViewerUrl}
          fileName={pdfViewerName}
          onClose={() => {
            setPdfViewerUrl(null)
            setPdfViewerName('')
          }}
        />
      )}

      {/* Medication Detail Modal */}
      {selectedMedication && (
        <MedicationDetailModal
          medication={selectedMedication}
          onClose={() => setSelectedMedication(null)}
          patientId={patientId}
          onMedicationUpdated={fetchMedications}
        />
      )}

      {/* Delete Vital Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingVital}
        onClose={() => setDeletingVital(null)}
        onConfirm={confirmDeleteVital}
        title="Delete Vital Sign"
        message={`Delete this ${deletingVital?.type.replace('_', ' ')} reading? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Vitals Wizard Integration */}
      {patient && showVitalsWizard && (() => {
        console.log('[PatientDetail] Opening vitals wizard with familyMembers:', JSON.stringify(familyMembers, null, 2))
        const caregivers = familyMembers.map(member => {
          console.log('[PatientDetail] Mapping family member:', {
            id: member.id,
            name: member.name,
            relationship: member.relationship,
            userId: member.userId,
            status: member.status,
            hasUserId: !!member.userId
          })
          return {
            id: member.id,
            name: member.name,
            relationship: member.relationship,
            userId: member.userId
          }
        })
        console.log('[PatientDetail] Mapped caregivers:', caregivers)

        return (
          <SupervisedVitalsWizard
            isOpen={showVitalsWizard}
            onClose={() => setShowVitalsWizard(false)}
            familyMember={{
              id: patient.id,
              name: patient.name,
              age: calculateAge(patient.dateOfBirth),
              conditions: patient.healthConditions || []
            }}
            caregivers={caregivers}
          onSubmit={async (vitals) => {
            try {
              logger.info('[PatientDetail] Submitting vitals from wizard', {
                patientId: patient.id,
                vitals,
                loggedBy: vitals.loggedBy,
                loggedByUserId: vitals.loggedBy?.userId
              })

              // Use shared transformation utility (DRY principle)
              const vitalInputs = transformWizardDataToVitals(vitals)

              logger.info('[PatientDetail] Transformed vitals', {
                vitalInputs,
                takenByValues: vitalInputs.map(v => ({ type: v.type, takenBy: v.takenBy }))
              })

              // Validate at least one vital was recorded
              if (!hasAnyVitalMeasurement(vitals)) {
                toast.error('Please record at least one vital sign measurement.')
                return
              }

              // Append mood data to notes if mood was recorded
              let enhancedNotes = vitals.notes || ''
              if (vitals.mood) {
                const moodEmoji = vitals.mood === 'happy' ? '😊' :
                                 vitals.mood === 'calm' ? '😌' :
                                 vitals.mood === 'okay' ? '😐' :
                                 vitals.mood === 'worried' ? '😟' :
                                 vitals.mood === 'sad' ? '😢' :
                                 vitals.mood === 'pain' ? '😫' : '😐'

                const moodSection = `[MOOD: ${moodEmoji} ${vitals.mood}]${vitals.moodNotes ? `\n${vitals.moodNotes}` : ''}`
                enhancedNotes = enhancedNotes ? `${moodSection}\n\n${enhancedNotes}` : moodSection
              }

              // Add enhanced notes to all vitals
              const vitalInputsWithMood = vitalInputs.map(input => ({
                ...input,
                notes: enhancedNotes
              }))

              // Save all vitals
              const savedVitals: VitalSign[] = []
              for (const vitalInput of vitalInputsWithMood) {
                const saved = await medicalOperations.vitals.logVital(patient.id, {
                  ...vitalInput,
                  unit: vitalInput.unit as VitalUnit
                })
                savedVitals.push(saved)
              }

              logger.info('[PatientDetail] Vitals saved successfully', { count: savedVitals.length })

              // Create schedules if user enabled them
              if (vitals.schedulePreferences?.enabled && user) {
                const { vitalTypes, frequency, times, notificationChannels } = vitals.schedulePreferences

                logger.info('[PatientDetail] Creating vital monitoring schedules', {
                  vitalTypes,
                  frequency,
                  times
                })

                // Create a schedule for each selected vital type
                for (const vitalType of vitalTypes) {
                  try {
                    await createSchedule({
                      userId: user.uid,
                      patientId: patient.id,
                      patientName: patient.name,
                      vitalType: vitalType as any, // Maps 'blood_pressure', 'blood_sugar', etc.
                      frequency: frequency as any,
                      specificTimes: times,
                      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // User's timezone
                      notificationChannels: {
                        ...notificationChannels,
                        voice: [] // Voice assistants not configured yet
                      },
                      advanceReminderMinutes: 15,
                      complianceTarget: 90,
                      complianceWindow: 2
                    })

                    logger.info('[PatientDetail] Schedule created', { vitalType })
                  } catch (scheduleError) {
                    logger.error('[PatientDetail] Failed to create schedule', scheduleError as Error, {
                      vitalType
                    })
                    // Don't fail the whole operation if schedule creation fails
                    toast.error(`Warning: Could not set up reminder for ${vitalType}`)
                  }
                }

                toast.success(`Reminders set up for ${vitalTypes.length} vital${vitalTypes.length !== 1 ? 's' : ''}!`, {
                  duration: 4000
                })
              }

              // Store saved vitals and mood data for summary
              setSummaryVitals(savedVitals)
              setSummaryMood(vitals.mood)
              setSummaryMoodNotes(vitals.moodNotes)

              // Refresh vitals data in real-time
              await refetch()

              // Show summary modal
              setShowVitalsSummary(true)

              // Close wizard
              setShowVitalsWizard(false)

              toast.success(`${savedVitals.length} vital sign${savedVitals.length !== 1 ? 's' : ''} logged successfully!`)
            } catch (error) {
              logger.error('[PatientDetail] Failed to save vitals', error instanceof Error ? error : undefined)
              toast.error(`Failed to save vitals: ${error instanceof Error ? error.message : 'Unknown error'}`)
              throw error
            }
          }}
          />
        )
      })()}

      {/* Vitals Summary Modal */}
      {patient && (
        <VitalsSummaryModal
          vitals={summaryVitals}
          patientName={patient.name}
          patientId={patient.id}
          mood={summaryMood}
          moodNotes={summaryMoodNotes}
          isOpen={showVitalsSummary}
          onClose={() => {
            setShowVitalsSummary(false)
            setSummaryVitals([])
            setSummaryMood(undefined)
            setSummaryMoodNotes(undefined)
          }}
          onViewDashboard={() => {
            setShowVitalsSummary(false)
            setSummaryVitals([])
            setSummaryMood(undefined)
            setSummaryMoodNotes(undefined)
            setActiveTab('vitals')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          caregivers={familyMembers.map(member => ({
            id: member.id,
            name: member.name,
            relationship: member.relationship,
            userId: member.userId
          }))}
        />
      )}

      {/* Appointment Wizard */}
      {patient && showAppointmentWizard && (
        <AppointmentWizard
          isOpen={showAppointmentWizard}
          onClose={() => setShowAppointmentWizard(false)}
          familyMember={{
            id: patient.id,
            name: patient.name
          }}
          providers={providers}
          familyMembers={familyMembers}
          onProviderAdded={refetchProviders}
          onSubmit={async (appointmentData) => {
            try {
              logger.info('[PatientDetail] Creating appointment from wizard', {
                patientId: patient.id,
                appointmentData
              })

              const provider = providers.find(p => p.id === appointmentData.providerId)

              const appointmentId = await createAppointment({
                userId: user?.uid || '',
                patientId: patient.id,
                patientName: patient.name,
                providerName: provider?.name || 'Unknown Provider',
                updatedAt: new Date().toISOString(),
                ...appointmentData,
                dateTime: appointmentData.dateTime.toISOString(),
                pickupTime: appointmentData.pickupTime instanceof Date ? appointmentData.pickupTime.toISOString() : appointmentData.pickupTime,
                providerId: appointmentData.providerId || '', // Ensure providerId is always a string
                status: 'scheduled',
                createdFrom: 'manual',
                driverStatus: appointmentData.requiresDriver
                  ? (appointmentData.assignedDriverId ? 'pending' : 'pending')
                  : 'not-needed'
              })

              logger.info('[PatientDetail] Appointment created successfully', { appointmentId })

              toast.success('Appointment scheduled successfully!')
              setShowAppointmentWizard(false)

              // Redirect to calendar view
              router.push('/calendar')
            } catch (error) {
              logger.error('[PatientDetail] Failed to create appointment', error instanceof Error ? error : undefined)
              throw error
            }
          }}
        />
      )}

      {/* Quick Vital Log Modal */}
      {patient && quickLogVitalType && (
        <VitalQuickLogModal
          isOpen={showQuickLogModal}
          onClose={() => {
            setShowQuickLogModal(false)
            setQuickLogVitalType(null)
          }}
          vitalType={quickLogVitalType}
          patientName={patient.name}
          onSubmit={async (vitalData) => {
            await handleLogVital(vitalData)
            setShowQuickLogModal(false)
            setQuickLogVitalType(null)
          }}
        />
      )}
    </div>
  )
}
