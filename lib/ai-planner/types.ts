// AI Planner TypeScript Interfaces

import { FamilyRole } from '@prisma/client'

// ============================================================================
// Context Types - Input to AI generation
// ============================================================================

export interface FamilyMemberContext {
  name: string
  role: FamilyRole
}

export interface FavoriteRecipeContext {
  id: string
  title: string
  tags: string[]
  score: number
  daysSinceUsed: number | null
  imageUrl?: string | null
}

export interface AvoidRecipeContext {
  id: string
  title: string
  kidDownVotes: number
}

export interface RecentMealContext {
  title: string
  weeksAgo: number
}

export interface PerishableContext {
  name: string
  daysUntilExpiration: number
}

export interface ExistingMealContext {
  dayOfWeek: number
  title: string
}

export interface WebRecipeContext {
  url: string
  title: string
  snippet: string
  source: string
  imageUrl?: string | null
}

export interface PlannerContext {
  family: {
    members: FamilyMemberContext[]
  }
  preferences: {
    favoriteRecipes: FavoriteRecipeContext[]
    avoidRecipes: AvoidRecipeContext[]
    preferredTags: string[]
  }
  recentMeals: RecentMealContext[]
  perishables: PerishableContext[]
  existingMeals: ExistingMealContext[]
  webRecipes?: WebRecipeContext[]
}

// ============================================================================
// Generation Request/Response Types
// ============================================================================

export interface GenerateRequest {
  context: PlannerContext
  userPrompt?: string
  daysToGenerate: number[]
  excludeRecipeIds?: string[]
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface AISuggestion {
  dayOfWeek: number
  recipeId: string
  recipeTitle: string
  reason: string
  confidence: ConfidenceLevel
  imageUrl?: string | null
  // For web recipes that need to be imported
  isWebRecipe?: boolean
  webRecipeUrl?: string
  webRecipeSource?: string
}

export interface GenerateResponse {
  suggestions: AISuggestion[]
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

// ============================================================================
// UI State Types
// ============================================================================

export type DecisionStatus = 'pending' | 'accept' | 'reject'

export type ModalStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

export interface AIPlannerModalState {
  status: ModalStatus
  suggestions: AISuggestion[]
  decisions: Map<number, DecisionStatus>
  rejectedRecipeIds: string[]
  feedbackText: string
  error: string | null
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface ExistingMealInfo {
  dayOfWeek: number
  recipeId?: string
  title: string
}

export interface AIPlanButtonProps {
  weekStart: Date
  mealPlanId: string | null
  existingMeals: ExistingMealInfo[]
  onSuggestionsAccepted: () => void
}

export interface AIPlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weekStart: Date
  mealPlanId: string
  userPrompt?: string
  existingMeals: ExistingMealInfo[]
  onComplete: () => void
}

export interface AISuggestionCardProps {
  suggestion: AISuggestion
  decision: DecisionStatus
  onAccept: () => void
  onReject: () => void
  onRegenerate: () => void
  isRegenerating: boolean
}

// ============================================================================
// API Error Types
// ============================================================================

export interface APIError {
  error: string
  code?: string
  details?: string
}
