'use client'

/**
 * Sequential Shopping Flow Component
 *
 * All-in-one guided shopping experience:
 * 1. Scanner opens immediately
 * 2. Nutrition review
 * 3. Category confirmation
 * 4. Item not found? → Substitution flow
 * 5. Quantity adjustment
 * 6. Family chat (always available)
 * 7. Expiration date (if perishable)
 * 8. Complete purchase
 */

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { ShoppingItem, ProductCategory, QuantityUnit } from '@/types/shopping'
import { OpenFoodFactsProduct, simplifyProduct } from '@/lib/openfoodfacts-api'
import { lookupBarcodeWithCache } from '@/lib/cached-product-lookup'
import { getCategoryMetadata, detectCategory } from '@/lib/product-categories'
import { updateGlobalProductDatabase } from '@/lib/shopping-operations'
import { NutritionReviewModal } from './NutritionReviewModal'
import { CategoryConfirmModal } from './CategoryConfirmModal'
import { QuantityAdjustModal } from './QuantityAdjustModal'
import { ReplacementCompareModal } from './ReplacementCompareModal'
import { ExpirationPicker } from './ExpirationPicker'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'

// Dynamic import for BarcodeScanner
const BarcodeScanner = dynamic(
  () => import('@/components/BarcodeScanner').then(mod => ({ default: mod.BarcodeScanner })),
  { ssr: false }
)

type FlowStep =
  | 'SCANNING'
  | 'NUTRITION_REVIEW'
  | 'CATEGORY_CONFIRM'
  | 'ITEM_NOT_FOUND'
  | 'SCAN_REPLACEMENT'
  | 'COMPARE_REPLACEMENT'
  | 'QUANTITY_ADJUST'
  | 'EXPIRATION_PICKER'
  | 'COMPLETE'

interface PurchaseResult {
  quantity: number
  unit?: QuantityUnit
  expirationDate?: Date
  category: ProductCategory
  scannedProduct: OpenFoodFactsProduct
  isReplacement: boolean
}

interface SequentialShoppingFlowProps {
  isOpen: boolean
  item: ShoppingItem
  onComplete: (result: PurchaseResult) => Promise<void>
  onCancel: () => void
}

export function SequentialShoppingFlow({
  isOpen,
  item,
  onComplete,
  onCancel
}: SequentialShoppingFlowProps) {
  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep>('SCANNING')
  const [scannedProduct, setScannedProduct] = useState<OpenFoodFactsProduct | null>(null)
  const [replacementProduct, setReplacementProduct] = useState<OpenFoodFactsProduct | null>(null)
  const [selectedQuantity, setSelectedQuantity] = useState(item.quantity || 1)
  const [selectedCategory, setSelectedCategory] = useState(item.category)
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined)
  const [showFamilyChat, setShowFamilyChat] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('SCANNING')
      setScannedProduct(null)
      setReplacementProduct(null)
      setSelectedQuantity(item.quantity || 1)
      setSelectedCategory(item.category)
      setExpirationDate(undefined)
      setShowFamilyChat(false)
    }
  }, [isOpen, item])

  /**
   * Handle barcode scan
   */
  const handleBarcodeScan = async (barcode: string) => {
    try {
      toast.loading('Looking up product...', { id: 'scan' })

      const response = await lookupBarcodeWithCache(barcode)
      const product = simplifyProduct(response)

      if (!product.found || !response.product) {
        toast.error('Product not found in database', { id: 'scan' })
        setCurrentStep('ITEM_NOT_FOUND')
        return
      }

      toast.success(`Found: ${product.name}`, { id: 'scan' })

      // Detect category from scanned product
      const detectedCategory = detectCategory(response.product)
      setSelectedCategory(detectedCategory)

      // Update global product database (non-blocking)
      const user = auth.currentUser
      if (user && response.product) {
        updateGlobalProductDatabase(
          barcode,
          response.product,
          user.uid,
          {
            category: detectedCategory,
            store: item.preferredStore,
            priceCents: item.purchasePriceCents,
            region: undefined, // Could be derived from user profile
            purchased: false, // Will be set to true on completion
            context: 'shopping'
          }
        ).catch(err => {
          // Silently log errors - don't block user flow
          logger.debug('[GlobalProduct] Failed to update database (non-critical)', err)
        })
      }

      // Store scanned product based on current step
      if (currentStep === 'SCANNING') {
        setScannedProduct(response.product)
        setCurrentStep('NUTRITION_REVIEW')
      } else if (currentStep === 'SCAN_REPLACEMENT') {
        setReplacementProduct(response.product)
        setCurrentStep('COMPARE_REPLACEMENT')
      }
    } catch (error) {
      logger.error('Error scanning barcode', error as Error)
      toast.error('Failed to scan product', { id: 'scan' })
    }
  }

  /**
   * Handle nutrition review confirmation
   */
  const handleNutritionConfirm = () => {
    setCurrentStep('CATEGORY_CONFIRM')
  }

  /**
   * Handle category confirmation
   */
  const handleCategoryConfirm = (category: ProductCategory) => {
    setSelectedCategory(category)
    setCurrentStep('QUANTITY_ADJUST')
  }

  /**
   * Handle quantity confirmation
   */
  const handleQuantityConfirm = (quantity: number) => {
    setSelectedQuantity(quantity)

    // Check if item is perishable
    const categoryMeta = getCategoryMetadata(selectedCategory)
    if (categoryMeta.isPerishable) {
      setCurrentStep('EXPIRATION_PICKER')
    } else {
      // Non-perishable - complete immediately
      handleComplete()
    }
  }

  /**
   * Handle expiration date selection
   */
  const handleExpirationSelected = (date: Date) => {
    setExpirationDate(date)
    handleComplete()
  }

  /**
   * Handle skip expiration
   */
  const handleSkipExpiration = () => {
    setExpirationDate(undefined)
    handleComplete()
  }

  /**
   * Complete the purchase
   */
  const handleComplete = async () => {
    if (!scannedProduct) return

    setIsSubmitting(true)
    try {
      const result: PurchaseResult = {
        quantity: selectedQuantity,
        unit: item.unit,
        expirationDate,
        category: selectedCategory,
        scannedProduct: replacementProduct || scannedProduct,
        isReplacement: !!replacementProduct
      }

      await onComplete(result)
      setCurrentStep('COMPLETE')

      // Auto-close after showing success
      setTimeout(() => {
        onCancel()
      }, 1500)
    } catch (error) {
      logger.error('Error completing purchase', error as Error)
      toast.error('Failed to complete purchase')
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Handle scan replacement
   */
  const handleScanReplacement = () => {
    setCurrentStep('SCAN_REPLACEMENT')
  }

  /**
   * Handle replacement acceptance
   */
  const handleReplacementAccept = () => {
    setCurrentStep('NUTRITION_REVIEW')
  }

  /**
   * Handle replacement rejection
   */
  const handleReplacementReject = () => {
    setReplacementProduct(null)
    setCurrentStep('ITEM_NOT_FOUND')
  }

  /**
   * Handle skip item
   */
  const handleSkipItem = () => {
    toast('Item skipped', { icon: '⏭️' })
    onCancel()
  }

  if (!isOpen) return null

  // Get step info for progress indicator
  const steps = [
    { key: 'SCANNING', label: 'Scan' },
    { key: 'NUTRITION_REVIEW', label: 'Review' },
    { key: 'CATEGORY_CONFIRM', label: 'Category' },
    { key: 'QUANTITY_ADJUST', label: 'Quantity' },
    { key: 'EXPIRATION_PICKER', label: 'Expiration' }
  ]

  const currentStepIndex = steps.findIndex(s => s.key === currentStep)

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Progress Header */}
          <div className="sticky top-0 bg-card border-b p-4 z-10">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-foreground truncate flex-1 mr-2">
                {item.productName}
              </h2>
              <button
                onClick={onCancel}
                className="text-muted-foreground hover:text-foreground dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Progress Bar */}
            {currentStep !== 'ITEM_NOT_FOUND' && currentStep !== 'COMPLETE' && (
              <>
                <div className="flex items-center gap-1 mb-1">
                  {steps.map((step, idx) => (
                    <div
                      key={step.key}
                      className={`flex-1 h-1 rounded ${
                        idx <= currentStepIndex ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Step {currentStepIndex + 1} of {steps.length}
                </p>
              </>
            )}
          </div>

          {/* Step Content */}
          <div className="p-6">
            {/* SCANNING */}
            {(currentStep === 'SCANNING' || currentStep === 'SCAN_REPLACEMENT') && (
              <BarcodeScanner
                isOpen={true}
                onScan={handleBarcodeScan}
                onClose={onCancel}
                context="purchase"
              />
            )}

            {/* NUTRITION REVIEW */}
            {currentStep === 'NUTRITION_REVIEW' && scannedProduct && (
              <NutritionReviewModal
                isOpen={true}
                onClose={onCancel}
                product={scannedProduct}
                onConfirm={handleNutritionConfirm}
              />
            )}

            {/* CATEGORY CONFIRM */}
            {currentStep === 'CATEGORY_CONFIRM' && scannedProduct && (
              <CategoryConfirmModal
                isOpen={true}
                onClose={onCancel}
                currentCategory={selectedCategory}
                productName={scannedProduct.product_name || 'Product'}
                onConfirm={handleCategoryConfirm}
              />
            )}

            {/* ITEM NOT FOUND */}
            {currentStep === 'ITEM_NOT_FOUND' && (
              <div className="text-center">
                <div className="text-6xl mb-4">😕</div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {item.productName} not found
                </h3>
                <p className="text-muted-foreground mb-6">
                  Can't find the exact item? Try scanning a substitution or ask your family for help.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleScanReplacement}
                    className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <span>🔄</span>
                    <span>Scan Substitution</span>
                  </button>

                  <button
                    onClick={() => setShowFamilyChat(true)}
                    className="w-full py-3 px-4 bg-purple-500 hover:bg-primary text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <span>💬</span>
                    <span>Ask Family for Help</span>
                  </button>

                  <button
                    onClick={handleSkipItem}
                    className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-foreground rounded-lg font-medium transition-colors"
                  >
                    Skip This Item
                  </button>
                </div>
              </div>
            )}

            {/* COMPARE REPLACEMENT */}
            {currentStep === 'COMPARE_REPLACEMENT' && replacementProduct && (
              <ReplacementCompareModal
                isOpen={true}
                onClose={onCancel}
                originalItem={item}
                replacementProduct={replacementProduct}
                onConfirm={handleReplacementAccept}
                onCancel={handleReplacementReject}
              />
            )}

            {/* QUANTITY ADJUST */}
            {currentStep === 'QUANTITY_ADJUST' && (
              <QuantityAdjustModal
                isOpen={true}
                onClose={onCancel}
                item={{ ...item, quantity: selectedQuantity }}
                onConfirm={handleQuantityConfirm}
              />
            )}

            {/* EXPIRATION PICKER */}
            {currentStep === 'EXPIRATION_PICKER' && scannedProduct && (
              <ExpirationPicker
                isOpen={true}
                onClose={onCancel}
                category={selectedCategory}
                productName={scannedProduct.product_name || 'Product'}
                onSelectDate={handleExpirationSelected}
                onSkip={handleSkipExpiration}
              />
            )}

            {/* COMPLETE */}
            {currentStep === 'COMPLETE' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-success dark:text-green-400 mb-2">
                  Purchase Complete!
                </h3>
                <p className="text-muted-foreground">
                  {item.productName} added to inventory
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Family Chat Button */}
      {currentStep !== 'COMPLETE' && (
        <button
          onClick={() => setShowFamilyChat(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary hover:bg-primary-hover text-white rounded-full shadow-xl z-[60] flex items-center justify-center transition-colors"
          title="Ask Family"
        >
          <span className="text-2xl">💬</span>
        </button>
      )}

      {/* Family Chat Drawer (Coming Soon) */}
      {showFamilyChat && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end justify-center">
          <div className="bg-card rounded-t-xl shadow-xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">
                Ask Family
              </h3>
              <button
                onClick={() => setShowFamilyChat(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="text-center py-8">
              <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
              <p className="text-muted-foreground mb-2">
                Family collaboration coming soon!
              </p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Chat with family members about shopping items in real-time.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
