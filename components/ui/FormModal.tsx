/**
 * FormModal - ResponsiveModal optimized for forms
 *
 * Features:
 * - Form submission handling
 * - Automatic keyboard space adjustment
 * - Loading states
 * - Error display
 */

'use client'

import { ReactNode, FormEvent } from 'react'
import { ResponsiveModal, ModalFooter, ModalButton } from './ResponsiveModal'

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: FormEvent) => void | Promise<void>
  title: string
  children: ReactNode
  submitText?: string
  cancelText?: string
  isSubmitting?: boolean
  submitDisabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  submitText = 'Submit',
  cancelText = 'Cancel',
  isSubmitting = false,
  submitDisabled = false,
  size = 'md'
}: FormModalProps) {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await onSubmit(e)
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      closeOnBackdrop={!isSubmitting}
      footer={
        <ModalFooter align="right">
          <ModalButton
            onClick={onClose}
            variant="secondary"
            disabled={isSubmitting}
          >
            {cancelText}
          </ModalButton>
          <ModalButton
            onClick={handleSubmit}
            variant="primary"
            disabled={isSubmitting || submitDisabled}
            type="submit"
          >
            {isSubmitting ? 'Submitting...' : submitText}
          </ModalButton>
        </ModalFooter>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {children}
      </form>
    </ResponsiveModal>
  )
}
