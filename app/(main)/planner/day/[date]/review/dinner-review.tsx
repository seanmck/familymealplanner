'use client'

import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RatingGrid } from './rating-grid'
import { FeedbackInput } from './feedback-input'
import { LeftoversToggle } from './leftovers-toggle'
import { UtensilsCrossed } from 'lucide-react'

interface Recipe {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  type: 'MAIN' | 'SIDE'
  ratings: Array<{
    id: string
    rating: 'UP' | 'DOWN' | 'NEUTRAL'
    member: { id: string; name: string; role: 'ADULT' | 'CHILD' }
  }>
}

interface PlannedMealRecipe {
  id: string
  role: 'MAIN' | 'SIDE'
  recipe: Recipe
}

interface MealFeedback {
  id: string
  content: string
  familyMemberId: string | null
  familyMember: { id: string; name: string; role: 'ADULT' | 'CHILD' } | null
}

interface PlannedMeal {
  id: string
  dayOfWeek: number
  mealType: 'DINNER' | 'LUNCH'
  placeholderTitle: string | null
  hasLeftovers: boolean
  leftoversQuantity: string | null
  recipes: PlannedMealRecipe[]
  feedback: MealFeedback[]
}

interface FamilyMember {
  id: string
  name: string
  role: 'ADULT' | 'CHILD'
}

interface DinnerReviewProps {
  meal: PlannedMeal
  familyMembers: FamilyMember[]
  selfMemberId?: string | null
  onUpdate?: () => void
}

export function DinnerReview({ meal, familyMembers, selfMemberId, onUpdate }: DinnerReviewProps) {
  const mainRecipe = meal.recipes.find((r) => r.role === 'MAIN')?.recipe
  const sideRecipes = meal.recipes.filter((r) => r.role === 'SIDE').map((r) => r.recipe)

  // If it's a placeholder meal (no recipe)
  if (!mainRecipe && meal.placeholderTitle) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 border-b">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <UtensilsCrossed className="h-7 w-7 text-slate-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5 text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wide">Dinner</span>
              </div>
              <CardTitle className="text-lg">{meal.placeholderTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">Quick meal / Takeout</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Feedback Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Notes</h4>
            <div className="bg-muted/30 rounded-lg p-4">
              <FeedbackInput
                plannedMealId={meal.id}
                existingFeedback={meal.feedback}
                onUpdate={onUpdate}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No recipe at all
  if (!mainRecipe) {
    return null
  }

  return (
    <Card className="overflow-hidden">
      {/* Hero image header */}
      {mainRecipe.imageUrl ? (
        <div className="relative h-48 w-full">
          <Image
            src={mainRecipe.imageUrl}
            alt={mainRecipe.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <div className="flex items-center gap-2 mb-1 text-white/80">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="text-sm font-medium">Dinner</span>
            </div>
            <h3 className="text-xl font-semibold">{mainRecipe.title}</h3>
            {sideRecipes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {sideRecipes.map((side) => (
                  <Badge key={side.id} variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    + {side.title}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10 border-b">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <UtensilsCrossed className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5 text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wide">Dinner</span>
              </div>
              <CardTitle className="text-lg">{mainRecipe.title}</CardTitle>
              {sideRecipes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {sideRecipes.map((side) => (
                    <Badge key={side.id} variant="secondary" className="text-xs">
                      + {side.title}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className={mainRecipe.imageUrl ? "pt-6 space-y-6" : "space-y-6"}>
        {/* Ratings & Per-Person Feedback Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">How did everyone like it?</h4>
          <RatingGrid
            recipeId={mainRecipe.id}
            plannedMealId={meal.id}
            familyMembers={familyMembers}
            selfMemberId={selfMemberId}
            existingRatings={mainRecipe.ratings}
            existingFeedback={meal.feedback}
            onUpdate={onUpdate}
          />
        </div>

        {/* Leftovers & General Notes row */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Leftovers Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Leftovers?</h4>
            <div className="bg-muted/30 rounded-lg p-4 h-[calc(100%-2rem)]">
              <LeftoversToggle
                plannedMealId={meal.id}
                hasLeftovers={meal.hasLeftovers}
                leftoversQuantity={meal.leftoversQuantity}
                onUpdate={onUpdate}
              />
            </div>
          </div>

          {/* General Notes Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">General Notes</h4>
            <div className="bg-muted/30 rounded-lg p-4">
              <FeedbackInput
                plannedMealId={meal.id}
                existingFeedback={meal.feedback}
                onUpdate={onUpdate}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
