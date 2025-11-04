'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Product {
  barcode: string
  productName: string
  brand: string
  category: string
  imageUrl?: string
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    servingSize: string
  }
}

interface SelectedProduct extends Product {
  quantity: number
  unit: string
  notes?: string
  optional?: boolean
}

interface ProductSelectorProps {
  onSelectProduct: (product: SelectedProduct) => void
  onClose: () => void
}

export function ProductSelector({ onSelectProduct, onClose }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Selection state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('count')
  const [notes, setNotes] = useState('')
  const [optional, setOptional] = useState(false)

  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    return await user.getIdToken()
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, searchQuery, categoryFilter])

  const loadProducts = async () => {
    setLoading(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/admin/products?limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to load products')
      }

      const data = await response.json()
      setProducts(data.products || [])
    } catch (err) {
      logger.error('Load products error:', err as Error)
      toast.error('Failed to load products')
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

    setFilteredProducts(filtered)
  }

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    // Set default unit based on category
    if (product.category === 'dairy' || product.category === 'beverages') {
      setUnit('cups')
    } else if (product.category === 'meat' || product.category === 'seafood') {
      setUnit('lbs')
    } else if (product.category === 'eggs') {
      setUnit('count')
    } else {
      setUnit('count')
    }
  }

  const handleAddToRecipe = () => {
    if (!selectedProduct) return

    onSelectProduct({
      ...selectedProduct,
      quantity,
      unit,
      notes: notes || undefined,
      optional
    })

    // Reset form
    setSelectedProduct(null)
    setQuantity(1)
    setUnit('count')
    setNotes('')
    setOptional(false)
    setSearchQuery('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add Product to Recipe</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 p-6">
            {/* Left: Product Browser */}
            <div className="space-y-4">
              <div className="flex gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Categories</option>
                  <option value="produce">Produce</option>
                  <option value="meat">Meat</option>
                  <option value="dairy">Dairy</option>
                  <option value="eggs">Eggs</option>
                  <option value="seafood">Seafood</option>
                  <option value="bakery">Bakery</option>
                  <option value="pantry">Pantry</option>
                  <option value="frozen">Frozen</option>
                  <option value="beverages">Beverages</option>
                  <option value="condiments">Condiments</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Products List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading products...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No products found</div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.barcode}
                      onClick={() => handleSelectProduct(product)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProduct?.barcode === product.barcode
                          ? 'border-primary bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt={product.productName} className="w-12 h-12 object-cover rounded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{product.productName}</p>
                          <p className="text-xs text-gray-500 truncate">{product.brand}</p>
                          <p className="text-xs text-gray-400">{product.nutrition.calories} cal | {product.nutrition.protein}g protein</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Product Details & Configuration */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              {selectedProduct ? (
                <div className="space-y-6">
                  {/* Product Info */}
                  <div>
                    {selectedProduct.imageUrl && (
                      <img src={selectedProduct.imageUrl} alt={selectedProduct.productName} className="w-32 h-32 object-cover rounded mb-4" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedProduct.productName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedProduct.brand}</p>
                    <p className="text-xs text-gray-500 mt-1">Barcode: {selectedProduct.barcode}</p>
                  </div>

                  {/* Nutrition Facts */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Nutrition Facts</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Calories:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedProduct.nutrition.calories}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Protein:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedProduct.nutrition.protein}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Carbs:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedProduct.nutrition.carbs}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fat:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedProduct.nutrition.fat}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fiber:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedProduct.nutrition.fiber}g</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Serving:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedProduct.nutrition.servingSize}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Unit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="count">count</option>
                        <option value="cups">cups</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                        <option value="oz">oz</option>
                        <option value="lbs">lbs</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., or substitute with almond milk"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Optional Checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="optional"
                      checked={optional}
                      onChange={(e) => setOptional(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="optional" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Mark as optional ingredient
                    </label>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={handleAddToRecipe}
                    className="w-full py-3 px-6 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add to Recipe
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a product from the list
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
