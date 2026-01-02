'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MealSlot } from '@/components/meal-slot'
import { RecipePicker } from '@/components/recipe-picker'
import { LunchboxPicker, type LunchboxItem, type FamilyMember } from '@/components/lunchbox-picker'
import { PlannerSuggestions } from '@/components/planner-suggestions'
import { getMonday, formatWeekRange, addWeeks, formatDateString, DAYS_OF_WEEK } from '@/lib/utils/dates'
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, UtensilsCrossed, Sparkles, AlertTriangle, ShoppingCart, Utensils, Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface WeekViewProps {
  recipes: Recipe[]
  familyMembers: FamilyMember[]
}

export function WeekView({ recipes, familyMembers }: WeekViewProps) {
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
    familyMemberId?: string
  } | null>(null)

  // Lunchbox picker state
  const [lunchboxPickerOpen, setLunchboxPickerOpen] = useState(false)
  const [selectedLunchDay, setSelectedLunchDay] = useState<number>(0)

  // Lunch choice dialog state
  const [lunchChoiceOpen, setLunchChoiceOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined)
  // Per-member lunch dialog (shows after selecting a member)
  const [memberLunchOpen, setMemberLunchOpen] = useState(false)

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

  const handleSlotClick = async (dayOfWeek: number, mealType: 'DINNER' | 'LUNCH') => {
    // For lunch, show choice dialog (recipe vs lunchbox items)
    if (mealType === 'LUNCH') {
      // Ensure meal plan exists before opening picker
      if (!mealPlan?.id) {
        await createMealPlan()
      }
      setSelectedLunchDay(dayOfWeek)
      setLunchChoiceOpen(true)
      return
    }

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

  // Get shared meal for a slot (dinner or shared lunch - no familyMemberId)
  const getMealForSlot = (dayOfWeek: number, mealType: 'DINNER' | 'LUNCH') => {
    return mealPlan?.plannedMeals.find(
      (m) => m.dayOfWeek === dayOfWeek && m.mealType === mealType && !m.familyMemberId
    )
  }

  // Get all per-person lunch meals for a day
  const getMemberLunchMeals = (dayOfWeek: number) => {
    return mealPlan?.plannedMeals.filter(
      (m) => m.dayOfWeek === dayOfWeek && m.mealType === 'LUNCH' && m.familyMemberId
    ) || []
  }

  const getLunchboxItemsForDay = (dayOfWeek: number) => {
    return mealPlan?.lunchboxItems?.filter((item) => item.dayOfWeek === dayOfWeek) || []
  }

  // Get a specific family member's lunch meal for a day
  const getMemberLunchMeal = (dayOfWeek: number, memberId: string) => {
    return mealPlan?.plannedMeals.find(
      (m) => m.dayOfWeek === dayOfWeek && m.mealType === 'LUNCH' && m.familyMemberId === memberId
    )
  }

  // Handle clicking a family member in the lunch dialog
  const handleMemberClick = (memberId: string) => {
    setSelectedMemberId(memberId)
    setLunchChoiceOpen(false)
    setMemberLunchOpen(true)
  }

  // Handle adding recipe for a specific member's lunch
  const handleMemberRecipeChoice = () => {
    if (!selectedMemberId) return
    const existingMeal = getMemberLunchMeal(selectedLunchDay, selectedMemberId)
    const existingPlaceholder = existingMeal && existingMeal.recipes.length === 0 && existingMeal.placeholderTitle
      ? existingMeal.placeholderTitle
      : undefined
    setSelectedSlot({
      dayOfWeek: selectedLunchDay,
      mealType: 'LUNCH',
      existingPlaceholder,
      mode: 'main',
      plannedMealId: existingMeal?.id,
      familyMemberId: selectedMemberId,
    })
    setMemberLunchOpen(false)
    setPickerOpen(true)
  }

  // Handle adding lunchbox items for a specific member
  const handleMemberLunchboxChoice = () => {
    setMemberLunchOpen(false)
    setLunchboxPickerOpen(true)
  }

  // Ensure meal plan exists for lunchbox items
  const ensureMealPlan = async () => {
    if (mealPlan?.id) return mealPlan.id
    return await createMealPlan()
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
                    <Link href={`/planner/day/${formatDateString(dayDate)}`}>
                      <CardHeader className="pb-2 pt-3 px-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
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
                    </Link>
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
                        lunchboxItems={getLunchboxItemsForDay(index)}
                        memberLunchMeals={getMemberLunchMeals(index).map((m) => ({
                          memberId: m.familyMemberId!,
                          memberName: m.familyMember?.name || '',
                          recipeTitle: m.recipes?.find((r) => r.role === 'MAIN')?.recipe.title,
                          placeholderTitle: m.placeholderTitle,
                        }))}
                        onClick={() => handleSlotClick(index, 'LUNCH')}
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
                    <Link href={`/planner/day/${formatDateString(dayDate)}`}>
                      <CardHeader className="pb-2 pt-3 px-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
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
                    </Link>
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
                        lunchboxItems={getLunchboxItemsForDay(index)}
                        memberLunchMeals={getMemberLunchMeals(index).map((m) => ({
                          memberId: m.familyMemberId!,
                          memberName: m.familyMember?.name || '',
                          recipeTitle: m.recipes?.find((r) => r.role === 'MAIN')?.recipe.title,
                          placeholderTitle: m.placeholderTitle,
                        }))}
                        onClick={() => handleSlotClick(index, 'LUNCH')}
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Weekly Summary */}
          <WeeklySummary mealPlan={mealPlan} />

          {/* Recipe Suggestions */}
          <PlannerSuggestions />
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

      <LunchboxPicker
        open={lunchboxPickerOpen}
        onOpenChange={setLunchboxPickerOpen}
        dayOfWeek={selectedLunchDay}
        mealPlanId={mealPlan?.id || ''}
        familyMembers={familyMembers}
        existingItems={mealPlan?.lunchboxItems || []}
        onRefresh={async () => {
          // Ensure meal plan exists before refreshing
          if (!mealPlan?.id) {
            await ensureMealPlan()
          }
          fetchMealPlan()
        }}
        initialMemberId={selectedMemberId}
      />

      {/* Lunch: Select Family Member Dialog */}
      <Dialog open={lunchChoiceOpen} onOpenChange={setLunchChoiceOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>{DAYS_OF_WEEK[selectedLunchDay]} Lunch</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Who&apos;s lunch are you planning?</p>
            {familyMembers.map((member) => {
              const memberMeal = getMemberLunchMeal(selectedLunchDay, member.id)
              const memberItems = getLunchboxItemsForDay(selectedLunchDay).filter(
                item => item.familyMember.id === member.id
              )
              const mainRecipe = memberMeal?.recipes?.find(r => r.role === 'MAIN')?.recipe
              return (
                <Button
                  key={member.id}
                  variant="outline"
                  className="w-full h-auto py-3 px-3 justify-start gap-3"
                  onClick={() => handleMemberClick(member.id)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-medium">
                    {member.name.charAt(0)}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{member.name}</p>
                      {member.role === 'CHILD' && (
                        <Badge variant="secondary" className="h-4 text-[9px] px-1">
                          Child
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {mainRecipe?.title || memberMeal?.placeholderTitle
                        ? `${mainRecipe?.title || memberMeal?.placeholderTitle}${memberItems.length > 0 ? ` + ${memberItems.length} items` : ''}`
                        : memberItems.length > 0
                          ? `${memberItems.length} ${memberItems.length === 1 ? 'item' : 'items'}`
                          : 'Nothing planned yet'}
                    </p>
                  </div>
                </Button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lunch: Per-Member Options Dialog */}
      <Dialog open={memberLunchOpen} onOpenChange={setMemberLunchOpen}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>
              {familyMembers.find(m => m.id === selectedMemberId)?.name}&apos;s Lunch
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {(() => {
              const memberMeal = selectedMemberId ? getMemberLunchMeal(selectedLunchDay, selectedMemberId) : null
              const mainRecipe = memberMeal?.recipes?.find(r => r.role === 'MAIN')?.recipe
              const memberItems = selectedMemberId
                ? getLunchboxItemsForDay(selectedLunchDay).filter(item => item.familyMember.id === selectedMemberId)
                : []
              return (
                <>
                  <Button
                    variant="outline"
                    className="h-auto py-4 px-4 justify-start gap-3"
                    onClick={handleMemberRecipeChoice}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Utensils className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">
                        {mainRecipe?.title || memberMeal?.placeholderTitle || 'Add Recipe'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mainRecipe || memberMeal?.placeholderTitle ? 'Change recipe' : 'Pick from your recipes'}
                      </p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 px-4 justify-start gap-3"
                    onClick={handleMemberLunchboxChoice}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/50">
                      <Package className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Lunchbox Items</p>
                      <p className="text-xs text-muted-foreground">
                        {memberItems.length > 0
                          ? `${memberItems.length} ${memberItems.length === 1 ? 'item' : 'items'} packed`
                          : 'Add snacks, sides, fruit...'}
                      </p>
                    </div>
                  </Button>
                </>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>
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
