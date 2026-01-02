'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { IngredientSearchInput } from '@/components/ingredient-search-input'
import { SuggestionsSection } from '@/components/suggestions-section'
import type { SuggestionsResponse } from '@/lib/suggestions/types'

interface Recipe {
  id: string
  title: string
  tags: string[]
  type: 'MAIN' | 'SIDE'
  ratings: Array<{
    rating: 'UP' | 'DOWN' | 'NEUTRAL'
    member: { name: string; role: 'ADULT' | 'CHILD' }
  }>
}

interface RecipePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipes: Recipe[]
  onSelect: (recipeId: string | null, placeholder?: string) => void
  initialPlaceholder?: string
  filterType?: 'MAIN' | 'SIDE' | null
  title?: string
  showSuggestions?: boolean
}

// Inner component that resets state when key changes
function RecipePickerContent({
  recipes,
  onSelect,
  initialPlaceholder,
  filterType,
  title,
  showSuggestions = true,
}: {
  recipes: Recipe[]
  onSelect: (recipeId: string | null, placeholder?: string) => void
  initialPlaceholder?: string
  filterType?: 'MAIN' | 'SIDE' | null
  title?: string
  showSuggestions?: boolean
}) {
  const [search, setSearch] = useState('')
  const [quickAdd, setQuickAdd] = useState(initialPlaceholder || '')
  const [ingredientSearch, setIngredientSearch] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  // Fetch suggestions on mount and when ingredient search changes
  const fetchSuggestions = useCallback(async (ingredients: string[]) => {
    setIsLoadingSuggestions(true)
    try {
      const params = new URLSearchParams()
      if (ingredients.length > 0) {
        params.set('ingredients', ingredients.join(','))
      }
      params.set('limit', '5')

      const response = await fetch(`/api/recipes/suggestions?${params}`)
      if (response.ok) {
        const data: SuggestionsResponse = await response.json()
        setSuggestions(data)
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    if (showSuggestions) {
      fetchSuggestions([])
    }
  }, [showSuggestions, fetchSuggestions])

  // Debounced fetch when ingredients change
  useEffect(() => {
    if (!showSuggestions) return

    const timer = setTimeout(() => {
      fetchSuggestions(ingredientSearch)
    }, 300)

    return () => clearTimeout(timer)
  }, [ingredientSearch, showSuggestions, fetchSuggestions])

  const isEditing = Boolean(initialPlaceholder)
  const isPickingSide = filterType === 'SIDE'

  // Filter by search, then sort (show matching type first when filterType is set)
  const filteredRecipes = recipes
    .filter(
      (r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      // When picking sides, show SIDE types first but allow any recipe
      if (filterType) {
        if (a.type === filterType && b.type !== filterType) return -1
        if (b.type === filterType && a.type !== filterType) return 1
      }
      return a.title.localeCompare(b.title)
    })

  const handleQuickAdd = () => {
    if (quickAdd.trim()) {
      onSelect(null, quickAdd.trim())
      setQuickAdd('')
    }
  }

  const dialogTitle = title || (isEditing ? 'Edit Meal' : isPickingSide ? 'Add Side' : 'Add Meal')

  return (
    <>
      <DialogHeader>
        <DialogTitle>{dialogTitle}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Quick add - only show for mains, not sides */}
        {!isPickingSide && (
          <div className="flex gap-2">
            <Input
              placeholder={isEditing ? 'Edit meal name...' : 'Quick add (no recipe)...'}
              value={quickAdd}
              onChange={(e) => setQuickAdd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleQuickAdd()
              }}
              autoFocus={isEditing}
            />
            <Button onClick={handleQuickAdd} disabled={!quickAdd.trim()}>
              {isEditing ? 'Save' : 'Add'}
            </Button>
          </div>
        )}

        <div className="relative">
          <Input
            placeholder={isPickingSide ? 'Search sides...' : 'Search recipes...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus={isPickingSide}
          />
        </div>

        {/* Ingredient search - only show when not searching by title and suggestions enabled */}
        {showSuggestions && !isPickingSide && !search && (
          <IngredientSearchInput
            value={ingredientSearch}
            onChange={setIngredientSearch}
            placeholder="Have ingredients? Search by what you have..."
          />
        )}

        {/* Suggestions section - only show when not searching by title */}
        {showSuggestions && !search && suggestions && (
          <SuggestionsSection
            favorites={suggestions.favorites}
            ingredientMatches={suggestions.ingredientMatches}
            onSelect={(recipeId) => onSelect(recipeId)}
            isLoading={isLoadingSuggestions}
          />
        )}
      </div>

      <div className="flex-1 overflow-auto mt-4">
        {filteredRecipes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {recipes.length === 0
              ? 'No recipes yet. Add some first!'
              : 'No recipes match your search'}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredRecipes.map((recipe) => {
              const upVotes = recipe.ratings.filter(
                (r) => r.rating === 'UP'
              ).length
              const hasKidDownVotes = recipe.ratings.some(
                (r) => r.rating === 'DOWN' && r.member.role === 'CHILD'
              )
              const isNew = recipe.ratings.length === 0

              return (
                <button
                  key={recipe.id}
                  onClick={() => onSelect(recipe.id)}
                  className="w-full text-left p-3 rounded border hover:border-primary hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{recipe.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {/* Show recipe type badge when not filtering */}
                        {!filterType && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${recipe.type === 'SIDE' ? 'bg-muted' : ''}`}
                          >
                            {recipe.type === 'MAIN' ? 'Main' : 'Side'}
                          </Badge>
                        )}
                        {recipe.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 items-center">
                      {isNew && (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      )}
                      {hasKidDownVotes && (
                        <Badge variant="destructive" className="text-xs">
                          Picky alert
                        </Badge>
                      )}
                      {upVotes > 0 && (
                        <span className="text-sm text-muted-foreground">
                          👍 {upVotes}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

export function RecipePicker({
  open,
  onOpenChange,
  recipes,
  onSelect,
  initialPlaceholder,
  filterType,
  title,
  showSuggestions = true,
}: RecipePickerProps) {
  // Use a key based on open state and initialPlaceholder to reset form state when dialog opens
  // This is the React-recommended pattern for resetting state based on props
  const contentKey = open ? `open-${initialPlaceholder || 'new'}-${filterType || 'all'}` : 'closed'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <RecipePickerContent
          key={contentKey}
          recipes={recipes}
          onSelect={onSelect}
          initialPlaceholder={initialPlaceholder}
          filterType={filterType}
          title={title}
          showSuggestions={showSuggestions}
        />
      </DialogContent>
    </Dialog>
  )
}
