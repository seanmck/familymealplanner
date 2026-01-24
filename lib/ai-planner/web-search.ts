// Web recipe search using DuckDuckGo (no API key required)

export interface WebRecipeResult {
  title: string
  url: string
  snippet: string
  source: string
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

/**
 * Search for recipes using DuckDuckGo HTML (no API key needed)
 */
export async function searchWebRecipes(
  query: string,
  limit: number = 5
): Promise<WebSearchResponse> {
  try {
    // Add recipe sites to query for better results
    const siteQuery = RECIPE_SITES.slice(0, 3).map(s => `site:${s}`).join(' OR ')
    const fullQuery = `${query} recipe (${siteQuery})`

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(fullQuery)}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FamilyTable/1.0)',
      },
    })

    if (!response.ok) {
      console.error('DuckDuckGo search failed:', response.status)
      return { results: [], searchQuery: query }
    }

    const html = await response.text()

    // Parse results from HTML
    const results = parseSearchResults(html, limit)

    console.log(`Web search for "${query}" found ${results.length} recipes`)

    return { results, searchQuery: query }
  } catch (error) {
    console.error('Web search failed:', error)
    return { results: [], searchQuery: query }
  }
}

/**
 * Parse search results from DuckDuckGo HTML
 */
function parseSearchResults(html: string, limit: number): WebRecipeResult[] {
  const results: WebRecipeResult[] = []

  // Match result blocks - DuckDuckGo uses class="result__a" for links
  const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi
  const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/gi

  let linkMatch
  const links: { url: string; title: string }[] = []

  while ((linkMatch = linkRegex.exec(html)) !== null && links.length < limit * 2) {
    let url = linkMatch[1]
    const title = linkMatch[2].trim()

    // DuckDuckGo wraps URLs - extract the actual URL
    if (url.includes('uddg=')) {
      const match = url.match(/uddg=([^&]+)/)
      if (match) {
        url = decodeURIComponent(match[1])
      }
    }

    // Only include results from recipe sites
    if (RECIPE_SITES.some(site => url.includes(site))) {
      links.push({ url, title })
    }
  }

  // Get snippets
  const snippets: string[] = []
  let snippetMatch
  while ((snippetMatch = snippetRegex.exec(html)) !== null) {
    snippets.push(snippetMatch[1].replace(/<[^>]+>/g, '').trim())
  }

  // Combine links with snippets
  for (let i = 0; i < Math.min(links.length, limit); i++) {
    const { url, title } = links[i]

    // Extract source domain
    let source = 'web'
    try {
      source = new URL(url).hostname.replace('www.', '')
    } catch {
      // Keep default
    }

    results.push({
      title: cleanRecipeTitle(title),
      url,
      snippet: snippets[i] || '',
      source,
    })
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

/**
 * Build search queries based on context
 */
export function buildSearchQueries(
  perishables: string[],
  preferredTags: string[],
  userPrompt?: string
): string[] {
  const queries: string[] = []

  if (userPrompt) {
    queries.push(userPrompt)
  }

  if (perishables.length > 0) {
    const perishableQuery = perishables.slice(0, 3).join(' ')
    queries.push(`easy ${perishableQuery} dinner`)
  }

  if (preferredTags.length > 0) {
    const tagQuery = preferredTags.slice(0, 2).join(' ')
    queries.push(`${tagQuery} dinner`)
  }

  if (queries.length < 2) {
    queries.push('easy weeknight dinner')
    queries.push('quick family dinner')
  }

  return queries.slice(0, 3)
}
