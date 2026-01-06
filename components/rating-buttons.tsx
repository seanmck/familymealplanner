'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ThumbsUp, ThumbsDown, Meh } from 'lucide-react'
import { toast } from 'sonner'

interface FamilyMember {
  id: string
  name: string
  role: 'ADULT' | 'CHILD'
}

interface Rating {
  memberId: string
  rating: 'UP' | 'DOWN' | 'NEUTRAL'
}

interface RatingButtonsProps {
  recipeId: string
  familyMembers: FamilyMember[]
  existingRatings: Rating[]
}

export function RatingButtons({
  recipeId,
  familyMembers,
  existingRatings,
}: RatingButtonsProps) {
  const router = useRouter()
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getCurrentRating = (memberId: string) => {
    return existingRatings.find((r) => r.memberId === memberId)?.rating
  }

  const handleRate = async (rating: 'UP' | 'DOWN' | 'NEUTRAL') => {
    if (!selectedMember) {
      toast.error('Please select a family member')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId,
          memberId: selectedMember,
          rating,
        }),
      })

      if (!response.ok) throw new Error('Failed to save rating')

      toast.success('Rating saved!')
      router.refresh()
    } catch (error) {
      toast.error('Failed to save rating')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (familyMembers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add family members in Settings to rate recipes.
      </p>
    )
  }

  const currentRating = selectedMember ? getCurrentRating(selectedMember) : null

  return (
    <div className="space-y-3">
      <Select value={selectedMember} onValueChange={setSelectedMember}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select family member to rate" />
        </SelectTrigger>
        <SelectContent>
          {familyMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              <span className="flex items-center gap-2">
                {member.name} {member.role === 'CHILD' ? '(Kid)' : ''}
                {getCurrentRating(member.id) === 'UP' && (
                  <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
                )}
                {getCurrentRating(member.id) === 'DOWN' && (
                  <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                )}
                {getCurrentRating(member.id) === 'NEUTRAL' && (
                  <Meh className="h-3.5 w-3.5 text-amber-500" />
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedMember && (
        <div className="flex gap-2">
          <Button
            variant={currentRating === 'UP' ? 'default' : 'outline'}
            onClick={() => handleRate('UP')}
            disabled={isSubmitting}
            className={`flex-1 gap-2 ${currentRating === 'UP' ? 'bg-green-500 hover:bg-green-600' : ''}`}
          >
            <ThumbsUp className="h-4 w-4" />
            Loved it
          </Button>
          <Button
            variant={currentRating === 'NEUTRAL' ? 'default' : 'outline'}
            onClick={() => handleRate('NEUTRAL')}
            disabled={isSubmitting}
            className={`flex-1 gap-2 ${currentRating === 'NEUTRAL' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
          >
            <Meh className="h-4 w-4" />
            It&apos;s OK
          </Button>
          <Button
            variant={currentRating === 'DOWN' ? 'default' : 'outline'}
            onClick={() => handleRate('DOWN')}
            disabled={isSubmitting}
            className={`flex-1 gap-2 ${currentRating === 'DOWN' ? 'bg-red-500 hover:bg-red-600' : ''}`}
          >
            <ThumbsDown className="h-4 w-4" />
            Nope
          </Button>
        </div>
      )}
    </div>
  )
}
