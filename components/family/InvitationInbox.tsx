/**
 * Invitation inbox
 *
 * Surfaces the pending invitations a caregiver has RECEIVED, in-app, with
 * one-tap accept / decline — so a caregiver never has to hunt through email
 * to act on an invite, and so new-patient assignments to an already-onboarded
 * caregiver land here instead of forcing a full re-invitation.
 *
 * DRY: reads the same `receivedInvitations` + accept/decline that
 * `useInvitations` already exposes (identical to the /family/dashboard
 * "Received Invitations" section). Renders nothing when the inbox is empty,
 * so it's safe to mount at the top of any dashboard.
 */

'use client'

import { useState } from 'react'
import { useInvitations } from '@/hooks/useInvitations'
import type { FamilyInvitation, FamilyMemberPermissions } from '@/types/medical'

function formatDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Short human labels for the "what you'd be able to do" chips, in the order we
// want to surface them. Kept small on purpose — the goal is a quick sense of
// scope, not an exhaustive audit.
const PERMISSION_LABELS: Array<[keyof FamilyMemberPermissions, string]> = [
  ['viewMedicalRecords', 'View records'],
  ['editMedications', 'Manage meds'],
  ['logVitals', 'Log vitals'],
  ['viewVitals', 'View vitals'],
  ['scheduleAppointments', 'Book appointments'],
  ['editAppointments', 'Edit appointments'],
  ['uploadDocuments', 'Upload documents'],
  ['editPatientProfile', 'Edit profile'],
  ['viewSensitiveInfo', 'View sensitive info'],
  ['chatAccess', 'Chat'],
]

function permissionSummary(perms?: FamilyMemberPermissions): string[] {
  if (!perms) return []
  const out = PERMISSION_LABELS.filter(([k]) => perms[k]).map(([, label]) => label)
  // Log implies view — don't show both.
  return out.includes('Log vitals') ? out.filter((l) => l !== 'View vitals') : out
}

// Human list: ["Jimmy"] → "Jimmy"; ["A","B"] → "A and B"; ["A","B","C"] → "A, B and C".
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function InvitationInbox({ className }: { className?: string }) {
  const { receivedInvitations, loading, acceptInvitation, declineInvitation } = useInvitations()
  const [busy, setBusy] = useState<string | null>(null)

  // Nothing pending → render nothing (no empty-state clutter on the dashboard).
  if (loading || receivedInvitations.length === 0) return null

  const handleAccept = async (id: string) => {
    setBusy(id)
    try {
      // The hook handles optimistic removal + the success toast.
      await acceptInvitation(id)
      // Accepting grants a new account + patients + permissions. Soft-reload so
      // every derived surface (account switcher, patient lists, caregiver
      // context) reflects it without a manual refresh — same pattern
      // UpgradeModal uses after a plan change. Leave the button in its busy
      // state until the reload takes over.
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload()
      }, 600)
    } catch {
      // Hook already toasted + reverted the optimistic removal.
      setBusy(null)
    }
  }

  const handleDecline = async (id: string) => {
    setBusy(id)
    try {
      await declineInvitation(id)
    } finally {
      setBusy(null)
    }
  }

  const count = (inv: FamilyInvitation) => inv.patientsShared?.length ?? 0

  return (
    <section
      className={`bg-card rounded-lg border-2 border-primary/30 p-4 space-y-3 ${className ?? ''}`}
      aria-label="Invitation inbox"
      data-testid="invitation-inbox"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>📨</span>
        <h2 className="text-base font-semibold text-foreground">
          Invitation inbox ({receivedInvitations.length})
        </h2>
      </div>

      <div className="space-y-3">
        {receivedInvitations.map((inv) => {
          const n = count(inv)
          const role = (inv.familyRole || 'caregiver').replace(/_/g, ' ')
          const isBusy = busy === inv.id
          // Prefer a real inviter name; fall back to their email when the
          // stored name is the generic placeholder.
          const genericName = !inv.invitedByName || /^a family member$/i.test(inv.invitedByName)
          const inviter = genericName ? (inv.invitedByEmail || 'Someone') : inv.invitedByName
          const names = inv.patientNames ?? []
          const who = names.length > 0 ? joinNames(names) : n > 0 ? `${n} ${n === 1 ? 'person' : 'people'}` : 'their household'
          const perms = permissionSummary(inv.permissions as unknown as FamilyMemberPermissions)
          return (
            <div
              key={inv.id}
              data-testid={`invitation-card-${inv.id}`}
              className="rounded-lg border border-border bg-background p-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1.5">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{inviter}</span>{' '}
                  {inv.deliveryMethod === 'in_app' ? (
                    <>wants you to help care for </>
                  ) : (
                    <>
                      invited you to help as <span className="font-medium capitalize">{role}</span> for{' '}
                    </>
                  )}
                  <span className="font-medium text-foreground">{who}</span>
                </p>

                {perms.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {perms.map((label) => (
                      <span
                        key={label}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Role: <span className="capitalize">{role}</span>
                  {inv.createdAt ? ` · sent ${formatDate(inv.createdAt)}` : ''}
                  {inv.expiresAt ? ` · expires ${formatDate(inv.expiresAt)}` : ''}
                </p>

                {inv.message && (
                  <p className="text-xs text-muted-foreground italic truncate">“{inv.message}”</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDecline(inv.id)}
                  disabled={isBusy}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(inv.id)}
                  disabled={isBusy}
                  className="px-3 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {isBusy ? 'Working…' : 'Accept'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
