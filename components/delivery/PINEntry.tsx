'use client'

/**
 * PINEntry Component
 *
 * Driver-facing PIN entry interface for delivery verification
 * Features:
 * - Large numeric keypad for easy use
 * - 4-digit PIN display with dots/asterisks
 * - Error messages on wrong PIN
 * - Attempts counter (3 max)
 * - Call customer button after max attempts
 */

import { useState, useEffect } from 'react'
import { verifyDeliveryPIN } from '@/lib/order-operations'
// import { FRAUD_THRESHOLDS } from '@/types/shopping'
const FRAUD_THRESHOLDS = { PIN_RETRY_LIMIT: 3 }

interface PINEntryProps {
  orderId: string
  driverId?: string
  onSuccess?: () => void
  onMaxAttemptsReached?: () => void
  customerPhone?: string
}

export default function PINEntry({
  orderId,
  driverId,
  onSuccess,
  onMaxAttemptsReached,
  customerPhone
}: PINEntryProps) {
  const [pin, setPin] = useState<string>('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string>('')
  const [remainingAttempts, setRemainingAttempts] = useState(FRAUD_THRESHOLDS.PIN_RETRY_LIMIT)
  const [requiresCall, setRequiresCall] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Clear error when user starts typing again
  useEffect(() => {
    if (pin.length > 0 && error) {
      setError('')
    }
  }, [pin, error])

  const handleNumberClick = (num: number) => {
    if (pin.length < 4 && !requiresCall) {
      setPin(prev => prev + num.toString())
    }
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  const handleClear = () => {
    setPin('')
    setError('')
  }

  const handleVerify = async () => {
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const result = await verifyDeliveryPIN(orderId, pin, driverId)

      if (result.success) {
        setSuccessMessage('Delivery verified successfully!')
        setError('')
        setTimeout(() => {
          onSuccess?.()
        }, 1500)
      } else {
        setError(result.message)
        setRemainingAttempts(result.remainingAttempts)
        setRequiresCall(result.requiresCustomerCall)
        setPin('')

        if (result.requiresCustomerCall) {
          onMaxAttemptsReached?.()
        }
      }
    } catch (err) {
      setError('Error verifying PIN. Please try again.')
      setPin('')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCallCustomer = () => {
    if (customerPhone) {
      // On mobile, this will open the phone dialer
      window.location.href = `tel:${customerPhone}`
    }
  }

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !isVerifying && !requiresCall) {
      handleVerify()
    }
  }, [pin])

  const renderPINDisplay = () => {
    const dots = []
    for (let i = 0; i < 4; i++) {
      dots.push(
        <div
          key={i}
          className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${
            i < pin.length
              ? 'border-blue-500 bg-blue-50 scale-105'
              : 'border-gray-300 bg-white'
          }`}
        >
          {i < pin.length ? '●' : ''}
        </div>
      )
    }
    return dots
  }

  const renderKeypad = () => {
    const buttons = []

    // Numbers 1-9
    for (let i = 1; i <= 9; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handleNumberClick(i)}
          disabled={requiresCall || isVerifying}
          className="w-20 h-20 bg-white border-2 border-gray-300 rounded-xl text-3xl font-bold hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {i}
        </button>
      )
    }

    return (
      <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
        {buttons}
        <button
          onClick={handleClear}
          disabled={requiresCall || isVerifying}
          className="w-20 h-20 bg-gray-100 border-2 border-gray-300 rounded-xl text-lg font-semibold hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
        <button
          onClick={() => handleNumberClick(0)}
          disabled={requiresCall || isVerifying}
          className="w-20 h-20 bg-white border-2 border-gray-300 rounded-xl text-3xl font-bold hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={requiresCall || isVerifying}
          className="w-20 h-20 bg-gray-100 border-2 border-gray-300 rounded-xl text-lg font-semibold hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ←
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Delivery Verification
        </h2>
        <p className="text-gray-600">
          {requiresCall
            ? 'Maximum attempts reached. Please call customer.'
            : 'Ask customer for their 4-digit PIN'}
        </p>
      </div>

      {/* Attempts Counter */}
      {!requiresCall && !successMessage && (
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border-2 border-gray-200">
            <span className="text-sm font-medium text-gray-600">Attempts remaining:</span>
            <span className={`text-lg font-bold ${
              remainingAttempts <= 1 ? 'text-red-500' : 'text-green-600'
            }`}>
              {remainingAttempts}
            </span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border-2 border-green-500 rounded-xl">
          <div className="flex items-center gap-3 text-green-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold text-lg">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 rounded-xl">
          <div className="flex items-center gap-3 text-red-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* PIN Display */}
      <div className="flex justify-center gap-4 mb-8">
        {renderPINDisplay()}
      </div>

      {/* Keypad */}
      {!successMessage && (
        <div className="mb-8">
          {renderKeypad()}
        </div>
      )}

      {/* Call Customer Button */}
      {requiresCall && customerPhone && (
        <div className="text-center">
          <button
            onClick={handleCallCustomer}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors text-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call Customer
          </button>
          <p className="mt-4 text-sm text-gray-600">
            Customer will provide the correct PIN over the phone
          </p>
        </div>
      )}

      {/* Loading State */}
      {isVerifying && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Verifying PIN...</p>
        </div>
      )}

      {/* Order Info */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
        Order ID: {orderId.slice(0, 8)}...
      </div>
    </div>
  )
}
