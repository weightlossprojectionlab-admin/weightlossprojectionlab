'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getAllShoppingItems } from '@/lib/shopping-operations'
import { createShopAndDeliverOrder } from '@/lib/shop-deliver-orders'
import { ShoppingItem } from '@/types/shopping'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export default function SubmitOrderPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [items, setItems] = useState<ShoppingItem[]>([])

  // Form state
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [safetyNotes, setSafetyNotes] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTimeStart, setDeliveryTimeStart] = useState('09:00')
  const [deliveryTimeEnd, setDeliveryTimeEnd] = useState('11:00')

  useEffect(() => {
    loadShoppingList()
  }, [user])

  async function loadShoppingList() {
    if (!user) return

    try {
      const allItems = await getAllShoppingItems(user.uid)
      const neededItems = allItems.filter(item => item.needed && !item.inStock)
      setItems(neededItems)
    } catch (error) {
      console.error('Error loading shopping list:', error)
      toast.error('Failed to load shopping list')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    if (items.length === 0) {
      toast.error('No items in shopping list')
      return
    }

    if (!deliveryAddress.trim()) {
      toast.error('Please enter a delivery address')
      return
    }

    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number for delivery coordination')
      return
    }

    setSubmitting(true)

    try {
      // Create delivery window
      const windowStart = new Date(`${deliveryDate}T${deliveryTimeStart}`)
      const windowEnd = new Date(`${deliveryDate}T${deliveryTimeEnd}`)

      // For now, we'll use a placeholder payment method
      // In production, you'd collect this via Stripe Elements
      const paymentMethodId = 'pm_placeholder'

      const { orderId } = await createShopAndDeliverOrder({
        userId: user.uid,
        itemIds: items.map(item => item.id),
        deliveryAddress: deliveryAddress.trim(),
        deliveryInstructions: deliveryInstructions.trim() || undefined,
        safetyNotes: safetyNotes.trim() || undefined,
        deliveryWindow: {
          start: windowStart,
          end: windowEnd,
        },
        customerPhoneNumber: phoneNumber.trim(),
        paymentMethodId,
      })

      toast.success('Order submitted! You will be charged when shopping is complete.')
      router.push(`/shopping/orders/${orderId}`)
    } catch (error: any) {
      console.error('Error submitting order:', error)
      toast.error(error.message || 'Failed to submit order')
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate estimated total
  const subtotal = items.reduce((sum, item) => {
    const price = (item.expectedPriceCents || item.purchasePriceCents || 0) / 100
    return sum + (price * item.quantity)
  }, 0)
  const deliveryFee = 7.00
  const tax = subtotal * 0.08
  const estimatedTotal = subtotal + deliveryFee + tax

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shopping list...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-4">📝</p>
          <h1 className="text-2xl font-bold text-foreground mb-2">Shopping List Empty</h1>
          <p className="text-muted-foreground mb-6">
            Add items to your shopping list before submitting an order.
          </p>
          <Link
            href="/shopping"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90"
          >
            Go to Shopping List
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <div className="mb-6">
          <Link
            href="/shopping"
            className="text-primary hover:underline inline-flex items-center gap-2 mb-4"
          >
            ← Back to Shopping List
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Submit Shop & Deliver Order</h1>
          <p className="text-muted-foreground">
            Review your items and provide delivery details
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <div className="bg-card rounded-lg shadow-lg p-6 border">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span>🛒</span>
              Order Summary ({items.length} items)
            </h2>

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.productName} className="w-12 h-12 object-contain rounded" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">{item.quantity} {item.unit || 'unit'}</p>
                    </div>
                  </div>
                  <p className="font-medium text-foreground">
                    ${((item.expectedPriceCents || item.purchasePriceCents || 0) / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-foreground">
                <span>Delivery Fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-foreground">
                <span>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-foreground border-t border-border pt-2">
                <span>Estimated Total</span>
                <span>${estimatedTotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * Final total may vary based on actual store prices. You will only be charged for items purchased.
              </p>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="bg-card rounded-lg shadow-lg p-6 border">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span>📍</span>
              Delivery Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Delivery Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="123 Main St, Apt 4B, City, State 12345"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  For delivery coordination and PIN retrieval if you're not home
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Delivery Instructions
                </label>
                <textarea
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="Gate code, preferred entrance, where to leave items, etc."
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Safety Notes (Optional)
                </label>
                <textarea
                  value={safetyNotes}
                  onChange={(e) => setSafetyNotes(e.target.value)}
                  placeholder="Any safety concerns for the delivery driver (e.g., dogs, gated community)"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Window Start
                  </label>
                  <input
                    type="time"
                    value={deliveryTimeStart}
                    onChange={(e) => setDeliveryTimeStart(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Window End
                  </label>
                  <input
                    type="time"
                    value={deliveryTimeEnd}
                    onChange={(e) => setDeliveryTimeEnd(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Link
              href="/shopping"
              className="flex-1 px-6 py-4 border-2 border-border rounded-lg font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-primary text-primary-foreground px-6 py-4 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Submitting Order...' : 'Submit Order'}
            </button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By submitting this order, you authorize us to hold payment on your card.
            You will only be charged for items actually purchased at the store.
          </p>
        </form>
      </div>
    </div>
  )
}
