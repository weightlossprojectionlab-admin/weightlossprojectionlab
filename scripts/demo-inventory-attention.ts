/**
 * Demo: run the real inventory Attention formula on example items and print
 * the urgency curve + the ranked table it produces. Read-only, no DB.
 *   npx tsx scripts/demo-inventory-attention.ts
 */
import { inventoryAttentionScore, compareAttention } from '../lib/inventory-attention'
import type { ShoppingItem } from '../types/shopping'

const NOW = Date.now()
const DAY = 86_400_000

function it(productName: string, o: Partial<ShoppingItem>): ShoppingItem {
  return {
    id: productName, userId: 'u', productName, brand: '', imageUrl: '',
    category: 'pantry', isManual: false, inStock: true, quantity: 5,
    location: 'pantry', isPerishable: false, needed: false, priority: 'medium',
    purchaseHistory: [], createdAt: new Date(NOW), updatedAt: new Date(NOW),
    ...o,
  } as ShoppingItem
}

// ---- 1. The urgency kernel u(T;τ) = e^(−max(0,T)/τ) ----
console.log('\nURGENCY CURVE   u(T;τ) = e^(−max(0,T)/τ)')
console.log('days T :  ' + [-2, 0, 1, 2, 3, 5, 7, 10, 14].map(t => String(t).padStart(5)).join(''))
const curve = (tau: number) =>
  [-2, 0, 1, 2, 3, 5, 7, 10, 14].map(t => Math.exp(-Math.max(0, t) / tau).toFixed(2).padStart(5)).join('')
console.log('restock (τ=7):' + curve(7))
console.log('spoil   (τ=5):' + curve(5))

// ---- 2. A wide field, heavy on stockouts/overdue, to stress the tie-break ----
const items: ShoppingItem[] = [
  // Five items all pinned at score 1.00 — differ only by how overdue:
  it('Salt',          { category: 'pantry',  averageDaysBetweenPurchases: 7,  lastPurchased: new Date(NOW - 19 * DAY) }), // run-out −12
  it('Flour',         { category: 'pantry',  averageDaysBetweenPurchases: 10, lastPurchased: new Date(NOW - 17 * DAY) }), // run-out −7
  it('Yogurt',        { category: 'dairy',   isPerishable: true, expiresAt: new Date(NOW - 3 * DAY), quantity: 2 }),      // EXPIRED 3d ago → discard
  it('Eggs',          { category: 'eggs',    isPerishable: true, expiresAt: new Date(NOW + 12 * DAY),
                        averageDaysBetweenPurchases: 7, lastPurchased: new Date(NOW - 8 * DAY) }),                         // run-out −1
  it('Coffee beans',  { category: 'pantry',  quantity: 0 }),                                                              // out of stock, no cadence → clock 0
  // Future events:
  it('Milk',          { category: 'dairy',   isPerishable: true, expiresAt: new Date(NOW + 2 * DAY), quantity: 1,
                        averageDaysBetweenPurchases: 7, lastPurchased: new Date(NOW - 6 * DAY) }),                         // run-out 1, spoil 2
  it('Bananas',       { category: 'produce', isPerishable: true, expiresAt: new Date(NOW + 1 * DAY), quantity: 4 }),       // spoil 1 → use-soon
  it('Rice (10 lb)',  { category: 'pantry',  quantity: 10 }),                                                             // plentiful → ok
]

const scored = items
  .map(i => ({ name: i.productName, q: i.quantity, r: inventoryAttentionScore(i, NOW) }))
  .sort((a, b) => compareAttention(a.r, b.r)) // score DESC, then soonestClock ASC

console.log('\nRANKED INVENTORY  (compareAttention: score DESC, then soonest-clock ASC)\n')
const pad = (s: any, n: number) => String(s).padEnd(n)
const clk = (n: number | null) => (n === null ? '—' : `${n}d`)
const soon = (n: number) => (n === Infinity ? '∞' : `${n}d`)
console.log(pad('#', 3) + pad('item', 15) + pad('onHand', 8) + pad('runOut', 8) + pad('spoil', 7) + pad('soonest', 9) + pad('SCORE', 7) + 'action')
console.log('─'.repeat(66))
scored.forEach((s, idx) => {
  console.log(
    pad(idx + 1, 3) +
    pad(s.name, 15) +
    pad(s.q, 8) +
    pad(clk(s.r.tEmpty), 8) +
    pad(clk(s.r.tSpoil), 7) +
    pad(soon(s.r.soonestClock), 9) +
    pad(s.r.score.toFixed(2), 7) +
    s.r.action,
  )
})
console.log('')
