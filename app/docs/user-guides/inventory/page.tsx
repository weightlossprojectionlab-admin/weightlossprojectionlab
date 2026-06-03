import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kitchen Inventory Guide | Wellness Projection Lab',
  description:
    'Track what you have at home — what to restock, what to use soon, and health flags for each family member.',
}

export default function InventoryPage() {
  return (
    <GuideTemplate
      appRoute="/inventory"
      title="Kitchen Inventory"
      description="Track what you have at home — what to restock, what to use soon, and what fits your family's health"
    >
      <div className="bg-purple-50 border-l-4 border-purple-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-purple-900 mb-2">🍽️ Your Kitchen at a Glance</p>
        <p className="text-purple-800 m-0">
          Kitchen Inventory shows what you have on hand, sorts it by what needs attention first, and
          flags items for each family member's allergies and health conditions.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        When you scan or add a product, it lands in your Kitchen Inventory. The list keeps track of
        how much you have, when things are likely to run out or spoil, and whether an item is a good
        or risky choice for anyone in your household.
      </p>
      <p className="text-sm text-gray-600">
        Items arrive here automatically when you finish a shopping trip — see the{' '}
        <Link href="/docs/user-guides/shopping" className="text-blue-600 underline">
          Shopping Lists Guide
        </Link>{' '}
        and{' '}
        <Link href="/docs/user-guides/barcode-scanning" className="text-blue-600 underline">
          Barcode Scanning Guide
        </Link>
        .
      </p>

      <h2 id="reading-the-list">Reading the List</h2>
      <p>
        Items are ordered by what needs you first, so anything about to run out or go bad rises to
        the top. Each item can show a small badge:
      </p>
      <ul>
        <li>
          <strong>Restock</strong> — you're low, or about due to buy more.
        </li>
        <li>
          <strong>Use soon</strong> — it's close to its expiration date; use it before it spoils.
        </li>
        <li>
          <strong>Discard</strong> — it's past its date; time to throw it out.
        </li>
        <li>No badge — you're well stocked and it's fresh. Nothing to do.</li>
      </ul>
      <p>
        Each item also shows how much is on hand, and a <strong>Last one</strong> note when you're
        down to your final unit. Use the location buttons — Fridge, Freezer, Pantry, Counter — to
        see just one spot.
      </p>

      <h2 id="health-flags">Health Flags</h2>
      <p>
        An item can show a flag based on your family members' profiles — so you can see at a glance
        who it's right or wrong for. The flags come straight from each member's allergies and health
        conditions, so keep those up to date and the flags update on their own.
      </p>
      <ul>
        <li>
          <strong className="text-red-700">Unsafe for [name]</strong> — the item has a food this
          person is allergic to (it lists which one). Don't give it to them.
        </li>
        <li>
          <strong className="text-amber-700">High in [nutrient] — best to limit for [name]</strong>{' '}
          — the item is high in something that isn't ideal for this person's health condition, like
          sugar with diabetes or sodium (salt) with high blood pressure. It's fine now and then —
          just go easy.
        </li>
        <li>
          <strong className="text-green-700">Good for [name]</strong> — the item is a helpful choice
          for this person's health.
        </li>
      </ul>
      <p>
        A red &ldquo;unsafe&rdquo; flag is a hard stop (an allergy). An amber or green flag is a
        gentle nudge to help you choose — not a rule. Set each member's allergies and health
        conditions in their{' '}
        <Link href="/docs/user-guides/patient-profiles" className="text-blue-600 underline">
          profile
        </Link>{' '}
        to turn the flags on.
      </p>

      <h2 id="nutrition">Nutrition Facts</h2>
      <p>
        Open an item's <strong>Item Details</strong> to see its nutrition — calories, total and
        saturated fat, sodium, carbs, fiber, sugars, and protein. The label tells you whether the
        numbers are <strong>per serving</strong> or <strong>per 100 g</strong>, so a big sugar
        number isn't mistaken for a single serving. This comes from the shared product catalog and
        is read-only here.
      </p>

      <h2 id="adjusting">Adjusting What You Have</h2>
      <p>
        To change how much you have on hand, use the <strong>Inventory Adjustment</strong> tab (or
        the <strong>Adjust</strong> link on an item). Every change is saved with a reason and a
        timestamp, so in a family everyone can see what changed and when.
      </p>

      <h2 id="history">Purchase History</h2>
      <p>
        The <strong>Purchase History</strong> tab shows when you last bought an item and how often
        you tend to buy it. That pattern is what powers the <strong>Restock</strong> timing — the
        more you buy over time, the better it learns your rhythm.
      </p>
    </GuideTemplate>
  )
}
