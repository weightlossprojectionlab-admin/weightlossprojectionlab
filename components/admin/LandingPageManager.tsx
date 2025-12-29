/**
 * Landing Page Manager
 *
 * Admin component to manage, preview, and generate ads from landing pages
 * Shows all 30 landing pages organized by category
 */

'use client'

import { useState } from 'react'
import {
  getAllLandingPagePersonas,
  getPersonasByCategory,
  LANDING_PAGE_CATEGORIES,
  LandingPageCategory,
  LandingPagePersona
} from '@/lib/landing-page-personas'
import {
  getAdTemplatesForLandingPage,
  getRecommendedPlatforms,
  getLandingPageUrlWithTracking
} from '@/lib/landing-page-ad-generator'
import { AdGeneratorModal } from '@/components/ads/AdGeneratorModal'

interface LandingPageManagerProps {
  onGenerateAd?: (persona: LandingPagePersona) => void
}

export function LandingPageManager({ onGenerateAd }: LandingPageManagerProps) {
  const [selectedCategory, setSelectedCategory] = useState<LandingPageCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPersona, setSelectedPersona] = useState<LandingPagePersona | null>(null)
  const [showPersonaDetails, setShowPersonaDetails] = useState(false)
  const [showAdGenerator, setShowAdGenerator] = useState(false)

  const allPersonas = getAllLandingPagePersonas()

  const filteredPersonas = allPersonas.filter(persona => {
    const matchesCategory = selectedCategory === 'all' || persona.category === selectedCategory
    const matchesSearch = !searchQuery ||
      persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      persona.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      persona.targetAudience.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesSearch
  })

  const liveCount = allPersonas.filter(p => p.status === 'live').length
  const comingSoonCount = allPersonas.filter(p => p.status === 'coming-soon').length

  const handlePersonaClick = (persona: LandingPagePersona) => {
    setSelectedPersona(persona)
    setShowPersonaDetails(true)
  }

  const handleGenerateAd = (persona: LandingPagePersona) => {
    setSelectedPersona(persona)
    setShowAdGenerator(true)
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-3xl mb-1">📄</div>
          <div className="text-2xl font-bold text-foreground">{allPersonas.length}</div>
          <div className="text-sm text-muted-foreground">Total Landing Pages</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-3xl mb-1">✅</div>
          <div className="text-2xl font-bold text-green-600">{liveCount}</div>
          <div className="text-sm text-muted-foreground">Live Pages</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-3xl mb-1">🚧</div>
          <div className="text-2xl font-bold text-orange-600">{comingSoonCount}</div>
          <div className="text-sm text-muted-foreground">Coming Soon</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-3xl mb-1">📱</div>
          <div className="text-2xl font-bold text-foreground">{allPersonas.length * 3}</div>
          <div className="text-sm text-muted-foreground">Ad Templates Available</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search landing pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as LandingPageCategory | 'all')}
          className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="all">All Categories ({allPersonas.length})</option>
          {(Object.entries(LANDING_PAGE_CATEGORIES) as [LandingPageCategory, typeof LANDING_PAGE_CATEGORIES[LandingPageCategory]][]).map(([key, cat]) => (
            <option key={key} value={key}>
              {cat.icon} {cat.name} ({cat.count})
            </option>
          ))}
        </select>
      </div>

      {/* Landing Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPersonas.map((persona) => (
          <div
            key={persona.id}
            className="bg-card rounded-lg border border-border hover:border-primary transition-all overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{persona.icon}</div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  persona.status === 'live'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                }`}>
                  {persona.status === 'live' ? 'LIVE' : 'COMING SOON'}
                </span>
              </div>

              <h3 className="font-bold text-foreground mb-2">{persona.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {persona.description}
              </p>

              <div className="mb-4 space-y-2">
                <div className="text-xs text-muted-foreground">
                  <strong>Target:</strong> {persona.targetAudience.split(',')[0]}
                </div>
                <div className="flex flex-wrap gap-1">
                  {persona.painPoints.slice(0, 2).map((pain, i) => (
                    <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs">
                      {pain}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {persona.status === 'live' && (
                  <a
                    href={persona.landingPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded text-center text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    View Page
                  </a>
                )}
                <button
                  onClick={() => handlePersonaClick(persona)}
                  className="flex-1 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded text-sm font-medium transition-colors"
                >
                  Details
                </button>
                <button
                  onClick={() => handleGenerateAd(persona)}
                  className="px-3 py-2 bg-gradient-to-r from-primary to-purple-600 text-white rounded text-sm font-medium hover:shadow-lg transition-all"
                >
                  🎨
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPersonas.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-muted-foreground">No landing pages found matching your search.</p>
        </div>
      )}

      {/* Persona Details Modal */}
      {showPersonaDetails && selectedPersona && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-5xl">{selectedPersona.icon}</span>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{selectedPersona.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedPersona.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPersonaDetails(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Category */}
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">Category</h3>
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    {LANDING_PAGE_CATEGORIES[selectedPersona.category].icon} {LANDING_PAGE_CATEGORIES[selectedPersona.category].name}
                  </span>
                </div>

                {/* Target Audience */}
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">Target Audience</h3>
                  <p className="text-sm text-muted-foreground">{selectedPersona.targetAudience}</p>
                </div>

                {/* Pain Points */}
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">Pain Points</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPersona.painPoints.map((pain, i) => (
                      <span key={i} className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded text-sm">
                        {pain}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Key Features */}
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">Key Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPersona.keyFeatures.map((feature, i) => (
                      <span key={i} className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded text-sm">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Emotional Triggers */}
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">Emotional Triggers</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPersona.emotionalTriggers.map((trigger, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded text-sm">
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Platforms */}
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">Recommended Ad Platforms</h3>
                  <div className="flex flex-wrap gap-2">
                    {getRecommendedPlatforms(selectedPersona).map((platform, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded text-sm">
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Ad Keywords */}
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">Ad Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPersona.adKeywords.map((keyword, i) => (
                      <span key={i} className="px-2 py-1 bg-muted rounded text-xs font-mono">
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Landing Page URL */}
                {selectedPersona.status === 'live' && (
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-2">Landing Page URL</h3>
                    <div className="bg-muted p-3 rounded font-mono text-xs break-all">
                      {selectedPersona.landingPageUrl}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  {selectedPersona.status === 'live' && (
                    <a
                      href={selectedPersona.landingPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-3 bg-primary text-white rounded-lg text-center font-medium hover:bg-primary/90 transition-colors"
                    >
                      View Landing Page
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setShowPersonaDetails(false)
                      handleGenerateAd(selectedPersona)
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                  >
                    🎨 Generate Ads
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ad Generator Modal */}
      {showAdGenerator && (
        <AdGeneratorModal
          isOpen={showAdGenerator}
          onClose={() => setShowAdGenerator(false)}
        />
      )}
    </div>
  )
}
