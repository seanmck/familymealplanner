'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { IngredientSearchInput } from '@/components/ingredient-search-input'
import { SuggestionBadge } from '@/components/suggestion-badge'
import { Lightbulb, ChevronRight, Loader2, ThumbsUp } from 'lucide-react'
import type { SuggestedRecipe, SuggestionsResponse } from '@/lib/suggestions/types'

interface PlannerSuggestionsProps {
  className?: string
}

export function PlannerSuggestions({ className }: PlannerSuggestionsProps) {
  const [ingredientSearch, setIngredientSearch] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSuggestions = useCallback(async (ingredients: string[]) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (ingredients.length > 0) {
        params.set('ingredients', ingredients.join(','))
      }
      params.set('limit', '6')

      const response = await fetch(`/api/recipes/suggestions?${params}`)
      if (response.ok) {
        const data: SuggestionsResponse = await response.json()
        setSuggestions(data)
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchSuggestions([])
  }, [fetchSuggestions])

  // Debounced fetch when ingredients change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(ingredientSearch)
    }, 300)

    return () => clearTimeout(timer)
  }, [ingredientSearch, fetchSuggestions])

  const hasIngredientMatches =
    suggestions?.ingredientMatches && suggestions.ingredientMatches.length > 0
  const hasFavorites = suggestions?.favorites && suggestions.favorites.length > 0
  const hasAnySuggestions = hasIngredientMatches || hasFavorites

  // Combine suggestions for display - ingredient matches first, then favorites
  const displaySuggestions: SuggestedRecipe[] = [
    ...(suggestions?.ingredientMatches || []),
    ...(suggestions?.favorites || []),
  ].slice(0, 6)

  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Need Ideas?
      </h3>
      <Card className="border-border/60">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Recipe Suggestions</span>
          </div>
          <IngredientSearchInput
            value={ingredientSearch}
            onChange={setIngredientSearch}
            placeholder="Search by ingredients you have..."
            className="mt-3"
          />
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !hasAnySuggestions ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {ingredientSearch.length > 0
                ? 'No recipes match those ingredients'
                : 'Rate some recipes to get personalized suggestions'}
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {displaySuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.recipeId}
                  suggestion={suggestion}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SuggestionCard({
  suggestion,
}: {
  suggestion: SuggestedRecipe
}) {
  const upVotes = suggestion.recipe.ratings.filter(
    (r) => r.rating === 'UP'
  ).length

  return (
    <Link
      href={`/recipes/${suggestion.recipeId}`}
      className="flex-shrink-0 w-[180px] p-3 rounded-lg border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card transition-all text-left group"
    >
      <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
        {suggestion.recipe.title}
      </p>
      <div className="flex items-center justify-between mt-2">
        <SuggestionBadge reason={suggestion.reason} />
        {upVotes > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            {upVotes}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        View recipe
        <ChevronRight className="h-3 w-3" />
      </div>
    </Link>
  )
}
