export type SuggestionReason =
  | { type: 'favorite'; upVotes: number; daysSinceUsed: number | null }
  | { type: 'ingredient-match'; matchedIngredients: string[]; matchCount: number }

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
}

export interface RecipeWithLastUsed {
  recipe: RecipeForSuggestion
  lastUsedDate: Date | null
}
