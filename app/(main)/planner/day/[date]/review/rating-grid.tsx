'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ThumbsUp, ThumbsDown, Meh } from 'lucide-react'
import { toast } from 'sonner'

interface FamilyMember {
  id: string
  name: string
  role: 'ADULT' | 'CHILD'
}

interface Rating {
  id: string
  rating: 'UP' | 'DOWN' | 'NEUTRAL'
  member: { id: string; name: string; role: 'ADULT' | 'CHILD' }
}

interface MealFeedback {
  id: string
  content: string
  familyMemberId: string | null
  familyMember: { id: string; name: string; role: 'ADULT' | 'CHILD' } | null
}

interface RatingGridProps {
  recipeId: string
  plannedMealId: string
  familyMembers: FamilyMember[]
  existingRatings: Rating[]
  existingFeedback: MealFeedback[]
  onUpdate?: () => void
}

export function RatingGrid({
  recipeId,
  plannedMealId,
  familyMembers,
  existingRatings,
  existingFeedback,
  onUpdate,
}: RatingGridProps) {
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [localRatings, setLocalRatings] = useState<Record<string, 'UP' | 'DOWN' | 'NEUTRAL'>>(() => {
    const initial: Record<string, 'UP' | 'DOWN' | 'NEUTRAL'> = {}
    existingRatings.forEach((r) => {
      initial[r.member.id] = r.rating
    })
    return initial
  })

  // Feedback state per family member
  const [feedbackState, setFeedbackState] = useState<Record<string, { id?: string; content: string }>>(() => {
    const state: Record<string, { id?: string; content: string }> = {}
    familyMembers.forEach((member) => {
      const existing = existingFeedback.find((fb) => fb.familyMemberId === member.id)
      state[member.id] = existing ? { id: existing.id, content: existing.content } : { content: '' }
    })
    return state
  })
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null)

  const handleRate = async (memberId: string, rating: 'UP' | 'DOWN' | 'NEUTRAL') => {
    // Optimistic update
    setLocalRatings((prev) => ({ ...prev, [memberId]: rating }))
    setSubmitting(memberId)

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId,
          memberId,
          rating,
        }),
      })

      if (!response.ok) throw new Error('Failed to save rating')

      onUpdate?.()
    } catch (error) {
      // Revert on error
      const originalRating = existingRatings.find((r) => r.member.id === memberId)?.rating
      if (originalRating) {
        setLocalRatings((prev) => ({ ...prev, [memberId]: originalRating }))
      } else {
        setLocalRatings((prev) => {
          const next = { ...prev }
          delete next[memberId]
          return next
        })
      }
      toast.error('Failed to save rating')
      console.error(error)
    } finally {
      setSubmitting(null)
    }
  }

  const handleFeedbackBlur = async (memberId: string) => {
    const current = feedbackState[memberId]
    if (!current) return

    const content = current.content.trim()
    const original = existingFeedback.find((fb) => fb.familyMemberId === memberId)

    // No change
    if (original?.content === content) return
    if (!original && !content) return

    setSavingFeedback(memberId)

    try {
      if (original && !content) {
        // Delete
        const response = await fetch(`/api/meal-feedback/${original.id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('Failed to delete feedback')
        setFeedbackState((prev) => ({ ...prev, [memberId]: { content: '' } }))
      } else if (original && content) {
        // Update
        const response = await fetch(`/api/meal-feedback/${original.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        if (!response.ok) throw new Error('Failed to update feedback')
        const updated = await response.json()
        setFeedbackState((prev) => ({ ...prev, [memberId]: { id: updated.id, content: updated.content } }))
      } else if (!original && content) {
        // Create
        const response = await fetch('/api/meal-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plannedMealId, content, familyMemberId: memberId }),
        })
        if (!response.ok) throw new Error('Failed to save feedback')
        const created = await response.json()
        setFeedbackState((prev) => ({ ...prev, [memberId]: { id: created.id, content: created.content } }))
      }
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to save feedback')
      console.error(error)
    } finally {
      setSavingFeedback(null)
    }
  }

  if (familyMembers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add family members in Settings to rate recipes.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {familyMembers.map((member) => {
        const currentRating = localRatings[member.id]
        const isSubmitting = submitting === member.id
        const feedback = feedbackState[member.id]

        return (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-background border"
          >
            {/* Name */}
            <div className="w-24 flex-shrink-0">
              <span className="font-medium text-sm">{member.name}</span>
              {member.role === 'CHILD' && (
                <Badge variant="outline" className="ml-1.5 text-[10px] py-0">
                  Kid
                </Badge>
              )}
            </div>

            {/* Rating buttons */}
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant={currentRating === 'UP' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleRate(member.id, 'UP')}
                disabled={isSubmitting}
                className={`h-9 w-9 p-0 ${
                  currentRating === 'UP'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'hover:bg-green-100 hover:text-green-700'
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                variant={currentRating === 'NEUTRAL' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleRate(member.id, 'NEUTRAL')}
                disabled={isSubmitting}
                className={`h-9 w-9 p-0 ${
                  currentRating === 'NEUTRAL'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'hover:bg-amber-100 hover:text-amber-700'
                }`}
              >
                <Meh className="h-4 w-4" />
              </Button>
              <Button
                variant={currentRating === 'DOWN' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleRate(member.id, 'DOWN')}
                disabled={isSubmitting}
                className={`h-9 w-9 p-0 ${
                  currentRating === 'DOWN'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'hover:bg-red-100 hover:text-red-700'
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Feedback input */}
            <Input
              placeholder="Notes..."
              value={feedback?.content || ''}
              onChange={(e) =>
                setFeedbackState((prev) => ({
                  ...prev,
                  [member.id]: { ...prev[member.id], content: e.target.value },
                }))
              }
              onBlur={() => handleFeedbackBlur(member.id)}
              disabled={savingFeedback === member.id}
              className="h-9 flex-1"
            />
          </div>
        )
      })}
    </div>
  )
}
