/**
 * Demo Request Button Component
 *
 * Client component wrapper for triggering demo request modal
 * Can be used within server components
 */

'use client'

import { useState } from 'react'
import { DemoRequestModal } from './DemoRequestModal'

interface DemoRequestButtonProps {
  source: string
  className?: string
  children: React.ReactNode
}

export function DemoRequestButton({ source, className, children }: DemoRequestButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        {children}
      </button>

      <DemoRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        source={source}
      />
    </>
  )
}
