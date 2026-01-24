import type { PlannerContext, AISuggestion } from './types'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const SYSTEM_PROMPT = `You are a family meal planning assistant. Your job is to suggest dinner recipes based on family preferences, what's expiring in their kitchen, and any specific requests.

Guidelines:
- Prioritize recipes from the user's AVAILABLE RECIPES list (these are known family favorites)
- NEVER suggest recipes that kids have downvoted - these are marked in the "AVOID" list
- Avoid recipes made in the last 2 weeks unless there are limited options
- Prioritize recipes that use expiring perishables
- Balance variety across the week (don't suggest similar cuisines back-to-back)
- Consider the user's specific requests (easy meals on busy days, guests, etc.)
- Keep reasons to 1-2 concise sentences explaining why this recipe fits
- If WEB RECIPES are provided, you may suggest them when they're a better fit than available recipes (e.g., uses expiring ingredients, matches user request, adds variety)

Confidence levels:
- "high": Recipe is a family favorite, uses expiring ingredients, or perfectly matches user request
- "medium": Good fit but not perfect (recently made, or partial match to preferences)
- "low": Only option available, or compromises needed

CRITICAL: Only suggest recipes from "AVAILABLE RECIPES" or "WEB RECIPES" lists. Never invent recipes.

Respond with valid JSON matching this schema:
{
  "suggestions": [
    {
      "dayOfWeek": <number 0-6 where 0=Monday>,
      "recipeId": "<recipe ID from AVAILABLE RECIPES, or URL from WEB RECIPES>",
      "recipeTitle": "<exact recipe title>",
      "reason": "<1-2 sentence explanation>",
      "confidence": "high" | "medium" | "low",
      "isWebRecipe": <true if from WEB RECIPES, false or omit if from AVAILABLE RECIPES>
    }
  ]
}`

export function buildUserPrompt(
  context: PlannerContext,
  daysToGenerate: number[],
  userPrompt?: string,
  excludeRecipeIds?: string[]
): string {
  const lines: string[] = []

  // Days needed
  const dayNames = daysToGenerate.map((d) => DAYS_OF_WEEK[d]).join(', ')
  lines.push(`Generate dinner suggestions for: ${dayNames}`)
  lines.push(`(Day numbers: ${daysToGenerate.join(', ')} where 0=Monday, 6=Sunday)`)
  lines.push('')

  // Family members
  if (context.family.members.length > 0) {
    const memberList = context.family.members
      .map((m) => `${m.name} (${m.role})`)
      .join(', ')
    lines.push(`FAMILY: ${memberList}`)
    lines.push('')
  }

  // Available recipes (excluding any previously rejected this session)
  const availableRecipes = context.preferences.favoriteRecipes.filter(
    (r) => !excludeRecipeIds?.includes(r.id)
  )

  if (availableRecipes.length > 0) {
    lines.push('AVAILABLE RECIPES (sorted by preference score):')
    for (const recipe of availableRecipes) {
      const tags = recipe.tags.length > 0 ? recipe.tags.join(', ') : 'no tags'
      const lastUsed = recipe.daysSinceUsed !== null
        ? `${recipe.daysSinceUsed} days ago`
        : 'never made'
      lines.push(
        `- ID: ${recipe.id} | "${recipe.title}" | Tags: ${tags} | Score: ${recipe.score} | Last: ${lastUsed}`
      )
    }
    lines.push('')
  } else {
    lines.push('AVAILABLE RECIPES: None available (all filtered out)')
    lines.push('')
  }

  // Recipes to avoid
  if (context.preferences.avoidRecipes.length > 0) {
    const avoidList = context.preferences.avoidRecipes
      .map((r) => `"${r.title}"`)
      .join(', ')
    lines.push(`AVOID (kids don't like): ${avoidList}`)
    lines.push('')
  }

  // Recently made
  if (context.recentMeals.length > 0) {
    const recentList = context.recentMeals
      .map((m) => `"${m.title}" (${m.weeksAgo === 0 ? 'this week' : `${m.weeksAgo} week${m.weeksAgo > 1 ? 's' : ''} ago`})`)
      .join(', ')
    lines.push(`RECENTLY MADE: ${recentList}`)
    lines.push('')
  }

  // Expiring perishables
  if (context.perishables.length > 0) {
    const perishableList = context.perishables
      .map((p) => `${p.name} (${p.daysUntilExpiration} day${p.daysUntilExpiration !== 1 ? 's' : ''})`)
      .join(', ')
    lines.push(`EXPIRING SOON: ${perishableList}`)
    lines.push('')
  }

  // Already planned meals
  if (context.existingMeals.length > 0) {
    lines.push('ALREADY PLANNED THIS WEEK:')
    for (const meal of context.existingMeals) {
      lines.push(`- ${DAYS_OF_WEEK[meal.dayOfWeek]}: "${meal.title}"`)
    }
    lines.push('')
  }

  // Web recipes (from search)
  if (context.webRecipes && context.webRecipes.length > 0) {
    lines.push('WEB RECIPES (can be imported - use URL as recipeId, set isWebRecipe: true):')
    for (const recipe of context.webRecipes) {
      lines.push(`- URL: ${recipe.url} | "${recipe.title}" | ${recipe.source}`)
      if (recipe.snippet) {
        lines.push(`  ${recipe.snippet.slice(0, 150)}...`)
      }
    }
    lines.push('')
  }

  // User's specific request
  if (userPrompt && userPrompt.trim()) {
    lines.push(`USER REQUEST: ${userPrompt.trim()}`)
    lines.push('')
  }

  // Final instruction
  lines.push('Respond with JSON only. No explanation text before or after the JSON.')

  return lines.join('\n')
}

export function parseAIResponse(responseText: string): AISuggestion[] {
  // Try to extract JSON from the response
  let jsonText = responseText.trim()

  // Sometimes the model wraps in markdown code blocks
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim()
  }

  // Parse the JSON
  const parsed = JSON.parse(jsonText)

  if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
    throw new Error('Invalid response format: missing suggestions array')
  }

  // Validate each suggestion
  const suggestions: AISuggestion[] = []
  for (const s of parsed.suggestions) {
    if (
      typeof s.dayOfWeek !== 'number' ||
      s.dayOfWeek < 0 ||
      s.dayOfWeek > 6
    ) {
      throw new Error(`Invalid dayOfWeek: ${s.dayOfWeek}`)
    }

    if (typeof s.recipeId !== 'string' || !s.recipeId) {
      throw new Error('Invalid or missing recipeId')
    }

    if (typeof s.recipeTitle !== 'string' || !s.recipeTitle) {
      throw new Error('Invalid or missing recipeTitle')
    }

    const suggestion: AISuggestion = {
      dayOfWeek: s.dayOfWeek,
      recipeId: s.recipeId,
      recipeTitle: s.recipeTitle,
      reason: typeof s.reason === 'string' ? s.reason : 'AI suggestion',
      confidence: ['high', 'medium', 'low'].includes(s.confidence)
        ? s.confidence
        : 'medium',
    }

    // Handle web recipes
    if (s.isWebRecipe === true) {
      suggestion.isWebRecipe = true
      suggestion.webRecipeUrl = s.recipeId // URL is stored in recipeId for web recipes
      // Extract source from URL
      try {
        const url = new URL(s.recipeId)
        suggestion.webRecipeSource = url.hostname.replace('www.', '')
      } catch {
        suggestion.webRecipeSource = 'web'
      }
    }

    suggestions.push(suggestion)
  }

  return suggestions
}
