/**
 * Spreadsheet Import — Onboarding wizard.
 *
 * Single-page flow with a state machine:
 *   1. upload   — drop CSV
 *   2. map      — confirm or override the auto-detected column mapping
 *   3. import   — submit to /commit
 *   4. result   — receipt: imported / errors / skipped
 *
 * Supports BOTH simple imports (only family members; no Type
 * column) and advanced imports (mixed family-member + weight-log
 * rows discriminated by a Type column). Two templates are
 * downloadable from the upload step. The advanced template is
 * ONE CSV that handles everything in one upload — explicit
 * design choice to avoid the friction of multiple import paths.
 *
 * Design:
 *   - One file. State machine; splitting each step would mean
 *     threading the same five pieces of state through props.
 *   - No "back" navigation between steps. If the user wants to
 *     change the mapping, they re-upload — simpler state, no
 *     stale-mapping bugs after picking a different file.
 *   - Reads via fetch + JSON. Doesn't use apiClient because the
 *     import endpoints return a different response shape than
 *     api-client expects.
 */

'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { ArrowUpTrayIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import {
  IMPORTABLE_FIELDS,
  fieldLabel,
  type ColumnMapping,
  type ImportableField,
} from '@/lib/import/patient-import-config'
import { matchPatientByName } from '@/lib/import/match-patient'
import toast from 'react-hot-toast'

interface HouseholdPatient {
  id: string
  name: string
  nickname?: string
  type: 'human' | 'pet'
}

interface PreviewData {
  headers: string[]
  sampleRows: Record<string, string>[]
  suggestedMapping: Record<string, ColumnMapping>
  totalRows: number
  householdPatients: HouseholdPatient[]
}

interface CommitResult {
  batchId: string
  imported: number
  skipped: Array<{ rowIndex: number; reason: string }>
  errors: Array<{ rowIndex: number; errors: Array<{ field: string; message: string }> }>
}

type Step = 'upload' | 'map' | 'importing' | 'result'

export default function ImportPage() {
  return (
    <AuthGuard>
      <ImportContent />
    </AuthGuard>
  )
}

function ImportContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('upload')
  const [csvText, setCsvText] = useState<string>('')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [mapping, setMapping] = useState<Record<string, ColumnMapping>>({})
  const [result, setResult] = useState<CommitResult | null>(null)
  const [busy, setBusy] = useState(false)

  const authedFetch = async (url: string, body: unknown): Promise<Response> => {
    const token = await user?.getIdToken()
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  }

  const handleFile = async (file: File) => {
    if (!file) return
    if (file.size > 5_000_000) {
      toast.error('File is too large (max 5 MB)')
      return
    }
    setBusy(true)
    try {
      const text = await file.text()
      setCsvText(text)

      const res = await authedFetch('/api/import/patients/preview', { csv: text })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Could not read this file. Try saving as CSV first.')
        return
      }
      setPreview(json.data)
      setMapping(json.data.suggestedMapping)
      setStep('map')
    } catch (err) {
      console.error('[Import] Preview failed', err)
      toast.error('Could not read this file')
    } finally {
      setBusy(false)
    }
  }

  const handleCommit = async () => {
    if (!csvText) return
    setBusy(true)
    setStep('importing')
    try {
      const res = await authedFetch('/api/import/patients/commit', {
        csv: csvText,
        mapping,
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Import failed')
        setStep('map')
        return
      }
      setResult(json.data)
      setStep('result')
      if (json.data.imported > 0) {
        toast.success(`Imported ${json.data.imported} row${json.data.imported === 1 ? '' : 's'}`)
      }
    } catch (err) {
      console.error('[Import] Commit failed', err)
      toast.error('Import failed')
      setStep('map')
    } finally {
      setBusy(false)
    }
  }

  const restart = () => {
    setStep('upload')
    setCsvText('')
    setPreview(null)
    setMapping({})
    setResult(null)
  }

  // Detect whether the CSV is using the advanced (Type-column)
  // shape. When yes, the mapping is more flexible (different
  // required-field sets per row type) and we can show a row-type
  // breakdown to give the user confidence about what'll happen.
  const rowTypeColumn = useMemo(
    () => Object.entries(mapping).find(([, f]) => f === '_rowType')?.[0],
    [mapping],
  )

  // Sample-row-based row-type counts. Only the first 5 rows are
  // visible to the client; this is a directional indicator, not
  // a full count. The receipt at the end shows actuals.
  const sampleBreakdown = useMemo(() => {
    if (!preview || !rowTypeColumn) return null
    let patientCount = 0
    let weightCount = 0
    let unknownCount = 0
    for (const row of preview.sampleRows) {
      const v = (row[rowTypeColumn] ?? '').trim().toLowerCase()
      if (!v || ['patient', 'family member', 'person', 'human', 'pet'].includes(v)) {
        patientCount++
      } else if (['weight', 'weight log', 'weigh-in', 'weigh in'].includes(v)) {
        weightCount++
      } else {
        unknownCount++
      }
    }
    return { patientCount, weightCount, unknownCount, total: preview.sampleRows.length }
  }, [preview, rowTypeColumn])

  // For weight rows in the sample, surface name-match status
  // against the union of household patients + patient rows in
  // this same upload. Catches typos before commit.
  const weightRowMatchStatus = useMemo(() => {
    if (!preview || !rowTypeColumn) return null
    const nameColumn = Object.entries(mapping).find(([, f]) => f === 'name')?.[0]
    if (!nameColumn) return null

    // Just-uploaded patient names from the sample
    const justUploadedNames = preview.sampleRows
      .filter((row) => {
        const v = (row[rowTypeColumn] ?? '').trim().toLowerCase()
        return !v || ['patient', 'family member', 'person', 'human', 'pet'].includes(v)
      })
      .map((row) => (row[nameColumn] ?? '').trim())
      .filter(Boolean)

    const candidates = [
      ...preview.householdPatients,
      ...justUploadedNames.map((n) => ({ id: '__just_uploaded__', name: n })),
    ]

    const weightNames = preview.sampleRows
      .filter((row) => {
        const v = (row[rowTypeColumn] ?? '').trim().toLowerCase()
        return ['weight', 'weight log', 'weigh-in', 'weigh in'].includes(v)
      })
      .map((row) => (row[nameColumn] ?? '').trim())
      .filter(Boolean)

    const seen = new Set<string>()
    const results: Array<{ name: string; matched: boolean; reason: string }> = []
    for (const name of weightNames) {
      if (seen.has(name)) continue
      seen.add(name)
      const m = matchPatientByName(name, candidates)
      results.push({ name, matched: m.patientId !== null, reason: m.reason })
    }
    return results
  }, [preview, mapping, rowTypeColumn])

  const requiredFieldsMapped = useMemo(() => {
    const mapped = new Set(Object.values(mapping))
    if (rowTypeColumn) {
      // Advanced mode — minimum is Name (shared across both row
      // types). Per-row validation enforces the rest server-side.
      return mapped.has('name')
    }
    // Simple mode — every row is a patient; needs the patient
    // required set.
    return mapped.has('name') && mapped.has('type') && mapped.has('dateOfBirth') && mapped.has('relationship')
  }, [mapping, rowTypeColumn])

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Import"
        subtitle="Upload a spreadsheet to bring family members and weight history at once"
        backHref="/patients"
      />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {step === 'upload' && (
          <UploadStep onFile={handleFile} busy={busy} />
        )}

        {step === 'map' && preview && (
          <MapStep
            preview={preview}
            mapping={mapping}
            onMappingChange={setMapping}
            requiredFieldsMapped={requiredFieldsMapped}
            sampleBreakdown={sampleBreakdown}
            weightRowMatchStatus={weightRowMatchStatus}
            onCommit={handleCommit}
            onRestart={restart}
            busy={busy}
          />
        )}

        {step === 'importing' && (
          <div className="bg-card rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Importing {preview?.totalRows ?? 0} rows…</p>
          </div>
        )}

        {step === 'result' && result && (
          <ResultStep
            result={result}
            onDone={() => router.push('/patients')}
            onImportMore={restart}
          />
        )}
      </main>
    </div>
  )
}

function UploadStep({ onFile, busy }: { onFile: (f: File) => void; busy: boolean }) {
  return (
    <div className="bg-card rounded-lg shadow-sm p-8">
      <div className="text-center max-w-md mx-auto">
        <ArrowUpTrayIcon className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Upload your spreadsheet</h2>
        <p className="text-muted-foreground mb-6">
          A CSV file works best. Save your Excel sheet or Google Sheet as CSV first.
        </p>
        <label className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium cursor-pointer">
          {busy ? 'Reading…' : 'Choose CSV file'}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
              e.target.value = ''
            }}
          />
        </label>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">
            Don't have a spreadsheet ready? Start from a template:
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <a
              href="/templates/family-members-template.csv"
              download="family-members-template.csv"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors font-medium text-foreground"
            >
              Family members
            </a>
            <a
              href="/templates/family-members-advanced-template.csv"
              download="family-members-advanced-template.csv"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors font-medium text-foreground"
            >
              Advanced (with weight history)
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            The simple template adds family members. The advanced
            template adds a Type column so you can mix family
            members and historical weight readings in one file.
          </p>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Required (simple): name, type (human/pet), date of birth, relationship.
          <br />
          Required (advanced): a Type column. Each row's required fields depend on its type.
        </p>
      </div>
    </div>
  )
}

function MapStep({
  preview,
  mapping,
  onMappingChange,
  requiredFieldsMapped,
  sampleBreakdown,
  weightRowMatchStatus,
  onCommit,
  onRestart,
  busy,
}: {
  preview: PreviewData
  mapping: Record<string, ColumnMapping>
  onMappingChange: (m: Record<string, ColumnMapping>) => void
  requiredFieldsMapped: boolean
  sampleBreakdown: { patientCount: number; weightCount: number; unknownCount: number; total: number } | null
  weightRowMatchStatus: Array<{ name: string; matched: boolean; reason: string }> | null
  onCommit: () => void
  onRestart: () => void
  busy: boolean
}) {
  const updateColumn = (header: string, value: ColumnMapping) => {
    onMappingChange({ ...mapping, [header]: value })
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold text-foreground mb-1">Map your columns</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Found {preview.totalRows} row{preview.totalRows === 1 ? '' : 's'} and {preview.headers.length} columns.
          Confirm how each column maps. Set a column to <em>Skip</em> to ignore it.
        </p>

        <div className="space-y-2">
          {preview.headers.map((header) => (
            <div key={header} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{header}</div>
                <div className="text-xs text-muted-foreground truncate">
                  e.g. {preview.sampleRows[0]?.[header] || '(empty)'}
                </div>
              </div>
              <select
                value={mapping[header] ?? 'skip'}
                onChange={(e) => updateColumn(header, e.target.value as ColumnMapping)}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm min-w-[180px]"
              >
                <option value="skip">— Skip —</option>
                {IMPORTABLE_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {fieldLabel(field as ImportableField)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {sampleBreakdown && (
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">What we detected</h3>
          <p className="text-xs text-muted-foreground mb-3">
            From the first {sampleBreakdown.total} sampled rows. The full file has {preview.totalRows} rows total.
          </p>
          <ul className="text-sm space-y-1">
            <li><span className="font-medium text-foreground">{sampleBreakdown.patientCount}</span> family member row{sampleBreakdown.patientCount === 1 ? '' : 's'}</li>
            <li><span className="font-medium text-foreground">{sampleBreakdown.weightCount}</span> weight log row{sampleBreakdown.weightCount === 1 ? '' : 's'}</li>
            {sampleBreakdown.unknownCount > 0 && (
              <li className="text-warning">
                <span className="font-medium">{sampleBreakdown.unknownCount}</span> unknown row{sampleBreakdown.unknownCount === 1 ? '' : 's'} — Type values must be "patient" or "weight"
              </li>
            )}
          </ul>
        </div>
      )}

      {weightRowMatchStatus && weightRowMatchStatus.length > 0 && (
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Weight rows: family-member matching</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Each weight row's Name must match an existing family member or one
            you're creating in this same upload. Sampled from the first 5 rows.
          </p>
          <div className="space-y-1.5">
            {weightRowMatchStatus.map((m) => (
              <div key={m.name} className="flex items-center gap-2 text-sm">
                {m.matched ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4 text-success flex-shrink-0" />
                    <span className="text-foreground">{m.name}</span>
                    <span className="text-xs text-muted-foreground">— matched ({m.reason})</span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="w-4 h-4 text-warning flex-shrink-0" />
                    <span className="text-foreground">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      — {m.reason === 'ambiguous' ? 'ambiguous' : 'no family member with this name'}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!requiredFieldsMapped && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="text-foreground">Missing required columns.</strong>{' '}
            <span className="text-muted-foreground">
              Map at least: Name, Patient Type, Date of Birth, Relationship.
              For advanced files, Name is required (other fields per row type).
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onRestart}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Choose a different file
        </button>
        <button
          type="button"
          onClick={onCommit}
          disabled={busy || !requiredFieldsMapped}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors font-medium"
        >
          Import {preview.totalRows} row{preview.totalRows === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}

function ResultStep({
  result,
  onDone,
  onImportMore,
}: {
  result: CommitResult
  onDone: () => void
  onImportMore: () => void
}) {
  const hasErrors = result.errors.length > 0
  const hasSkipped = result.skipped.length > 0

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg shadow-sm p-8 text-center">
        <CheckCircleIcon className="w-12 h-12 text-success mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Imported {result.imported} row{result.imported === 1 ? '' : 's'}
        </h2>
        {(hasErrors || hasSkipped) && (
          <p className="text-muted-foreground">
            {hasErrors && `${result.errors.length} row${result.errors.length === 1 ? '' : 's'} had errors`}
            {hasErrors && hasSkipped && ', '}
            {hasSkipped && `${result.skipped.length} row${result.skipped.length === 1 ? '' : 's'} skipped`}
          </p>
        )}
      </div>

      {hasErrors && (
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Rows with errors</h3>
          <div className="space-y-2 text-sm">
            {result.errors.slice(0, 10).map((err) => (
              <div key={err.rowIndex} className="border-b border-border last:border-0 py-2">
                <div className="font-medium text-foreground">Row {err.rowIndex}</div>
                <ul className="text-muted-foreground mt-1 ml-4 list-disc">
                  {err.errors.map((e, i) => (
                    <li key={i}>
                      <span className="font-mono text-xs">{e.field}</span>: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {result.errors.length > 10 && (
              <div className="text-xs text-muted-foreground pt-2">
                + {result.errors.length - 10} more
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onImportMore}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Import another file
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
        >
          View family members
        </button>
      </div>
    </div>
  )
}
