// HIPAA Complaints Admin Dashboard
// View and manage privacy complaints submitted via /hipaa form

'use client'

import { useAdminAuth } from '@/hooks/useAdminAuth'
import HIPAAComplaintsAdmin from '@/components/hipaa/HIPAAComplaintsAdmin'

export default function HIPAAComplaintsAdminPage() {
  const { isAdmin } = useAdminAuth()

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-red-700 dark:text-red-300">
            You do not have permission to access HIPAA complaints.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HIPAA Complaints</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review and manage privacy complaints submitted by users
        </p>
      </div>

      {/* Complaints Dashboard */}
      <HIPAAComplaintsAdmin />

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
          HIPAA Compliance Guidelines
        </h2>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li>• All complaints must be acknowledged within 7 business days</li>
          <li>• Investigation and resolution must be completed within 30 days (HIPAA requirement)</li>
          <li>• No retaliation against complainants is permitted</li>
          <li>• Maintain confidentiality of all complaint details</li>
          <li>• Document all actions taken in response to complaints</li>
          <li>• Critical priority complaints require immediate escalation</li>
        </ul>
      </div>
    </div>
  )
}
