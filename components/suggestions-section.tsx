'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { SuggestionBadge } from '@/components/suggestion-badge'
import { ChevronDown, ChevronUp, Lightbulb, ThumbsUp } from 'lucide-react'
import type { SuggestedRecipe } from '@/lib/suggestions/types'

interface SuggestionsSectionProps {
  favorites: SuggestedRecipe[]
  ingredientMatches?: SuggestedRecipe[]
  onSelect: (recipeId: string) => void
  isLoading?: boolean
}

export function SuggestionsSection({
  favorites,
  ingredientMatches,
  onSelect,
  isLoading,
}: SuggestionsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const hasIngredientMatches = ingredientMatches && ingredientMatches.length > 0
  const hasFavorites = favorites.length > 0
  const hasAnySuggestions = hasIngredientMatches || hasFavorites

  if (isLoading) {
    return (
      <div className="border rounded-lg p-3 bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          <span>Finding suggestions...</span>
        </div>
      </div>
    )
  }

  if (!hasAnySuggestions) {
    return null
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Suggestions
          <Badge variant="secondary" className="text-xs">
            {(ingredientMatches?.length || 0) + favorites.length}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="p-2 space-y-3">
          {/* Ingredient matches first if present */}
          {hasIngredientMatches && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">
                Matching your ingredients
              </p>
              <div className="space-y-1">
                {ingredientMatches.map((suggestion) => (
                  <SuggestionItem
                    key={suggestion.recipeId}
                    suggestion={suggestion}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Favorites */}
          {hasFavorites && (
            <div className="space-y-1">
              {hasIngredientMatches && (
                <p className="text-xs text-muted-foreground px-1 pt-1">
                  Family favorites
                </p>
              )}
              <div className="space-y-1">
                {favorites.map((suggestion) => (
                  <SuggestionItem
                    key={suggestion.recipeId}
                    suggestion={suggestion}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SuggestionItem({
  suggestion,
  onSelect,
}: {
  suggestion: SuggestedRecipe
  onSelect: (recipeId: string) => void
}) {
  const upVotes = suggestion.recipe.ratings.filter(
    (r) => r.rating === 'UP'
  ).length

  return (
    <button
      type="button"
      onClick={() => onSelect(suggestion.recipeId)}
      className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{suggestion.recipe.title}</p>
        <SuggestionBadge reason={suggestion.reason} className="mt-1" />
      </div>
      {upVotes > 0 && (
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
          <ThumbsUp className="h-3 w-3" />
          {upVotes}
        </span>
      )}
    </button>
  )
}
