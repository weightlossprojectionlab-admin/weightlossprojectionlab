'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { ArrowPathIcon, BeakerIcon, ChartBarIcon, SparklesIcon, CubeIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface AnalysisStatus {
  running: boolean
  startedAt?: string
  startedBy?: string
  completedAt?: string
  failedAt?: string
  lastRunBy?: string
  status?: 'completed' | 'failed' | 'running'
  error?: string
  progress?: string
  recipesGenerated?: number
  recipesSkipped?: number
}

interface AnalysisMetadata {
  lastAnalysisRun?: string
  lastAnalysisBy?: string
  totalProductAssociations?: number
  lastRecipeGeneration?: string
  lastRecipeGenerationBy?: string
  totalMLRecipes?: number
  totalMLRecipesGenerated?: number
}

export default function MLAnalyticsPage() {
  const [status, setStatus] = useState<AnalysisStatus>({ running: false })
  const [metadata, setMetadata] = useState<AnalysisMetadata>({})
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  // Recipe generation state
  const [recipeStatus, setRecipeStatus] = useState<AnalysisStatus>({ running: false })
  const [recipeLoading, setRecipeLoading] = useState(true)
  const [recipeTriggering, setRecipeTriggering] = useState(false)

  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    return await user.getIdToken()
  }

  useEffect(() => {
    loadStatus()
    loadRecipeStatus()

    // Auto-refresh every 5 seconds if any process is running
    const interval = setInterval(() => {
      if (status.running || recipeStatus.running) {
        loadStatus()
        loadRecipeStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [status.running, recipeStatus.running])

  const loadStatus = async () => {
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/admin/ml/analyze-associations', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to load status')
      }

      const data = await response.json()
      setStatus(data.status || { running: false })
      setMetadata(data.metadata || {})
    } catch (err) {
      logger.error('Failed to load analysis status', err as Error)
      toast.error('Failed to load status')
    } finally {
      setLoading(false)
    }
  }

  const handleTriggerAnalysis = async () => {
    if (status.running) {
      toast.error('Analysis already in progress')
      return
    }

    const confirmed = confirm(
      'This will analyze all user shopping data to find product associations. ' +
      'The process may take several minutes depending on data volume. Continue?'
    )

    if (!confirmed) return

    setTriggering(true)

    try {
      const token = await getAuthToken()
      const response = await fetch('/api/admin/ml/analyze-associations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start analysis')
      }

      const data = await response.json()
      toast.success(data.message || 'Analysis started')

      // Refresh status after a short delay
      setTimeout(() => loadStatus(), 1000)
    } catch (err) {
      logger.error('Failed to trigger analysis', err as Error)
      toast.error(err instanceof Error ? err.message : 'Failed to start analysis')
    } finally {
      setTriggering(false)
    }
  }

  const loadRecipeStatus = async () => {
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/admin/ml/generate-recipes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to load recipe generation status')
      }

      const data = await response.json()
      setRecipeStatus(data.status || { running: false })

      // Merge recipe metadata into main metadata
      setMetadata(prev => ({ ...prev, ...data.metadata }))
    } catch (err) {
      logger.error('Failed to load recipe generation status', err as Error)
      toast.error('Failed to load recipe status')
    } finally {
      setRecipeLoading(false)
    }
  }

  const handleTriggerRecipeGeneration = async () => {
    if (recipeStatus.running) {
      toast.error('Recipe generation already in progress')
      return
    }

    // Check if associations exist
    if (!metadata.totalProductAssociations || metadata.totalProductAssociations === 0) {
      toast.error('No product associations found. Please run analysis first.')
      return
    }

    const confirmed = confirm(
      'This will generate recipes from product associations discovered in your data. ' +
      'Generated recipes will be saved as drafts for review. Continue?'
    )

    if (!confirmed) return

    setRecipeTriggering(true)

    try {
      const token = await getAuthToken()
      const response = await fetch('/api/admin/ml/generate-recipes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 50 })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start recipe generation')
      }

      const data = await response.json()
      toast.success(data.message || 'Recipe generation started')

      // Refresh status after a short delay
      setTimeout(() => loadRecipeStatus(), 1000)
    } catch (err) {
      logger.error('Failed to trigger recipe generation', err as Error)
      toast.error(err instanceof Error ? err.message : 'Failed to start recipe generation')
    } finally {
      setRecipeTriggering(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">ML Analytics</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Analyze user shopping patterns to discover product associations and generate recipe suggestions
        </p>
      </div>

      {/* Product Association Analysis Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <BeakerIcon className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Product Association Analysis
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Market basket analysis to find products frequently bought together
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Current Status</h3>

            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                <span>Loading status...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Running Status */}
                {status.running && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <ArrowPathIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900 dark:text-blue-100">Analysis Running</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {status.progress || 'Processing...'}
                      </p>
                      {status.startedAt && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Started: {formatDate(status.startedAt)} by {status.startedBy}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Completed Status */}
                {!status.running && status.status === 'completed' && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <SparklesIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900 dark:text-green-100">Analysis Complete</p>
                      {status.completedAt && (
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Completed: {formatDate(status.completedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Failed Status */}
                {!status.running && status.status === 'failed' && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-red-900 dark:text-red-100">Analysis Failed</p>
                      <p className="text-sm text-red-700 dark:text-red-300">{status.error || 'Unknown error'}</p>
                      {status.failedAt && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Failed: {formatDate(status.failedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Idle Status */}
                {!status.running && !status.status && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <ChartBarIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">Ready to Analyze</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No analysis has been run yet
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Analysis Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Analysis</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {metadata.lastAnalysisRun ? formatDate(metadata.lastAnalysisRun) : 'Never'}
                </p>
                {metadata.lastAnalysisBy && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">by {metadata.lastAnalysisBy}</p>
                )}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Product Associations</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {metadata.totalProductAssociations?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">products with associations</p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {status.running ? 'Running' : 'Idle'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {status.running ? 'In progress' : 'Ready to run'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Click to run market basket analysis on all user shopping data.</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                This process analyzes products bought together to generate smart recipe suggestions.
              </p>
            </div>

            <button
              onClick={handleTriggerAnalysis}
              disabled={status.running || triggering}
              className="px-6 py-3 bg-primary hover:bg-primary-hover disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
            >
              {triggering || status.running ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  {status.running ? 'Running...' : 'Starting...'}
                </>
              ) : (
                <>
                  <BeakerIcon className="h-5 w-5" />
                  Run Analysis
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ML Recipe Generation Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <CubeIcon className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              ML Recipe Generation
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Auto-generate recipes from discovered product associations
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Current Status</h3>

            {recipeLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                <span>Loading status...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Running Status */}
                {recipeStatus.running && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <ArrowPathIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900 dark:text-blue-100">Generating Recipes</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {recipeStatus.progress || 'Processing...'}
                      </p>
                      {recipeStatus.startedAt && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Started: {formatDate(recipeStatus.startedAt)} by {recipeStatus.startedBy}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Completed Status */}
                {!recipeStatus.running && recipeStatus.status === 'completed' && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <SparklesIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Generation Complete
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Generated {recipeStatus.recipesGenerated || 0} recipes, skipped {recipeStatus.recipesSkipped || 0}
                      </p>
                      {recipeStatus.completedAt && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Completed: {formatDate(recipeStatus.completedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Failed Status */}
                {!recipeStatus.running && recipeStatus.status === 'failed' && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-red-900 dark:text-red-100">Generation Failed</p>
                      <p className="text-sm text-red-700 dark:text-red-300">{recipeStatus.error || 'Unknown error'}</p>
                      {recipeStatus.failedAt && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Failed: {formatDate(recipeStatus.failedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Idle Status */}
                {!recipeStatus.running && !recipeStatus.status && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <CubeIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">Ready to Generate</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No recipes have been generated yet
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recipe Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Generation</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {metadata.lastRecipeGeneration ? formatDate(metadata.lastRecipeGeneration) : 'Never'}
                </p>
                {metadata.lastRecipeGenerationBy && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    by {metadata.lastRecipeGenerationBy}
                  </p>
                )}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">ML-Generated Recipes</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {metadata.totalMLRecipes?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">total in database</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Generate recipes from product associations discovered in your data.</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Recipes will be created as drafts and can be reviewed in the Recipes tab.
              </p>
            </div>

            <button
              onClick={handleTriggerRecipeGeneration}
              disabled={recipeStatus.running || recipeTriggering || !metadata.totalProductAssociations}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
            >
              {recipeTriggering || recipeStatus.running ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  {recipeStatus.running ? 'Generating...' : 'Starting...'}
                </>
              ) : (
                <>
                  <CubeIcon className="h-5 w-5" />
                  Generate Recipes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          How Product Association Analysis Works
        </h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>
            <strong>1. Data Collection:</strong> Analyzes all barcode scans from user shopping lists to understand what products are bought together.
          </p>
          <p>
            <strong>2. Session Grouping:</strong> Groups scans within 24 hours from the same user into shopping sessions.
          </p>
          <p>
            <strong>3. Pattern Discovery:</strong> Uses market basket analysis (Apriori algorithm) to find products frequently purchased together.
          </p>
          <p>
            <strong>4. Metric Calculation:</strong> Calculates support (frequency), confidence (probability), and lift (strength) for each product pair.
          </p>
          <p>
            <strong>5. Smart Suggestions:</strong> Uses these associations to suggest complementary products and auto-generate recipes.
          </p>
        </div>
      </div>

      {/* Future Features */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Coming Soon
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            Collaborative filtering for personalized recommendations
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            Regional product preferences and trends
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            Smart shopping list suggestions based on purchase patterns
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            AI-powered meal planning based on user preferences
          </li>
        </ul>
      </div>
    </div>
  )
}
