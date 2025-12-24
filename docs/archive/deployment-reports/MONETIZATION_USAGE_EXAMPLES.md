# Monetization Trigger Usage Examples

> How to integrate event-driven monetization into your pages

---

## Example 1: Meal Photo Analysis (Hard Block)

```typescript
// app/log-meal/page.tsx

'use client'

import { useState } from 'react'
import { useMonetizationTrigger } from '@/hooks/useMonetizationTrigger'
import UpgradeModal from '@/components/monetization/UpgradeModal'

export default function LogMealPage() {
  const mealScanTrigger = useMonetizationTrigger('ai_meal_scan')
  const [photo, setPhoto] = useState<File | null>(null)

  async function handlePhotoCapture(capturedPhoto: File) {
    // Check if user can use AI meal scan
    const allowed = await mealScanTrigger.checkAndPrompt()

    if (!allowed) {
      // Upgrade modal will show automatically
      // Block the scan
      return
    }

    // User is allowed - proceed with AI analysis
    setPhoto(capturedPhoto)
    await analyzeMealWithAI(capturedPhoto)
  }

  return (
    <div>
      <MealPhotoCapture onCapture={handlePhotoCapture} />

      {/* Upgrade Modal */}
      <UpgradeModal
        prompt={mealScanTrigger.prompt}
        isOpen={mealScanTrigger.showModal}
        onClose={mealScanTrigger.dismissModal}
        onUpgrade={mealScanTrigger.handleUpgrade}
      />
    </div>
  )
}
```

---

## Example 2: Add Second Patient (Hard Block)

```typescript
// app/patients/new/page.tsx

'use client'

import { useRouter } from 'next/navigation'
import { useMonetizationTrigger } from '@/hooks/useMonetizationTrigger'
import UpgradeModal from '@/components/monetization/UpgradeModal'

export default function NewPatientPage() {
  const router = useRouter()
  const addPatientTrigger = useMonetizationTrigger('add_second_member')

  // Check on page load
  useEffect(() => {
    async function checkLimit() {
      const allowed = await addPatientTrigger.checkAndPrompt()

      if (!allowed) {
        // Redirect back if hard blocked
        setTimeout(() => {
          router.push('/patients')
        }, 100)
      }
    }

    checkLimit()
  }, [])

  async function handleSubmit(patientData: PatientProfile) {
    // Double-check before saving
    const allowed = await addPatientTrigger.checkAndPrompt()

    if (!allowed) return

    // Save patient
    await createPatient(patientData)
    router.push('/patients')
  }

  return (
    <div>
      <PatientForm onSubmit={handleSubmit} />

      <UpgradeModal
        prompt={addPatientTrigger.prompt}
        isOpen={addPatientTrigger.showModal}
        onClose={addPatientTrigger.dismissModal}
        onUpgrade={addPatientTrigger.handleUpgrade}
      />
    </div>
  )
}
```

---

## Example 3: Recipe Library (Soft Gate)

```typescript
// app/recipes/[id]/page.tsx

'use client'

import { useMonetizationTrigger } from '@/hooks/useMonetizationTrigger'
import UpgradeModal from '@/components/monetization/UpgradeModal'

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  const recipeTrigger = useMonetizationTrigger('recipes_limit')
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  useEffect(() => {
    async function loadRecipe() {
      const recipeData = await getRecipe(params.id)

      // Check if this is a premium recipe
      if (recipeData.isPremium) {
        const allowed = await recipeTrigger.checkAndPrompt()

        if (!allowed) {
          // Soft gate - show teaser instead
          setRecipe({ ...recipeData, isLocked: true })
          return
        }
      }

      setRecipe(recipeData)
    }

    loadRecipe()
  }, [params.id])

  if (!recipe) return <Loading />

  if (recipe.isLocked) {
    return (
      <div>
        <RecipeTeaser recipe={recipe} />
        <div className="text-center mt-6">
          <button
            onClick={() => recipeTrigger.setShowModal(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg"
          >
            Unlock This Recipe
          </button>
        </div>

        <UpgradeModal
          prompt={recipeTrigger.prompt}
          isOpen={recipeTrigger.showModal}
          onClose={recipeTrigger.dismissModal}
          onUpgrade={recipeTrigger.handleUpgrade}
        />
      </div>
    )
  }

  return <RecipeDetail recipe={recipe} />
}
```

---

## Example 4: Inventory Feature (Soft Gate with Nudge)

```typescript
// app/inventory/page.tsx

'use client'

import { useMonetizationTrigger } from '@/hooks/useMonetizationTrigger'
import UpgradeModal from '@/components/monetization/UpgradeModal'

export default function InventoryPage() {
  const inventoryTrigger = useMonetizationTrigger('inventory')

  // Show upgrade nudge on mount if not premium
  useEffect(() => {
    async function checkAccess() {
      const allowed = await inventoryTrigger.checkAndPrompt()

      if (!allowed) {
        // User will see upgrade modal
        // But we can still show limited view
      }
    }

    checkAccess()
  }, [])

  return (
    <div>
      {/* Limited free version */}
      <div className="space-y-4">
        <h1>Kitchen Inventory (Limited)</h1>
        <p className="text-muted-foreground">
          Track up to 10 items for free. Upgrade for unlimited tracking!
        </p>

        <InventoryList limit={10} />
      </div>

      <UpgradeModal
        prompt={inventoryTrigger.prompt}
        isOpen={inventoryTrigger.showModal}
        onClose={inventoryTrigger.dismissModal}
        onUpgrade={inventoryTrigger.handleUpgrade}
      />
    </div>
  )
}
```

---

## Example 5: AI Chat (Usage-Based Hard Block)

```typescript
// components/ChatInterface.tsx

'use client'

import { useMonetizationTrigger } from '@/hooks/useMonetizationTrigger'
import UpgradeModal from '@/components/monetization/UpgradeModal'

export function ChatInterface() {
  const chatTrigger = useMonetizationTrigger('ai_chat_limit')
  const [messages, setMessages] = useState<Message[]>([])

  async function sendMessage(content: string) {
    // Check limit before sending
    const allowed = await chatTrigger.checkAndPrompt()

    if (!allowed) {
      // Hard block - show modal
      return
    }

    // Send message
    const response = await sendChatMessage(content)
    setMessages([...messages, { role: 'assistant', content: response }])
  }

  return (
    <div>
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} disabled={chatTrigger.checking} />

      <UpgradeModal
        prompt={chatTrigger.prompt}
        isOpen={chatTrigger.showModal}
        onClose={chatTrigger.dismissModal}
        onUpgrade={chatTrigger.handleUpgrade}
      />
    </div>
  )
}
```

---

## Trigger Types Reference

### Premium Triggers (Upgrade to Single/Premium)
- `ai_meal_scan` - Hard block after 10 scans/month
- `recipes_limit` - Soft gate after viewing 20 recipes
- `inventory` - Soft gate for kitchen inventory features
- `shopping` - Soft gate for shopping list features
- `ai_chat_limit` - Hard block after 5 messages/day

### Family Triggers (Upgrade to Family Plan)
- `add_second_member` - Hard block when adding 2nd patient
- `medications` - Soft gate for medication tracking
- `appointments` - Soft gate for appointment features
- `vitals` - Soft gate for health vitals tracking

### Family+ Triggers (Informational)
- `add_five_members` - Soft nudge at 5 members (Family supports 10)
- `storage_limit` - Soft warning near storage limit
- `ai_chat_unlimited` - Soft nudge for unlimited chats
- `medical_reports` - Soft gate for advanced reports

---

## Best Practices

### 1. Check Early
```typescript
// ✅ GOOD - Check before showing feature
useEffect(() => {
  trigger.checkAndPrompt()
}, [])

// ❌ BAD - Let user fill form then block
function handleSubmit() {
  trigger.checkAndPrompt() // Too late!
}
```

### 2. Provide Context
```typescript
// ✅ GOOD - Explain why upgrade is needed
<p>You've used all 10 free AI scans this month. Upgrade for unlimited!</p>

// ❌ BAD - Generic message
<p>Upgrade to continue</p>
```

### 3. Soft Gates > Hard Blocks
```typescript
// ✅ GOOD - Show limited free version
if (!allowed) {
  return <FeatureTeaser feature="inventory" />
}

// ❌ BAD - Block everything
if (!allowed) {
  return <Error message="Access denied" />
}
```

### 4. Track Analytics
```typescript
// All triggers automatically log events:
// - 'shown' - When modal appears
// - 'dismissed' - When user closes modal
// - 'upgraded' - When user clicks upgrade

// Use this data to optimize conversion!
```

---

## Testing Triggers

```typescript
// Force trigger in development
if (process.env.NODE_ENV === 'development') {
  // Override subscription for testing
  const testTrigger = useMonetizationTrigger('ai_meal_scan')

  // Manually show modal
  testTrigger.setShowModal(true)
}
```

---

Ready to monetize! 💰
