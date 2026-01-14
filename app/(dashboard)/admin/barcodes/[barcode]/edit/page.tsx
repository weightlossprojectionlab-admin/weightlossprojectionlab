'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'
import { ArrowLeftIcon, CheckBadgeIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'

import { getCSRFToken } from '@/lib/csrf'
interface ProductEditData {
  barcode: string
  productName: string
  brand: string
  imageUrl: string
  category: string
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    saturatedFat?: number
    transFat?: number
    fiber: number
    sugars?: number
    addedSugars?: number
    sodium: number
    cholesterol?: number
    vitaminD?: number
    calcium?: number
    iron?: number
    potassium?: number
    servingSize: string
  }
  quality: {
    verified: boolean
    confidence: number
    dataSource: string
  }
}

export default function ProductEditPage() {
  const params = useParams()
  const router = useRouter()
  const barcode = params?.barcode as string
  const { isAdmin } = useAdminAuth()

  const [product, setProduct] = useState<ProductEditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchingNutrition, setFetchingNutrition] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<ProductEditData>({
    barcode: '',
    productName: '',
    brand: '',
    imageUrl: '',
    category: 'other',
    nutrition: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      saturatedFat: undefined,
      transFat: undefined,
      fiber: 0,
      sugars: undefined,
      addedSugars: undefined,
      sodium: 0,
      cholesterol: undefined,
      vitaminD: undefined,
      calcium: undefined,
      iron: undefined,
      potassium: undefined,
      servingSize: ''
    },
    quality: {
      verified: false,
      confidence: 50,
      dataSource: 'openfoodfacts'
    }
  })

  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    return await user.getIdToken()
  }

  useEffect(() => {
    if (isAdmin && barcode) {
      loadProduct()
    }
  }, [isAdmin, barcode])

  const loadProduct = async () => {
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
      const productData: ProductEditData = {
        barcode: data.product.barcode,
        productName: data.product.productName,
        brand: data.product.brand,
        imageUrl: data.product.imageUrl || '',
        category: data.product.category,
        nutrition: data.product.nutrition,
        quality: data.product.quality
      }

      setProduct(productData)
      setFormData(productData)
    } catch (err) {
      logger.error('Load product error:', err as Error, { barcode })
      setError(err instanceof Error ? err.message : 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/admin/products/${barcode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save product' }))
        throw new Error(errorData.error || 'Failed to save product')
      }

      toast.success('Product updated successfully')
      router.push('/admin/barcodes')
    } catch (err) {
      logger.error('Save product error:', err as Error, { barcode })
      toast.error(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleVerify = async () => {
    const updatedFormData = {
      ...formData,
      quality: {
        ...formData.quality,
        verified: true,
        confidence: 100
      }
    }
    setFormData(updatedFormData)
  }

  const handleFetchNutrition = async () => {
    setFetchingNutrition(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/admin/products/${barcode}/fetch-nutrition`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch nutrition data' }))
        throw new Error(errorData.error || 'Failed to fetch nutrition data')
      }

      const data = await response.json()

      // Update form with new nutrition data
      setFormData({
        ...formData,
        productName: data.product.productName || formData.productName,
        brand: data.product.brand || formData.brand,
        imageUrl: data.product.imageUrl || formData.imageUrl,
        nutrition: data.product.nutrition,
        quality: {
          ...formData.quality,
          dataSource: data.product.quality.dataSource
        }
      })

      toast.success('Nutrition data updated from OpenFoodFacts')
    } catch (err) {
      logger.error('Fetch nutrition error:', err as Error, { barcode })
      toast.error(err instanceof Error ? err.message : 'Failed to fetch nutrition data')
    } finally {
      setFetchingNutrition(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-error-dark dark:text-red-300">
            You do not have permission to edit products.
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
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-red-900 dark:text-red-200 font-semibold mb-2">Error Loading Product</h3>
          <p className="text-error-dark dark:text-red-300">{error || 'Product not found'}</p>
          <Link href="/admin/barcodes" className="text-primary hover:underline mt-4 inline-block">
            ← Back to Barcodes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/barcodes"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Barcodes
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Edit Product</h1>
        <p className="text-muted-foreground mt-1">Barcode: {barcode}</p>
      </div>

      {/* Product Preview */}
      {formData.imageUrl && (
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Product Preview</h2>
          <img
            src={formData.imageUrl}
            alt={formData.productName}
            className="w-32 h-32 object-cover rounded"
          />
        </div>
      )}

      {/* Product Information */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Product Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Brand
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Image URL
            </label>
            <input
              type="text"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="produce">Produce</option>
              <option value="meat">Meat</option>
              <option value="dairy">Dairy</option>
              <option value="bakery">Bakery</option>
              <option value="deli">Deli</option>
              <option value="eggs">Eggs</option>
              <option value="herbs">Herbs</option>
              <option value="seafood">Seafood</option>
              <option value="frozen">Frozen</option>
              <option value="pantry">Pantry</option>
              <option value="beverages">Beverages</option>
              <option value="condiments">Condiments</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Nutrition Data */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Nutrition Data</h2>
          <button
            onClick={handleFetchNutrition}
            disabled={fetchingNutrition || saving}
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary-hover disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${fetchingNutrition ? 'animate-spin' : ''}`} />
            {fetchingNutrition ? 'Fetching...' : 'Fetch from OpenFoodFacts'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Calories
            </label>
            <input
              type="number"
              value={formData.nutrition.calories ?? 0}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, calories: parseFloat(e.target.value) || 0 }
              })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Protein (g)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.protein ?? 0}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, protein: parseFloat(e.target.value) || 0 }
              })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Carbs (g)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.carbs ?? 0}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, carbs: parseFloat(e.target.value) || 0 }
              })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Fat (g)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.fat ?? 0}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, fat: parseFloat(e.target.value) || 0 }
              })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Saturated Fat (g)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.saturatedFat ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, saturatedFat: e.target.value ? parseFloat(e.target.value) : undefined }
              })}
              placeholder="Optional"
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Trans Fat (g)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.transFat ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, transFat: e.target.value ? parseFloat(e.target.value) : undefined }
              })}
              placeholder="Optional"
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Fiber (g)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.fiber ?? 0}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, fiber: parseFloat(e.target.value) || 0 }
              })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Sugars (g)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.sugars ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, sugars: e.target.value ? parseFloat(e.target.value) : undefined }
              })}
              placeholder="Optional"
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Added Sugars (g)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.addedSugars ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, addedSugars: e.target.value ? parseFloat(e.target.value) : undefined }
              })}
              placeholder="Optional"
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Sodium (mg)
            </label>
            <input
              type="number"
              value={formData.nutrition.sodium ?? 0}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, sodium: parseFloat(e.target.value) || 0 }
              })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Cholesterol (mg)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.cholesterol ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, cholesterol: e.target.value ? parseFloat(e.target.value) : undefined }
              })}
              placeholder="Optional"
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Vitamin D (mcg)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.vitaminD ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, vitaminD: e.target.value ? parseFloat(e.target.value) : undefined }
              })}
              placeholder="Optional"
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Calcium (mg)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.calcium ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, calcium: e.target.value ? parseFloat(e.target.value) : undefined }
              })}
              placeholder="Optional"
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Iron (mg)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.iron ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, iron: e.target.value ? parseFloat(e.target.value) : undefined }
              })}
              placeholder="Optional"
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Potassium (mg)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.nutrition.potassium ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, potassium: e.target.value ? parseFloat(e.target.value) : undefined }
              })}
              placeholder="Optional"
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Serving Size
            </label>
            <input
              type="text"
              value={formData.nutrition.servingSize ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                nutrition: { ...formData.nutrition, servingSize: e.target.value }
              })}
              placeholder="e.g., 100g, 1 cup"
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Quality & Verification */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quality & Verification</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.quality.verified}
              onChange={(e) => setFormData({
                ...formData,
                quality: { ...formData.quality, verified: e.target.checked }
              })}
              className="rounded"
            />
            <label className="text-sm font-medium text-foreground">
              Mark as Verified
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Data Source
            </label>
            <select
              value={formData.quality.dataSource}
              onChange={(e) => setFormData({
                ...formData,
                quality: { ...formData.quality, dataSource: e.target.value }
              })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="openfoodfacts">OpenFoodFacts</option>
              <option value="usda">USDA</option>
              <option value="user-verified">User Verified</option>
              <option value="aggregate">Aggregate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Confidence Score: {formData.quality.confidence}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.quality.confidence}
              onChange={(e) => setFormData({
                ...formData,
                quality: { ...formData.quality, confidence: parseInt(e.target.value) }
              })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 px-6 bg-primary hover:bg-primary-hover disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={handleVerify}
          disabled={saving}
          className="py-3 px-6 bg-success hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <CheckBadgeIcon className="h-5 w-5" />
          Mark Verified
        </button>
        <Link
          href="/admin/barcodes"
          className="py-3 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-foreground rounded-lg font-medium transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  )
}
