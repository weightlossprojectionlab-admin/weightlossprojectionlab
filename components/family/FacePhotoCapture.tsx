/**
 * Face Photo Capture Component
 *
 * Captures 3 photos for identity verification:
 * - Front view
 * - Left profile
 * - Right profile
 *
 * Much simpler than OCR - just image capture for admin verification
 */

'use client'

import { useState, useRef } from 'react'
import { CameraIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export interface FacePhotoCaptureProps {
  onComplete: (data: {
    firstName: string
    lastName: string
    dateOfBirth?: string
    frontPhoto: string
    leftPhoto: string
    rightPhoto: string
  }) => void
  onClose: () => void
  isOpen: boolean
}

export function FacePhotoCapture({ onComplete, onClose, isOpen }: FacePhotoCaptureProps) {
  const [step, setStep] = useState<'front' | 'left' | 'right' | 'form'>('front')
  const [photos, setPhotos] = useState({
    front: null as string | null,
    left: null as string | null,
    right: null as string | null
  })
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: ''
  })

  const frontInputRef = useRef<HTMLInputElement>(null)
  const leftInputRef = useRef<HTMLInputElement>(null)
  const rightInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handlePhotoCapture = (angle: 'front' | 'left' | 'right', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const photoData = e.target?.result as string
      setPhotos(prev => ({ ...prev, [angle]: photoData }))

      // Auto-advance to next step
      if (angle === 'front') {
        setStep('left')
      } else if (angle === 'left') {
        setStep('right')
      } else if (angle === 'right') {
        setStep('form')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName) {
      alert('Please enter your first and last name')
      return
    }

    if (!photos.front || !photos.left || !photos.right) {
      alert('Please capture all 3 photos')
      return
    }

    onComplete({
      firstName: formData.firstName,
      lastName: formData.lastName,
      dateOfBirth: formData.dateOfBirth,
      frontPhoto: photos.front,
      leftPhoto: photos.left,
      rightPhoto: photos.right
    })
  }

  const getInstructions = () => {
    switch (step) {
      case 'front':
        return {
          title: 'Front View',
          instruction: 'Look straight at the camera',
          icon: '👤'
        }
      case 'left':
        return {
          title: 'Left Profile',
          instruction: 'Turn your head to show your left side',
          icon: '👈'
        }
      case 'right':
        return {
          title: 'Right Profile',
          instruction: 'Turn your head to show your right side',
          icon: '👉'
        }
      default:
        return {
          title: 'Your Information',
          instruction: 'Enter your name to complete registration',
          icon: '📝'
        }
    }
  }

  const instructions = getInstructions()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{instructions.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-foreground">Identity Verification</h2>
              <p className="text-sm text-muted-foreground">{instructions.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${photos.front ? 'text-success-dark' : step === 'front' ? 'text-primary' : 'text-muted-foreground'}`}>
              {photos.front ? <CheckCircleIcon className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
              <span className="text-sm font-medium">Front</span>
            </div>
            <div className="w-8 h-0.5 bg-border" />
            <div className={`flex items-center gap-2 ${photos.left ? 'text-success-dark' : step === 'left' ? 'text-primary' : 'text-muted-foreground'}`}>
              {photos.left ? <CheckCircleIcon className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
              <span className="text-sm font-medium">Left</span>
            </div>
            <div className="w-8 h-0.5 bg-border" />
            <div className={`flex items-center gap-2 ${photos.right ? 'text-success-dark' : step === 'right' ? 'text-primary' : 'text-muted-foreground'}`}>
              {photos.right ? <CheckCircleIcon className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
              <span className="text-sm font-medium">Right</span>
            </div>
          </div>

          {step !== 'form' ? (
            /* Photo Capture Steps */
            <div>
              <div className="bg-primary-light border border-primary rounded-lg p-6 mb-6 text-center">
                <p className="text-primary-dark dark:text-purple-300 font-medium mb-2">
                  {instructions.instruction}
                </p>
                <p className="text-sm text-primary-dark/80 dark:text-purple-300/80">
                  Make sure your face is clearly visible and well-lit
                </p>
              </div>

              {/* Current Photo Preview */}
              {photos[step] && (
                <div className="mb-6">
                  <img
                    src={photos[step]!}
                    alt={`${step} photo`}
                    className="w-full max-w-md mx-auto rounded-lg border-2 border-success"
                  />
                </div>
              )}

              {/* Hidden File Inputs */}
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => handlePhotoCapture('front', e)}
                className="hidden"
              />
              <input
                ref={leftInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => handlePhotoCapture('left', e)}
                className="hidden"
              />
              <input
                ref={rightInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => handlePhotoCapture('right', e)}
                className="hidden"
              />

              {/* Capture Button */}
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={() => {
                    if (step === 'front') frontInputRef.current?.click()
                    else if (step === 'left') leftInputRef.current?.click()
                    else if (step === 'right') rightInputRef.current?.click()
                  }}
                  className="w-full max-w-md px-6 py-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-lg flex items-center justify-center gap-3"
                >
                  <CameraIcon className="w-6 h-6" />
                  {photos[step] ? 'Retake Photo' : 'Take Photo'}
                </button>

                {photos[step] && (
                  <button
                    onClick={() => {
                      if (step === 'front') setStep('left')
                      else if (step === 'left') setStep('right')
                      else if (step === 'right') setStep('form')
                    }}
                    className="text-primary hover:text-primary-hover font-medium"
                  >
                    Continue →
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Name Entry Form */
            <form onSubmit={handleSubmit}>
              <div className="bg-success-light border border-success rounded-lg p-4 mb-6">
                <p className="text-success-dark text-sm">
                  ✓ All photos captured! Now enter your information.
                </p>
              </div>

              {/* Photo Thumbnails */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {photos.front && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Front</p>
                    <img src={photos.front} alt="Front" className="w-full rounded-lg border border-border" />
                  </div>
                )}
                {photos.left && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Left</p>
                    <img src={photos.left} alt="Left" className="w-full rounded-lg border border-border" />
                  </div>
                )}
                {photos.right && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Right</p>
                    <img src={photos.right} alt="Right" className="w-full rounded-lg border border-border" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Date of Birth (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-semibold text-lg"
                >
                  Complete Registration
                </button>
                <button
                  type="button"
                  onClick={() => setStep('front')}
                  className="px-6 py-4 border-2 border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
                >
                  Retake Photos
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
