/**
 * Spreadsheet Import — Weight Logs wizard.
 *
 * Mirrors the patients wizard at /onboarding/import/patients —
 * see that file's docstring for the design rationale (state
 * machine, fetch-not-apiClient, no-back-navigation).
 *
 * The weight-logs wizard adds a patient-matching surface on the
 * map step: each unique value the user has mapped to "Patient
 * Name" is shown alongside its match status against the
 * household's existing patients. Unmatched names are flagged
 * before the user clicks Import — they're the most common
 * non-recoverable error.
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
} from '@/lib/import/weight-log-import-config'
import { matchPatientsForPreview, type MatchResult } from '@/lib/import/match-patient'
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

export default function WeightLogImportPage() {
  return (
    <AuthGuard>
      <WeightLogImportContent />
    </AuthGuard>
  )
}

function WeightLogImportContent() {
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

      const res = await authedFetch('/api/import/weight-logs/preview', { csv: text })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Could not read this file. Try saving as CSV first.')
        return
      }
      setPreview(json.data)
      setMapping(json.data.suggestedMapping)
      setStep('map')
    } catch (err) {
      console.error('[Import-Weight] Preview failed', err)
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
      const res = await authedFetch('/api/import/weight-logs/commit', {
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
        toast.success(`Imported ${json.data.imported} weight log${json.data.imported === 1 ? '' : 's'}`)
      }
    } catch (err) {
      console.error('[Import-Weight] Commit failed', err)
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

  const requiredFieldsMapped = useMemo(() => {
    const mapped = new Set(Object.values(mapping))
    return mapped.has('patientName') && mapped.has('weight') && mapped.has('unit') && mapped.has('loggedAt')
  }, [mapping])

  // Compute patient-name match status across all rows (not just
  // the preview slice) so the wizard surfaces every unmatched
  // name before the commit. Saves users from "imported 47, 53
  // errors" surprises.
  const patientMatchPreview = useMemo(() => {
    if (!preview) return null
    const patientNameHeader = Object.entries(mapping).find(([, f]) => f === 'patientName')?.[0]
    if (!patientNameHeader) return null
    const allNames = preview.sampleRows
      .map((r) => (r[patientNameHeader] ?? '').trim())
      .filter((s) => s.length > 0)
    return matchPatientsForPreview(allNames, preview.householdPatients)
  }, [preview, mapping])

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Import Weight Logs"
        subtitle="Bring historical weight readings for any family member"
        backHref="/onboarding/import"
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
            patientMatchPreview={patientMatchPreview}
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
        <h2 className="text-xl font-bold text-foreground mb-2">Upload your weight log</h2>
        <p className="text-muted-foreground mb-6">
          A CSV file with one row per weight reading. The Patient column should match an existing family member name or nickname.
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
            Don't have a spreadsheet ready?
          </p>
          <a
            href="/templates/weight-logs-template.csv"
            download="weight-logs-template.csv"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors font-medium text-foreground"
          >
            Download template (.csv)
          </a>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Required: patient name, weight, unit (lbs / kg), date.
          <br />
          Optional: notes, body fat %, tags.
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
  patientMatchPreview,
  onCommit,
  onRestart,
  busy,
}: {
  preview: PreviewData
  mapping: Record<string, ColumnMapping>
  onMappingChange: (m: Record<string, ColumnMapping>) => void
  requiredFieldsMapped: boolean
  patientMatchPreview: Map<string, MatchResult> | null
  onCommit: () => void
  onRestart: () => void
  busy: boolean
}) {
  const updateColumn = (header: string, value: ColumnMapping) => {
    onMappingChange({ ...mapping, [header]: value })
  }

  const unmatchedNames = patientMatchPreview
    ? Array.from(patientMatchPreview.entries()).filter(([, r]) => r.patientId === null)
    : []
  const matchedCount = patientMatchPreview
    ? Array.from(patientMatchPreview.values()).filter((r) => r.patientId !== null).length
    : 0

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold text-foreground mb-1">Map your columns</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Found {preview.totalRows} row{preview.totalRows === 1 ? '' : 's'} and {preview.headers.length} columns.
          Confirm how each column maps to a weight-log field. Set a column to <em>Skip</em> to ignore it.
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

      {!requiredFieldsMapped && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="text-foreground">Missing required columns.</strong>{' '}
            <span className="text-muted-foreground">
              Map at least: Patient (Name), Weight, Unit, Date.
            </span>
          </div>
        </div>
      )}

      {patientMatchPreview && (
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Family-member matching</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Sampled from the first {preview.sampleRows.length} rows. Unmatched names will be skipped on import.
          </p>
          {patientMatchPreview.size === 0 ? (
            <p className="text-sm text-muted-foreground">No patient names found in the sampled rows.</p>
          ) : (
            <div className="space-y-1.5">
              {Array.from(patientMatchPreview.entries()).map(([name, match]) => (
                <div key={name} className="flex items-center gap-2 text-sm">
                  {match.patientId ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-success flex-shrink-0" />
                      <span className="text-foreground">{name}</span>
                      <span className="text-xs text-muted-foreground">
                        — matched ({match.reason})
                      </span>
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="w-4 h-4 text-warning flex-shrink-0" />
                      <span className="text-foreground">{name}</span>
                      <span className="text-xs text-muted-foreground">
                        — {match.reason === 'ambiguous' ? 'ambiguous (matches multiple)' : 'no family member with this name'}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {unmatchedNames.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Add these family members first via the patients import, or fix the names in your CSV before importing weights.
            </p>
          )}
          {patientMatchPreview.size > 0 && unmatchedNames.length === 0 && (
            <p className="text-xs text-success mt-4">
              All {matchedCount} sampled names matched.
            </p>
          )}
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
          Imported {result.imported} weight log{result.imported === 1 ? '' : 's'}
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
