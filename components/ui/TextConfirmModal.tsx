'use client'

import { useState } from 'react'

interface TextConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  /** The exact text the user must type to confirm */
  requiredText: string
  /** Placeholder for the input field */
  inputPlaceholder?: string
}

export default function TextConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  requiredText,
  inputPlaceholder = 'Type here...'
}: TextConfirmModalProps) {
  const [inputValue, setInputValue] = useState('')

  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: '🗑️',
      confirmButton: 'bg-error hover:bg-error-dark text-white disabled:bg-gray-400 disabled:cursor-not-allowed',
      headerBg: 'bg-error-light dark:bg-red-900/20'
    },
    warning: {
      icon: '⚠️',
      confirmButton: 'bg-warning hover:bg-warning-dark text-white disabled:bg-gray-400 disabled:cursor-not-allowed',
      headerBg: 'bg-warning-light'
    },
    info: {
      icon: 'ℹ️',
      confirmButton: 'bg-primary hover:bg-primary-hover text-white disabled:bg-gray-400 disabled:cursor-not-allowed',
      headerBg: 'bg-primary-light dark:bg-purple-900/20'
    }
  }

  const styles = variantStyles[variant]

  const handleConfirm = () => {
    if (inputValue === requiredText) {
      onConfirm()
      setInputValue('')
      onClose()
    }
  }

  const handleClose = () => {
    setInputValue('')
    onClose()
  }

  const isConfirmEnabled = inputValue === requiredText

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          aria-hidden="true"
          onClick={handleClose}
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
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full">
                <span className="text-3xl" role="img" aria-label={variant}>
                  {styles.icon}
                </span>
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

          {/* Body with input */}
          <div className="px-6 py-4 bg-background">
            <label htmlFor="confirm-input" className="block text-sm font-medium text-foreground mb-2">
              Type <span className="font-bold text-error">&quot;{requiredText}&quot;</span> to confirm:
            </label>
            <input
              id="confirm-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmEnabled) {
                  handleConfirm()
                }
              }}
            />
          </div>

          {/* Footer */}
          <div className="bg-muted px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isConfirmEnabled}
              className={`inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${styles.confirmButton}`}
            >
              {confirmText}
            </button>
            <button
              type="button"
              onClick={handleClose}
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
