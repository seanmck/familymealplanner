// Web recipe search using Brave Search API

import Anthropic from '@anthropic-ai/sdk'

export interface WebRecipeResult {
  title: string
  url: string
  snippet: string
  source: string
  imageUrl?: string | null
}

export interface WebSearchResponse {
  results: WebRecipeResult[]
  searchQuery: string
}

const RECIPE_SITES = [
  'allrecipes.com',
  'seriouseats.com',
  'budgetbytes.com',
  'foodnetwork.com',
  'bonappetit.com',
  'epicurious.com',
  'simplyrecipes.com',
  'delish.com',
]

interface BraveSearchResult {
  title: string
  url: string
  description: string
  thumbnail?: {
    src: string
  }
}

interface BraveSearchResponse {
  web?: {
    results: BraveSearchResult[]
  }
}

/**
 * Search for recipes using Brave Search API
 */
export async function searchWebRecipes(
  query: string,
  limit: number = 5
): Promise<WebSearchResponse> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY

  if (!apiKey) {
    console.error('BRAVE_SEARCH_API_KEY not configured')
    return { results: [], searchQuery: query }
  }

  try {
    // Add recipe sites to query for better results
    const siteQuery = RECIPE_SITES.slice(0, 3).map(s => `site:${s}`).join(' OR ')
    const fullQuery = `${query} recipe (${siteQuery})`

    const url = new URL('https://api.search.brave.com/res/v1/web/search')
    url.searchParams.set('q', fullQuery)
    url.searchParams.set('count', '20') // Fetch more to filter with LLM

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    })

    if (!response.ok) {
      console.error('Brave search failed:', response.status, await response.text())
      return { results: [], searchQuery: query }
    }

    const data: BraveSearchResponse = await response.json()

    // Parse results from recipe sites
    const candidates = parseSearchResults(data, 20)

    // Use LLM to filter out roundup/listicle pages
    const filtered = await filterWithLLM(candidates)

    // Return requested limit
    const results = filtered.slice(0, limit)

    console.log(`Web search for "${query}": ${candidates.length} candidates -> ${filtered.length} valid -> ${results.length} returned`)

    return { results, searchQuery: query }
  } catch (error) {
    console.error('Web search failed:', error)
    return { results: [], searchQuery: query }
  }
}

/**
 * Use LLM to filter out roundup/listicle pages, keeping only single-recipe URLs
 */
async function filterWithLLM(candidates: WebRecipeResult[]): Promise<WebRecipeResult[]> {
  if (candidates.length === 0) {
    return []
  }

  // Skip LLM filtering if Anthropic not configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not configured, skipping LLM filter')
    return candidates
  }

  try {
    const anthropic = new Anthropic()

    // Build compact list for LLM
    const candidateList = candidates.map((c, i) =>
      `${i + 1}. "${c.title}" - ${c.url}${c.snippet ? ` | ${c.snippet.slice(0, 100)}` : ''}`
    ).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Filter this list to ONLY include URLs that link to a SINGLE recipe page.

EXCLUDE:
- Roundup/listicle pages ("25 best dinners", "easy weeknight meal ideas")
- Gallery/collection pages listing multiple recipes
- Category or index pages

INCLUDE:
- Pages for ONE specific recipe (e.g., "Honey Garlic Chicken", "Sheet Pan Salmon")

${candidateList}

Return JSON with the numbers of valid single-recipe pages: {"valid": [1, 3, 5]}`
      }]
    })

    const text = response.content[0]
    if (text.type !== 'text') {
      return candidates
    }

    // Parse response
    const match = text.text.match(/\{[\s\S]*"valid"[\s\S]*\[[\s\S]*\][\s\S]*\}/)
    if (!match) {
      console.warn('LLM filter returned unexpected format:', text.text)
      return candidates
    }

    const parsed = JSON.parse(match[0])
    const validIndices = new Set(parsed.valid.map((n: number) => n - 1)) // Convert to 0-indexed

    return candidates.filter((_, i) => validIndices.has(i))
  } catch (error) {
    console.error('LLM filter failed, returning all candidates:', error)
    return candidates
  }
}

/**
 * Parse search results from Brave Search API response
 */
function parseSearchResults(data: BraveSearchResponse, limit: number): WebRecipeResult[] {
  const results: WebRecipeResult[] = []

  if (!data.web?.results) {
    return results
  }

  for (const result of data.web.results) {
    // Only include results from recipe sites
    if (!RECIPE_SITES.some(site => result.url.includes(site))) {
      continue
    }

    // Extract source domain
    let source = 'web'
    try {
      source = new URL(result.url).hostname.replace('www.', '')
    } catch {
      // Keep default
    }

    results.push({
      title: cleanRecipeTitle(result.title),
      url: result.url,
      snippet: result.description || '',
      source,
      imageUrl: result.thumbnail?.src || null,
    })

    if (results.length >= limit) {
      break
    }
  }

  return results
}

/**
 * Clean up recipe titles from search results
 */
function cleanRecipeTitle(title: string): string {
  return title
    .replace(/\s*[\|\-–—]\s*(Allrecipes|Food Network|Bon Appétit|Epicurious|Serious Eats|Budget Bytes|Delish|Simply Recipes|Taste of Home|NYT Cooking).*$/i, '')
    .replace(/\s*Recipe\s*$/i, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .trim()
}

export interface SearchQueryContext {
  userPrompt?: string
  perishables: string[]
  preferredTags: string[]
  recentMeals: string[]
  familyNotes?: string // e.g., "2 adults, 1 picky child"
}

/**
 * Use LLM to generate targeted search queries based on context
 */
export async function buildSearchQueries(
  context: SearchQueryContext
): Promise<string[]> {
  // Fallback queries if LLM unavailable
  const fallbackQueries = ['easy weeknight dinner', 'quick family dinner']

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not configured, using fallback queries')
    return fallbackQueries
  }

  try {
    const anthropic = new Anthropic()

    const contextLines: string[] = []

    if (context.userPrompt) {
      contextLines.push(`User request: "${context.userPrompt}"`)
    }
    if (context.perishables.length > 0) {
      contextLines.push(`Expiring ingredients to use: ${context.perishables.join(', ')}`)
    }
    if (context.preferredTags.length > 0) {
      contextLines.push(`Family preferences: ${context.preferredTags.join(', ')}`)
    }
    if (context.recentMeals.length > 0) {
      contextLines.push(`Recently made (avoid similar): ${context.recentMeals.slice(0, 5).join(', ')}`)
    }
    if (context.familyNotes) {
      contextLines.push(`Family: ${context.familyNotes}`)
    }

    // If no context, return fallbacks
    if (contextLines.length === 0) {
      return fallbackQueries
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Generate ONE specific recipe search query based on this context:

${contextLines.join('\n')}

Guidelines:
- Be specific (e.g., "honey garlic salmon" not "fish dinner")
- Prioritize using expiring ingredients if listed
- Target a single recipe, not roundups

Return JSON: {"query": "your search query"}`
      }]
    })

    const text = response.content[0]
    if (text.type !== 'text') {
      return fallbackQueries
    }

    const match = text.text.match(/\{[\s\S]*"query"[\s\S]*:[\s\S]*"([^"]+)"[\s\S]*\}/)
    if (!match) {
      console.warn('Query generation returned unexpected format:', text.text)
      return fallbackQueries
    }

    const query = match[1].trim()

    console.log('LLM generated search query:', query)

    return query.length > 0 ? [query] : fallbackQueries
  } catch (error) {
    console.error('Query generation failed, using fallbacks:', error)
    return fallbackQueries
  }
}

/**
 * Fetch the image URL from a recipe page
 * Looks for og:image, schema.org image, or twitter:image
 */
export async function fetchRecipeImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      return null
    }

    const html = await response.text()

    // Try og:image first (most common) - handle various attribute orderings
    let imageUrl: string | null = null

    // Pattern 1: property before content
    const ogMatch1 = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    if (ogMatch1) {
      imageUrl = ogMatch1[1]
    }

    // Pattern 2: content before property
    if (!imageUrl) {
      const ogMatch2 = html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i)
      if (ogMatch2) {
        imageUrl = ogMatch2[1]
      }
    }

    // Pattern 3: with other attributes in between
    if (!imageUrl) {
      const ogMatch3 = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      if (ogMatch3) {
        imageUrl = ogMatch3[1]
      }
    }

    if (imageUrl) {
      return imageUrl
    }

    // Try twitter:image
    const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
    if (twitterMatch) {
      return twitterMatch[1]
    }

    // Try schema.org Recipe image
    const schemaMatch = html.match(/"image"\s*:\s*"([^"]+)"/i)
      || html.match(/"image"\s*:\s*\[\s*"([^"]+)"/i)
    if (schemaMatch) {
      return schemaMatch[1]
    }

    return null
  } catch {
    return null
  }
}

/**
 * Enrich web recipe results with images (fetched in parallel)
 */
export async function enrichWithImages(
  results: WebRecipeResult[]
): Promise<WebRecipeResult[]> {
  const imagePromises = results.map(async (result) => {
    const imageUrl = await fetchRecipeImage(result.url)
    return { ...result, imageUrl }
  })

  return Promise.all(imagePromises)
}
