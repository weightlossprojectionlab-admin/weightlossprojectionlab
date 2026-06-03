/**
 * Shared recipe text-search predicate.
 *
 * Splits the query into words and requires EVERY word to appear somewhere in
 * the recipe's searchable text (name + description + mealType + ingredients),
 * order-independent. So "creamy mushroom pasta" matches the recipe titled
 * "Creamy Mushroom Noodle Pasta" — a naive whole-phrase `.includes()` would
 * not, because "Noodle" sits between the query words.
 *
 * Used by both the consumer /recipes grid and the /admin/recipes manager so
 * search behaves identically in both surfaces (one predicate, one source of
 * truth — no drift when one page tweaks its matching).
 */
export function recipeMatchesQuery(
  recipe: {
    name?: string
    description?: string
    mealType?: string
    ingredients?: string[]
  },
  query: string
): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true

  const haystack = [
    recipe.name,
    recipe.description,
    recipe.mealType,
    ...(recipe.ingredients || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return terms.every(term => haystack.includes(term))
}
