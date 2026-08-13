'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DinnerReview } from './dinner-review'
import { LunchboxReview } from './lunchbox-review'
import {
  getMonday,
  getDayOfWeek,
  formatMonthDay,
  parseDateString,
  DAYS_OF_WEEK,
} from '@/lib/utils/dates'
import { ChevronLeft, Loader2, ClipboardCheck } from 'lucide-react'

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
  familyMemberId?: string | null
}

interface LunchboxItem {
  id: string
  dayOfWeek: number
  category: string | null
  name: string
  notes: string | null
  wasConsumed: boolean
  consumptionNote: string | null
  familyMemberId: string
  familyMember: { id: string; name: string; role: 'ADULT' | 'CHILD' }
}

interface MealPlan {
  id: string
  plannedMeals: PlannedMeal[]
  lunchboxItems: LunchboxItem[]
}

interface FamilyMember {
  id: string
  name: string
  role: 'ADULT' | 'CHILD'
}

interface ReviewViewProps {
  date: string
  familyMembers: FamilyMember[]
  selfMemberId?: string | null
}

export function ReviewView({ date, familyMembers, selfMemberId }: ReviewViewProps) {
  const currentDate = parseDateString(date)!
  const dayOfWeek = getDayOfWeek(currentDate)
  const weekStart = getMonday(currentDate)
  const weekStartIso = weekStart.toISOString()

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMealPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartIso])

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

  // Get dinner meal for this day (shared, no familyMemberId)
  const getDinnerMeal = () => {
    return mealPlan?.plannedMeals.find(
      (m) => m.dayOfWeek === dayOfWeek && m.mealType === 'DINNER' && !m.familyMemberId
    )
  }

  // Get lunchbox items for this day
  const getLunchboxItems = () => {
    return mealPlan?.lunchboxItems?.filter((item) => item.dayOfWeek === dayOfWeek) || []
  }

  // Check if this is today or a past day
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isPastOrToday = currentDate <= today

  const dinnerMeal = getDinnerMeal()
  const lunchboxItems = getLunchboxItems()
  const hasContent = dinnerMeal || lunchboxItems.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-9 w-9 rounded-full"
          >
            <Link href={`/planner/day/${date}`} aria-label="Back to day">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center gap-3 px-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">
                Review {DAYS_OF_WEEK[dayOfWeek]}
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatMonthDay(currentDate)}
              </p>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href={`/planner/day/${date}`} className="gap-2">
            Done
          </Link>
        </Button>
      </div>

      {/* Content - centered with max width */}
      <div className="max-w-3xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm">Loading...</span>
            </div>
          </div>
        ) : !isPastOrToday ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-medium">Can&apos;t review future days</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Come back after {DAYS_OF_WEEK[dayOfWeek]} to review how meals went.
            </p>
          </div>
        ) : !hasContent ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-medium">Nothing to review</h2>
            <p className="text-sm text-muted-foreground mt-1">
              No meals were planned for this day.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Dinner Review Section */}
            {dinnerMeal && (
              <DinnerReview
                meal={dinnerMeal}
                familyMembers={familyMembers}
                selfMemberId={selfMemberId}
                onUpdate={fetchMealPlan}
              />
            )}

            {/* Lunchbox Review Section */}
            {lunchboxItems.length > 0 && (
              <LunchboxReview
                items={lunchboxItems}
                familyMembers={familyMembers}
                onUpdate={fetchMealPlan}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
