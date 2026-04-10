'use client'

/**
 * Branding Editor
 *
 * Client component. Loads the current Firebase user, verifies the tenantId
 * custom claim matches this tenant, and lets the franchise owner edit
 * their public branding fields.
 *
 * Auth gating: server page already 404s for missing tenant; this component
 * checks the user's claims on mount and redirects to /login on mismatch.
 *
 * Logo upload: drag-and-drop or click-to-pick uploads directly to Firebase
 * Storage at tenants/{tenantId}/branding/{file} (rule in storage.rules), then
 * the resulting download URL is stored in the form state and PATCHed to
 * /api/tenant/branding alongside the other fields. Manual URL paste is kept
 * as a small fallback affordance below the drop zone for users who already
 * host their logo on their own CDN.
 *
 * Submits to PATCH /api/tenant/branding with a Bearer token. The API route
 * persists, audit-logs, and revalidates the tenant landing path.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, storage } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { logger } from '@/lib/logger'
import { getCSRFToken } from '@/lib/csrf'

interface BrandingState {
  logoUrl: string
  primaryColor: string
  companyName: string
  supportEmail: string
}

interface Props {
  tenantId: string
  initial: BrandingState
}

// Same HSL parsing logic as app/tenant-shell/page.tsx and layout.tsx.
// Inlined here intentionally — we'll extract a shared util on the next reuse
// (rule of three).
function toCss(color: string): string {
  return /^\d/.test(color) ? `hsl(${color})` : color
}

const ACCEPTED_LOGO_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]
const MAX_LOGO_BYTES = 5 * 1024 * 1024 // 5MB — must match storage.rules

export default function BrandingEditor({ tenantId, initial }: Props) {
  const router = useRouter()
  const [state, setState] = useState<BrandingState>(initial)
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [showUrlFallback, setShowUrlFallback] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!auth) {
      router.replace('/login?next=/dashboard')
      return
    }
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        router.replace('/login?next=/dashboard')
        return
      }
      try {
        const tokenResult = await user.getIdTokenResult()
        const claims = tokenResult.claims as any
        const isSuperAdmin = claims.role === 'admin'
        const isFranchiseAdminForThis =
          claims.tenantRole === 'franchise_admin' && claims.tenantId === tenantId
        if (!isSuperAdmin && !isFranchiseAdminForThis) {
          router.replace('/login?next=/dashboard')
          return
        }
        setAuthorized(true)
      } finally {
        setAuthChecked(true)
      }
    })
    return () => unsub()
  }, [router, tenantId])

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      return 'Logo must be a PNG, JPEG, WebP, or SVG image.'
    }
    if (file.size > MAX_LOGO_BYTES) {
      return `Logo must be smaller than 5 MB. (Yours is ${(file.size / (1024 * 1024)).toFixed(1)} MB.)`
    }
    return null
  }

  const handleFile = async (file: File) => {
    setUploadError(null)
    const validationError = validateFile(file)
    if (validationError) {
      setUploadError(validationError)
      return
    }
    if (!auth?.currentUser) {
      setUploadError('You are not signed in.')
      return
    }
    if (!storage) {
      setUploadError('Storage is unavailable. Please refresh and try again.')
      return
    }

    setUploading(true)
    try {
      // Cache-bust by timestamping the filename. Old logos are orphaned in
      // Storage rather than deleted (matches the partner-logo upload pattern
      // in lib/perk-image-upload.ts) — branding changes are infrequent and
      // the storage cost is negligible.
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `tenants/${tenantId}/branding/logo-${Date.now()}.${ext}`
      const ref = storageRef(storage, path)

      await uploadBytes(ref, file, { contentType: file.type })
      const downloadUrl = await getDownloadURL(ref)

      setState(s => ({ ...s, logoUrl: downloadUrl }))
    } catch (err) {
      logger.error('[BrandingEditor] logo upload failed', err as Error)
      const code = (err as any)?.code
      if (code === 'storage/unauthorized') {
        setUploadError('Upload denied. Your account does not have permission for this tenant.')
      } else {
        setUploadError(err instanceof Error ? err.message : 'Upload failed.')
      }
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragActive) setDragActive(true)
  }

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const onPickFile = () => {
    fileInputRef.current?.click()
  }

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so picking the same filename again still fires onChange
    e.target.value = ''
  }

  const removeLogo = () => {
    setState(s => ({ ...s, logoUrl: '' }))
    setUploadError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth?.currentUser) {
      setMessage({ type: 'error', text: 'You are not signed in.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const token = await auth.currentUser.getIdToken()
      const csrfToken = getCSRFToken()
      const res = await fetch('/api/tenant/branding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ tenantId, branding: state }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Save failed (${res.status})`)
      }
      console.log('[tenant-dashboard] branding saved')
      setMessage({ type: 'success', text: 'Branding saved. Your public landing page is updated.' })
      router.refresh()
    } catch (err) {
      logger.error('[BrandingEditor] save failed', err as Error)
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-500">
        Loading&hellip;
      </div>
    )
  }
  if (!authorized) {
    return null
  }

  const previewColor = toCss(state.primaryColor)
  const hasLogo = !!state.logoUrl

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Branding</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Edit how your platform appears to families. Changes are live immediately.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company name</label>
          <input
            type="text"
            value={state.companyName}
            onChange={e => setState(s => ({ ...s, companyName: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo</label>

          {hasLogo ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.logoUrl}
                  alt="Logo preview"
                  className="h-20 w-20 object-contain rounded bg-white border border-gray-200 dark:border-gray-700"
                  onError={() =>
                    setUploadError('This logo URL did not load. Try uploading a file instead.')
                  }
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {state.logoUrl}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={onPickFile}
                      disabled={uploading}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={removeLogo}
                      disabled={uploading}
                      className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={onPickFile}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPickFile()
                }
              }}
              className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-900'
              }`}
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path
                      fill="currentColor"
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span className="text-sm">Uploading&hellip;</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg
                    className="mx-auto h-10 w-10 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.9 5 5 0 019.9-1.1A4.5 4.5 0 0117 16h-1m-4-4v8m0-8l-3 3m3-3l3 3"
                    />
                  </svg>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span>{' '}
                    or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    PNG, JPEG, WebP, or SVG &middot; up to 5 MB
                  </p>
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_LOGO_TYPES.join(',')}
            onChange={onFileInputChange}
            className="hidden"
          />

          {uploadError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">{uploadError}</p>
          )}

          <div className="mt-3">
            {showUrlFallback ? (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Or paste a hosted image URL
                </label>
                <input
                  type="url"
                  value={state.logoUrl}
                  onChange={e => setState(s => ({ ...s, logoUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500">
                  Must be a direct image URL (ending in .png, .jpg, .webp, etc.) and publicly
                  accessible. Pages from sites like Shutterstock or Google Images won&rsquo;t work.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowUrlFallback(true)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline"
              >
                Already have a hosted image? Paste a URL instead
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Primary color (HSL triplet)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={state.primaryColor}
              onChange={e => setState(s => ({ ...s, primaryColor: e.target.value }))}
              placeholder="262 83% 58%"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm"
            />
            <span
              className="h-10 w-10 rounded-lg border border-gray-300 dark:border-gray-600 shrink-0"
              style={{ backgroundColor: previewColor }}
              aria-label="color preview"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Format: <code>hue saturation% lightness%</code>. Example: <code>262 83% 58%</code> (purple).
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Support email</label>
          <input
            type="email"
            value={state.supportEmail}
            onChange={e => setState(s => ({ ...s, supportEmail: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || uploading}
          className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: previewColor }}
        >
          {saving ? 'Saving…' : 'Save Branding'}
        </button>
      </div>
    </form>
  )
}
