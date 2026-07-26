'use client'

/**
 * IngredientListInput — a fat-finger, mobile-first ingredient capture used in
 * the manual meal-log "Ingredients breakdown" section.
 *
 * Design (agreed w/ product): type-as-text, store-as-structured. The user
 * types or pastes a natural list ("2 eggs, 1 tbsp butter, 1/2 cup oats") into a
 * single field; on Add / Enter we split on commas+newlines and parse each
 * fragment (lib/ingredient-parse) into an editable chip row. One big field, no
 * per-field tapping, and the parse is visible + correctable (tap a row to pull
 * it back into the field). Rules-based parse → zero API/quota cost.
 *
 * Purely a capture control: it owns no persistence. The parent holds the
 * ParsedIngredient[] and writes them to MealLog.sourceRefs.cookedIngredients.
 */

import { useState } from 'react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { parseIngredientList, type ParsedIngredient } from '@/lib/ingredient-parse'

interface IngredientListInputProps {
  value: ParsedIngredient[]
  onChange: (next: ParsedIngredient[]) => void
}

export default function IngredientListInput({ value, onChange }: IngredientListInputProps) {
  const [draft, setDraft] = useState('')

  const commitDraft = () => {
    const parsed = parseIngredientList(draft)
    if (parsed.length === 0) {
      setDraft('')
      return
    }
    onChange([...value, ...parsed])
    setDraft('')
  }

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  // Tap a row → pull it back into the field for a quick fix, removing it from
  // the list (re-Add re-inserts it). Simplest fat-finger edit — no tiny inline
  // fields.
  const editAt = (index: number) => {
    const item = value[index]
    setDraft((d) => (d.trim() ? `${d.trim()}, ${item.ingredientText}` : item.ingredientText))
    removeAt(index)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter adds; comma also adds (so "eggs," commits without waiting for +).
    if (e.key === 'Enter') {
      e.preventDefault()
      commitDraft()
    }
  }

  return (
    <div className="space-y-3">
      {/* Entry field + big Add button */}
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., 2 eggs, 1 tbsp butter, 1/2 cup oats"
          aria-label="Add an ingredient (you can paste a whole list)"
          className="flex-1 min-w-0 min-h-[48px] px-3 rounded-lg border border-border bg-background text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          inputMode="text"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={commitDraft}
          disabled={!draft.trim()}
          aria-label="Add ingredient"
          className="shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[48px] px-4 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 active:scale-[0.97] transition-transform disabled:opacity-50 disabled:active:scale-100"
        >
          <PlusIcon className="w-5 h-5" aria-hidden="true" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Helper line */}
      <p className="text-xs text-muted-foreground">
        Add what you remember — even without amounts. Tap an item to edit it.
      </p>

      {/* Parsed ingredient rows */}
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((ing, i) => (
            <li
              key={`${ing.ingredientText}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-background shadow-sm"
            >
              <button
                type="button"
                onClick={() => editAt(i)}
                className="flex-1 min-w-0 min-h-[48px] px-3 py-2 text-left flex flex-col justify-center"
                aria-label={`Edit ${ing.ingredientText}`}
              >
                <span className="text-sm font-medium text-foreground truncate">
                  {ing.ingredientText}
                </span>
                {(ing.quantity != null || ing.unit) && (
                  <span className="text-xs text-muted-foreground">
                    {[ing.quantity != null ? formatQty(ing.quantity) : null, ing.unit]
                      .filter(Boolean)
                      .join(' ')}
                    {' · '}
                    {ing.name}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove ${ing.ingredientText}`}
                className="shrink-0 flex items-center justify-center w-12 min-h-[48px] text-muted-foreground hover:text-error active:scale-90 transition-transform"
              >
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Render a numeric quantity back to a friendly string (0.5 → "½", 1.5 → "1½"). */
function formatQty(q: number): string {
  const whole = Math.floor(q)
  const frac = q - whole
  const map: Record<string, string> = {
    '0.5': '½', '0.25': '¼', '0.75': '¾', '0.33': '⅓', '0.67': '⅔',
  }
  const key = frac.toFixed(2).replace(/0$/, '').replace(/\.$/, '')
  const fracStr = map[frac.toFixed(2)] || map[key]
  if (frac === 0) return String(whole)
  if (fracStr) return whole > 0 ? `${whole}${fracStr}` : fracStr
  return String(Math.round(q * 100) / 100)
}
