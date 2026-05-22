'use client'

import { useAccount } from '@/contexts/AccountContext'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { capitalizeName } from '@/lib/utils'
import { getPatientDisplayName } from '@/lib/life-stage-utils'

export function SwitchAccountButton() {
  const { selectedPatient, clearSelection } = useAccount()
  const router = useRouter()
  const pathname = usePathname()

  // Only show if we have a selected patient and we're not already on the patients page
  if (!selectedPatient || pathname === '/patients') {
    return null
  }

  const handleSwitchAccount = () => {
    clearSelection()
    router.push('/patients')
  }

  // Account switcher is an everyday surface — show nickname-or-name,
  // proper-cased. capitalizeName is defensive so legacy data with
  // weird casing still renders properly.
  const displayName = capitalizeName(getPatientDisplayName(selectedPatient))

  return (
    <button
      onClick={handleSwitchAccount}
      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted-dark text-foreground rounded-lg transition-colors"
      title={`Currently managing: ${displayName}`}
    >
      <span className="hidden sm:inline">{displayName}</span>
      <ArrowsRightLeftIcon className="w-4 h-4" />
      <span className="hidden md:inline text-xs">Switch</span>
    </button>
  )
}
