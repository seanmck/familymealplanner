/**
 * Fetch the image URL from a recipe page
 * Looks for og:image, twitter:image, or schema.org image
 */
export async function fetchRecipeImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return null
    }

    const html = await response.text()

    // Try og:image first (most common)
    const ogPatterns = [
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
      /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    ]

    for (const pattern of ogPatterns) {
      const match = html.match(pattern)
      if (match) {
        return match[1]
      }
    }

    // Try twitter:image
    const twitterPatterns = [
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ]

    for (const pattern of twitterPatterns) {
      const match = html.match(pattern)
      if (match) {
        return match[1]
      }
    }

    // Try schema.org Recipe image
    const schemaPatterns = [
      /"image"\s*:\s*"([^"]+)"/i,
      /"image"\s*:\s*\[\s*"([^"]+)"/i,
    ]

    for (const pattern of schemaPatterns) {
      const match = html.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  } catch {
    return null
  }
}
