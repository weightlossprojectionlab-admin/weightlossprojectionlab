'use client'

/**
 * PINDisplay Component
 *
 * Customer-facing PIN display for delivery verification
 * Features:
 * - Large, readable PIN display
 * - Copy to clipboard functionality
 * - How-to-use instructions
 * - Refresh PIN option
 */

import { useState } from 'react'
import { requestPINReset } from '@/lib/order-operations'

interface PINDisplayProps {
  orderId: string
  pin: string
  userId: string
  orderStatus: string
  onPINRefreshed?: (newPIN: string) => void
}

export default function PINDisplay({
  orderId,
  pin,
  userId,
  orderStatus,
  onPINRefreshed
}: PINDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false)
  const [currentPIN, setCurrentPIN] = useState(pin)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentPIN)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleRefreshPIN = async () => {
    setIsRefreshing(true)
    setShowRefreshConfirm(false)

    try {
      const result = await requestPINReset(
        orderId,
        'Customer requested PIN refresh',
        userId
      )

      if (result.success && result.newPIN) {
        setCurrentPIN(result.newPIN)
        onPINRefreshed?.(result.newPIN)
      } else {
        alert(result.message || 'Failed to refresh PIN')
      }
    } catch (err) {
      console.error('Error refreshing PIN:', err)
      alert('Error refreshing PIN. Please try again.')
    } finally {
      setIsRefreshing(false)
    }
  }

  const canRefreshPIN = orderStatus !== 'delivered' && orderStatus !== 'cancelled'

  return (
    <div className="max-w-2xl mx-auto">
      {/* Main PIN Display Card */}
      <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-xl p-8 border-2 border-green-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your Delivery PIN
          </h2>
          <p className="text-gray-600">
            Provide this PIN to your delivery driver
          </p>
        </div>

        {/* PIN Display */}
        <div className="bg-white rounded-xl p-8 mb-6 border-2 border-gray-200">
          <div className="flex justify-center gap-4 mb-6">
            {currentPIN.split('').map((digit, index) => (
              <div
                key={index}
                className="w-20 h-24 bg-gradient-to-br from-green-100 to-green-50 border-3 border-green-500 rounded-xl flex items-center justify-center shadow-lg"
              >
                <span className="text-5xl font-bold text-green-700">
                  {digit}
                </span>
              </div>
            ))}
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy PIN
              </>
            )}
          </button>
        </div>

        {/* Refresh PIN Option */}
        {canRefreshPIN && (
          <div className="mb-6">
            {!showRefreshConfirm ? (
              <button
                onClick={() => setShowRefreshConfirm(true)}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Need a new PIN?
              </button>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <p className="text-sm text-yellow-900 mb-3">
                  Are you sure you want to generate a new PIN? The old PIN will no longer work.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefreshPIN}
                    disabled={isRefreshing}
                    className="flex-1 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {isRefreshing ? 'Refreshing...' : 'Yes, Generate New PIN'}
                  </button>
                  <button
                    onClick={() => setShowRefreshConfirm(false)}
                    className="flex-1 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Badge */}
        <div className="text-center text-sm text-gray-500">
          Order Status: <span className="font-semibold capitalize">{orderStatus.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* How to Use Instructions */}
      <div className="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How PIN Verification Works
        </h3>
        <ol className="space-y-3 text-sm text-blue-900">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
              1
            </span>
            <span>
              <strong>Driver arrives</strong> with your order
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
              2
            </span>
            <span>
              <strong>Driver asks for PIN</strong> - Show them this screen or tell them the 4 digits
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
              3
            </span>
            <span>
              <strong>Driver enters PIN</strong> on their device to verify delivery
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
              4
            </span>
            <span>
              <strong>Delivery confirmed</strong> - You receive your groceries!
            </span>
          </li>
        </ol>
      </div>

      {/* Security Notice */}
      <div className="mt-6 bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Why We Use PINs</h4>
            <p className="text-sm text-gray-600">
              PIN verification prevents fraud and ensures you receive your order.
              The driver has 3 attempts to enter the correct PIN. If they can't verify,
              they'll call you to confirm the delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Order ID Reference */}
      <div className="mt-4 text-center text-xs text-gray-400">
        Order ID: {orderId}
      </div>
    </div>
  )
}
