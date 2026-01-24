'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AIPlanModal } from './ai-plan-modal'
import { Sparkles, ChevronDown, Loader2 } from 'lucide-react'
import type { AIPlanButtonProps } from '@/lib/ai-planner/types'

export function AIPlanButton({
  weekStart,
  mealPlanId,
  existingMeals,
  onSuggestionsAccepted,
}: AIPlanButtonProps) {
  const [showPreferences, setShowPreferences] = useState(false)
  const [userPrompt, setUserPrompt] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [isCreatingPlan, setIsCreatingPlan] = useState(false)
  const [activeMealPlanId, setActiveMealPlanId] = useState<string | null>(mealPlanId)

  // Count empty dinner slots
  const plannedDays = new Set(existingMeals.map((m) => m.dayOfWeek))
  const emptySlots = 7 - plannedDays.size

  // Don't show if all days are planned
  if (emptySlots === 0) {
    return null
  }

  const handleOpenModal = async () => {
    // If no meal plan exists, create one first
    if (!activeMealPlanId) {
      setIsCreatingPlan(true)
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
        setActiveMealPlanId(data.id)
        setModalOpen(true)
      } catch (error) {
        console.error('Failed to create meal plan:', error)
      } finally {
        setIsCreatingPlan(false)
      }
    } else {
      setModalOpen(true)
    }
  }

  const handleComplete = () => {
    setUserPrompt('')
    setShowPreferences(false)
    onSuggestionsAccepted()
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handleOpenModal}
        disabled={isCreatingPlan}
        className="gap-2"
        size="lg"
      >
        {isCreatingPlan ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Plan This Week
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-muted-foreground"
        onClick={() => setShowPreferences(!showPreferences)}
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${showPreferences ? 'rotate-180' : ''}`}
        />
        Add preferences
      </Button>

      {showPreferences && (
        <Textarea
          placeholder="e.g., guests Saturday, easy Wednesday, use up chicken..."
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          className="min-h-[80px] w-[280px] text-sm resize-none"
        />
      )}

      {activeMealPlanId && (
        <AIPlanModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          weekStart={weekStart}
          mealPlanId={activeMealPlanId}
          userPrompt={userPrompt}
          existingMeals={existingMeals}
          onComplete={handleComplete}
        />
      )}
    </div>
  )
}
