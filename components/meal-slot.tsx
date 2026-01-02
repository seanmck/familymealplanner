'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Plus, Sparkles, AlertTriangle, Utensils } from 'lucide-react'

interface Recipe {
  id: string
  title: string
  tags: string[]
  ratings: Array<{
    rating: 'UP' | 'DOWN' | 'NEUTRAL'
    member: { name: string; role: 'ADULT' | 'CHILD' }
  }>
}

interface PlannedMeal {
  id: string
  dayOfWeek: number
  mealType: 'DINNER' | 'LUNCH'
  placeholderTitle: string | null
  recipe: Recipe | null
}

interface MealSlotProps {
  label: string
  meal?: PlannedMeal | null
  onClick: () => void
  onClear?: () => void
}

export function MealSlot({ label, meal, onClick, onClear }: MealSlotProps) {
  const hasKidDownVotes = meal?.recipe?.ratings.some(
    (r) => r.rating === 'DOWN' && r.member.role === 'CHILD'
  )
  const isNew = meal?.recipe && meal.recipe.ratings.length === 0

  const isDinner = label.toLowerCase() === 'dinner'

  return (
    <div className="group">
      <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Utensils className="h-3 w-3" />
          {label}
        </span>
        {onClear && (
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

      <button
        onClick={onClick}
        className={`
          w-full text-left p-3 rounded-xl border-2 border-dashed
          min-h-[52px] transition-all duration-200
          ${meal
            ? 'border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card'
            : 'border-border/40 bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
          }
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        `}
      >
        {meal ? (
          <div className="space-y-1.5">
            <p className={`text-sm font-medium leading-tight ${isDinner ? 'text-foreground' : 'text-muted-foreground'}`}>
              {meal.recipe?.title || meal.placeholderTitle}
            </p>
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
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            Add {label.toLowerCase()}
          </span>
        )}
      </button>
    </div>
  )
}
