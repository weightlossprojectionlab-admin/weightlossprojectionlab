/**
 * Veterinary Disclaimer Component
 *
 * VCPR Compliance: Displays required disclaimers to avoid veterinary malpractice liability.
 * This component must be shown whenever veterinary-related recommendations or advice are provided.
 */

'use client'

import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface VeterinaryDisclaimerProps {
  variant?: 'full' | 'compact' | 'inline'
  context?: 'vitals' | 'symptoms' | 'recommendations' | 'general'
}

export function VeterinaryDisclaimer({ variant = 'compact', context = 'general' }: VeterinaryDisclaimerProps) {
  const fullDisclaimer = `This application is not a substitute for professional veterinary medical advice, diagnosis, or treatment.
Always seek the advice of your veterinarian or other qualified animal health provider with any questions you may have regarding your pet's medical condition.

Never disregard professional veterinary advice or delay in seeking it because of something you have read in this application.

If you think your pet may have a medical emergency, call your veterinarian or emergency animal hospital immediately.

The vital ranges, health recommendations, and symptom guidance provided are for informational purposes only and should not be used as a basis for diagnosis or treatment without consulting with a licensed veterinarian.`

  const compactDisclaimer = `This app provides informational guidance only and is not a substitute for professional veterinary care. Always consult your veterinarian for medical advice.`

  const inlineDisclaimer = `Not veterinary medical advice. Consult your veterinarian.`

  const contextMessages: Record<string, string> = {
    vitals: 'Vital sign ranges are species-specific and provided for informational purposes. Your veterinarian should interpret vital signs in the context of your pet\'s individual health.',
    symptoms: 'Symptom tracking helps you communicate with your veterinarian but should not be used for self-diagnosis. Emergency symptoms require immediate veterinary attention.',
    recommendations: 'Vital tracking recommendations are based on general veterinary guidelines. Your veterinarian may recommend different monitoring based on your pet\'s specific health needs.',
    general: 'The information provided is for educational purposes and general guidance only.'
  }

  if (variant === 'inline') {
    return (
      <span className="text-xs text-muted-foreground italic">
        {inlineDisclaimer}
      </span>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
        <InformationCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <p className="font-medium mb-1">Medical Disclaimer</p>
          <p>{compactDisclaimer}</p>
          {context && context !== 'general' && (
            <p className="mt-2 text-amber-800">{contextMessages[context]}</p>
          )}
        </div>
      </div>
    )
  }

  // Full disclaimer
  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0" />
        <div className="text-sm text-amber-900">
          <h3 className="font-bold text-base mb-2">Important Medical Disclaimer</h3>

          <div className="space-y-2 whitespace-pre-line">
            {fullDisclaimer}
          </div>

          {context && context !== 'general' && (
            <div className="mt-4 p-3 bg-amber-100 rounded border border-amber-300">
              <p className="font-medium mb-1">Regarding {context}:</p>
              <p>{contextMessages[context]}</p>
            </div>
          )}

          <div className="mt-4 p-3 bg-white rounded border border-amber-200">
            <p className="font-medium mb-1">VCPR (Veterinary-Client-Patient Relationship)</p>
            <p className="text-xs">
              This application does not establish a VCPR. Only a licensed veterinarian who has examined your pet can provide medical advice, diagnosis, or treatment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Emergency Disclaimer - For critical symptoms or vital readings
 */
export function EmergencyVeterinaryDisclaimer() {
  return (
    <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0 animate-pulse" />
        <div className="text-sm text-red-900">
          <h3 className="font-bold text-base mb-2">⚠️ EMERGENCY VETERINARY CARE REQUIRED</h3>
          <p className="font-medium mb-2">
            If your pet is experiencing emergency symptoms or critical vital signs, seek immediate veterinary care.
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Call your veterinarian or emergency animal hospital immediately</li>
            <li>Do not wait to see if symptoms improve</li>
            <li>Transport your pet safely to the nearest veterinary facility</li>
            <li>Have your pet's medical records ready if possible</li>
          </ul>
          <p className="mt-3 text-xs font-bold">
            Delays in emergency care can be life-threatening. This app cannot replace emergency veterinary services.
          </p>
        </div>
      </div>
    </div>
  )
}
