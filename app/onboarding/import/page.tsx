/**
 * Spreadsheet Import — entity picker.
 *
 * Lands here when the user clicks "Import" anywhere in the app.
 * Each card routes to a per-entity wizard (Phase 1: family
 * members; Phase 2: weight logs; Phases 3+ to follow). Picker
 * lives at /onboarding/import; sub-pages at
 * /onboarding/import/{entity}.
 *
 * Why a picker rather than a single tabbed wizard: each entity
 * has its own validation rules, optional patient-matching step,
 * and result summary. Trying to thread all of that through a
 * single component would be premature generalization on two
 * concrete examples — see the comment at the top of
 * patient-import-config.ts.
 */

'use client'

import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { useCanImport } from '@/hooks/useCanImport'
import { UserGroupIcon, ScaleIcon } from '@heroicons/react/24/outline'

export default function ImportPickerPage() {
  return (
    <AuthGuard>
      <ImportPickerContent />
    </AuthGuard>
  )
}

function ImportPickerContent() {
  const { canImport, reason } = useCanImport()

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Import data"
        subtitle="Bring your existing spreadsheets into your household"
        backHref="/patients"
      />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {!canImport ? (
          <NotAllowed reason={reason} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <ImportCard
              href="/onboarding/import/patients"
              icon={<UserGroupIcon className="w-8 h-8 text-primary" />}
              title="Family Members"
              description="Add many family members at once — names, dates of birth, allergies, conditions."
              available
            />
            <ImportCard
              href="/onboarding/import/weight-logs"
              icon={<ScaleIcon className="w-8 h-8 text-primary" />}
              title="Weight Logs"
              description="Bring in historical weight readings for any family member. Pairs with the trend / projection engine."
              available
            />
            <ImportCard
              href="#"
              icon={<span className="text-2xl">🩺</span>}
              title="Vital Signs"
              description="Blood pressure, blood sugar, temperature, etc. Coming soon."
              available={false}
            />
            <ImportCard
              href="#"
              icon={<span className="text-2xl">💊</span>}
              title="Medications"
              description="Medication name, dosage, schedule. Coming soon."
              available={false}
            />
          </div>
        )}
      </main>
    </div>
  )
}

function ImportCard({
  href,
  icon,
  title,
  description,
  available,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  available: boolean
}) {
  const inner = (
    <div
      className={`p-6 rounded-lg border-2 transition-colors h-full flex flex-col ${
        available
          ? 'bg-card border-border hover:border-primary cursor-pointer'
          : 'bg-muted/30 border-border opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0">{icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {!available && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Coming soon
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground flex-1">{description}</p>
    </div>
  )
  if (!available) return inner
  return <Link href={href}>{inner}</Link>
}

function NotAllowed({ reason }: { reason: string }) {
  const message =
    reason === 'caregiver_no_grant'
      ? "Your caregiver permissions don't include importing. Ask the account owner to grant 'Import Family Members from Spreadsheet' on your permissions."
      : reason === 'no_household'
        ? 'No household found to import into. Sign up first or accept a caregiver invitation.'
        : reason === 'loading'
          ? 'Loading…'
          : 'You need an active account to use the import wizard.'

  return (
    <div className="bg-card rounded-lg shadow-sm p-8 text-center max-w-md mx-auto">
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}
