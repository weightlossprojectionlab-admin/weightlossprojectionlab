'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

import { getCSRFToken } from '@/lib/csrf'
export default function FixProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [fixing, setFixing] = useState(false)

  const handleFix = async () => {
    if (!user) {
      toast.error('Please log in first')
      return
    }

    setFixing(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/fix-onboarding', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Profile fixed! Redirecting to dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        toast.error(data.error || 'Failed to fix profile')
      }
    } catch (error) {
      toast.error('Error fixing profile')
      console.error(error)
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Fix Onboarding Status
        </h1>
        <p className="text-muted-foreground mb-6">
          If you're being redirected to onboarding even though you've completed it,
          click the button below to restore your onboarding completion status.
        </p>
        <button
          onClick={handleFix}
          disabled={fixing || !user}
          className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {fixing ? 'Fixing...' : 'Fix My Profile'}
        </button>
      </div>
    </div>
  )
}
