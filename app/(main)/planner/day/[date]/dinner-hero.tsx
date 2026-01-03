'use client'

import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  UtensilsCrossed,
  Clock,
  Users,
  Pencil,
  Plus,
  X,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'

interface Recipe {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  servings: number
  tags: string[]
  type: 'MAIN' | 'SIDE'
  ratings: Array<{
    rating: 'UP' | 'DOWN' | 'NEUTRAL'
    member: { id: string; name: string; role: 'ADULT' | 'CHILD' }
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
  familyMemberId?: string | null
  familyMember?: {
    id: string
    name: string
    role: 'ADULT' | 'CHILD'
  } | null
}

interface FamilyMember {
  id: string
  name: string
  role: 'ADULT' | 'CHILD'
}

interface DinnerHeroProps {
  meal: PlannedMeal | null | undefined
  familyMembers: FamilyMember[]
  alternateMeals?: PlannedMeal[]
  onEditClick: () => void
  onAddSide: () => void
  onRemoveSide: (recipeId: string) => void
  onClear: () => void
  onAddAlternate?: (memberId: string) => void
  onRemoveAlternate?: (mealId: string) => void
}

export function DinnerHero({
  meal,
  familyMembers,
  alternateMeals = [],
  onEditClick,
  onAddSide,
  onRemoveSide,
  onClear,
  onAddAlternate,
  onRemoveAlternate,
}: DinnerHeroProps) {
  const mainRecipe = meal?.recipes?.find((r) => r.role === 'MAIN')?.recipe
  const sideRecipes = meal?.recipes?.filter((r) => r.role === 'SIDE') || []
  const hasContent = mainRecipe || meal?.placeholderTitle

  const isNew = mainRecipe && mainRecipe.ratings.length === 0
  const hasKidDownVotes = mainRecipe?.ratings.some(
    (r) => r.rating === 'DOWN' && r.member.role === 'CHILD'
  )

  // Calculate total time
  const totalTime = mainRecipe
    ? (mainRecipe.prepTimeMinutes || 0) + (mainRecipe.cookTimeMinutes || 0)
    : null

  // Get rating for a specific member
  const getMemberRating = (memberId: string) => {
    return mainRecipe?.ratings.find((r) => r.member.id === memberId)
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <UtensilsCrossed className="h-4 w-4" />
        Tonight&apos;s Dinner
      </h2>

      {hasContent ? (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
          <div className={`flex ${mainRecipe?.imageUrl ? 'flex-col md:flex-row' : ''}`}>
            {/* Recipe Image */}
            {mainRecipe?.imageUrl && (
              <div className="relative w-full md:w-64 lg:w-80 h-48 md:h-auto md:min-h-[200px] flex-shrink-0">
                <Image
                  src={mainRecipe.imageUrl}
                  alt={mainRecipe.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 320px"
                />
              </div>
            )}

            <div className="flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-2xl">
                        {mainRecipe?.title || meal?.placeholderTitle}
                      </CardTitle>
                      {isNew && (
                        <Badge className="gap-1 bg-accent text-accent-foreground">
                          <Sparkles className="h-3 w-3" />
                          New Recipe
                        </Badge>
                      )}
                      {hasKidDownVotes && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Kid Alert
                        </Badge>
                      )}
                    </div>
                    {mainRecipe?.description && (
                      <p className="text-muted-foreground">{mainRecipe.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onEditClick}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Change
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={onClear}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
            {/* Recipe details - only show if we have a full recipe */}
            {mainRecipe && (
              <div className="flex flex-wrap gap-4 text-sm">
                {mainRecipe.prepTimeMinutes && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Prep: {mainRecipe.prepTimeMinutes} min</span>
                  </div>
                )}
                {mainRecipe.cookTimeMinutes && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Cook: {mainRecipe.cookTimeMinutes} min</span>
                  </div>
                )}
                {totalTime && totalTime > 0 && (
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Total: {totalTime} min</span>
                  </div>
                )}
                {mainRecipe.servings && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{mainRecipe.servings} servings</span>
                  </div>
                )}
              </div>
            )}

            {/* Family Ratings - only show if we have ratings */}
            {mainRecipe && mainRecipe.ratings.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Family Ratings</h3>
                <div className="flex flex-wrap gap-2">
                  {familyMembers.map((member) => {
                    const rating = getMemberRating(member.id)
                    return (
                      <div
                        key={member.id}
                        className={`
                          flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                          ${rating?.rating === 'UP'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : rating?.rating === 'DOWN'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-muted text-muted-foreground'
                          }
                        `}
                      >
                        <span className="font-medium">{member.name}</span>
                        {rating?.rating === 'UP' && <ThumbsUp className="h-3.5 w-3.5" />}
                        {rating?.rating === 'DOWN' && <ThumbsDown className="h-3.5 w-3.5" />}
                        {rating?.rating === 'NEUTRAL' && <Minus className="h-3.5 w-3.5" />}
                        {!rating && <span className="text-xs opacity-60">No rating</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Side Dishes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Side Dishes</h3>
                {mainRecipe && (
                  <Button variant="ghost" size="sm" onClick={onAddSide} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add side
                  </Button>
                )}
              </div>

              {sideRecipes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sideRecipes.map((side) => (
                    <Badge
                      key={side.id}
                      variant="secondary"
                      className="gap-1 pr-1 text-sm"
                    >
                      {side.recipe.title}
                      <button
                        onClick={() => onRemoveSide(side.recipe.id)}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No sides planned</p>
              )}
            </div>

            {/* Alternate Meals - for family members eating something different */}
            {onAddAlternate && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Alternate Meals</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        Add alternate
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {familyMembers
                        .filter(m => !alternateMeals.some(am => am.familyMemberId === m.id))
                        .map((member) => (
                          <DropdownMenuItem
                            key={member.id}
                            onClick={() => onAddAlternate(member.id)}
                          >
                            {member.name}
                          </DropdownMenuItem>
                        ))}
                      {familyMembers.filter(m => !alternateMeals.some(am => am.familyMemberId === m.id)).length === 0 && (
                        <DropdownMenuItem disabled>
                          All members have alternates
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {alternateMeals.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {alternateMeals.map((altMeal) => {
                      const altRecipe = altMeal.recipes?.find((r) => r.role === 'MAIN')?.recipe
                      const displayTitle = altRecipe?.title || altMeal.placeholderTitle || 'Unnamed'
                      return (
                        <Badge
                          key={altMeal.id}
                          variant="outline"
                          className="gap-1 pr-1 text-sm"
                        >
                          <span className="font-medium">{altMeal.familyMember?.name}:</span>
                          <span>{displayTitle}</span>
                          {onRemoveAlternate && (
                            <button
                              onClick={() => onRemoveAlternate(altMeal.id)}
                              className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Everyone eating the same thing</p>
                )}
              </div>
            )}
          </CardContent>
            </div>
          </div>
        </Card>
      ) : (
        /* Empty State */
        <Card
          className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer"
          onClick={onEditClick}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <UtensilsCrossed className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No dinner planned</h3>
            <p className="text-muted-foreground mb-4">
              Click to add tonight&apos;s dinner
            </p>
            <Button onClick={onEditClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Dinner
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
