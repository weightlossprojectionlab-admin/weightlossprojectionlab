'use client'

import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import type { ComplaintType } from '@/schemas/firestore/hipaa-complaints'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

export default function ComplaintForm() {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [caseNumber, setCaseNumber] = useState('')

  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    type: 'other' as ComplaintType,
    description: '',
    incidentDate: '',
    affectedData: '',
  })

  const complaintTypes: { value: ComplaintType; label: string }[] = [
    { value: 'unauthorized_access', label: 'Unauthorized Access to My PHI' },
    { value: 'improper_disclosure', label: 'Improper Disclosure of My PHI' },
    { value: 'lack_of_access', label: 'Denied Access to My Health Records' },
    { value: 'breach_notification', label: 'Breach Notification Issue' },
    { value: 'amendment_denied', label: 'Request to Amend Records Denied' },
    { value: 'accounting_request', label: 'Accounting of Disclosures Request' },
    { value: 'other', label: 'Other Privacy Concern' },
  ]

  const generateCaseNumber = () => {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `HIPAA-${dateStr}-${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const newCaseNumber = generateCaseNumber()

      await addDoc(collection(db, 'hipaaComplaints'), {
        userId: user?.uid || null,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        type: formData.type,
        description: formData.description.trim(),
        incidentDate: formData.incidentDate || null,
        affectedData: formData.affectedData.trim() || null,
        status: 'pending',
        priority: 'medium',
        caseNumber: newCaseNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      logger.info('[HIPAAComplaint] Complaint submitted', { caseNumber: newCaseNumber })

      setCaseNumber(newCaseNumber)
      setIsSubmitted(true)
      toast.success('Complaint submitted successfully')
    } catch (error) {
      logger.error('[HIPAAComplaint] Error submitting complaint', error as Error)
      toast.error('Failed to submit complaint. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Complaint Submitted
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Your privacy complaint has been received and will be reviewed by our Privacy Officer.
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 inline-block">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Case Number:</p>
          <p className="text-2xl font-mono font-bold text-blue-600">{caseNumber}</p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
          Please save this case number for your records. We will investigate and respond within 30
          days as required by HIPAA.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <p className="font-semibold mb-1">Filing a Privacy Complaint</p>
          <p>
            Use this form to file a complaint if you believe your privacy rights have been violated.
            Your complaint will be reviewed by our Privacy Officer. You will NOT be retaliated
            against for filing a complaint.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Complaint Type *
          </label>
          <select
            id="type"
            required
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as ComplaintType })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {complaintTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="incidentDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Date of Incident (Optional)
        </label>
        <input
          type="date"
          id="incidentDate"
          value={formData.incidentDate}
          onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description of Privacy Violation *
        </label>
        <textarea
          id="description"
          required
          rows={6}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Please describe what happened, who was involved, and how your privacy rights were violated..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Be as specific as possible. Include dates, names, and details about the incident.
        </p>
      </div>

      <div>
        <label htmlFor="affectedData" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          What Health Information Was Affected? (Optional)
        </label>
        <textarea
          id="affectedData"
          rows={3}
          value={formData.affectedData}
          onChange={(e) => setFormData({ ...formData, affectedData: e.target.value })}
          placeholder="e.g., weight logs, meal photos, medical conditions, medications..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Submitting...</span>
          </>
        ) : (
          <span>Submit Privacy Complaint</span>
        )}
      </button>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Your complaint will be reviewed within 30 days as required by HIPAA regulations.
      </p>
    </form>
  )
}
