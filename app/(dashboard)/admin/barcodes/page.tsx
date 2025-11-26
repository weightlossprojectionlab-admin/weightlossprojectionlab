'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'
import { MagnifyingGlassIcon, PencilSquareIcon, CheckBadgeIcon, FunnelIcon, ArrowPathIcon, BeakerIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Product {
  barcode: string
  productName: string
  brand: string
  category: string
  imageUrl?: string
  stats: {
    totalScans: number
    uniqueUsers: number
  }
  quality: {
    verified: boolean
    confidence: number
    dataSource: string
  }
  updatedAt: string
}

export default function BarcodesManagementPage() {
  const router = useRouter()
  const { isAdmin, role } = useAdminAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchingNutritionBulk, setFetchingNutritionBulk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [dataSourceFilter, setDataSourceFilter] = useState('all')
  const [sortBy, setSortBy] = useState('scans')

  // Bulk selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    return await user.getIdToken()
  }

  useEffect(() => {
    if (isAdmin) {
      loadProducts()
    }
  }, [isAdmin])

  // Filter products whenever search/filter state changes
  useEffect(() => {
    filterProducts()
  }, [products, searchQuery, categoryFilter, verificationFilter, dataSourceFilter, sortBy])

  const loadProducts = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/admin/products?limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load products' }))
        throw new Error(errorData.error || 'Failed to load products')
      }

      const data = await response.json()
      setProducts(data.products || [])
    } catch (err) {
      logger.error('Load products error:', err as Error)
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = [...products]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.barcode.includes(query) ||
        p.productName.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter)
    }

    // Verification filter
    if (verificationFilter === 'verified') {
      filtered = filtered.filter(p => p.quality.verified)
    } else if (verificationFilter === 'unverified') {
      filtered = filtered.filter(p => !p.quality.verified)
    }

    // Data source filter
    if (dataSourceFilter !== 'all') {
      filtered = filtered.filter(p => p.quality.dataSource === dataSourceFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'scans') {
        return b.stats.totalScans - a.stats.totalScans
      } else if (sortBy === 'name') {
        return a.productName.localeCompare(b.productName)
      } else if (sortBy === 'recent') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      } else if (sortBy === 'verified') {
        return (b.quality.verified ? 1 : 0) - (a.quality.verified ? 1 : 0)
      }
      return 0
    })

    setFilteredProducts(filtered)
  }

  const toggleSelectProduct = (barcode: string) => {
    const newSelection = new Set(selectedProducts)
    if (newSelection.has(barcode)) {
      newSelection.delete(barcode)
    } else {
      newSelection.add(barcode)
    }
    setSelectedProducts(newSelection)
    setShowBulkActions(newSelection.size > 0)
  }

  const selectAll = () => {
    setSelectedProducts(new Set(filteredProducts.map(p => p.barcode)))
    setShowBulkActions(true)
  }

  const clearSelection = () => {
    setSelectedProducts(new Set())
    setShowBulkActions(false)
  }

  const handleBulkFetchNutrition = async () => {
    if (selectedProducts.size === 0) return

    setFetchingNutritionBulk(true)

    try {
      const token = await getAuthToken()
      const barcodes = Array.from(selectedProducts)

      const response = await fetch(`/api/admin/products/fetch-nutrition-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ barcodes })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch nutrition data' }))
        throw new Error(errorData.error || 'Failed to fetch nutrition data')
      }

      const data = await response.json()

      // Show summary
      const { summary } = data
      if (summary.successful > 0) {
        if (summary.failed === 0) {
          toast.success(`Updated ${summary.successful} product${summary.successful !== 1 ? 's' : ''} successfully`)
        } else {
          toast.success(`Updated ${summary.successful} products, ${summary.failed} failed`)
        }
      } else {
        toast.error('Failed to update products')
      }

      // Reload products
      await loadProducts()

      // Clear selection
      clearSelection()

    } catch (err) {
      logger.error('Bulk fetch nutrition error:', err as Error)
      toast.error(err instanceof Error ? err.message : 'Failed to fetch nutrition data')
    } finally {
      setFetchingNutritionBulk(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-error-dark dark:text-red-300">
            You do not have permission to manage barcodes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Barcode Management</h1>
          <p className="text-muted-foreground mt-1">
            Search, edit, and verify products in the global database
          </p>
        </div>
        <button
          onClick={loadProducts}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg shadow p-6">
          <div className="text-sm text-muted-foreground mb-1">Total Products</div>
          <div className="text-3xl font-bold text-foreground">
            {products.length.toLocaleString()}
          </div>
        </div>
        <div className="bg-card rounded-lg shadow p-6">
          <div className="text-sm text-muted-foreground mb-1">Verified</div>
          <div className="text-3xl font-bold text-success dark:text-green-400">
            {products.filter(p => p.quality.verified).length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {products.length > 0 ? ((products.filter(p => p.quality.verified).length / products.length) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="bg-card rounded-lg shadow p-6">
          <div className="text-sm text-muted-foreground mb-1">Unverified</div>
          <div className="text-3xl font-bold text-warning">
            {products.filter(p => !p.quality.verified).length}
          </div>
        </div>
        <div className="bg-card rounded-lg shadow p-6">
          <div className="text-sm text-muted-foreground mb-1">Filtered Results</div>
          <div className="text-3xl font-bold text-foreground">
            {filteredProducts.length}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by barcode, name, or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            <option value="produce">Produce</option>
            <option value="meat">Meat</option>
            <option value="dairy">Dairy</option>
            <option value="bakery">Bakery</option>
            <option value="pantry">Pantry</option>
            <option value="frozen">Frozen</option>
            <option value="beverages">Beverages</option>
            <option value="other">Other</option>
          </select>

          {/* Verification Filter */}
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="scans">Most Scanned</option>
            <option value="recent">Recently Updated</option>
            <option value="name">Name (A-Z)</option>
            <option value="verified">Verified First</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {showBulkActions && (
        <div className="bg-secondary-light border border-secondary-light rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-blue-900 font-medium">
              {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-secondary hover:underline text-sm"
            >
              Clear Selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkFetchNutrition}
              disabled={fetchingNutritionBulk}
              className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary-hover disabled:bg-gray-400 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <BeakerIcon className={`h-4 w-4 ${fetchingNutritionBulk ? 'animate-pulse' : ''}`} />
              {fetchingNutritionBulk ? 'Fetching...' : 'Fetch Nutrition Data'}
            </button>
            <button className="px-4 py-2 bg-success hover:bg-green-700 text-white rounded-lg font-medium text-sm">
              Bulk Verify
            </button>
            <button className="px-4 py-2 bg-warning hover:bg-warning-dark text-white rounded-lg font-medium text-sm">
              Bulk Categorize
            </button>
            <button className="px-4 py-2 bg-error hover:bg-red-700 text-white rounded-lg font-medium text-sm">
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-red-900 dark:text-red-200 font-semibold mb-2">Error Loading Products</h3>
          <p className="text-error-dark dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Products Table */}
      {!loading && !error && (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          {/* Table Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Products ({filteredProducts.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-sm text-primary hover:underline"
              >
                Select All
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">Scans</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">Data Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProducts.map((product) => (
                  <tr key={product.barcode} className="hover:bg-background">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.barcode)}
                        onChange={() => toggleSelectProduct(product.barcode)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt={product.productName} className="w-12 h-12 object-cover rounded" />
                        )}
                        <div>
                          <div className="font-medium text-foreground">{product.productName}</div>
                          <div className="text-sm text-muted-foreground dark:text-muted-foreground">{product.brand}</div>
                          <div className="text-xs text-muted-foreground dark:text-muted-foreground font-mono">{product.barcode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full capitalize bg-blue-100 text-blue-800 dark:text-blue-300">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {product.stats.totalScans.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {product.quality.verified ? (
                        <span className="flex items-center gap-1 text-success dark:text-green-400 text-sm">
                          <CheckBadgeIcon className="h-4 w-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-warning text-sm">
                          {product.quality.confidence}% confidence
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground capitalize">
                      {product.quality.dataSource.replace('-', ' ')}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/barcodes/${product.barcode}/edit`}
                        className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredProducts.length === 0 && !loading && (
            <div className="p-12 text-center">
              <FunnelIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Products Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
