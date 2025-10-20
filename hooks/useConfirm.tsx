'use client'

import { useState, useCallback } from 'react'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: ''
  })
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)

    return new Promise<boolean>((resolve) => {
      setResolveCallback(() => resolve)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (resolveCallback) {
      resolveCallback(true)
    }
    setIsOpen(false)
    setResolveCallback(null)
  }, [resolveCallback])

  const handleCancel = useCallback(() => {
    if (resolveCallback) {
      resolveCallback(false)
    }
    setIsOpen(false)
    setResolveCallback(null)
  }, [resolveCallback])

  const ConfirmDialog = useCallback(() => (
    <ConfirmModal
      isOpen={isOpen}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      title={options.title}
      message={options.message}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      variant={options.variant}
    />
  ), [isOpen, options, handleCancel, handleConfirm])

  return { confirm, ConfirmDialog }
}
