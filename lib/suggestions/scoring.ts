import type { RecipeForSuggestion, SuggestionReason, PerishableItem, PerishableMatch } from './types'

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

  // Perishable matching
  PERISHABLE_BASE_MATCH: 10,
  PERISHABLE_EXPIRING_TODAY: 30,
  PERISHABLE_EXPIRING_3_DAYS: 20,
  PERISHABLE_EXPIRING_7_DAYS: 10,
  PERISHABLE_EXPIRED: 5, // Still suggest to use up, but lower priority
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

export function computePerishableMatchScore(
  recipe: RecipeForSuggestion,
  perishables: PerishableItem[],
  today: Date = new Date()
): { score: number; reason: SuggestionReason } {
  const matchedPerishables: PerishableMatch[] = []
  let score = 0

  // Normalize today to start of day for consistent comparison
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)

  for (const perishable of perishables) {
    const normalizedPerishable = normalizeIngredient(perishable.name)

    for (const ingredient of recipe.ingredients) {
      const ingredientNormalized = normalizeIngredient(ingredient.name)

      // Check for match (exact or partial)
      const isMatch =
        ingredientNormalized === normalizedPerishable ||
        ingredientNormalized.includes(normalizedPerishable) ||
        normalizedPerishable.includes(ingredientNormalized)

      if (isMatch) {
        // Calculate days until expiration
        let daysUntilExpiration: number | null = null
        let urgencyBonus = 0

        if (perishable.expirationDate) {
          const expDate = new Date(perishable.expirationDate)
          expDate.setHours(0, 0, 0, 0)
          daysUntilExpiration = Math.floor(
            (expDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (daysUntilExpiration < 0) {
            urgencyBonus = SCORING_WEIGHTS.PERISHABLE_EXPIRED
          } else if (daysUntilExpiration <= 1) {
            urgencyBonus = SCORING_WEIGHTS.PERISHABLE_EXPIRING_TODAY
          } else if (daysUntilExpiration <= 3) {
            urgencyBonus = SCORING_WEIGHTS.PERISHABLE_EXPIRING_3_DAYS
          } else if (daysUntilExpiration <= 7) {
            urgencyBonus = SCORING_WEIGHTS.PERISHABLE_EXPIRING_7_DAYS
          }
        }

        score += SCORING_WEIGHTS.PERISHABLE_BASE_MATCH + urgencyBonus

        matchedPerishables.push({
          perishableName: perishable.displayName,
          ingredientName: ingredient.name,
          daysUntilExpiration,
        })

        break // Only count each perishable once per recipe
      }
    }
  }

  // Calculate overall urgency score (average of matched items)
  const urgencyScore =
    matchedPerishables.length > 0
      ? matchedPerishables.reduce((sum, p) => {
          if (p.daysUntilExpiration === null) return sum
          return sum + Math.max(0, 7 - p.daysUntilExpiration)
        }, 0) / matchedPerishables.length
      : 0

  return {
    score,
    reason: {
      type: 'perishable-match',
      matchedPerishables,
      urgencyScore,
    },
  }
}
