'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Plus, Sparkles, AlertTriangle, Utensils } from 'lucide-react'

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

interface PlannedMealRecipe {
  id: string
  role: 'MAIN' | 'SIDE'
  recipe: Recipe
}

interface PlannedMeal {
  id: string
  dayOfWeek: number
  mealType: 'DINNER' | 'LUNCH'
  placeholderTitle: string | null
  recipes: PlannedMealRecipe[]
}

interface LunchboxItem {
  id: string
  name: string
  category: string | null
  familyMember: {
    id: string
    name: string
    role: 'ADULT' | 'CHILD'
  }
}

interface MemberLunchMeal {
  memberId: string
  memberName: string
  recipeTitle?: string
  placeholderTitle?: string | null
}

interface MealSlotProps {
  label: string
  meal?: PlannedMeal | null
  lunchboxItems?: LunchboxItem[]
  memberLunchMeals?: MemberLunchMeal[]
  onClick: () => void
  onClear?: () => void
  onAddSide?: () => void
  onRemoveSide?: (recipeId: string) => void
}

export function MealSlot({ label, meal, lunchboxItems = [], memberLunchMeals = [], onClick, onClear, onAddSide, onRemoveSide }: MealSlotProps) {
  const mainRecipe = meal?.recipes?.find((r) => r.role === 'MAIN')?.recipe
  const sideRecipes = meal?.recipes?.filter((r) => r.role === 'SIDE') || []

  const hasKidDownVotes = mainRecipe?.ratings.some(
    (r) => r.rating === 'DOWN' && r.member.role === 'CHILD'
  )
  const isNew = mainRecipe && mainRecipe.ratings.length === 0

  const isLunch = label.toLowerCase() === 'lunch'
  const hasMainOrPlaceholder = mainRecipe || meal?.placeholderTitle
  const hasLunchboxItems = lunchboxItems.length > 0
  const hasMemberLunchMeals = memberLunchMeals.length > 0

  return (
    <div className="group">
      <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Utensils className="h-3 w-3" />
          {label}
        </span>
        {onClear && meal && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
        className={`
          w-full text-left p-3 rounded-xl border-2 border-dashed cursor-pointer
          min-h-[52px] transition-all duration-200
          ${hasMainOrPlaceholder || hasLunchboxItems || hasMemberLunchMeals
            ? 'border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card'
            : 'border-border/40 bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
          }
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        `}
      >
        {/* Empty state */}
        {!hasMainOrPlaceholder && !hasLunchboxItems && !hasMemberLunchMeals && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            Add {label.toLowerCase()}
          </span>
        )}

        {/* Dinner: Recipe display */}
        {!isLunch && hasMainOrPlaceholder && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-tight text-foreground">
              {mainRecipe?.title || meal?.placeholderTitle}
            </p>

            {/* Sides display */}
            {sideRecipes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {sideRecipes.map((side) => (
                  <span
                    key={side.id}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded"
                  >
                    {side.recipe.title}
                    {onRemoveSide && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveSide(side.recipe.id)
                        }}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-1">
              {isNew && (
                <Badge
                  variant="secondary"
                  className="h-5 gap-0.5 text-[10px] bg-accent/60 text-accent-foreground border-0"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  New
                </Badge>
              )}
              {hasKidDownVotes && (
                <Badge
                  variant="destructive"
                  className="h-5 gap-0.5 text-[10px] bg-destructive/10 text-destructive border-0"
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Lunch: Per-member meals and lunchbox items */}
        {isLunch && (hasMemberLunchMeals || hasLunchboxItems) && (
          <div className="space-y-1">
            {/* Combine member meals with lunchbox items by member */}
            {(() => {
              // Create a map of member info
              const memberInfo: Record<string, { name: string; recipe?: string; itemCount: number }> = {}

              // Add recipe info
              memberLunchMeals.forEach((m) => {
                memberInfo[m.memberId] = {
                  name: m.memberName,
                  recipe: m.recipeTitle || m.placeholderTitle || undefined,
                  itemCount: 0,
                }
              })

              // Add item counts
              lunchboxItems.forEach((item) => {
                if (!memberInfo[item.familyMember.id]) {
                  memberInfo[item.familyMember.id] = {
                    name: item.familyMember.name,
                    itemCount: 0,
                  }
                }
                memberInfo[item.familyMember.id].itemCount++
              })

              return Object.entries(memberInfo).map(([memberId, info]) => (
                <div key={memberId} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{info.name}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {info.recipe
                      ? info.itemCount > 0
                        ? `${info.recipe} + ${info.itemCount}`
                        : info.recipe
                      : `${info.itemCount} ${info.itemCount === 1 ? 'item' : 'items'}`}
                  </span>
                </div>
              ))
            })()}
          </div>
        )}
      </div>

      {/* Add side button - only show when there's a main */}
      {hasMainOrPlaceholder && mainRecipe && onAddSide && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddSide()
          }}
          className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary py-1 transition-colors"
        >
          <Plus className="h-2.5 w-2.5" />
          Add side
        </button>
      )}
    </div>
  )
}
