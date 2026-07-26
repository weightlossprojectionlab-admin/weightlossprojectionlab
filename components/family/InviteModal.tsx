/**
 * Family Invitation Modal — batch-capable.
 *
 * Invite one OR several people at once. Each invitee is an independent row with
 * its own family-member selection + permissions (people often differ), so the
 * form is a list of collapsible rows. "Add another person" clones the previous
 * row's permissions, so the common case (several people, same access) is fast —
 * just change the email — while different access is a per-row edit.
 *
 * The backend already invites one recipient per call, so batch = a client-side
 * loop over sendInvitation with partial-success handling: valid rows send, and
 * any that fail (bad email, already invited) stay flagged inline for a fix.
 */

'use client'

import { useState, useEffect } from 'react'
import { usePatients } from '@/hooks/usePatients'
import { useInvitations } from '@/hooks/useInvitations'
import { useAuth } from '@/hooks/useAuth'
import { PERMISSION_PRESETS } from '@/lib/family-permissions'
import { hasAdminPrivileges } from '@/lib/family-roles'
import { useLockedAction } from '@/hooks/useLockedAction'
import { LockClosedIcon } from '@heroicons/react/24/solid'
import { ChevronDownIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  InviteePermissionFields,
  invitePermissions,
  PRESET_LABEL,
  type InviteeDraft,
} from './InviteePermissionFields'
import type { FamilyRole } from '@/types/medical'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  preSelectedPatientId?: string
  onSuccess?: () => void
  currentUserRole?: FamilyRole // Pass from parent to enable role assignment
}

let seq = 0
const makeInvitee = (base?: Partial<InviteeDraft>, preSelectedPatientId?: string): InviteeDraft => ({
  id: `inv-${(seq += 1)}`,
  email: '',
  phone: '',
  patientsShared: base?.patientsShared ?? (preSelectedPatientId ? [preSelectedPatientId] : []),
  role: base?.role ?? 'caregiver',
  permissionPreset: base?.permissionPreset ?? 'CAREGIVER',
  customPermissions: base?.customPermissions ?? PERMISSION_PRESETS.CAREGIVER,
  message: '',
  collapsed: false,
})

const isValidEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim())

export function InviteModal({
  isOpen,
  onClose,
  preSelectedPatientId,
  onSuccess,
  currentUserRole = 'caregiver',
}: InviteModalProps) {
  const { patients } = usePatients()
  const { sendInvitation, revokeInvitation } = useInvitations(false)
  const { user } = useAuth()
  const myEmail = (user?.email || '').trim().toLowerCase()
  // Feature-access gate — terminated subscribers can't invite new caregivers.
  const inviteCaregiverLock = useLockedAction()
  const canAssignRoles = hasAdminPrivileges(currentUserRole)

  const [invitees, setInvitees] = useState<InviteeDraft[]>(() => [
    makeInvitee(undefined, preSelectedPatientId),
  ])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  // Reset to a single fresh row whenever the modal closes.
  useEffect(() => {
    if (!isOpen) {
      setInvitees([makeInvitee(undefined, preSelectedPatientId)])
      setLoading(false)
      setSummary(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  const preSelectedPatient = preSelectedPatientId
    ? patients.find((p) => p.id === preSelectedPatientId) ?? null
    : null

  const update = (id: string, patch: Partial<InviteeDraft>) =>
    setInvitees((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)))

  const addInvitee = () =>
    setInvitees((prev) => {
      const last = prev[prev.length - 1]
      const clone = makeInvitee(
        {
          patientsShared: last?.patientsShared,
          role: last?.role,
          permissionPreset: last?.permissionPreset,
          customPermissions: last?.customPermissions,
        },
        preSelectedPatientId,
      )
      return [...prev.map((i) => ({ ...i, collapsed: true })), clone]
    })

  const removeInvitee = (id: string) =>
    setInvitees((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev))

  const rowError = (inv: InviteeDraft): string | null => {
    if (!isValidEmail(inv.email)) return 'Enter a valid email'
    if (inv.email.trim().toLowerCase() === myEmail)
      return "You can't invite yourself as your own caregiver"
    if (inv.patientsShared.length === 0) return 'Select at least one family member'
    return null
  }

  const sendOne = (inv: InviteeDraft) =>
    sendInvitation({
      recipientEmail: inv.email.trim(),
      ...(inv.phone.trim() && { recipientPhone: inv.phone.trim() }),
      patientsShared: inv.patientsShared,
      permissions: invitePermissions(inv),
      familyRole: inv.role, // include role so permissions match on acceptance
      ...(inv.message.trim() && { message: inv.message.trim() }),
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteCaregiverLock.isLocked) {
      inviteCaregiverLock.onLockedClick()
      return
    }

    // Count emails so a repeat within the same batch can be flagged.
    const emailCounts = new Map<string, number>()
    invitees.forEach((inv) => {
      const e = inv.email.trim().toLowerCase()
      if (e) emailCounts.set(e, (emailCounts.get(e) || 0) + 1)
    })

    // Validate every row up front; expand + flag any that fail.
    let anyInvalid = false
    setInvitees((prev) =>
      prev.map((inv) => {
        const e = inv.email.trim().toLowerCase()
        const err =
          rowError(inv) || (e && (emailCounts.get(e) || 0) > 1 ? 'Duplicate email in this batch' : null)
        if (err) anyInvalid = true
        return { ...inv, error: err ?? undefined, existingInvitationId: undefined, collapsed: err ? false : inv.collapsed }
      }),
    )
    if (anyInvalid) {
      setSummary(null)
      return
    }

    setLoading(true)
    setSummary(null)

    // Sequential — keeps per-row error mapping simple and is gentle on the API.
    const rows = invitees
    const results: Array<{ id: string; ok: boolean; error?: string; existingInvitationId?: string }> = []
    for (const inv of rows) {
      try {
        await sendOne(inv)
        results.push({ id: inv.id, ok: true })
      } catch (error: any) {
        const existingInvitationId = error?.details?.existingInvitation?.id
        results.push({
          id: inv.id,
          ok: false,
          existingInvitationId,
          error: existingInvitationId
            ? 'A pending invite to this email already exists'
            : error?.message || 'Could not send this invite',
        })
      }
    }
    setLoading(false)

    const okIds = new Set(results.filter((r) => r.ok).map((r) => r.id))
    const failed = results.filter((r) => !r.ok)
    const sentCount = results.length - failed.length
    if (sentCount > 0) onSuccess?.()

    if (failed.length === 0) {
      onClose()
      return
    }

    // Drop the sent rows; keep + annotate the failures.
    setInvitees((prev) =>
      prev
        .filter((inv) => !okIds.has(inv.id))
        .map((inv) => {
          const r = results.find((x) => x.id === inv.id)
          return r ? { ...inv, error: r.error, existingInvitationId: r.existingInvitationId, collapsed: false } : inv
        }),
    )
    setSummary(
      sentCount > 0
        ? `Sent ${sentCount} invite${sentCount !== 1 ? 's' : ''}. ${failed.length} need${failed.length === 1 ? 's' : ''} attention below.`
        : `Couldn't send ${failed.length} invite${failed.length !== 1 ? 's' : ''} — see below.`,
    )
  }

  const revokeAndResend = async (inv: InviteeDraft) => {
    if (!inv.existingInvitationId) return
    setLoading(true)
    try {
      await revokeInvitation(inv.existingInvitationId)
      await sendOne(inv)
      onSuccess?.()
      const remaining = invitees.filter((i) => i.id !== inv.id)
      setInvitees(remaining.length ? remaining : [makeInvitee(undefined, preSelectedPatientId)])
      if (remaining.length === 0) onClose()
    } catch (error: any) {
      update(inv.id, { error: error?.message || 'Could not resend' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {invitees.length > 1 ? 'Invite family members' : 'Invite a family member'}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {summary && (
              <p className="text-sm bg-muted rounded-lg px-4 py-2 text-foreground">{summary}</p>
            )}

            {invitees.map((inv, idx) => {
              const memberCount = inv.patientsShared.length
              return (
                <div
                  key={inv.id}
                  className={`border-2 rounded-lg ${inv.error ? 'border-error' : 'border-border'}`}
                >
                  <div className="p-4 space-y-3">
                    {/* Row header: email + collapse + remove */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Email address {invitees.length > 1 ? `#${idx + 1}` : ''} *
                        </label>
                        <input
                          type="email"
                          value={inv.email}
                          onChange={(e) => update(inv.id, { email: e.target.value, error: undefined })}
                          className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                          placeholder="family.member@example.com"
                        />
                        {inv.collapsed && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {PRESET_LABEL[inv.permissionPreset]} · {memberCount} member
                            {memberCount !== 1 ? 's' : ''}
                            {preSelectedPatient ? ` · ${preSelectedPatient.name}` : ''}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => update(inv.id, { collapsed: !inv.collapsed })}
                        className="mt-6 p-2 text-muted-foreground hover:bg-muted rounded-lg"
                        aria-label={inv.collapsed ? 'Expand invitee' : 'Collapse invitee'}
                      >
                        <ChevronDownIcon
                          className={`w-5 h-5 transition-transform ${inv.collapsed ? '' : 'rotate-180'}`}
                        />
                      </button>
                      {invitees.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInvitee(inv.id)}
                          className="mt-6 p-2 text-muted-foreground hover:text-error hover:bg-muted rounded-lg"
                          aria-label="Remove invitee"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {inv.error && <p className="text-sm text-error">{inv.error}</p>}

                    {inv.existingInvitationId && (
                      <div className="bg-warning-light border-2 border-warning rounded-lg p-3">
                        <p className="text-xs text-warning-dark mb-2">
                          A pending invite to <strong>{inv.email}</strong> already exists.
                        </p>
                        <button
                          type="button"
                          onClick={() => revokeAndResend(inv)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-warning text-white rounded-lg text-sm disabled:opacity-50 hover:bg-warning-dark transition-colors"
                        >
                          {loading ? 'Working…' : 'Revoke & resend'}
                        </button>
                      </div>
                    )}

                    {/* Body: phone + full permission editor */}
                    {!inv.collapsed && (
                      <div className="pt-2 space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Phone number (optional)
                          </label>
                          <input
                            type="tel"
                            value={inv.phone}
                            onChange={(e) => update(inv.id, { phone: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                        <InviteePermissionFields
                          invitee={inv}
                          patients={patients}
                          canAssignRoles={canAssignRoles}
                          currentUserRole={currentUserRole}
                          preSelectedPatient={preSelectedPatient}
                          onChange={(patch) => update(inv.id, patch)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Add another person */}
            <button
              type="button"
              onClick={addInvitee}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-lg text-primary font-medium hover:bg-primary-light/40 transition-colors"
            >
              <PlusIcon className="w-5 h-5" /> Add another person
            </button>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type={inviteCaregiverLock.isLocked ? 'button' : 'submit'}
                onClick={inviteCaregiverLock.isLocked ? inviteCaregiverLock.onLockedClick : undefined}
                disabled={loading && !inviteCaregiverLock.isLocked}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium inline-flex items-center justify-center gap-2"
              >
                {inviteCaregiverLock.isLocked && <LockClosedIcon className="w-4 h-4" />}
                {inviteCaregiverLock.isLocked
                  ? 'Paused — Send invitations'
                  : loading
                    ? 'Sending…'
                    : invitees.length > 1
                      ? `Send ${invitees.length} invitations`
                      : 'Send invitation'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
