'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'
import { ArrowLeftIcon, CheckBadgeIcon, ClockIcon, MapPinIcon, ShoppingBagIcon, ChartBarIcon, UsersIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

// Dynamic imports for Recharts components to reduce bundle size
const ProductScanTimeline = dynamic(() => import('@/components/charts/ProductScanTimeline').then(m => ({ default: m.ProductScanTimeline })), {
  loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false
})

const ProductStoreBreakdown = dynamic(() => import('@/components/charts/ProductStoreBreakdown').then(m => ({ default: m.ProductStoreBreakdown })), {
  loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false
})

const ProductContextBreakdown = dynamic(() => import('@/components/charts/ProductContextBreakdown').then(m => ({ default: m.ProductContextBreakdown })), {
  loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false
})

interface ProductDetail {
  barcode: string
  productName: string
  brand: string
  imageUrl?: string
  category: string
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sodium: number
    servingSize: string
  }
  stats: {
    totalScans: number
    uniqueUsers: number
    totalPurchases: number
    firstSeenAt: string
    lastSeenAt: string
  }
  regional: {
    stores: string[]
    regions: string[]
    avgPriceCents: number
    priceMin: number
    priceMax: number
    lastPriceUpdate: string
  }
  usage: {
    linkedRecipes: number
    popularityScore: number
  }
  quality: {
    verified: boolean
    verificationCount: number
    lastVerified?: string
    dataSource: string
    confidence: number
  }
  createdAt: string
  updatedAt: string
}

interface Analytics {
  scanTimeline: { date: string; count: number }[]
  regionalBreakdown: { region: string; scans: number; stores: string[]; avgPriceCents: number }[]
  storeBreakdown: { store: string; scans: number }[]
  contextBreakdown: { context: string; count: number }[]
  conversionRate: number
  recentScans: any[]
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const barcode = params?.barcode as string
  const { isAdmin } = useAdminAuth()

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    return await user.getIdToken()
  }

  useEffect(() => {
    if (isAdmin && barcode) {
      loadProductDetails()
    }
  }, [isAdmin, barcode])

  const loadProductDetails = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/admin/products/${barcode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load product' }))
        throw new Error(errorData.error || 'Failed to load product')
      }

      const data = await response.json()
      setProduct(data.product)
      setAnalytics(data.analytics)
    } catch (err) {
      logger.error('Load product error:', err as Error, { barcode })
      setError(err instanceof Error ? err.message : 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-red-700 dark:text-red-300">
            You do not have permission to access product details.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading product details...</p>
        </div>
      </div>
    )
  }

  if (error || !product || !analytics) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-red-900 dark:text-red-200 font-semibold mb-2">Error Loading Product</h2>
          <p className="text-red-700 dark:text-red-300">{error || 'Product not found'}</p>
          <Link href="/admin/products" className="text-primary hover:underline mt-4 inline-block">
            ← Back to Products
          </Link>
        </div>
      </div>
    )
  }

  const conversionRate = analytics.conversionRate || 0

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back Navigation */}
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to Products
      </Link>

      {/* Product Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8">
        <div className="flex items-start gap-6">
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.productName}
              className="w-32 h-32 object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {product.productName}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-1">{product.brand}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 font-mono">{product.barcode}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  product.quality.verified
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                }`}>
                  {product.quality.verified ? (
                    <span className="flex items-center gap-1">
                      <CheckBadgeIcon className="h-4 w-4" />
                      Verified
                    </span>
                  ) : (
                    `${product.quality.confidence}% Confidence`
                  )}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium capitalize bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                  {product.category}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                  <ChartBarIcon className="h-4 w-4" />
                  Total Scans
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {product.stats.totalScans.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                  <UsersIcon className="h-4 w-4" />
                  Unique Users
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {product.stats.uniqueUsers.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                  <ShoppingBagIcon className="h-4 w-4" />
                  Purchases
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {product.stats.totalPurchases.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">{conversionRate.toFixed(1)}% conversion</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                  <MapPinIcon className="h-4 w-4" />
                  Avg Price
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {product.regional.avgPriceCents > 0 ? `$${(product.regional.avgPriceCents / 100).toFixed(2)}` : '-'}
                </div>
                {product.regional.priceMin > 0 && product.regional.priceMax > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    ${(product.regional.priceMin / 100).toFixed(2)} - ${(product.regional.priceMax / 100).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nutrition & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Nutrition Facts */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Nutrition Facts</h2>
          <div className="border border-gray-200 dark:border-gray-700 rounded p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Serving Size: {product.nutrition.servingSize}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">Calories</span>
                <span className="text-gray-900 dark:text-gray-100">{product.nutrition.calories}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Protein</span>
                <span className="text-gray-900 dark:text-gray-100">{product.nutrition.protein}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Carbs</span>
                <span className="text-gray-900 dark:text-gray-100">{product.nutrition.carbs}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Fat</span>
                <span className="text-gray-900 dark:text-gray-100">{product.nutrition.fat}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Fiber</span>
                <span className="text-gray-900 dark:text-gray-100">{product.nutrition.fiber}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Sodium</span>
                <span className="text-gray-900 dark:text-gray-100">{product.nutrition.sodium}mg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Quality */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Data Quality</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Data Source</div>
              <div className="text-gray-900 dark:text-gray-100 font-medium capitalize">
                {product.quality.dataSource.replace('-', ' ')}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Verification Count</div>
              <div className="text-gray-900 dark:text-gray-100 font-medium">
                {product.quality.verificationCount} {product.quality.verificationCount === 1 ? 'user' : 'users'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Confidence Score</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2"
                    style={{ width: `${product.quality.confidence}%` }}
                  />
                </div>
                <span className="text-gray-900 dark:text-gray-100 font-medium">{product.quality.confidence}%</span>
              </div>
            </div>
            {product.quality.lastVerified && (
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Verified</div>
                <div className="text-gray-900 dark:text-gray-100">
                  {new Date(product.quality.lastVerified).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Usage Stats */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Usage Stats</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Linked Recipes</div>
              <div className="text-gray-900 dark:text-gray-100 font-medium text-2xl">
                {product.usage.linkedRecipes}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Popularity Score</div>
              <div className="text-gray-900 dark:text-gray-100 font-medium text-2xl">
                {product.usage.popularityScore.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">First Seen</div>
              <div className="text-gray-900 dark:text-gray-100">
                {new Date(product.stats.firstSeenAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Seen</div>
              <div className="text-gray-900 dark:text-gray-100">
                {new Date(product.stats.lastSeenAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scan Timeline Chart */}
      {analytics.scanTimeline.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Scan Timeline (Last 30 Days)</h2>
          <ProductScanTimeline data={analytics.scanTimeline} />
        </div>
      )}

      {/* Regional & Store Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Store Breakdown */}
        {analytics.storeBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Store Breakdown</h2>
            <ProductStoreBreakdown data={analytics.storeBreakdown} />
          </div>
        )}

        {/* Context Breakdown */}
        {analytics.contextBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Scan Context</h2>
            <ProductContextBreakdown data={analytics.contextBreakdown} />
          </div>
        )}
      </div>

      {/* Regional Breakdown Table */}
      {analytics.regionalBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Regional Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Scans</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stores</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.regionalBreakdown.map((region, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{region.region}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{region.scans}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{region.stores.join(', ') || '-'}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                      {region.avgPriceCents > 0 ? `$${(region.avgPriceCents / 100).toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Scan Activity */}
      {analytics.recentScans.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recent Scan Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Context</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Purchased</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.recentScans.map((scan, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {new Date(scan.scannedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{scan.store || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{scan.region || '-'}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                      {scan.priceCents ? `$${(scan.priceCents / 100).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                        {scan.context}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {scan.purchased ? (
                        <CheckBadgeIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
