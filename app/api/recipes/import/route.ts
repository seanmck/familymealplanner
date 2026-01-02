import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/api-auth'
import { parseRecipeFromUrl } from '@/lib/recipe-parser'

export async function POST(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Parse the recipe from the URL
    const parsedRecipe = await parseRecipeFromUrl(url)

    return NextResponse.json(parsedRecipe)
  } catch (error) {
    console.error('Error importing recipe:', error)

    // Return user-friendly error messages
    if (error instanceof Error) {
      const message = error.message

      if (message === 'Invalid URL format') {
        return NextResponse.json(
          { error: 'Please enter a valid URL' },
          { status: 400 }
        )
      }

      if (message === 'Could not access that URL') {
        return NextResponse.json(
          { error: 'Could not access that URL. The site may be blocking requests.' },
          { status: 400 }
        )
      }

      if (message === 'No recipe data found on that page') {
        return NextResponse.json(
          { error: 'No recipe data found on that page. Try a different URL.' },
          { status: 400 }
        )
      }

      if (message.startsWith('Recipe is missing')) {
        return NextResponse.json(
          { error: message },
          { status: 400 }
        )
      }

      if (message.startsWith('Failed to fetch')) {
        return NextResponse.json(
          { error: message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to import recipe' },
      { status: 500 }
    )
  }
}
