/**
 * ParasitePreventionForm Component
 * Form for logging monthly parasite prevention (heartworm, flea, tick)
 */

'use client'

import { useState } from 'react'
import { ParasitePreventionRecord, PreventionType } from '@/types/pet-vaccinations'
import { logger } from '@/lib/logger'

interface ParasitePreventionFormProps {
  species: string
  petName: string
  onSubmit: (data: Partial<ParasitePreventionRecord>) => Promise<void>
  onCancel: () => void
  initialData?: Partial<ParasitePreventionRecord>
}

export function ParasitePreventionForm({ species, petName, onSubmit, onCancel, initialData }: ParasitePreventionFormProps) {
  const [formData, setFormData] = useState({
    preventionType: initialData?.preventionType || ('' as PreventionType),
    productName: initialData?.productName || '',
    givenDate: initialData?.givenDate || new Date().toISOString().split('T')[0],
    nextDueDate: initialData?.nextDueDate || '',
    status: initialData?.status || ('given' as const),
    notes: initialData?.notes || ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-calculate next due date (monthly)
  const calculateNextDue = (givenDate: string) => {
    const given = new Date(givenDate)
    const nextDue = new Date(given)
    nextDue.setMonth(nextDue.getMonth() + 1)
    return nextDue.toISOString().split('T')[0]
  }

  // Get filtered products based on prevention type
  const getFilteredProducts = () => {
    switch (formData.preventionType) {
      case 'heartworm':
        return [
          { value: 'Heartgard Plus', label: 'Heartgard Plus (Heartworm + Intestinal)' },
          { value: 'Heartgard', label: 'Heartgard (Heartworm only)' },
          { value: 'Interceptor Plus', label: 'Interceptor Plus (Heartworm + Intestinal)' },
          { value: 'Tri-Heart Plus', label: 'Tri-Heart Plus (Heartworm + Intestinal)' },
          { value: 'ProHeart 6', label: 'ProHeart 6 (6-month injection)' },
          { value: 'ProHeart 12', label: 'ProHeart 12 (12-month injection)' }
        ]

      case 'flea':
        return [
          { value: 'Advantage II', label: 'Advantage II (Flea only)' },
          { value: 'Capstar', label: 'Capstar (Fast-acting flea kill)' },
          { value: 'Comfortis', label: 'Comfortis (Flea only - oral)' }
        ]

      case 'tick':
        return [
          { value: 'Bravecto', label: 'Bravecto (Flea + Tick - 3 months)' },
          { value: 'Seresto Collar', label: 'Seresto Collar (Flea + Tick - 8 months)' }
        ]

      case 'flea_tick':
        return [
          { value: 'NexGard', label: 'NexGard (Flea + Tick)' },
          { value: 'Bravecto', label: 'Bravecto (Flea + Tick - 3 months)' },
          { value: 'Seresto Collar', label: 'Seresto Collar (Flea + Tick - 8 months)' },
          { value: 'K9 Advantix II', label: 'K9 Advantix II (Flea + Tick)' },
          { value: 'Frontline Plus', label: 'Frontline Plus (Flea + Tick)' },
          { value: 'Credelio', label: 'Credelio (Flea + Tick)' }
        ]

      case 'heartworm_flea_tick':
        return [
          { value: 'Simparica Trio', label: 'Simparica Trio (Heartworm + Flea + Tick + Intestinal)' },
          { value: 'Revolution Plus', label: 'Revolution Plus (Heartworm + Flea + Tick + Ear Mites)' },
          { value: 'Trifexis', label: 'Trifexis (Heartworm + Flea + Intestinal)' },
          { value: 'Sentinel Spectrum', label: 'Sentinel Spectrum (Heartworm + Flea + Intestinal)' },
          { value: 'Revolution (Cats)', label: 'Revolution (Cats - Heartworm + Flea + Ear Mites)' },
          { value: 'Advantage Multi (Cats)', label: 'Advantage Multi (Cats - Heartworm + Flea + Intestinal)' },
          { value: 'Bravecto Plus (Cats)', label: 'Bravecto Plus (Cats - Flea + Tick + Heartworm)' }
        ]

      default:
        return []
    }
  }

  const filteredProducts = getFilteredProducts()

  // Species that don't typically need parasite prevention
  const noPreventionNeeded = ['Turtle', 'Lizard', 'Snake', 'Reptile', 'Bird', 'Hamster', 'Guinea Pig'].includes(species)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation
      if (!formData.preventionType) {
        throw new Error('Prevention type is required')
      }
      if (!formData.givenDate) {
        throw new Error('Date given is required')
      }

      const submitData: Partial<ParasitePreventionRecord> = {
        preventionType: [formData.preventionType] as any, // Convert single type to array
        productName: formData.productName || '',
        administeredDate: formData.givenDate,
        administeredBy: 'You',
        dosage: '', // TODO: Add dosage field to form
        frequency: 'monthly',
        nextDueDate: formData.nextDueDate || calculateNextDue(formData.givenDate),
        status: formData.status,
        notes: formData.notes || ''
      }

      await onSubmit(submitData)
    } catch (err: any) {
      logger.error('[ParasitePreventionForm] Submission error:', err)
      setError(err.message || 'Failed to save prevention record')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* No Prevention Needed Message */}
      {noPreventionNeeded && (
        <div className="p-4 bg-info/10 border border-info/30 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="text-sm font-semibold text-info">No Parasite Prevention Required for {petName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {species}s typically do not require heartworm, flea, or tick prevention. However, you can still add custom prevention records for {petName} if prescribed by a veterinarian.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prevention Type */}
      {!noPreventionNeeded && (
        <>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Prevention Type <span className="text-error">*</span>
            </label>
            <select
              value={formData.preventionType}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                preventionType: e.target.value as PreventionType,
                productName: '' // Reset product when prevention type changes
              }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select prevention type...</option>
              <option value="heartworm">Heartworm Prevention</option>
              <option value="flea">Flea Prevention</option>
              <option value="tick">Tick Prevention</option>
              <option value="flea_tick">Flea & Tick Combination</option>
              <option value="heartworm_flea_tick">Heartworm + Flea + Tick (All-in-One)</option>
            </select>
          </div>

      {/* Product Name */}
      {formData.preventionType && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Product Name
          </label>
          <select
            value={formData.productName}
            onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a product...</option>
            {filteredProducts.map((product) => (
              <option key={product.value} value={product.value}>
                {product.label}
              </option>
            ))}
            <option value="Other">Other (Custom)</option>
          </select>

          {formData.productName === 'Other' && (
            <input
              type="text"
              placeholder="Enter custom product name"
              onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
              className="mt-2 w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>
      )}

      {/* Date Administered */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Date Administered <span className="text-error">*</span>
        </label>
        <input
          type="date"
          value={formData.givenDate}
          onChange={(e) => {
            const newDate = e.target.value
            setFormData(prev => ({
              ...prev,
              givenDate: newDate,
              nextDueDate: calculateNextDue(newDate)
            }))
          }}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      {/* Next Due Date */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Next Due Date
        </label>
        <input
          type="date"
          value={formData.nextDueDate}
          onChange={(e) => setFormData(prev => ({ ...prev, nextDueDate: e.target.value }))}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Auto-calculated as one month from given date. Most preventions are monthly.
        </p>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ParasitePreventionRecord['status'] }))}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="given">✅ Administered</option>
          <option value="skipped">⏭️ Skipped (will reschedule)</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {formData.status === 'given'
            ? 'Prevention was administered on the selected date'
            : 'Mark as skipped if the dose was missed or delayed'}
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Notes about administration, reactions, etc..."
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Saving...' : initialData ? 'Update Record' : 'Add Record'}
        </button>
      </div>
    </form>
  )
}
