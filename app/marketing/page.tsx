/**
 * Marketing & Ads Page
 *
 * Generate marketing materials and social media ads
 * for different personas and platforms
 */

'use client'

import { useState } from 'react'
import AuthGuard from '@/components/auth/AuthGuard'
import { AdGeneratorModal } from '@/components/ads/AdGeneratorModal'
import { PERSONA_INFO } from '@/lib/ad-templates'
import { AD_PLATFORM_SPECS } from '@/lib/ad-generator'

export default function MarketingPage() {
  const [showAdGenerator, setShowAdGenerator] = useState(false)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Marketing & Advertising
            </h1>
            <p className="text-muted-foreground">
              Generate persona-driven ads for multiple platforms
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="text-4xl mb-2">👥</div>
              <h3 className="text-2xl font-bold text-foreground mb-1">3</h3>
              <p className="text-sm text-muted-foreground">Target Personas</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="text-4xl mb-2">📝</div>
              <h3 className="text-2xl font-bold text-foreground mb-1">13</h3>
              <p className="text-sm text-muted-foreground">Ad Templates</p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="text-4xl mb-2">📱</div>
              <h3 className="text-2xl font-bold text-foreground mb-1">7</h3>
              <p className="text-sm text-muted-foreground">Platform Formats</p>
            </div>
          </div>

          {/* Generate Ad Button */}
          <div className="mb-8">
            <button
              onClick={() => setShowAdGenerator(true)}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              🎨 Generate New Ad Campaign
            </button>
          </div>

          {/* Personas Overview */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Target Personas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.keys(PERSONA_INFO) as Array<keyof typeof PERSONA_INFO>).map((persona) => {
                const info = PERSONA_INFO[persona]
                return (
                  <div key={persona} className="bg-card p-6 rounded-lg border border-border">
                    <div className="text-4xl mb-3">{info.icon}</div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{info.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{info.description}</p>
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        <strong>Target:</strong> {info.targetAudience}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Supported Platforms */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Supported Platforms</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(AD_PLATFORM_SPECS) as Array<keyof typeof AD_PLATFORM_SPECS>).map((platform) => {
                const spec = AD_PLATFORM_SPECS[platform]
                return (
                  <div key={platform} className="bg-card p-4 rounded-lg border border-border text-center">
                    <h4 className="font-semibold text-foreground mb-1 text-sm">{spec.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {spec.aspectRatio} • {spec.width}×{spec.height}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Features Overview */}
          <div className="bg-gradient-to-br from-primary/10 to-purple-600/10 p-8 rounded-lg border border-primary/20">
            <h2 className="text-2xl font-bold text-foreground mb-4">✨ Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Persona-Driven</h4>
                  <p className="text-sm text-muted-foreground">
                    Templates crafted for specific user pain points and emotional hooks
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📐</span>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Multiple Formats</h4>
                  <p className="text-sm text-muted-foreground">
                    Export for Instagram, Facebook, Twitter, Pinterest, and LinkedIn
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Batch Export</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate ads for multiple platforms simultaneously
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎨</span>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Customizable</h4>
                  <p className="text-sm text-muted-foreground">
                    Add pricing, custom backgrounds, and branding
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Example Use Cases */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Example Use Cases</h2>
            <div className="space-y-3">
              <div className="bg-card p-4 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💪</span>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Weight Loss Campaign</h4>
                    <p className="text-sm text-muted-foreground">
                      Target individuals struggling with accountability. Use "Finally Stick To It This Time" template across Instagram Story, Feed, and Facebook.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-card p-4 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">👨‍👩‍👧‍👦</span>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Family Health Campaign</h4>
                    <p className="text-sm text-muted-foreground">
                      Target busy parents. Use "Keep Your Whole Family Healthy" template on Facebook and Pinterest where parents are active.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-card p-4 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚕️</span>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Caregiver Campaign</h4>
                    <p className="text-sm text-muted-foreground">
                      Target adult children caring for aging parents. Use "Be There When You Can't Be There" template on Facebook and LinkedIn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ad Generator Modal */}
        <AdGeneratorModal
          isOpen={showAdGenerator}
          onClose={() => setShowAdGenerator(false)}
        />
      </div>
    </AuthGuard>
  )
}
