import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth'

const MODEL = 'claude-haiku-4-5-20251001'

const TEXT_SYSTEM_PROMPT = `You are a helpful assistant that parses free-form text about perishable food items into structured data.

Given a list of perishable items (one per line or comma-separated), extract:
- name: The item name (required)
- quantity: Numeric quantity if mentioned (optional)
- unit: Unit of measurement if mentioned (optional) - use standard units like "lbs", "oz", "count", "dozen", "cups", etc.
- expirationDate: ISO date string if mentioned (optional) - interpret relative dates like "tomorrow", "in 3 days", "next week" based on today's date

Handle natural language gracefully:
- "3 apples" → { name: "Apples", quantity: 3 }
- "half a lemon" → { name: "Lemon", quantity: 0.5 }
- "milk expires tomorrow" → { name: "Milk", expirationDate: "<tomorrow's date>" }
- "2 lbs ground beef" → { name: "Ground Beef", quantity: 2, unit: "lbs" }
- "leftover chicken" → { name: "Chicken", notes: "leftover" }
- "spinach (wilty)" → { name: "Spinach", notes: "wilty" }

Respond ONLY with a JSON array of objects. No other text.
Example output:
[
  { "name": "Apples", "quantity": 3 },
  { "name": "Milk", "expirationDate": "2024-02-01" },
  { "name": "Ground Beef", "quantity": 2, "unit": "lbs" }
]`

const IMAGE_SYSTEM_PROMPT = `You are a helpful assistant that identifies perishable food items from photos.

Look at the photo and identify all visible perishable food items. For each item, extract:
- name: The item name (required) - use common grocery names
- quantity: Estimated count or amount if you can tell (optional)
- unit: Unit of measurement if applicable (optional) - use standard units like "lbs", "oz", "count", "dozen", "cups", etc.
- expirationDate: ISO date string if you can read a date label (optional)
- notes: Any relevant observations like "opened", "half used", "looks wilty" (optional)

Be practical - list items you can reasonably identify. Don't guess at items you can't see clearly.

Respond ONLY with a JSON array of objects. No other text.
Example output:
[
  { "name": "Milk", "quantity": 1, "notes": "gallon jug" },
  { "name": "Eggs", "quantity": 1, "unit": "dozen" },
  { "name": "Spinach", "notes": "bag, looks fresh" }
]`

export interface ParsedPerishable {
  name: string
  quantity?: number
  unit?: string
  expirationDate?: string
  notes?: string
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI features not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { text, image, mediaType } = body

    const hasText = text && typeof text === 'string' && text.trim().length > 0
    const hasImage = image && typeof image === 'string' && mediaType

    if (!hasText && !hasImage) {
      return NextResponse.json(
        { error: 'Either text or image is required' },
        { status: 400 }
      )
    }

    // Validate image size (base64 is ~33% larger than binary)
    if (hasImage) {
      const estimatedSize = (image.length * 3) / 4
      if (estimatedSize > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: 'Image too large. Please use a smaller photo (max 5MB).' },
          { status: 400 }
        )
      }
    }

    const anthropic = new Anthropic()
    const today = new Date().toISOString().split('T')[0]

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
          text: `Today's date is ${today}. Identify all perishable food items in this photo.`,
        },
      ]
    } else {
      systemPrompt = TEXT_SYSTEM_PROMPT
      content = `Today's date is ${today}.\n\nParse these perishable items:\n${text.trim()}`
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    })

    const textBlock = response.content.find((c) => c.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse the JSON response
    let parsed: ParsedPerishable[]
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      let jsonText = textBlock.text.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      parsed = JSON.parse(jsonText)
    } catch {
      console.error('Failed to parse AI response:', textBlock.text)
      return NextResponse.json(
        { error: 'Failed to parse items. Please try again.' },
        { status: 422 }
      )
    }

    // Validate and clean up the parsed items
    const items = parsed
      .filter((item) => item && typeof item.name === 'string' && item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        quantity: typeof item.quantity === 'number' ? item.quantity : undefined,
        unit: typeof item.unit === 'string' ? item.unit : undefined,
        expirationDate: typeof item.expirationDate === 'string' ? item.expirationDate : undefined,
        notes: typeof item.notes === 'string' ? item.notes : undefined,
      }))

    return NextResponse.json({
      items,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    })
  } catch (error) {
    console.error('Error parsing perishables:', error)

    if (error instanceof Anthropic.APIError) {
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
    }

    return NextResponse.json(
      { error: 'Failed to parse items' },
      { status: 500 }
    )
  }
}
