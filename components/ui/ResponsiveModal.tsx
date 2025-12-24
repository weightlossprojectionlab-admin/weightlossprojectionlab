/**
 * ResponsiveModal - Mobile-First Modal Base Component
 *
 * Provides consistent modal behavior across the platform with mobile optimization:
 * - Bottom sheet on mobile, centered on desktop
 * - Proper keyboard handling (max-height adjustment)
 * - Touch-optimized button sizing
 * - Accessible focus trap
 * - Responsive padding
 *
 * Usage:
 * <ResponsiveModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   size="md"
 *   title="Modal Title"
 *   footer={<ModalFooter />}
 * >
 *   <ModalContent />
 * </ResponsiveModal>
 */

'use client'

import { Fragment, ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export interface ResponsiveModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string | ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  showClose?: boolean
  closeOnBackdrop?: boolean
  mobileFullScreen?: boolean // For wizards that need full mobile screen
  fixedHeight?: boolean // Maintain consistent height (for wizards/multi-step)
  className?: string // Additional classes for modal panel
  headerClassName?: string // Custom header styling
  contentClassName?: string // Custom content area styling
  footerClassName?: string // Custom footer styling
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  full: 'sm:max-w-full sm:m-4'
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  showClose = true,
  closeOnBackdrop = true,
  mobileFullScreen = false,
  fixedHeight = false,
  className = '',
  headerClassName = '',
  contentClassName = '',
  footerClassName = ''
}: ResponsiveModalProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        onClose={closeOnBackdrop ? onClose : () => {}}
        className="relative z-50"
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Full-screen container - Mobile: bottom, Desktop: center */}
        <div className={`fixed inset-0 flex ${mobileFullScreen ? 'items-stretch sm:items-center' : 'items-end sm:items-center'} justify-center p-0 sm:p-4 overflow-y-auto`}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
          >
            <Dialog.Panel
              className={`
                w-full ${sizeClasses[size]}
                ${mobileFullScreen ? 'h-full sm:h-auto' : fixedHeight ? 'h-[25vh] sm:h-auto sm:max-h-[70vh]' : 'max-h-[95vh]'}
                bg-card
                rounded-t-2xl sm:rounded-xl
                shadow-xl
                overflow-hidden
                flex flex-col
                my-auto sm:my-0
                ${className}
              `}
            >
              {/* Header */}
              {(title || showClose) && (
                <div className={`
                  flex items-center justify-between
                  px-3 py-2 sm:px-6 sm:py-4
                  border-b border-border
                  flex-shrink-0
                  ${headerClassName}
                `}>
                  {title && (
                    <Dialog.Title className="text-base sm:text-lg font-semibold text-foreground pr-2">
                      {title}
                    </Dialog.Title>
                  )}
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="ml-auto p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted touch-manipulation flex-shrink-0"
                      aria-label="Close modal"
                    >
                      <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  )}
                </div>
              )}

              {/* Content - Scrollable area with keyboard space */}
              <div className={`
                flex-1
                overflow-y-auto
                px-3 py-3 sm:px-6 sm:py-6
                ${mobileFullScreen ? '' : 'max-h-[calc(100vh-16rem)] sm:max-h-[60vh]'}
                ${contentClassName}
              `}>
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className={`
                  px-3 py-2 sm:px-6 sm:py-4
                  bg-muted
                  border-t border-border
                  flex-shrink-0
                  ${footerClassName}
                `}>
                  {footer}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}

/**
 * ModalFooter - Responsive button container for modal actions
 */
interface ModalFooterProps {
  children: ReactNode
  align?: 'left' | 'center' | 'right' | 'between'
  mobileStack?: boolean // Stack buttons vertically on mobile
}

export function ModalFooter({
  children,
  align = 'right',
  mobileStack = true
}: ModalFooterProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  }

  return (
    <div className={`
      flex
      ${mobileStack ? 'flex-col sm:flex-row' : 'flex-row'}
      gap-3
      ${alignClasses[align]}
    `}>
      {children}
    </div>
  )
}

/**
 * ModalButton - Touch-optimized button for modals
 */
interface ModalButtonProps {
  children: ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
  className?: string
}

export function ModalButton({
  children,
  onClick,
  variant = 'secondary',
  disabled = false,
  type = 'button',
  fullWidth = false,
  className = ''
}: ModalButtonProps) {
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
    secondary: 'bg-background text-foreground border border-border hover:bg-muted active:bg-muted/80',
    danger: 'bg-error text-white hover:bg-error/90 active:bg-error/80'
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${fullWidth ? 'w-full' : 'w-full sm:flex-1'}
        px-4
        py-3 sm:py-2
        text-base sm:text-sm
        font-medium
        rounded-lg
        transition-colors
        disabled:opacity-50
        disabled:cursor-not-allowed
        touch-manipulation
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
