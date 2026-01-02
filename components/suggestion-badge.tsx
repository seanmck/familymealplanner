import { Badge } from '@/components/ui/badge'
import { Heart, Sparkles } from 'lucide-react'
import type { SuggestionReason } from '@/lib/suggestions/types'

interface SuggestionBadgeProps {
  reason: SuggestionReason
  className?: string
}

function formatDaysAgo(days: number | null): string {
  if (days === null) return 'never made'
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 21) return '2 weeks ago'
  if (days < 28) return '3 weeks ago'
  return '4+ weeks ago'
}

export function SuggestionBadge({ reason, className }: SuggestionBadgeProps) {
  if (reason.type === 'favorite') {
    const timeAgo = formatDaysAgo(reason.daysSinceUsed)
    return (
      <Badge
        variant="secondary"
        className={`gap-1 text-xs font-normal ${className || ''}`}
      >
        <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
        {reason.upVotes > 0 && `${reason.upVotes} likes`}
        {reason.upVotes > 0 && reason.daysSinceUsed !== null && ' · '}
        {timeAgo}
      </Badge>
    )
  }

  if (reason.type === 'ingredient-match') {
    const matchText =
      reason.matchedIngredients.length <= 2
        ? reason.matchedIngredients.join(', ')
        : `${reason.matchedIngredients.slice(0, 2).join(', ')} +${reason.matchedIngredients.length - 2}`

    return (
      <Badge
        variant="outline"
        className={`gap-1 text-xs font-normal ${className || ''}`}
      >
        <Sparkles className="h-3 w-3 text-amber-500" />
        {matchText}
      </Badge>
    )
  }

  return null
}
