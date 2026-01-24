'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AISuggestionCard } from './ai-suggestion-card'
import { Loader2, RefreshCw, Save, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type {
  AIPlanModalProps,
  PlannerContext,
  AISuggestion,
  DecisionStatus,
  GenerateResponse,
} from '@/lib/ai-planner/types'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function AIPlanModal({
  open,
  onOpenChange,
  weekStart,
  mealPlanId,
  userPrompt: initialUserPrompt,
  existingMeals,
  onComplete,
}: AIPlanModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'saving' | 'error'>('idle')
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [decisions, setDecisions] = useState<Map<number, DecisionStatus>>(new Map())
  const [rejectedRecipeIds, setRejectedRecipeIds] = useState<string[]>([])
  const [feedbackText, setFeedbackText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null)
  const [context, setContext] = useState<PlannerContext | null>(null)

  // Calculate which days need suggestions
  const existingDays = new Set(existingMeals.map((m) => m.dayOfWeek))
  const daysToGenerate = [0, 1, 2, 3, 4, 5, 6].filter((d) => !existingDays.has(d))

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStatus('idle')
      setSuggestions([])
      setDecisions(new Map())
      setRejectedRecipeIds([])
      setFeedbackText('')
      setError(null)
      setRegeneratingDay(null)
      setContext(null)
    }
  }, [open])

  // Auto-generate when modal opens
  useEffect(() => {
    if (open && status === 'idle' && daysToGenerate.length > 0) {
      generateSuggestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status])

  const fetchContext = useCallback(async (): Promise<PlannerContext | null> => {
    const params = new URLSearchParams({
      weekStart: weekStart.toISOString(),
    })
    const response = await fetch(`/api/ai-planner/context?${params}`)
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to fetch context')
    }
    return response.json()
  }, [weekStart])

  const generateSuggestions = useCallback(
    async (forDays?: number[], additionalExcludes?: string[]) => {
      try {
        setStatus('loading')
        setError(null)

        // Fetch fresh context if we don't have it
        let ctx = context
        if (!ctx) {
          ctx = await fetchContext()
          setContext(ctx)
        }

        if (!ctx) {
          throw new Error('Failed to load planning context')
        }

        const targetDays = forDays || daysToGenerate
        const excludes = [...rejectedRecipeIds, ...(additionalExcludes || [])]

        const response = await fetch('/api/ai-planner/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: ctx,
            userPrompt: feedbackText || initialUserPrompt,
            daysToGenerate: targetDays,
            excludeRecipeIds: excludes.length > 0 ? excludes : undefined,
            enableWebSearch: true,
          }),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to generate suggestions')
        }

        const data: GenerateResponse = await response.json()

        if (data.suggestions.length === 0) {
          throw new Error('No suggestions could be generated. Try adding more recipes.')
        }

        // If regenerating specific days, merge with existing
        if (forDays && forDays.length > 0) {
          setSuggestions((prev) => {
            const newSuggestions = [...prev]
            for (const s of data.suggestions) {
              const idx = newSuggestions.findIndex((x) => x.dayOfWeek === s.dayOfWeek)
              if (idx >= 0) {
                newSuggestions[idx] = s
              } else {
                newSuggestions.push(s)
              }
            }
            return newSuggestions.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          })

          // Reset decision for regenerated days
          setDecisions((prev) => {
            const newDecisions = new Map(prev)
            for (const day of forDays) {
              newDecisions.set(day, 'pending')
            }
            return newDecisions
          })
        } else {
          // Full regeneration
          setSuggestions(data.suggestions.sort((a, b) => a.dayOfWeek - b.dayOfWeek))
          setDecisions(new Map())
        }

        setStatus('ready')
      } catch (err) {
        console.error('Generation error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
        setStatus('error')
      }
    },
    [context, daysToGenerate, fetchContext, feedbackText, initialUserPrompt, rejectedRecipeIds]
  )

  const handleAccept = (dayOfWeek: number) => {
    setDecisions((prev) => new Map(prev).set(dayOfWeek, 'accept'))
  }

  const handleReject = (dayOfWeek: number) => {
    const suggestion = suggestions.find((s) => s.dayOfWeek === dayOfWeek)
    if (suggestion) {
      setRejectedRecipeIds((prev) => [...prev, suggestion.recipeId])
    }
    setDecisions((prev) => new Map(prev).set(dayOfWeek, 'reject'))
  }

  const handleRegenerate = async (dayOfWeek: number) => {
    const suggestion = suggestions.find((s) => s.dayOfWeek === dayOfWeek)
    if (!suggestion) return

    setRegeneratingDay(dayOfWeek)
    try {
      await generateSuggestions([dayOfWeek], [suggestion.recipeId])
    } finally {
      setRegeneratingDay(null)
    }
  }

  const handleRedoAll = () => {
    setRejectedRecipeIds([])
    setDecisions(new Map())
    setContext(null) // Force refetch context with new feedback
    generateSuggestions()
  }

  const handleSave = async () => {
    const acceptedSuggestions = suggestions.filter(
      (s) => decisions.get(s.dayOfWeek) === 'accept'
    )

    if (acceptedSuggestions.length === 0) {
      toast.error('No meals accepted to save')
      return
    }

    setStatus('saving')

    try {
      // Save each accepted meal sequentially
      let savedCount = 0
      let importedCount = 0

      for (const suggestion of acceptedSuggestions) {
        let recipeId = suggestion.recipeId

        // If it's a web recipe, import it first
        if (suggestion.isWebRecipe && suggestion.webRecipeUrl) {
          const importResponse = await fetch('/api/recipes/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: suggestion.webRecipeUrl }),
          })

          if (!importResponse.ok) {
            const err = await importResponse.json()
            throw new Error(err.error || `Failed to import ${suggestion.recipeTitle}`)
          }

          const importedRecipe = await importResponse.json()
          recipeId = importedRecipe.id
          importedCount++
        }

        // Now save to meal plan
        const response = await fetch('/api/planned-meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mealPlanId,
            recipeId,
            dayOfWeek: suggestion.dayOfWeek,
            mealType: 'DINNER',
            role: 'MAIN',
          }),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || `Failed to save ${suggestion.recipeTitle}`)
        }

        savedCount++
      }

      const message = importedCount > 0
        ? `Saved ${savedCount} meal${savedCount > 1 ? 's' : ''} (${importedCount} imported from web)`
        : `Saved ${savedCount} meal${savedCount > 1 ? 's' : ''}`

      toast.success(message)
      onComplete()
      onOpenChange(false)
    } catch (err) {
      console.error('Save error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save meals')
      setStatus('ready')
    }
  }

  const acceptedCount = Array.from(decisions.values()).filter((d) => d === 'accept').length
  const totalSuggestions = suggestions.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg md:max-w-xl lg:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between shrink-0 pr-8">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Suggested Meals
          </DialogTitle>
          {status === 'ready' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedoAll}
              className="gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Redo
            </Button>
          )}
        </DialogHeader>

        {/* Feedback input for redo */}
        {status === 'ready' && (
          <div className="shrink-0">
            <Textarea
              placeholder="Feedback for redo (optional)..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
            />
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-auto py-2">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating meal suggestions...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => generateSuggestions()}>
                Try again
              </Button>
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-3">
              {/* Show existing meals */}
              {existingMeals.length > 0 && (
                <div className="space-y-2">
                  {existingMeals.map((meal) => (
                    <div
                      key={meal.dayOfWeek}
                      className="rounded-lg border border-dashed bg-muted/30 p-4"
                    >
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {DAYS_OF_WEEK[meal.dayOfWeek].slice(0, 3)}
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        Already planned: {meal.title}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Show suggestions */}
              {suggestions.map((suggestion) => (
                <AISuggestionCard
                  key={suggestion.dayOfWeek}
                  suggestion={suggestion}
                  decision={decisions.get(suggestion.dayOfWeek) || 'pending'}
                  onAccept={() => handleAccept(suggestion.dayOfWeek)}
                  onReject={() => handleReject(suggestion.dayOfWeek)}
                  onRegenerate={() => handleRegenerate(suggestion.dayOfWeek)}
                  isRegenerating={regeneratingDay === suggestion.dayOfWeek}
                />
              ))}
            </div>
          )}

          {status === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Saving meals to your plan...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {status === 'ready' && (
          <div className="flex items-center justify-between pt-4 border-t shrink-0">
            <span className="text-sm text-muted-foreground">
              Accepted: {acceptedCount}/{totalSuggestions}
            </span>
            <Button
              onClick={handleSave}
              disabled={acceptedCount === 0}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Accepted Meals
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
