// Google Custom Search integration for recipe discovery

export interface WebRecipeResult {
  title: string
  url: string
  snippet: string
  source: string // e.g., "allrecipes.com"
}

export interface WebSearchResponse {
  results: WebRecipeResult[]
  searchQuery: string
}

/**
 * Search for recipes using Google Custom Search API
 */
export async function searchWebRecipes(
  query: string,
  limit: number = 5
): Promise<WebSearchResponse> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID

  if (!apiKey || !searchEngineId) {
    console.warn('Google Search API not configured, skipping web search')
    return { results: [], searchQuery: query }
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: `${query} recipe`,
      num: String(Math.min(limit, 10)), // Google API max is 10
    })

    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params}`
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('Google Search API error:', error)
      return { results: [], searchQuery: query }
    }

    const data = await response.json()

    const results: WebRecipeResult[] = (data.items || []).map(
      (item: { title: string; link: string; snippet: string; displayLink: string }) => ({
        title: cleanRecipeTitle(item.title),
        url: item.link,
        snippet: item.snippet || '',
        source: item.displayLink,
      })
    )

    return { results, searchQuery: query }
  } catch (error) {
    console.error('Web search failed:', error)
    return { results: [], searchQuery: query }
  }
}

/**
 * Clean up recipe titles from search results
 */
function cleanRecipeTitle(title: string): string {
  // Remove common suffixes like "| Allrecipes", "- Food Network", etc.
  return title
    .replace(/\s*[\|\-–—]\s*(Allrecipes|Food Network|Bon Appétit|Epicurious|Serious Eats|Budget Bytes|Delish|Simply Recipes|Taste of Home|NYT Cooking).*$/i, '')
    .replace(/\s*Recipe\s*$/i, '')
    .trim()
}

/**
 * Build search queries based on context (perishables, preferences, user request)
 */
export function buildSearchQueries(
  perishables: string[],
  preferredTags: string[],
  userPrompt?: string
): string[] {
  const queries: string[] = []

  // If user has specific request, prioritize that
  if (userPrompt) {
    queries.push(userPrompt)
  }

  // Build queries from expiring perishables
  if (perishables.length > 0) {
    // Combine first 2-3 perishables into a query
    const perishableQuery = perishables.slice(0, 3).join(' ')
    queries.push(`easy ${perishableQuery} dinner`)
  }

  // Build queries from preferred tags
  if (preferredTags.length > 0) {
    const tagQuery = preferredTags.slice(0, 2).join(' ')
    queries.push(`${tagQuery} dinner recipes`)
  }

  // Add some variety queries if we don't have enough
  if (queries.length < 2) {
    queries.push('easy weeknight dinner')
    queries.push('quick family dinner')
  }

  return queries.slice(0, 3) // Max 3 queries to limit API calls
}
