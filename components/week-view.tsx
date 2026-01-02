'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MealSlot } from '@/components/meal-slot'
import { RecipePicker } from '@/components/recipe-picker'
import { getMonday, formatWeekRange, addWeeks, DAYS_OF_WEEK } from '@/lib/utils/dates'
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, UtensilsCrossed, Sparkles, AlertTriangle, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

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

interface MealPlan {
  id: string
  plannedMeals: PlannedMeal[]
}

interface WeekViewProps {
  recipes: Recipe[]
}

export function WeekView({ recipes }: WeekViewProps) {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{
    dayOfWeek: number
    mealType: 'DINNER' | 'LUNCH'
    existingPlaceholder?: string
    mode: 'main' | 'side'
    plannedMealId?: string
  } | null>(null)

  useEffect(() => {
    fetchMealPlan()
  }, [weekStart])

  const fetchMealPlan = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/meal-plans?weekStart=${weekStart.toISOString()}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch meal plan')
      }
      const data = await response.json()
      setMealPlan(data)
    } catch (error) {
      console.error('Failed to fetch meal plan:', error)
      setMealPlan(null)
    } finally {
      setIsLoading(false)
    }
  }

  const createMealPlan = async () => {
    try {
      const response = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStartDate: weekStart.toISOString() }),
      })
      if (!response.ok) {
        throw new Error('Failed to create meal plan')
      }
      const data = await response.json()
      setMealPlan(data)
      return data.id
    } catch (error) {
      console.error('Failed to create meal plan:', error)
      return null
    }
  }

  const handleSlotClick = (dayOfWeek: number, mealType: 'DINNER' | 'LUNCH') => {
    const existingMeal = getMealForSlot(dayOfWeek, mealType)
    // If it's a quick-add meal (no recipe but has placeholder), pass the placeholder for editing
    const existingPlaceholder = existingMeal && existingMeal.recipes.length === 0 && existingMeal.placeholderTitle
      ? existingMeal.placeholderTitle
      : undefined
    setSelectedSlot({
      dayOfWeek,
      mealType,
      existingPlaceholder,
      mode: 'main',
      plannedMealId: existingMeal?.id,
    })
    setPickerOpen(true)
  }

  const handleAddSide = (dayOfWeek: number, mealType: 'DINNER' | 'LUNCH') => {
    const existingMeal = getMealForSlot(dayOfWeek, mealType)
    if (!existingMeal) return

    setSelectedSlot({
      dayOfWeek,
      mealType,
      mode: 'side',
      plannedMealId: existingMeal.id,
    })
    setPickerOpen(true)
  }

  const handleSelectRecipe = async (recipeId: string | null, placeholder?: string) => {
    if (!selectedSlot) return

    let planId = mealPlan?.id
    if (!planId) {
      planId = await createMealPlan()
      if (!planId) return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/planned-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealPlanId: planId,
          recipeId,
          placeholderTitle: placeholder || null,
          dayOfWeek: selectedSlot.dayOfWeek,
          mealType: selectedSlot.mealType,
          role: selectedSlot.mode === 'side' ? 'SIDE' : 'MAIN',
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to save meal')
      }

      setPickerOpen(false)
      setSelectedSlot(null)
      fetchMealPlan()
      router.refresh()
    } catch (error) {
      console.error('Failed to save meal:', error)
      alert('Failed to save meal. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveSide = async (plannedMealId: string, recipeId: string) => {
    try {
      const response = await fetch(`/api/planned-meals/${plannedMealId}/recipes/${recipeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove side')
      }

      fetchMealPlan()
      router.refresh()
    } catch (error) {
      console.error('Failed to remove side:', error)
    }
  }

  const handleClearSlot = async (plannedMealId: string) => {
    try {
      await fetch(`/api/planned-meals/${plannedMealId}`, {
        method: 'DELETE',
      })
      fetchMealPlan()
      router.refresh()
    } catch (error) {
      console.error('Failed to clear meal:', error)
    }
  }

  const getMealForSlot = (dayOfWeek: number, mealType: 'DINNER' | 'LUNCH') => {
    return mealPlan?.plannedMeals.find(
      (m) => m.dayOfWeek === dayOfWeek && m.mealType === mealType
    )
  }

  const isCurrentWeek = () => {
    const today = getMonday(new Date())
    return weekStart.getTime() === today.getTime()
  }

  const today = new Date()
  const todayDayOfWeek = (today.getDay() + 6) % 7 // Convert Sunday=0 to Monday=0

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addWeeks(weekStart, -1))}
            className="h-9 w-9 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3 px-4">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{formatWeekRange(weekStart)}</h2>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="h-9 w-9 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isCurrentWeek() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="text-primary hover:text-primary"
          >
            Back to this week
          </Button>
        )}
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm">Loading your meal plan...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Weekdays Row */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Weekdays</h3>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
              {DAYS_OF_WEEK.slice(0, 5).map((day, index) => {
                const dinnerMeal = getMealForSlot(index, 'DINNER')
                const lunchMeal = getMealForSlot(index, 'LUNCH')
                const dayDate = new Date(weekStart)
                dayDate.setDate(weekStart.getDate() + index)

                const isToday = isCurrentWeek() && index === todayDayOfWeek
                const isPast = isCurrentWeek() && index < todayDayOfWeek

                return (
                  <Card
                    key={day}
                    className={`
                      min-h-[220px] overflow-hidden transition-all duration-200
                      ${isToday
                        ? 'border-primary/50 bg-primary/5 shadow-md shadow-primary/10'
                        : isPast
                          ? 'opacity-60 bg-muted/30'
                          : 'border-border/60 hover:border-border'
                      }
                    `}
                  >
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                          {day}
                        </span>
                        <Badge
                          variant={isToday ? 'default' : 'outline'}
                          className={`
                            h-7 w-7 rounded-full p-0 flex items-center justify-center text-xs font-medium
                            ${isToday
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-transparent border-border/60'
                            }
                          `}
                        >
                          {dayDate.getDate()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 px-3 pb-3">
                      <MealSlot
                        label="Dinner"
                        meal={dinnerMeal}
                        onClick={() => handleSlotClick(index, 'DINNER')}
                        onClear={
                          dinnerMeal
                            ? () => handleClearSlot(dinnerMeal.id)
                            : undefined
                        }
                        onAddSide={() => handleAddSide(index, 'DINNER')}
                        onRemoveSide={
                          dinnerMeal
                            ? (recipeId) => handleRemoveSide(dinnerMeal.id, recipeId)
                            : undefined
                        }
                      />
                      <MealSlot
                        label="Lunch"
                        meal={lunchMeal}
                        onClick={() => handleSlotClick(index, 'LUNCH')}
                        onClear={
                          lunchMeal
                            ? () => handleClearSlot(lunchMeal.id)
                            : undefined
                        }
                        onAddSide={() => handleAddSide(index, 'LUNCH')}
                        onRemoveSide={
                          lunchMeal
                            ? (recipeId) => handleRemoveSide(lunchMeal.id, recipeId)
                            : undefined
                        }
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Weekend Row */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Weekend</h3>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {DAYS_OF_WEEK.slice(5).map((day, sliceIndex) => {
                const index = sliceIndex + 5
                const dinnerMeal = getMealForSlot(index, 'DINNER')
                const lunchMeal = getMealForSlot(index, 'LUNCH')
                const dayDate = new Date(weekStart)
                dayDate.setDate(weekStart.getDate() + index)

                const isToday = isCurrentWeek() && index === todayDayOfWeek
                const isPast = isCurrentWeek() && index < todayDayOfWeek

                return (
                  <Card
                    key={day}
                    className={`
                      min-h-[220px] overflow-hidden transition-all duration-200
                      ${isToday
                        ? 'border-primary/50 bg-primary/5 shadow-md shadow-primary/10'
                        : isPast
                          ? 'opacity-60 bg-muted/30'
                          : 'border-border/60 hover:border-border'
                      }
                    `}
                  >
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                          {day}
                        </span>
                        <Badge
                          variant={isToday ? 'default' : 'outline'}
                          className={`
                            h-7 w-7 rounded-full p-0 flex items-center justify-center text-xs font-medium
                            ${isToday
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-transparent border-border/60'
                            }
                          `}
                        >
                          {dayDate.getDate()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 px-3 pb-3">
                      <MealSlot
                        label="Dinner"
                        meal={dinnerMeal}
                        onClick={() => handleSlotClick(index, 'DINNER')}
                        onClear={
                          dinnerMeal
                            ? () => handleClearSlot(dinnerMeal.id)
                            : undefined
                        }
                        onAddSide={() => handleAddSide(index, 'DINNER')}
                        onRemoveSide={
                          dinnerMeal
                            ? (recipeId) => handleRemoveSide(dinnerMeal.id, recipeId)
                            : undefined
                        }
                      />
                      <MealSlot
                        label="Lunch"
                        meal={lunchMeal}
                        onClick={() => handleSlotClick(index, 'LUNCH')}
                        onClear={
                          lunchMeal
                            ? () => handleClearSlot(lunchMeal.id)
                            : undefined
                        }
                        onAddSide={() => handleAddSide(index, 'LUNCH')}
                        onRemoveSide={
                          lunchMeal
                            ? (recipeId) => handleRemoveSide(lunchMeal.id, recipeId)
                            : undefined
                        }
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Weekly Summary */}
          <WeeklySummary mealPlan={mealPlan} />
        </div>
      )}

      <RecipePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        recipes={recipes}
        onSelect={handleSelectRecipe}
        initialPlaceholder={selectedSlot?.existingPlaceholder}
        filterType={selectedSlot?.mode === 'side' ? 'SIDE' : null}
      />
    </div>
  )
}

function WeeklySummary({ mealPlan }: { mealPlan: MealPlan | null }) {
  const meals = mealPlan?.plannedMeals || []
  const totalSlots = 14 // 7 days × 2 meals
  const plannedCount = meals.length
  const newRecipes = meals.filter(
    (m) => m.recipes.some((r) => r.role === 'MAIN' && r.recipe.ratings.length === 0)
  ).length
  const kidWarnings = meals.filter((m) =>
    m.recipes.some((r) =>
      r.recipe.ratings.some((rating) => rating.rating === 'DOWN' && rating.member.role === 'CHILD')
    )
  ).length

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">This Week</h3>
      <Card className="border-border/60">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <UtensilsCrossed className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{plannedCount} of {totalSlots}</p>
                  <p className="text-xs text-muted-foreground">meals planned</p>
                </div>
              </div>

              {newRecipes > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/50">
                    <Sparkles className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{newRecipes}</p>
                    <p className="text-xs text-muted-foreground">new to try</p>
                  </div>
                </div>
              )}

              {kidWarnings > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{kidWarnings}</p>
                    <p className="text-xs text-muted-foreground">kid warnings</p>
                  </div>
                </div>
              )}
            </div>

            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/groceries">
                <ShoppingCart className="h-4 w-4" />
                View grocery list
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
