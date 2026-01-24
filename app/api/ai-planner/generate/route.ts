import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuth } from '@/lib/api-auth'
import { SYSTEM_PROMPT, buildUserPrompt, parseAIResponse } from '@/lib/ai-planner/prompt'
import type { GenerateRequest, GenerateResponse, AISuggestion } from '@/lib/ai-planner/types'

const MAX_RETRIES = 1
const MODEL = 'claude-haiku-4-5-20251001'


export async function POST(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI features not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 503 }
      )
    }

    const body: GenerateRequest = await request.json()

    // Validate request
    if (!body.context) {
      return NextResponse.json(
        { error: 'Missing context in request body' },
        { status: 400 }
      )
    }

    if (!body.daysToGenerate || body.daysToGenerate.length === 0) {
      return NextResponse.json(
        { error: 'No days specified to generate suggestions for' },
        { status: 400 }
      )
    }

    // Check if there are any recipes to suggest
    const availableRecipes = body.context.preferences.favoriteRecipes.filter(
      (r) => !body.excludeRecipeIds?.includes(r.id)
    )
    const enableWebSearch = body.enableWebSearch ?? false

    if (availableRecipes.length === 0 && !enableWebSearch) {
      return NextResponse.json(
        {
          error: 'No recipes available to suggest',
          code: 'NO_RECIPES',
          details: 'Add some recipes to your collection first, or enable web search.',
        },
        { status: 400 }
      )
    }

    const anthropic = new Anthropic()

    const userPrompt = buildUserPrompt(
      body.context,
      body.daysToGenerate,
      body.userPrompt,
      body.excludeRecipeIds
    )

    let suggestions: AISuggestion[] = []
    let inputTokens = 0
    let outputTokens = 0
    let lastError: Error | null = null

    // Build tools array - include web search if enabled
    // Note: web_search_20250305 is a server-side tool type not fully typed in the SDK yet
    // We don't restrict allowed_domains because many recipe sites block Anthropic's crawler
    const tools = enableWebSearch
      ? [
          {
            type: 'web_search_20250305' as const,
            name: 'web_search',
            max_uses: 3,
          },
        ]
      : []

    // Try to get valid suggestions, with retry on parse failure
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createParams: any = {
          model: MODEL,
          max_tokens: 2048, // Increased to accommodate web search results
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          system: SYSTEM_PROMPT,
        }
        if (tools.length > 0) {
          createParams.tools = tools
        }
        const response = await anthropic.messages.create(createParams)

        // Track token usage
        inputTokens = response.usage.input_tokens
        outputTokens = response.usage.output_tokens

        // Extract the final text content (after any web searches)
        // The response may contain: text, server_tool_use, web_search_tool_result blocks
        // We want the last text block which contains the JSON response
        const textBlocks = response.content.filter((c) => c.type === 'text')
        const lastTextBlock = textBlocks[textBlocks.length - 1]

        if (!lastTextBlock || lastTextBlock.type !== 'text') {
          throw new Error('No text response from AI')
        }

        // Parse the response
        suggestions = parseAIResponse(lastTextBlock.text)

        // Validate that suggested recipe IDs exist in available recipes
        // For web recipes, we trust the URLs from Claude's web search
        const validRecipeIds = new Set(availableRecipes.map((r) => r.id))

        suggestions = suggestions.filter((s) => {
          // Web recipes use URL as recipeId - validate URL format
          if (s.isWebRecipe) {
            try {
              new URL(s.recipeId)
              return true
            } catch {
              console.warn(`AI suggested invalid web recipe URL: ${s.recipeId}`)
              return false
            }
          }

          // Regular recipes
          if (!validRecipeIds.has(s.recipeId)) {
            console.warn(`AI suggested invalid recipe ID: ${s.recipeId}`)
            return false
          }
          return true
        })

        // Enrich suggestions with image URLs (only for local recipes)
        const recipeImageMap = new Map(
          availableRecipes.map((r) => [r.id, r.imageUrl])
        )
        suggestions = suggestions.map((s) => ({
          ...s,
          imageUrl: s.isWebRecipe
            ? null // Web recipe images will be fetched during import
            : recipeImageMap.get(s.recipeId) || null,
        }))

        // If we got at least some valid suggestions, we're good
        if (suggestions.length > 0) {
          break
        }

        lastError = new Error('AI returned no valid recipe suggestions')
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.error(`AI generation attempt ${attempt + 1} failed:`, lastError)

        // On last attempt, throw
        if (attempt === MAX_RETRIES) {
          throw lastError
        }
      }
    }

    // Return whatever suggestions we have
    const response: GenerateResponse = {
      suggestions,
      usage: {
        inputTokens,
        outputTokens,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating AI suggestions:', error)

    // Handle specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key configuration' },
          { status: 503 }
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'AI service rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate meal suggestions' },
      { status: 500 }
    )
  }
}
