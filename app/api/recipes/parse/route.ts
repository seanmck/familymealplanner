import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth'
import type { ParsedRecipe, ParsedIngredient } from '@/lib/recipe-parser'

const MODEL = 'claude-haiku-4-5-20251001'

const TEXT_SYSTEM_PROMPT = `You are a recipe parser that extracts structured data from free-form text (cookbook scans, handwritten notes, OCR output).

Extract the following fields:
- title: Recipe name (required)
- description: Brief description (optional)
- prepTimeMinutes: Preparation time in minutes (optional)
- cookTimeMinutes: Cooking time in minutes (optional)
- servings: Number of servings (optional)
- instructions: Step-by-step instructions as a numbered list
- ingredients: Array of ingredients with:
  - quantity: Decimal number (e.g., 1.5 for "1 1/2", 0.25 for "1/4")
  - unit: Standardized unit (cup, tablespoon, teaspoon, ounce, pound, gram, etc.) or null
  - name: Ingredient name
  - notes: Additional notes like "chopped", "melted" (optional)
- tags: Array of tags inferred from the recipe (e.g., "vegetarian", "quick", "baking", cuisine type)

Handle natural language gracefully:
- Convert fractions to decimals: "1/2" → 0.5, "1 1/4" → 1.25
- Normalize units: "tbsp" → "tablespoon", "c." → "cup"
- Extract notes from parentheses or descriptive text
- Infer tags from ingredients and cooking methods

Respond ONLY with a JSON object. No other text.
Example output:
{
  "title": "Chocolate Chip Cookies",
  "description": "Classic homemade cookies",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 12,
  "servings": 24,
  "instructions": "1. Preheat oven to 375°F\\n2. Mix dry ingredients...",
  "ingredients": [
    { "quantity": 2.25, "unit": "cup", "name": "flour", "notes": "all-purpose" },
    { "quantity": 1, "unit": "teaspoon", "name": "baking soda", "notes": null }
  ],
  "tags": ["baking", "dessert", "cookies"]
}`

const IMAGE_SYSTEM_PROMPT = `You are a recipe parser that extracts structured data from photos of recipes (printed recipes, handwritten recipe cards, cookbook pages).

Look at the image and extract:
- title: Recipe name (required)
- description: Brief description (optional)
- prepTimeMinutes: Preparation time in minutes (optional)
- cookTimeMinutes: Cooking time in minutes (optional)
- servings: Number of servings (optional)
- instructions: Step-by-step instructions as a numbered list
- ingredients: Array of ingredients with:
  - quantity: Decimal number (e.g., 1.5 for "1 1/2", 0.25 for "1/4")
  - unit: Standardized unit (cup, tablespoon, teaspoon, ounce, pound, gram, etc.) or null
  - name: Ingredient name
  - notes: Additional notes like "chopped", "melted" (optional)
- tags: Array of tags inferred from the recipe (e.g., "vegetarian", "quick", "baking", cuisine type)

Handle handwriting and OCR artifacts gracefully:
- Interpret unclear text based on cooking context
- Convert fractions to decimals: "1/2" → 0.5, "1 1/4" → 1.25
- Normalize units: "tbsp" → "tablespoon", "c." → "cup"
- Extract notes from parentheses or descriptive text
- Infer tags from ingredients and cooking methods

Respond ONLY with a JSON object. No other text.`

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      console.log('[recipe-parse] Unauthorized: no session or householdId')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('[recipe-parse] ANTHROPIC_API_KEY not configured')
      return NextResponse.json(
        { error: 'AI features not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { text, image, mediaType } = body

    console.log('[recipe-parse] Request received:', {
      hasText: !!text,
      textLength: text?.length,
      hasImage: !!image,
      imageLength: image?.length,
      mediaType,
    })

    const hasText = text && typeof text === 'string' && text.trim().length > 0
    const hasImage = image && typeof image === 'string' && mediaType

    if (!hasText && !hasImage) {
      console.log('[recipe-parse] Validation failed: no text or image')
      return NextResponse.json(
        { error: 'Either text or image is required' },
        { status: 400 }
      )
    }

    if (hasText && hasImage) {
      return NextResponse.json(
        { error: 'Provide either text or image, not both' },
        { status: 400 }
      )
    }

    // Validate image size (base64 is ~33% larger than binary)
    if (hasImage) {
      const estimatedSize = (image.length * 3) / 4
      console.log('[recipe-parse] Image size check:', {
        base64Length: image.length,
        estimatedBytes: estimatedSize,
        maxBytes: MAX_IMAGE_SIZE,
      })
      if (estimatedSize > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: 'Image too large. Please use a smaller photo (max 5MB).' },
          { status: 400 }
        )
      }
    }

    console.log('[recipe-parse] Calling Anthropic API...')
    const anthropic = new Anthropic()

    let content: Anthropic.MessageCreateParams['messages'][0]['content']
    let systemPrompt: string

    if (hasImage) {
      systemPrompt = IMAGE_SYSTEM_PROMPT
      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: image,
          },
        },
        {
          type: 'text',
          text: 'Extract the recipe from this image.',
        },
      ]
    } else {
      systemPrompt = TEXT_SYSTEM_PROMPT
      content = `Parse this recipe text:\n\n${text.trim()}`
    }

    let response
    try {
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      })
      console.log('[recipe-parse] Anthropic API response received:', {
        stopReason: response.stop_reason,
        usage: response.usage,
      })
    } catch (apiError) {
      console.error('[recipe-parse] Anthropic API error:', apiError)
      throw apiError
    }

    const textBlock = response.content.find((c) => c.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      console.error('[recipe-parse] No text in response:', response.content)
      throw new Error('No text response from AI')
    }

    console.log('[recipe-parse] AI response text:', textBlock.text.substring(0, 500))

    // Parse the JSON response
    let parsed: {
      title: string
      description?: string | null
      prepTimeMinutes?: number | null
      cookTimeMinutes?: number | null
      servings?: number | null
      instructions: string | Array<string | { text: string }>
      ingredients: Array<{
        quantity?: number | null
        unit?: string | null
        name: string
        notes?: string | null
      }>
      tags?: string[]
    }

    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      let jsonText = textBlock.text.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      console.log('[recipe-parse] Parsing JSON, length:', jsonText.length)
      parsed = JSON.parse(jsonText)
      console.log('[recipe-parse] JSON parsed successfully, title:', parsed.title)
    } catch (parseError) {
      console.error('[recipe-parse] Failed to parse AI response:', textBlock.text)
      console.error('[recipe-parse] Parse error:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse recipe. Please try again.' },
        { status: 422 }
      )
    }

    // Validate required fields
    console.log('[recipe-parse] Validating parsed data:', {
      hasTitle: !!parsed.title,
      titleType: typeof parsed.title,
      hasInstructions: !!parsed.instructions,
      instructionsType: typeof parsed.instructions,
      isInstructionsArray: Array.isArray(parsed.instructions),
      ingredientCount: parsed.ingredients?.length,
    })

    if (!parsed.title || typeof parsed.title !== 'string') {
      console.error('[recipe-parse] Missing title')
      return NextResponse.json(
        { error: 'Could not identify recipe title' },
        { status: 422 }
      )
    }

    // Handle instructions as string or array
    let instructionsText: string
    if (typeof parsed.instructions === 'string') {
      instructionsText = parsed.instructions
    } else if (Array.isArray(parsed.instructions)) {
      // Convert array of steps to numbered string
      instructionsText = parsed.instructions
        .map((step, index) => {
          if (typeof step === 'string') {
            return `${index + 1}. ${step}`
          } else if (step && typeof step === 'object' && 'text' in step) {
            return `${index + 1}. ${(step as { text: string }).text}`
          }
          return null
        })
        .filter(Boolean)
        .join('\n')
      console.log('[recipe-parse] Converted array instructions to string, length:', instructionsText.length)
    } else {
      console.error('[recipe-parse] Missing or invalid instructions')
      return NextResponse.json(
        { error: 'Could not extract recipe instructions' },
        { status: 422 }
      )
    }

    if (!instructionsText.trim()) {
      console.error('[recipe-parse] Empty instructions')
      return NextResponse.json(
        { error: 'Could not extract recipe instructions' },
        { status: 422 }
      )
    }

    // Build the recipe object in ParsedRecipe format
    const ingredients: ParsedIngredient[] = (parsed.ingredients || [])
      .filter((ing) => ing && typeof ing.name === 'string' && ing.name.trim())
      .map((ing) => ({
        quantity: typeof ing.quantity === 'number' ? ing.quantity : null,
        unit: typeof ing.unit === 'string' ? ing.unit : null,
        name: ing.name.trim(),
        notes: typeof ing.notes === 'string' ? ing.notes : null,
      }))

    const recipe: ParsedRecipe = {
      title: parsed.title.trim(),
      description: typeof parsed.description === 'string' ? parsed.description : null,
      prepTimeMinutes: typeof parsed.prepTimeMinutes === 'number' ? parsed.prepTimeMinutes : null,
      cookTimeMinutes: typeof parsed.cookTimeMinutes === 'number' ? parsed.cookTimeMinutes : null,
      servings: typeof parsed.servings === 'number' ? parsed.servings : null,
      instructions: instructionsText,
      imageUrl: null,
      sourceUrl: '',
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t): t is string => typeof t === 'string').slice(0, 10)
        : [],
      ingredients,
    }

    console.log('[recipe-parse] Success! Returning recipe:', recipe.title)
    return NextResponse.json({
      recipe,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    })
  } catch (error) {
    console.error('[recipe-parse] Error:', error)

    if (error instanceof Anthropic.APIError) {
      console.error('[recipe-parse] Anthropic API Error details:', {
        status: error.status,
        message: error.message,
        name: error.name,
      })
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key configuration' },
          { status: 503 }
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again.' },
          { status: 429 }
        )
      }
      // Return the actual API error message for debugging
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      )
    }

    // For other errors, include more details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to parse recipe: ${errorMessage}` },
      { status: 500 }
    )
  }
}
