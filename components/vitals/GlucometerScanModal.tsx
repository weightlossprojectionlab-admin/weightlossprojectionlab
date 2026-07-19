'use client'

/**
 * GlucometerScanModal — scan a meter's on-screen results list and import the
 * rows as timestamped blood_sugar vitals.
 *
 * Flow (mirrors the med-scan/receipt-scan UX): capture photo(s) → Gemini OCR
 * (extractGlucometerReadings) → editable multi-row review (each row keeps its
 * own date/time so multiple same-day readings stay distinct) → batch save via
 * medicalOperations.vitals.logVital. Per-row 409 duplicates are skipped so a
 * re-scan tops up only the new readings. Saving relies on the minute-level
 * dedupe (lib/services/vital-service) shipped alongside this.
 */

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { XMarkIcon, CameraIcon, ArrowUpTrayIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { extractGlucometerReadings } from '@/lib/ocr-glucometer'
import { toVitalDrafts, type VitalDraft } from '@/lib/glucometer-parse'
import { medicalOperations } from '@/lib/medical-operations'
import { logger } from '@/lib/logger'

export interface GlucometerScanModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  /** Called after a successful import so the caller can refresh its vitals list. */
  onImported?: (savedCount: number) => void
}

type Step = 'capture' | 'processing' | 'review' | 'saving'

const pad = (n: number) => String(n).padStart(2, '0')
const isoToDateInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const isoToTimeInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const combineDateTime = (dateStr: string, timeStr: string): string | null => {
  if (!dateStr || !timeStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  const combined = new Date(y, m - 1, d, hh, mm, 0, 0)
  return isNaN(combined.getTime()) ? null : combined.toISOString()
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the photo.'))
    reader.readAsDataURL(file)
  })
}

/** A 409 (or duplicate-worded) error from logVital — the reading already exists. */
function isDuplicateErr(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return m.includes('duplicate') || m.includes('already exists') || m.includes('409')
}

export function GlucometerScanModal({ isOpen, onClose, patientId, onImported }: GlucometerScanModalProps) {
  const [step, setStep] = useState<Step>('capture')
  const [images, setImages] = useState<string[]>([])
  const [drafts, setDrafts] = useState<VitalDraft[]>([])
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep('capture')
    setImages([])
    setDrafts([])
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    try {
      const urls = await Promise.all(
        Array.from(files)
          .filter(f => f.type.startsWith('image/'))
          .slice(0, 6)
          .map(readFileAsDataUrl)
      )
      setImages(prev => [...prev, ...urls].slice(0, 6))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the photo.')
    }
  }, [])

  const runScan = useCallback(async () => {
    if (images.length === 0) return
    setStep('processing')
    setError(null)
    try {
      const result = await extractGlucometerReadings(images)
      const parsed = toVitalDrafts(result)
      if (parsed.length === 0) {
        setError('No readings were found on that screen. Try a clearer, straight-on photo.')
        setStep('capture')
        return
      }
      setDrafts(parsed)
      setStep('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed.')
      setStep('capture')
    }
  }, [images])

  const updateDraft = useCallback((index: number, patch: Partial<VitalDraft>) => {
    setDrafts(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }, [])

  const includedCount = drafts.filter(d => d.include && d.recordedAt).length

  const save = useCallback(async () => {
    const toSave = drafts.filter(d => d.include && d.recordedAt)
    if (toSave.length === 0) return
    setStep('saving')
    let saved = 0
    let skipped = 0
    let failed = 0
    for (const d of toSave) {
      try {
        await medicalOperations.vitals.logVital(patientId, {
          type: 'blood_sugar',
          value: d.value,
          unit: d.unit,
          recordedAt: d.recordedAt as string,
          method: 'imported',
          tags: ['glucometer'],
        })
        saved++
      } catch (e) {
        if (isDuplicateErr(e)) {
          skipped++
        } else {
          failed++
          logger.error('[GlucometerScan] logVital failed', e as Error, { patientId })
        }
      }
    }

    if (saved > 0) {
      const bits = [`${saved} reading${saved === 1 ? '' : 's'} imported`]
      if (skipped > 0) bits.push(`${skipped} already logged`)
      if (failed > 0) bits.push(`${failed} failed`)
      toast.success(bits.join(' · '))
      onImported?.(saved)
      handleClose()
    } else if (skipped > 0 && failed === 0) {
      toast('All of those readings were already logged.')
      handleClose()
    } else {
      setError('Could not import those readings. Please try again.')
      setStep('review')
    }
  }, [drafts, patientId, onImported, handleClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CameraIcon className="w-5 h-5 text-primary" />
            Scan glucose meter
          </h2>
          <button onClick={handleClose} className="p-2 -mr-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" aria-label="Close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* CAPTURE */}
          {step === 'capture' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Take a straight-on photo of your meter&apos;s results list (its &quot;history&quot; or &quot;all results&quot; screen). Each row becomes a separate reading you can review before saving.
              </p>

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((src, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Meter photo ${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"
                        aria-label="Remove photo"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-primary hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer">
                  <CameraIcon className="w-5 h-5 text-primary" />
                  <span className="text-primary font-medium">Take photo</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => addFiles(e.target.files)} />
                </label>
                <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <ArrowUpTrayIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Upload</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
                </label>
              </div>
            </div>
          )}

          {/* PROCESSING */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Reading the meter screen…</p>
            </div>
          )}

          {/* REVIEW */}
          {(step === 'review' || step === 'saving') && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Review the readings. Uncheck any you don&apos;t want, and fix any flagged rows. Values are mg/dL unless noted.
              </p>
              <div className="space-y-2">
                {drafts.map((d, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${d.issue ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={d.include}
                        onChange={e => updateDraft(i, { include: e.target.checked })}
                        className="w-5 h-5 rounded text-primary"
                        aria-label="Include this reading"
                      />
                      <input
                        type="number"
                        value={Number.isFinite(d.value) ? d.value : ''}
                        onChange={e => updateDraft(i, { value: Number(e.target.value) })}
                        className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        aria-label="Glucose value"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-12">{d.unit}</span>
                      <input
                        type="date"
                        value={isoToDateInput(d.recordedAt)}
                        max={`${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`}
                        onChange={e => updateDraft(i, { recordedAt: combineDateTime(e.target.value, isoToTimeInput(d.recordedAt) || '00:00'), issue: undefined })}
                        className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        aria-label="Date"
                      />
                      <input
                        type="time"
                        value={isoToTimeInput(d.recordedAt)}
                        onChange={e => updateDraft(i, { recordedAt: combineDateTime(isoToDateInput(d.recordedAt) || isoToDateInput(new Date().toISOString()), e.target.value), issue: undefined })}
                        className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        aria-label="Time"
                      />
                    </div>
                    {d.issue && (
                      <p className="mt-1.5 ml-7 text-xs text-amber-700 dark:text-amber-300">{d.issue}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          {step === 'capture' && (
            <button
              onClick={runScan}
              disabled={images.length === 0}
              className="w-full py-3 bg-primary text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Scan {images.length > 0 ? `(${images.length} photo${images.length === 1 ? '' : 's'})` : ''}
            </button>
          )}
          {(step === 'review' || step === 'saving') && (
            <div className="flex gap-2">
              <button
                onClick={() => { reset() }}
                disabled={step === 'saving'}
                className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium disabled:opacity-40"
              >
                Rescan
              </button>
              <button
                onClick={save}
                disabled={includedCount === 0 || step === 'saving'}
                className="flex-1 py-3 bg-primary text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {step === 'saving' ? 'Importing…' : `Import ${includedCount} reading${includedCount === 1 ? '' : 's'}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
