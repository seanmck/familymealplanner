'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface MealFeedback {
  id: string
  content: string
  familyMemberId: string | null
  familyMember: { id: string; name: string; role: 'ADULT' | 'CHILD' } | null
}

interface FeedbackInputProps {
  plannedMealId: string
  existingFeedback: MealFeedback[]
  onUpdate?: () => void
}

export function FeedbackInput({
  plannedMealId,
  existingFeedback,
  onUpdate,
}: FeedbackInputProps) {
  // Only handle general feedback (familyMemberId === null)
  const generalFeedback = existingFeedback.find((fb) => fb.familyMemberId === null)

  const [content, setContent] = useState(generalFeedback?.content || '')
  const [feedbackId, setFeedbackId] = useState(generalFeedback?.id)
  const [isSaving, setIsSaving] = useState(false)

  const handleBlur = async () => {
    const trimmedContent = content.trim()

    // No change
    if (generalFeedback?.content === trimmedContent) return
    if (!generalFeedback && !trimmedContent) return

    setIsSaving(true)

    try {
      if (feedbackId && !trimmedContent) {
        // Delete
        const response = await fetch(`/api/meal-feedback/${feedbackId}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('Failed to delete')
        setFeedbackId(undefined)
        setContent('')
      } else if (feedbackId && trimmedContent) {
        // Update
        const response = await fetch(`/api/meal-feedback/${feedbackId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: trimmedContent }),
        })
        if (!response.ok) throw new Error('Failed to update')
        const updated = await response.json()
        setContent(updated.content)
      } else if (!feedbackId && trimmedContent) {
        // Create
        const response = await fetch('/api/meal-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plannedMealId,
            content: trimmedContent,
            familyMemberId: null,
          }),
        })
        if (!response.ok) throw new Error('Failed to save')
        const created = await response.json()
        setFeedbackId(created.id)
        setContent(created.content)
      }
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to save notes')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Textarea
      placeholder="Overall thoughts, tips for next time..."
      value={content}
      onChange={(e) => setContent(e.target.value)}
      onBlur={handleBlur}
      disabled={isSaving}
      rows={2}
      className="resize-none"
    />
  )
}
