/**
 * Patient Family Members Page
 *
 * View and manage family members who have access to a specific patient
 * Edit permissions and remove access
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useFamilyMembers } from '@/hooks/useFamilyMembers'
import { usePatients } from '@/hooks/usePatients'
import { PageHeader } from '@/components/ui/PageHeader'
import { FamilyMemberCard } from '@/components/family/FamilyMemberCard'
import { PermissionsMatrix } from '@/components/family/PermissionsMatrix'
import AuthGuard from '@/components/auth/AuthGuard'
import type { FamilyMember, FamilyMemberPermissions } from '@/types/medical'

export default function PatientFamilyPage() {
  return (
    <AuthGuard>
      <PatientFamilyContent />
    </AuthGuard>
  )
}

function PatientFamilyContent() {
  const params = useParams()
  const patientId = params.patientId as string

  const { patients } = usePatients()
  const { familyMembers, loading, updateMemberPermissions, removeMember } = useFamilyMembers({
    patientId
  })

  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [editPermissions, setEditPermissions] = useState<FamilyMemberPermissions | null>(null)

  const patient = patients.find(p => p.id === patientId)

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
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleRemove = async (member: FamilyMember) => {
    if (confirm(`Remove ${member.name}'s access to ${patient?.name}?`)) {
      await removeMember(member.id)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={`Family Access - ${patient?.name || 'Patient'}`}
        subtitle="Manage who can access this patient's records"
        backHref={`/patients/${patientId}`}
      />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground dark:text-muted-foreground">Loading family members...</p>
          </div>
        ) : familyMembers.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border-2 border-border">
            <p className="text-muted-foreground dark:text-muted-foreground mb-4">
              No family members have access to this patient yet
            </p>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              Invite family members from the Family page to share access
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {familyMembers.map(member => (
              <FamilyMemberCard
                key={member.id}
                member={member}
                onEdit={handleEdit}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </main>

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
    </div>
  )
}
