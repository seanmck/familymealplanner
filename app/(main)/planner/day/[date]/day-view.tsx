'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RecipePicker } from '@/components/recipe-picker'
import { LunchboxPicker, type LunchboxItem, type FamilyMember, type LunchboxSuggestion } from '@/components/lunchbox-picker'
import { DinnerHero } from './dinner-hero'
import { LunchGrid } from './lunch-grid'
import {
  getMonday,
  getDayOfWeek,
  formatDayDisplay,
  formatDateString,
  parseDateString,
  addDays,
  DAYS_OF_WEEK,
} from '@/lib/utils/dates'
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, ClipboardCheck } from 'lucide-react'

interface Recipe {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  sourceUrl: string | null
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

interface MealPlan {
  id: string
  plannedMeals: PlannedMeal[]
  lunchboxItems: LunchboxItem[]
}

interface DayViewProps {
  date: string
  recipes: Recipe[]
  familyMembers: FamilyMember[]
}

export function DayView({ date, recipes, familyMembers }: DayViewProps) {
  const router = useRouter()
  const currentDate = parseDateString(date)!
  const dayOfWeek = getDayOfWeek(currentDate)
  const weekStart = getMonday(currentDate)
  const weekStartIso = weekStart.toISOString()

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{
    mealType: 'DINNER' | 'LUNCH'
    existingPlaceholder?: string
    mode: 'main' | 'side'
    plannedMealId?: string
    familyMemberId?: string
  } | null>(null)

  // Lunchbox picker state
  const [lunchboxPickerOpen, setLunchboxPickerOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>()
  const [lunchboxSuggestions, setLunchboxSuggestions] = useState<LunchboxSuggestion[]>([])

  useEffect(() => {
    fetchMealPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartIso])

  useEffect(() => {
    fetchLunchboxSuggestions()
  }, [])

  const fetchLunchboxSuggestions = async () => {
    try {
      const response = await fetch('/api/lunchbox-items/suggestions')
      if (response.ok) {
        const data = await response.json()
        setLunchboxSuggestions(data)
      }
    } catch (error) {
      console.debug('Failed to fetch lunchbox suggestions:', error)
    }
  }

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

  const ensureMealPlan = async () => {
    if (mealPlan?.id) return mealPlan.id
    return await createMealPlan()
  }

  // Get dinner meal for this day (shared, no familyMemberId)
  const getDinnerMeal = () => {
    return mealPlan?.plannedMeals.find(
      (m) => m.dayOfWeek === dayOfWeek && m.mealType === 'DINNER' && !m.familyMemberId
    )
  }

  // Get per-member lunch meals for this day
  const getMemberLunchMeals = () => {
    return mealPlan?.plannedMeals.filter(
      (m) => m.dayOfWeek === dayOfWeek && m.mealType === 'LUNCH' && m.familyMemberId
    ) || []
  }

  // Get per-member alternate dinner meals for this day
  const getAlternateDinnerMeals = () => {
    return mealPlan?.plannedMeals.filter(
      (m) => m.dayOfWeek === dayOfWeek && m.mealType === 'DINNER' && m.familyMemberId
    ) || []
  }

  // Get a specific member's lunch meal
  const getMemberLunchMeal = (memberId: string) => {
    return mealPlan?.plannedMeals.find(
      (m) => m.dayOfWeek === dayOfWeek && m.mealType === 'LUNCH' && m.familyMemberId === memberId
    )
  }

  // Get lunchbox items for this day
  const getLunchboxItems = () => {
    return mealPlan?.lunchboxItems?.filter((item) => item.dayOfWeek === dayOfWeek) || []
  }

  // Handle clicking edit on dinner
  const handleDinnerEdit = () => {
    const existingMeal = getDinnerMeal()
    const existingPlaceholder = existingMeal && existingMeal.recipes.length === 0 && existingMeal.placeholderTitle
      ? existingMeal.placeholderTitle
      : undefined
    setSelectedSlot({
      mealType: 'DINNER',
      existingPlaceholder,
      mode: 'main',
      plannedMealId: existingMeal?.id,
    })
    setPickerOpen(true)
  }

  const handleAddSide = () => {
    const existingMeal = getDinnerMeal()
    if (!existingMeal) return
    setSelectedSlot({
      mealType: 'DINNER',
      mode: 'side',
      plannedMealId: existingMeal.id,
    })
    setPickerOpen(true)
  }

  const handleRemoveSide = async (recipeId: string) => {
    const dinnerMeal = getDinnerMeal()
    if (!dinnerMeal) return
    try {
      const response = await fetch(`/api/planned-meals/${dinnerMeal.id}/recipes/${recipeId}`, {
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

  const handleClearDinner = async () => {
    const dinnerMeal = getDinnerMeal()
    if (!dinnerMeal) return
    try {
      await fetch(`/api/planned-meals/${dinnerMeal.id}`, {
        method: 'DELETE',
      })
      fetchMealPlan()
      router.refresh()
    } catch (error) {
      console.error('Failed to clear meal:', error)
    }
  }

  // Handle member lunch click - open lunchbox picker for that member
  const handleMemberLunchClick = async (memberId: string) => {
    await ensureMealPlan()
    setSelectedMemberId(memberId)
    setLunchboxPickerOpen(true)
  }

  // Handle adding a recipe for a member's lunch
  const handleMemberRecipeClick = (memberId: string) => {
    const existingMeal = getMemberLunchMeal(memberId)
    const existingPlaceholder = existingMeal && existingMeal.recipes.length === 0 && existingMeal.placeholderTitle
      ? existingMeal.placeholderTitle
      : undefined
    setSelectedSlot({
      mealType: 'LUNCH',
      existingPlaceholder,
      mode: 'main',
      plannedMealId: existingMeal?.id,
      familyMemberId: memberId,
    })
    setPickerOpen(true)
  }

  // Handle adding an alternate dinner for a specific member
  const handleAddAlternateDinner = (memberId: string) => {
    const existingMeal = getAlternateDinnerMeals().find(m => m.familyMemberId === memberId)
    const existingPlaceholder = existingMeal && existingMeal.recipes.length === 0 && existingMeal.placeholderTitle
      ? existingMeal.placeholderTitle
      : undefined
    setSelectedSlot({
      mealType: 'DINNER',
      existingPlaceholder,
      mode: 'main',
      plannedMealId: existingMeal?.id,
      familyMemberId: memberId,
    })
    setPickerOpen(true)
  }

  // Handle removing an alternate dinner meal
  const handleRemoveAlternateDinner = async (mealId: string) => {
    try {
      await fetch(`/api/planned-meals/${mealId}`, {
        method: 'DELETE',
      })
      fetchMealPlan()
      router.refresh()
    } catch (error) {
      console.error('Failed to remove alternate dinner:', error)
    }
  }

  const handleSelectRecipe = async (recipeId: string | null, placeholder?: string) => {
    if (!selectedSlot) return

    let planId = mealPlan?.id
    if (!planId) {
      planId = await createMealPlan()
      if (!planId) return
    }

    try {
      const response = await fetch('/api/planned-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealPlanId: planId,
          recipeId,
          placeholderTitle: placeholder || null,
          dayOfWeek,
          mealType: selectedSlot.mealType,
          role: selectedSlot.mode === 'side' ? 'SIDE' : 'MAIN',
          familyMemberId: selectedSlot.familyMemberId || null,
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
    }
  }

  // Navigation
  const navigateToDay = (newDate: Date) => {
    router.push(`/planner/day/${formatDateString(newDate)}`)
  }

  const goToPrevDay = () => navigateToDay(addDays(currentDate, -1))
  const goToNextDay = () => navigateToDay(addDays(currentDate, 1))

  // Check if this is today or past
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday = formatDateString(currentDate) === formatDateString(today)
  const isPastOrToday = currentDate <= today

  return (
    <div className="space-y-8">
      {/* Day Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevDay}
            className="h-9 w-9 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3 px-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">
                {DAYS_OF_WEEK[dayOfWeek]}
                {isToday && (
                  <span className="ml-2 text-sm font-normal text-primary">(Today)</span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatDayDisplay(currentDate)}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNextDay}
            className="h-9 w-9 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Show Review Day button for today or past days with content */}
          {isPastOrToday && (getDinnerMeal() || getLunchboxItems().length > 0) && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/planner/day/${date}/review`} className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Review Day
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/planner" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Back to week
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Dinner Hero Section */}
          <DinnerHero
            meal={getDinnerMeal()}
            familyMembers={familyMembers}
            alternateMeals={getAlternateDinnerMeals()}
            onEditClick={handleDinnerEdit}
            onAddSide={handleAddSide}
            onRemoveSide={handleRemoveSide}
            onClear={handleClearDinner}
            onAddAlternate={handleAddAlternateDinner}
            onRemoveAlternate={handleRemoveAlternateDinner}
          />

          {/* Family Lunches Grid */}
          <LunchGrid
            familyMembers={familyMembers}
            memberLunchMeals={getMemberLunchMeals()}
            lunchboxItems={getLunchboxItems()}
            onMemberClick={handleMemberLunchClick}
            onMemberRecipeClick={handleMemberRecipeClick}
          />
        </div>
      )}

      {/* Recipe Picker Dialog */}
      <RecipePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        recipes={recipes}
        onSelect={handleSelectRecipe}
        initialPlaceholder={selectedSlot?.existingPlaceholder}
        filterType={selectedSlot?.mode === 'side' ? 'SIDE' : null}
      />

      {/* Lunchbox Picker Dialog */}
      <LunchboxPicker
        open={lunchboxPickerOpen}
        onOpenChange={setLunchboxPickerOpen}
        dayOfWeek={dayOfWeek}
        mealPlanId={mealPlan?.id || ''}
        familyMembers={familyMembers}
        existingItems={mealPlan?.lunchboxItems || []}
        suggestions={lunchboxSuggestions}
        onRefresh={async () => {
          if (!mealPlan?.id) {
            await ensureMealPlan()
          }
          fetchMealPlan()
        }}
        initialMemberId={selectedMemberId}
      />
    </div>
  )
}
