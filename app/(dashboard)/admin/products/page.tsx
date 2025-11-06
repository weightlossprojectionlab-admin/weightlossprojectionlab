'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'
import { MagnifyingGlassIcon, ChartBarIcon, ShoppingCartIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface Product {
  barcode: string
  productName: string
  brand: string
  category: string
  imageUrl?: string
  stats: {
    totalScans: number
    uniqueUsers: number
    totalPurchases: number
    lastSeenAt: string
  }
  regional: {
    stores: string[]
    avgPriceCents: number
  }
  quality: {
    verified: boolean
    confidence: number
  }
  usage: {
    linkedRecipes: number
    popularityScore: number
  }
}

interface ProductStats {
  totalProducts: number
  totalScans: number
  totalPurchases: number
  uniqueUsers: number
}

export default function AdminProductsPage() {
  const { isAdmin, role } = useAdminAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<ProductStats | null>(null)
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('scans')

  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    return await user.getIdToken()
  }

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (searchQuery) params.set('search', searchQuery)
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      params.set('sortBy', sortBy)

      const response = await fetch(`/api/admin/products?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load products' }))
        throw new Error(errorData.error || 'Failed to load products')
      }

      const data = await response.json()
      setProducts(data.products || [])
      setStats(data.stats || null)
      setCategoryBreakdown(data.categoryBreakdown || {})
    } catch (err) {
      logger.error('Load products error:', err as Error)
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, sortBy])

  useEffect(() => {
    if (isAdmin) {
      loadProducts()
    }
  }, [isAdmin, loadProducts])

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-red-700 dark:text-red-300">
            You do not have permission to access product database.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Product Database</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Global product catalog aggregated from user scans
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCartIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Products</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalProducts.toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <ChartBarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Scans</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalScans.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.totalProducts > 0 ? (stats.totalScans / stats.totalProducts).toFixed(1) : 0} avg per product
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckBadgeIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <div className="text-sm text-gray-600 dark:text-gray-400">Purchases</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalPurchases.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.totalScans > 0 ? ((stats.totalPurchases / stats.totalScans) * 100).toFixed(1) : 0}% conversion
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="text-sm text-gray-600 dark:text-gray-400">Top Category</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 capitalize">
              {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} products
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6 transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
              <span>Loading...</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, brand, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={loading}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">All Categories</option>
            {Object.keys(categoryBreakdown).sort().map(cat => (
              <option key={cat} value={cat} className="capitalize">
                {cat} ({categoryBreakdown[cat]})
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            disabled={loading}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="scans">Most Scanned</option>
            <option value="recent">Recently Scanned</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-16">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Loading products...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-red-900 dark:text-red-200 font-semibold mb-2">Error Loading Products</h2>
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Products Table */}
      {!loading && !error && products.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Scans</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purchases</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stores</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {products.map((product) => (
                  <tr key={product.barcode} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt={product.productName} className="w-12 h-12 object-cover rounded" />
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{product.productName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{product.brand}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{product.barcode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full capitalize bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {product.stats.totalScans.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {product.stats.totalPurchases.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {product.regional.avgPriceCents > 0 ? `$${(product.regional.avgPriceCents / 100).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {product.regional.stores.length > 0 ? product.regional.stores.join(', ') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.quality.verified ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                          <CheckBadgeIcon className="h-4 w-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          {product.quality.confidence}% confidence
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/products/${product.barcode}`}
                        className="text-primary hover:underline"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <ShoppingCartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Products Found</p>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your filters'
              : 'Products will appear here as users scan barcodes'}
          </p>
        </div>
      )}
    </div>
  )
}
