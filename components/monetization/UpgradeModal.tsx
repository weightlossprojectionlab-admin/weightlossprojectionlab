'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import type { UpgradePrompt } from '@/lib/monetization-triggers'

interface UpgradeModalProps {
  prompt: UpgradePrompt | null
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
}

export default function UpgradeModal({
  prompt,
  isOpen,
  onClose,
  onUpgrade
}: UpgradeModalProps) {
  if (!prompt) return null

  const canDismiss = prompt.urgency === 'soft'

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={canDismiss ? onClose : () => {}}>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card border border-border p-6 text-left align-middle shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {/* Tier badge */}
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                      {prompt.tier === 'premium' && '⭐ Premium'}
                      {prompt.tier === 'family' && '👨‍👩‍👧 Family'}
                      {prompt.tier === 'familyPlus' && '👨‍👩‍👧‍👦 Family+'}
                    </div>

                    <Dialog.Title className="text-2xl font-bold text-foreground">
                      {prompt.title}
                    </Dialog.Title>
                  </div>

                  {/* Close button (only if soft urgency) */}
                  {canDismiss && (
                    <button
                      onClick={onClose}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Close"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Description */}
                <p className="text-muted-foreground mb-6">{prompt.description}</p>

                {/* Features list */}
                <div className="space-y-3 mb-6">
                  {prompt.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                        <svg
                          className="w-3 h-3 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="text-foreground font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing (if provided) */}
                {prompt.pricing && (
                  <div className="bg-accent rounded-lg p-4 mb-6">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Starting at</div>
                        <div className="text-3xl font-bold text-foreground">
                          {prompt.pricing.price}
                          <span className="text-base text-muted-foreground font-normal">
                            /{prompt.pricing.period}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-primary">
                          {prompt.pricing.plan}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CTA Buttons */}
                <div className="flex gap-3">
                  {canDismiss && (
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-3 rounded-lg border-2 border-border hover:bg-accent transition-colors font-semibold"
                    >
                      Maybe Later
                    </button>
                  )}
                  <button
                    onClick={onUpgrade}
                    className={`${
                      canDismiss ? 'flex-1' : 'w-full'
                    } px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold shadow-lg`}
                  >
                    {prompt.ctaText}
                  </button>
                </div>

                {/* Hard urgency notice */}
                {!canDismiss && (
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Upgrade required to continue using this feature
                  </p>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
