'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: AlertType
  confirmText?: string
  showCancel?: boolean
  cancelText?: string
  onConfirm?: () => void
}

/**
 * Animated Pop-up Alert Modal
 *
 * Features:
 * - Smooth scale + fade animation
 * - Color-coded by alert type
 * - Icon indicators
 * - Optional cancel button
 * - Backdrop click to close
 */
export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  showCancel = false,
  cancelText = 'Cancel',
  onConfirm
}: AlertModalProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Trigger animation after mount
      setTimeout(() => setIsAnimating(true), 10)
    } else {
      setIsAnimating(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Color schemes for different alert types
  const typeStyles = {
    success: {
      icon: CheckCircleIcon,
      iconColor: 'text-green-600 dark:text-green-400',
      titleColor: 'text-green-900 dark:text-green-100',
      borderColor: 'border-green-200 dark:border-green-800',
      bgColor: 'bg-green-50 dark:bg-green-900/10'
    },
    error: {
      icon: XCircleIcon,
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-900 dark:text-red-100',
      borderColor: 'border-red-200 dark:border-red-800',
      bgColor: 'bg-red-50 dark:bg-red-900/10'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      titleColor: 'text-yellow-900 dark:text-yellow-100',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/10'
    },
    info: {
      icon: InformationCircleIcon,
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-900 dark:text-blue-100',
      borderColor: 'border-blue-200 dark:border-blue-800',
      bgColor: 'bg-blue-50 dark:bg-blue-900/10'
    }
  }

  const style = typeStyles[type]
  const Icon = style.icon

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-card rounded-xl shadow-2xl max-w-md w-full border ${style.borderColor} transform transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        {/* Header with Icon */}
        <div className={`p-6 border-b border-border ${style.bgColor}`}>
          <div className="flex items-start gap-4">
            <Icon className={`w-8 h-8 flex-shrink-0 ${style.iconColor}`} />
            <div className="flex-1">
              <h3 className={`text-lg font-bold ${style.titleColor}`}>
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Body */}
        <div className="p-6">
          <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 flex gap-3 justify-end">
          {showCancel && (
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium shadow-sm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
