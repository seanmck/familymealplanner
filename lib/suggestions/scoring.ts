import type { RecipeForSuggestion, SuggestionReason } from './types'

// Scoring weights for favorites
const SCORING_WEIGHTS = {
  UP_VOTE_POINTS: 10,
  DOWN_VOTE_PENALTY: -15,
  CHILD_DOWN_VOTE_PENALTY: -25,

  // Recency bonuses (higher = better, hasn't been made recently)
  RECENCY_NEVER_USED: 50,
  RECENCY_OVER_4_WEEKS: 40,
  RECENCY_OVER_2_WEEKS: 25,
  RECENCY_OVER_1_WEEK: 10,
  RECENCY_THIS_WEEK: 0,

  // Ingredient matching
  INGREDIENT_EXACT_MATCH: 15,
  INGREDIENT_PARTIAL_MATCH: 8,
}

function differenceInDays(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date1.getTime() - date2.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export function computeFavoriteScore(
  recipe: RecipeForSuggestion,
  lastUsedDate: Date | null,
  today: Date = new Date()
): { score: number; reason: SuggestionReason } {
  let score = 0
  let upVotes = 0

  // Calculate rating score
  for (const rating of recipe.ratings) {
    if (rating.rating === 'UP') {
      score += SCORING_WEIGHTS.UP_VOTE_POINTS
      upVotes++
    } else if (rating.rating === 'DOWN') {
      score += SCORING_WEIGHTS.DOWN_VOTE_PENALTY
      if (rating.member.role === 'CHILD') {
        score += SCORING_WEIGHTS.CHILD_DOWN_VOTE_PENALTY
      }
    }
  }

  // Skip if net negative (family doesn't like it)
  if (score <= 0) {
    return {
      score: 0,
      reason: { type: 'favorite', upVotes, daysSinceUsed: null },
    }
  }

  // Add recency bonus
  let daysSinceUsed: number | null = null
  if (!lastUsedDate) {
    score += SCORING_WEIGHTS.RECENCY_NEVER_USED
  } else {
    daysSinceUsed = differenceInDays(today, lastUsedDate)
    if (daysSinceUsed > 28) {
      score += SCORING_WEIGHTS.RECENCY_OVER_4_WEEKS
    } else if (daysSinceUsed > 14) {
      score += SCORING_WEIGHTS.RECENCY_OVER_2_WEEKS
    } else if (daysSinceUsed > 7) {
      score += SCORING_WEIGHTS.RECENCY_OVER_1_WEEK
    } else {
      score += SCORING_WEIGHTS.RECENCY_THIS_WEEK
    }
  }

  return {
    score,
    reason: { type: 'favorite', upVotes, daysSinceUsed },
  }
}

export function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/s$/, '') // Remove trailing 's' for basic plural handling
}

export function computeIngredientMatchScore(
  recipe: RecipeForSuggestion,
  searchIngredients: string[]
): { score: number; reason: SuggestionReason } {
  const matchedIngredients: string[] = []
  let score = 0

  const normalizedSearchTerms = searchIngredients.map(normalizeIngredient)

  for (const searchTerm of normalizedSearchTerms) {
    if (!searchTerm) continue

    for (const ingredient of recipe.ingredients) {
      const ingredientNormalized = normalizeIngredient(ingredient.name)

      // Check for exact match
      if (ingredientNormalized === searchTerm) {
        score += SCORING_WEIGHTS.INGREDIENT_EXACT_MATCH
        matchedIngredients.push(ingredient.name)
        break
      }
      // Check for partial match (ingredient contains search term or vice versa)
      if (
        ingredientNormalized.includes(searchTerm) ||
        searchTerm.includes(ingredientNormalized)
      ) {
        score += SCORING_WEIGHTS.INGREDIENT_PARTIAL_MATCH
        matchedIngredients.push(ingredient.name)
        break
      }
    }
  }

  return {
    score,
    reason: {
      type: 'ingredient-match',
      matchedIngredients,
      matchCount: matchedIngredients.length,
    },
  }
}

export function hasKidDownVotes(recipe: RecipeForSuggestion): boolean {
  return recipe.ratings.some(
    (r) => r.rating === 'DOWN' && r.member.role === 'CHILD'
  )
}
