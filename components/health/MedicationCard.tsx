'use client'

import { ScannedMedication } from '@/lib/medication-lookup'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface MedicationCardProps {
  medication: ScannedMedication
  onEdit?: () => void
  onDelete?: () => void
  showActions?: boolean
}

export function MedicationCard({
  medication,
  onEdit,
  onDelete,
  showActions = true
}: MedicationCardProps) {
  // Generate color based on patient name for visual distinction
  const getPatientColor = (name?: string) => {
    if (!name) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

    const colors = [
      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    ]

    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  // Check expiration status
  const getExpirationStatus = (expirationDate?: string) => {
    if (!expirationDate) return null

    try {
      const expDate = new Date(expirationDate)
      const today = new Date()
      const daysUntilExpiration = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiration < 0) {
        return { status: 'expired', message: 'EXPIRED', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' }
      } else if (daysUntilExpiration <= 30) {
        return { status: 'expiring-soon', message: `Expires in ${daysUntilExpiration} days`, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20' }
      } else if (daysUntilExpiration <= 90) {
        return { status: 'expiring-later', message: `Expires ${expirationDate}`, color: 'text-gray-600 dark:text-gray-400', bgColor: '' }
      }
      return null
    } catch (e) {
      return null
    }
  }

  const expirationStatus = getExpirationStatus(medication.expirationDate)

  // Calculate refill status based on quantity, frequency, and fill date
  const getRefillStatus = () => {
    if (!medication.quantity || !medication.fillDate || !medication.frequency) return null

    try {
      // Parse quantity (e.g., "30 tablets" -> 30)
      const quantityMatch = medication.quantity.match(/(\d+)/)
      if (!quantityMatch) return null
      const totalQuantity = parseInt(quantityMatch[1])

      // Parse frequency to estimate daily usage
      // Examples: "Take 1 tablet by mouth every day" -> 1/day
      //           "Take 2 capsules twice daily" -> 4/day
      const freqLower = medication.frequency.toLowerCase()
      let dailyUsage = 1

      // Extract number of pills per dose
      const doseMatch = freqLower.match(/take\s+(\d+)/)
      const perDose = doseMatch ? parseInt(doseMatch[1]) : 1

      // Extract frequency
      if (freqLower.includes('twice') || freqLower.includes('two times')) {
        dailyUsage = perDose * 2
      } else if (freqLower.includes('three times') || freqLower.includes('3 times')) {
        dailyUsage = perDose * 3
      } else if (freqLower.includes('four times') || freqLower.includes('4 times')) {
        dailyUsage = perDose * 4
      } else if (freqLower.includes('every') && freqLower.includes('hour')) {
        const hoursMatch = freqLower.match(/every\s+(\d+)\s+hours?/)
        if (hoursMatch) {
          const hours = parseInt(hoursMatch[1])
          dailyUsage = perDose * Math.floor(24 / hours)
        }
      } else {
        dailyUsage = perDose // Default: once daily
      }

      // Calculate days of supply
      const daysOfSupply = Math.floor(totalQuantity / dailyUsage)

      // Calculate when supply runs out
      const fillDate = new Date(medication.fillDate)
      const runOutDate = new Date(fillDate)
      runOutDate.setDate(runOutDate.getDate() + daysOfSupply)

      const today = new Date()
      const daysRemaining = Math.floor((runOutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysRemaining < 0) {
        return { status: 'out', message: 'Refill Needed', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: '🔴' }
      } else if (daysRemaining <= 7) {
        return { status: 'low', message: `Refill in ${daysRemaining} days`, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', icon: '⚠️' }
      } else if (daysRemaining <= 14) {
        return { status: 'soon', message: `${daysRemaining} days remaining`, color: 'text-gray-600 dark:text-gray-400', bgColor: '', icon: '💊' }
      }

      return null
    } catch (e) {
      return null
    }
  }

  const refillStatus = getRefillStatus()

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border-2 ${
      expirationStatus?.status === 'expired' || refillStatus?.status === 'out' ? 'border-red-300 dark:border-red-700' :
      expirationStatus?.status === 'expiring-soon' || refillStatus?.status === 'low' ? 'border-amber-300 dark:border-amber-700' :
      'border-gray-200 dark:border-gray-700'
    } p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-md`}>
      {/* Warning Banners */}
      <div className="space-y-2 mb-3">
        {/* Expiration Warning */}
        {expirationStatus && (expirationStatus.status === 'expired' || expirationStatus.status === 'expiring-soon') && (
          <div className={`${expirationStatus.bgColor} rounded-lg px-3 py-2 flex items-center gap-2`}>
            <span className="text-lg">
              {expirationStatus.status === 'expired' ? '🚫' : '⚠️'}
            </span>
            <span className={`text-sm font-bold ${expirationStatus.color}`}>
              {expirationStatus.message}
            </span>
          </div>
        )}

        {/* Refill Warning */}
        {refillStatus && (refillStatus.status === 'out' || refillStatus.status === 'low') && (
          <div className={`${refillStatus.bgColor} rounded-lg px-3 py-2 flex items-center gap-2`}>
            <span className="text-lg">{refillStatus.icon}</span>
            <span className={`text-sm font-bold ${refillStatus.color}`}>
              {refillStatus.message}
            </span>
            {medication.pharmacyPhone && (
              <a
                href={`tel:${medication.pharmacyPhone}`}
                className="ml-auto text-xs underline hover:no-underline"
                onClick={(e) => e.stopPropagation()}
              >
                Call Pharmacy
              </a>
            )}
          </div>
        )}
      </div>

      {/* Header - Medication Name and Patient */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
            {medication.name}
          </h3>
          {medication.brandName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              ({medication.brandName})
            </p>
          )}
        </div>

        {medication.patientName && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ml-2 whitespace-nowrap ${getPatientColor(medication.patientName)}`}>
            {medication.patientName}
          </span>
        )}
      </div>

      {/* Body - Medication Details */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium">{medication.strength}</span>
          <span className="text-gray-400">•</span>
          <span className="capitalize">{medication.dosageForm}</span>
        </div>

        {medication.frequency && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Frequency:</span> {medication.frequency}
          </div>
        )}

        {medication.prescribedFor && (
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">For:</span>{' '}
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              {medication.prescribedFor}
            </span>
          </div>
        )}

        {medication.drugClass && (
          <div className="text-xs text-gray-500 dark:text-gray-500 italic">
            {medication.drugClass}
          </div>
        )}

        {medication.rxNumber && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Rx #:</span> {medication.rxNumber}
          </div>
        )}

        {medication.ndc && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">NDC:</span> {medication.ndc}
          </div>
        )}

        {medication.quantity && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Quantity:</span> {medication.quantity}
          </div>
        )}

        {medication.refills && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Refills:</span> {medication.refills}
          </div>
        )}

        {medication.expirationDate && !expirationStatus && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Expires:</span> {medication.expirationDate}
          </div>
        )}

        {medication.pharmacyName && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Pharmacy:</span> {medication.pharmacyName}
            {medication.pharmacyPhone && ` • ${medication.pharmacyPhone}`}
          </div>
        )}

        {medication.warnings && medication.warnings.length > 0 && (
          <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">⚠️ Warnings:</div>
            {medication.warnings.slice(0, 2).map((warning, idx) => (
              <div key={idx} className="text-xs text-amber-600 dark:text-amber-400">• {warning}</div>
            ))}
            {medication.warnings.length > 2 && (
              <div className="text-xs text-amber-500 dark:text-amber-500 italic">
                +{medication.warnings.length - 2} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer - Actions */}
      {showActions && (onEdit || onDelete) && (
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              aria-label="Edit medication"
            >
              <PencilIcon className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              aria-label="Remove medication"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Remove</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
