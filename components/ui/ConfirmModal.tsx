'use client'

import { Fragment } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  customIcon?: React.ReactNode // Allow custom icon override
  iconSize?: 'small' | 'medium' | 'large' // Icon size option
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  customIcon,
  iconSize = 'medium'
}: ConfirmModalProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: '🗑️',
      confirmButton: 'bg-error hover:bg-error-dark text-white',
      headerBg: 'bg-error-light dark:bg-red-900/20'
    },
    warning: {
      icon: '⚠️',
      confirmButton: 'bg-warning hover:bg-warning-dark text-white',
      headerBg: 'bg-warning-light'
    },
    info: {
      icon: 'ℹ️',
      confirmButton: 'bg-primary hover:bg-primary-hover text-white',
      headerBg: 'bg-primary-light dark:bg-purple-900/20'
    }
  }

  const styles = variantStyles[variant]

  const iconSizeStyles = {
    small: 'h-10 w-10',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  }

  const iconTextSizeStyles = {
    small: 'text-2xl',
    medium: 'text-3xl',
    large: 'text-4xl'
  }

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        {/* Modal panel */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-card text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          {/* Header */}
          <div className={`px-6 pt-5 pb-4 ${styles.headerBg}`}>
            <div className="flex items-start">
              <div className={`flex ${iconSizeStyles[iconSize]} flex-shrink-0 items-center justify-center rounded-full`}>
                {customIcon ? (
                  <div className="flex items-center justify-center w-full h-full">
                    {customIcon}
                  </div>
                ) : (
                  <span className={iconTextSizeStyles[iconSize]} role="img" aria-label={variant}>
                    {styles.icon}
                  </span>
                )}
              </div>
              <div className="ml-4 mt-0 text-left">
                <h3 className="text-lg font-medium leading-6 text-foreground" id="modal-title">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-muted px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={handleConfirm}
              className={`inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${styles.confirmButton}`}
            >
              {confirmText}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md border border-border bg-background px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
