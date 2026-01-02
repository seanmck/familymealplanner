'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface Recipe {
  id: string
  title: string
  tags: string[]
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
}

// Inner component that resets state when key changes
function RecipePickerContent({
  recipes,
  onSelect,
  initialPlaceholder,
}: {
  recipes: Recipe[]
  onSelect: (recipeId: string | null, placeholder?: string) => void
  initialPlaceholder?: string
}) {
  const [search, setSearch] = useState('')
  const [quickAdd, setQuickAdd] = useState(initialPlaceholder || '')

  const isEditing = Boolean(initialPlaceholder)

  const filteredRecipes = recipes.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  const handleQuickAdd = () => {
    if (quickAdd.trim()) {
      onSelect(null, quickAdd.trim())
      setQuickAdd('')
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Meal' : 'Add Meal'}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
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

        <div className="relative">
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
                      {recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
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
                      )}
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
}: RecipePickerProps) {
  // Use a key based on open state and initialPlaceholder to reset form state when dialog opens
  // This is the React-recommended pattern for resetting state based on props
  const contentKey = open ? `open-${initialPlaceholder || 'new'}` : 'closed'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <RecipePickerContent
          key={contentKey}
          recipes={recipes}
          onSelect={onSelect}
          initialPlaceholder={initialPlaceholder}
        />
      </DialogContent>
    </Dialog>
  )
}
