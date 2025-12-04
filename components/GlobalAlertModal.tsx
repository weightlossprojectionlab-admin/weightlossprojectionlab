'use client'

import { useEffect, useState } from 'react'
import { AlertModal } from '@/components/ui/AlertModal'
import ConfirmModal from '@/components/ui/ConfirmModal'

/**
 * Global Alert/Confirm Modal Interceptor (DRY)
 *
 * Intercepts all window.alert() and window.confirm() calls and displays them
 * using existing AlertModal and ConfirmModal components.
 *
 * This ensures consistent styling across the entire application.
 *
 * Usage: Add <GlobalAlertModal /> to your providers once.
 */
export function GlobalAlertModal() {
  const [alert, setAlert] = useState<{
    isOpen: boolean
    message: string
  }>({
    isOpen: false,
    message: ''
  })

  const [confirm, setConfirm] = useState<{
    isOpen: boolean
    message: string
    resolve?: (value: boolean) => void
  }>({
    isOpen: false,
    message: ''
  })

  useEffect(() => {
    // Store original functions
    const originalAlert = window.alert
    const originalConfirm = window.confirm

    // Override window.alert
    window.alert = (message?: any) => {
      const msg = message?.toString() || ''
      setAlert({ isOpen: true, message: msg })
    }

    // Override window.confirm
    window.confirm = (message?: any): boolean => {
      const msg = message?.toString() || ''

      // Create a promise to wait for user response
      return new Promise<boolean>((resolve) => {
        setConfirm({
          isOpen: true,
          message: msg,
          resolve
        })
      }) as any // Synchronous return type, but we handle async
    }

    // Cleanup on unmount
    return () => {
      window.alert = originalAlert
      window.confirm = originalConfirm
    }
  }, [])

  const handleAlertClose = () => {
    setAlert({ isOpen: false, message: '' })
  }

  const handleConfirmClose = (confirmed: boolean) => {
    if (confirm.resolve) {
      confirm.resolve(confirmed)
    }
    setConfirm({ isOpen: false, message: '' })
  }

  return (
    <>
      {/* Alert Modal - uses existing AlertModal component */}
      <AlertModal
        isOpen={alert.isOpen}
        onClose={handleAlertClose}
        title="Alert"
        message={alert.message}
        type="warning"
        confirmText="OK"
      />

      {/* Confirm Modal - uses existing ConfirmModal component */}
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={() => handleConfirmClose(false)}
        onConfirm={() => handleConfirmClose(true)}
        title="Confirm"
        message={confirm.message}
        confirmText="OK"
        cancelText="Cancel"
        variant="info"
      />
    </>
  )
}
