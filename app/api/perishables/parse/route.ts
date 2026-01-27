import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth'

const MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are a helpful assistant that parses free-form text about perishable food items into structured data.

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

export interface ParsedPerishable {
  name: string
  quantity?: number
  unit?: string
  expirationDate?: string
  notes?: string
}

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

    const { text } = await request.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    const anthropic = new Anthropic()

    const today = new Date().toISOString().split('T')[0]
    const userPrompt = `Today's date is ${today}.

Parse these perishable items:
${text.trim()}`

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
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
