'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, RefreshCw, Loader2, Globe, ExternalLink, UtensilsCrossed } from 'lucide-react'
import type { AISuggestionCardProps } from '@/lib/ai-planner/types'

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function AISuggestionCard({
  suggestion,
  decision,
  onAccept,
  onReject,
  onRegenerate,
  isRegenerating,
}: AISuggestionCardProps) {
  const isAccepted = decision === 'accept'
  const isRejected = decision === 'reject'
  const isPending = decision === 'pending'

  return (
    <div
      className={`
        rounded-lg border p-4 md:p-5 transition-all
        ${isAccepted ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}
        ${isRejected ? 'border-muted bg-muted/30' : ''}
        ${isPending ? 'border-border' : ''}
      `}
    >
      <div className="flex items-start gap-3 md:gap-4">
        {/* Recipe image */}
        <div className="shrink-0">
          {suggestion.imageUrl ? (
            <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-md overflow-hidden">
              <Image
                src={suggestion.imageUrl}
                alt={suggestion.recipeTitle}
                fill
                className={`object-cover ${isRejected ? 'opacity-50 grayscale' : ''}`}
                sizes="(min-width: 768px) 96px, 64px"
              />
            </div>
          ) : (
            <div className={`w-16 h-16 md:w-24 md:h-24 rounded-md bg-muted flex items-center justify-center ${isRejected ? 'opacity-50' : ''}`}>
              <UtensilsCrossed className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Day label */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {DAYS_OF_WEEK[suggestion.dayOfWeek]}
            </span>
            {suggestion.isWebRecipe && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200">
                <Globe className="h-2.5 w-2.5 mr-0.5" />
                Web
              </Badge>
            )}
          </div>

          {/* Recipe title */}
          <h4
            className={`
              font-medium leading-tight flex items-center gap-1.5 md:text-lg
              ${isRejected ? 'line-through text-muted-foreground' : ''}
            `}
          >
            {suggestion.recipeTitle}
            {suggestion.isWebRecipe && suggestion.webRecipeUrl && !isRejected && (
              <a
                href={suggestion.webRecipeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </h4>

          {/* Source for web recipes */}
          {suggestion.isWebRecipe && suggestion.webRecipeSource && !isRejected && (
            <p className="text-xs text-muted-foreground">
              from {suggestion.webRecipeSource}
            </p>
          )}

          {/* Reason */}
          {!isRejected && (
            <p className="text-sm text-muted-foreground mt-1 leading-snug">
              {suggestion.reason}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-start gap-1 shrink-0">
          {isPending && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={onAccept}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                onClick={onReject}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}

          {isAccepted && (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              <Check className="h-3 w-3 mr-1" />
              Accepted
            </Badge>
          )}

          {isRejected && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="gap-1.5"
            >
              {isRegenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              New suggestion
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
