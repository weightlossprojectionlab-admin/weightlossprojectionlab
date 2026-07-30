/**
 * Family Snapshot Card
 *
 * Server component. A client is a HOUSEHOLD, so this is a household SUMMARY —
 * avatar, name, email, Active/Inactive badge, joined date, a care-recipient
 * count + names, last activity, and a Remove button. It deliberately does NOT
 * show one member's meal/weight/vital/meds: a household doesn't have a single
 * blood pressure. Per-member health lives in the client-detail view (click the
 * card). (Earlier this mirrored the consumer PatientSnapshotCard and showed the
 * primary patient's chart under the family name — a consumer-app leak.)
 */

import { formatDate, isActive } from './_lib/load-families'
import type { ManagedFamily } from './_lib/load-families'
import RemoveFamilyButton from './families/RemoveFamilyButton'

interface Props {
  family: ManagedFamily
  tenantId: string
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return formatDate(iso)
  } catch {
    return '—'
  }
}

export default function FamilySnapshotCard({ family, tenantId }: Props) {
  const active = isActive(family.lastActiveAt)
  const initial = (family.name.charAt(0) || '?').toUpperCase()
  const names = family.memberNames || []
  const extra = names.length > 3 ? names.length - 3 : 0

  return (
    <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all">
      {/* Header: avatar + name + email */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-lg font-bold shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {family.name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {family.email}
          </p>
        </div>
      </div>

      {/* Status + joined date */}
      <div className="flex items-center justify-between text-sm mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
            active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
          {active ? 'Active' : 'Inactive'}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Joined {formatDate(family.joinedPlatformAt)}
        </span>
      </div>

      {/* Household summary — care recipients + last activity across the
          household. Per-member health (meal/weight/vital/meds) is in the
          client-detail view; a household summary doesn't show one member's chart. */}
      <div className="space-y-2 text-sm border-t border-gray-100 dark:border-gray-700 pt-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <span className="text-base">👥</span> Care recipients
          </span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            {family.memberCount}
          </span>
        </div>

        {names.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {names.slice(0, 3).join(', ')}
            {extra > 0 ? ` +${extra} more` : ''}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <span className="text-base">🕑</span> Last activity
          </span>
          <span className="text-gray-700 dark:text-gray-300">
            {relativeTime(family.lastActiveAt)}
          </span>
        </div>
      </div>

      {/* Remove button */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
        <RemoveFamilyButton
          tenantId={tenantId}
          familyId={family.id}
          familyName={family.name}
        />
      </div>
    </div>
  )
}
