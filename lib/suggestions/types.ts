export interface PerishableMatch {
  perishableName: string
  ingredientName: string
  daysUntilExpiration: number | null
}

export type SuggestionReason =
  | { type: 'favorite'; upVotes: number; daysSinceUsed: number | null }
  | { type: 'ingredient-match'; matchedIngredients: string[]; matchCount: number }
  | { type: 'perishable-match'; matchedPerishables: PerishableMatch[]; urgencyScore: number }

export interface RecipeForSuggestion {
  id: string
  title: string
  tags: string[]
  type: 'MAIN' | 'SIDE'
  ingredients: Array<{ id: string; name: string }>
  ratings: Array<{
    rating: 'UP' | 'DOWN' | 'NEUTRAL'
    member: { name: string; role: 'ADULT' | 'CHILD' }
  }>
}

export interface SuggestedRecipe {
  recipeId: string
  recipe: RecipeForSuggestion
  score: number
  reason: SuggestionReason
}

export interface SuggestionsResponse {
  favorites: SuggestedRecipe[]
  ingredientMatches?: SuggestedRecipe[]
  perishableMatches?: SuggestedRecipe[]
}

export interface PerishableItem {
  name: string
  displayName: string
  expirationDate: Date | null
}

export interface RecipeWithLastUsed {
  recipe: RecipeForSuggestion
  lastUsedDate: Date | null
}
