'use client'

/**
 * MedicalEquipmentForm — add-only modal for recording a piece of
 * durable medical equipment (CPAP, glucose monitor, hearing aid,
 * walker, etc.).
 *
 * Phase C of the medical-binder gap close. Mirrors the
 * ImmunizationForm shape — same delete-then-re-add pattern for
 * corrections (delete affordance lives on the card itself).
 */

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface MedicalEquipmentFormProps {
  patientId: string
  patientName: string
  onClose: () => void
  onSubmit: (data: {
    name: string
    type?: string
    manufacturer?: string
    model?: string
    serialNumber?: string
    prescribedBy?: string
    acquiredAt?: string
    nextMaintenanceAt?: string
    notes?: string
  }) => Promise<void>
}

export default function MedicalEquipmentForm({
  patientId: _patientId,
  patientName,
  onClose,
  onSubmit,
}: MedicalEquipmentFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [prescribedBy, setPrescribedBy] = useState('')
  const [acquiredAt, setAcquiredAt] = useState('')
  const [nextMaintenanceAt, setNextMaintenanceAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Equipment name is required')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        type: type.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        prescribedBy: prescribedBy.trim() || undefined,
        acquiredAt: acquiredAt || undefined,
        nextMaintenanceAt: nextMaintenanceAt || undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (error) {
      console.error('[MedicalEquipmentForm] Save failed', error)
      toast.error('Could not save — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Add Medical Equipment</h2>
            <p className="text-sm text-muted-foreground mt-1">for {patientName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              Device *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CPAP Machine, Glucose Monitor, Walker"
              required
              autoFocus
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-foreground mb-2">
              Category <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="type"
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="respiratory, monitoring, mobility, hearing"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="manufacturer" className="block text-sm font-medium text-foreground mb-2">
                Manufacturer <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="manufacturer"
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. ResMed"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-foreground mb-2">
                Model <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. AirSense 11"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="serialNumber" className="block text-sm font-medium text-foreground mb-2">
              Serial number <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="serialNumber"
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="For warranty / support / recall lookups"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="prescribedBy" className="block text-sm font-medium text-foreground mb-2">
              Prescribed by <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="prescribedBy"
              type="text"
              value={prescribedBy}
              onChange={(e) => setPrescribedBy(e.target.value)}
              placeholder="Provider or clinic"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="acquiredAt" className="block text-sm font-medium text-foreground mb-2">
                Acquired <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="acquiredAt"
                type="date"
                value={acquiredAt}
                onChange={(e) => setAcquiredAt(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="nextMaintenanceAt" className="block text-sm font-medium text-foreground mb-2">
                Next maintenance <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="nextMaintenanceAt"
                type="date"
                value={nextMaintenanceAt}
                onChange={(e) => setNextMaintenanceAt(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Rental vs owned, supplier contact, etc."
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-background transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-write="true"
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
