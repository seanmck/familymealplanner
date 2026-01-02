import * as cheerio from 'cheerio'

export interface ParsedIngredient {
  quantity: number | null
  unit: string | null
  name: string
  notes: string | null
}

export interface ParsedRecipe {
  title: string
  description: string | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  servings: number | null
  instructions: string
  imageUrl: string | null
  sourceUrl: string
  tags: string[]
  ingredients: ParsedIngredient[]
}

// Common units for ingredient parsing
const UNITS = [
  'cups?', 'c\\.?',
  'tablespoons?', 'tbsps?\\.?', 'T\\.?',
  'teaspoons?', 'tsps?\\.?', 't\\.?',
  'ounces?', 'oz\\.?',
  'pounds?', 'lbs?\\.?',
  'grams?', 'g\\.?',
  'kilograms?', 'kgs?\\.?',
  'milliliters?', 'ml\\.?',
  'liters?', 'l\\.?',
  'quarts?', 'qts?\\.?',
  'pints?', 'pts?\\.?',
  'gallons?', 'gal\\.?',
  'pinch(?:es)?',
  'dash(?:es)?',
  'cloves?',
  'slices?',
  'pieces?',
  'cans?',
  'packages?', 'pkgs?\\.?',
  'bunches?',
  'heads?',
  'stalks?',
  'sprigs?',
  'leaves?',
  'whole',
  'large',
  'medium',
  'small',
]

const UNIT_PATTERN = new RegExp(`^(${UNITS.join('|')})\\s+`, 'i')

/**
 * Parse ISO 8601 duration (e.g., PT30M, PT1H15M) to minutes
 */
function parseDuration(duration: string | undefined): number | null {
  if (!duration) return null

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return null

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)

  return hours * 60 + minutes || null
}

/**
 * Parse a fraction string to a decimal number
 */
function parseFraction(str: string): number {
  // Handle unicode fractions
  const unicodeFractions: Record<string, number> = {
    '½': 0.5, '⅓': 0.333, '⅔': 0.667,
    '¼': 0.25, '¾': 0.75,
    '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
    '⅙': 0.167, '⅚': 0.833,
    '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
  }

  let result = 0
  let remaining = str.trim()

  // Check for unicode fractions
  for (const [frac, value] of Object.entries(unicodeFractions)) {
    if (remaining.includes(frac)) {
      result += value
      remaining = remaining.replace(frac, '').trim()
    }
  }

  // Check for whole number + fraction like "1 1/2"
  const mixedMatch = remaining.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch) {
    return parseInt(mixedMatch[1], 10) + parseInt(mixedMatch[2], 10) / parseInt(mixedMatch[3], 10)
  }

  // Check for simple fraction like "1/2"
  const fractionMatch = remaining.match(/^(\d+)\/(\d+)$/)
  if (fractionMatch) {
    return result + parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10)
  }

  // Check for decimal or whole number
  const numMatch = remaining.match(/^(\d+\.?\d*)$/)
  if (numMatch) {
    return result + parseFloat(numMatch[1])
  }

  return result || 0
}

/**
 * Parse an ingredient string into quantity, unit, and name
 */
function parseIngredient(ingredientStr: string): ParsedIngredient {
  let str = ingredientStr.trim()

  // Extract notes in parentheses
  let notes: string | null = null
  const notesMatch = str.match(/\(([^)]+)\)/)
  if (notesMatch) {
    notes = notesMatch[1]
    str = str.replace(notesMatch[0], '').trim()
  }

  // Extract quantity (numbers, fractions, unicode fractions at the start)
  const quantityMatch = str.match(/^([\d\s\/½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞.]+)/)
  let quantity: number | null = null
  if (quantityMatch) {
    quantity = parseFraction(quantityMatch[1])
    if (quantity === 0) quantity = null
    str = str.slice(quantityMatch[0].length).trim()
  }

  // Extract unit
  let unit: string | null = null
  const unitMatch = str.match(UNIT_PATTERN)
  if (unitMatch) {
    unit = unitMatch[1].toLowerCase()
    // Normalize common abbreviations
    if (unit.match(/^c\.?$/i)) unit = 'cup'
    if (unit.match(/^tbsps?\.?$/i) || unit === 't.') unit = 'tablespoon'
    if (unit.match(/^tsps?\.?$/i) || unit === 't.') unit = 'teaspoon'
    if (unit.match(/^oz\.?$/i)) unit = 'ounce'
    if (unit.match(/^lbs?\.?$/i)) unit = 'pound'
    if (unit.match(/^g\.?$/i)) unit = 'gram'
    if (unit.match(/^ml\.?$/i)) unit = 'milliliter'
    str = str.slice(unitMatch[0].length).trim()
  }

  // Remove leading "of " if present
  str = str.replace(/^of\s+/i, '')

  return {
    quantity,
    unit,
    name: str,
    notes,
  }
}

/**
 * Extract servings from recipeYield field
 */
function parseServings(yieldValue: string | number | string[] | undefined): number | null {
  if (!yieldValue) return null

  // Handle array (take first value)
  if (Array.isArray(yieldValue)) {
    yieldValue = yieldValue[0]
  }

  // Handle number
  if (typeof yieldValue === 'number') {
    return yieldValue
  }

  // Extract number from string like "4 servings" or "Serves 6"
  const match = yieldValue.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Extract instructions from various formats
 */
function parseInstructions(instructions: unknown): string {
  if (!instructions) return ''

  // If it's a string, return as-is
  if (typeof instructions === 'string') {
    return instructions
  }

  // If it's an array, process each item
  if (Array.isArray(instructions)) {
    return instructions.map((instruction, index) => {
      if (typeof instruction === 'string') {
        return `${index + 1}. ${instruction}`
      }
      // HowToStep or HowToSection object
      if (instruction.text) {
        return `${index + 1}. ${instruction.text}`
      }
      if (instruction.name && instruction.itemListElement) {
        // HowToSection with steps
        const sectionSteps = instruction.itemListElement
          .map((step: { text?: string }, i: number) => `   ${i + 1}. ${step.text || ''}`)
          .join('\n')
        return `${instruction.name}:\n${sectionSteps}`
      }
      return ''
    }).filter(Boolean).join('\n\n')
  }

  return ''
}

/**
 * Extract image URL from various formats
 */
function parseImageUrl(image: unknown): string | null {
  if (!image) return null

  if (typeof image === 'string') {
    return image
  }

  if (Array.isArray(image)) {
    // Take the first image
    return parseImageUrl(image[0])
  }

  if (typeof image === 'object' && image !== null) {
    // ImageObject
    const imgObj = image as { url?: string; contentUrl?: string }
    return imgObj.url || imgObj.contentUrl || null
  }

  return null
}

/**
 * Extract tags from keywords and categories
 */
function parseTags(recipe: Record<string, unknown>): string[] {
  const tags: string[] = []

  // Extract from keywords (can be string or array)
  if (recipe.keywords) {
    if (typeof recipe.keywords === 'string') {
      tags.push(...recipe.keywords.split(',').map(k => k.trim()).filter(Boolean))
    } else if (Array.isArray(recipe.keywords)) {
      tags.push(...recipe.keywords)
    }
  }

  // Extract from recipeCategory
  if (recipe.recipeCategory) {
    if (typeof recipe.recipeCategory === 'string') {
      tags.push(recipe.recipeCategory)
    } else if (Array.isArray(recipe.recipeCategory)) {
      tags.push(...recipe.recipeCategory)
    }
  }

  // Extract from recipeCuisine
  if (recipe.recipeCuisine) {
    if (typeof recipe.recipeCuisine === 'string') {
      tags.push(recipe.recipeCuisine)
    } else if (Array.isArray(recipe.recipeCuisine)) {
      tags.push(...recipe.recipeCuisine)
    }
  }

  // Deduplicate and clean
  return [...new Set(tags.map(t => t.toLowerCase().trim()))].slice(0, 10)
}

/**
 * Find Recipe schema in JSON-LD data (handles nested @graph structures)
 */
function findRecipeInJsonLd(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>

  // Direct Recipe type
  if (obj['@type'] === 'Recipe' ||
      (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) {
    return obj
  }

  // Check @graph array
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      const recipe = findRecipeInJsonLd(item)
      if (recipe) return recipe
    }
  }

  // Check if it's an array at the top level
  if (Array.isArray(data)) {
    for (const item of data) {
      const recipe = findRecipeInJsonLd(item)
      if (recipe) return recipe
    }
  }

  return null
}

/**
 * Parse a recipe from a URL by extracting JSON-LD structured data
 */
export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('Invalid URL format')
  }

  // Fetch the page
  let html: string
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FamilyMealPlanner/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
    }

    html = await response.text()
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Failed to fetch')) {
      throw error
    }
    throw new Error('Could not access that URL')
  }

  // Parse HTML
  const $ = cheerio.load(html)

  // Find all JSON-LD scripts
  const jsonLdScripts = $('script[type="application/ld+json"]')

  let recipeData: Record<string, unknown> | null = null

  jsonLdScripts.each((_, script) => {
    if (recipeData) return // Already found

    try {
      const content = $(script).html()
      if (!content) return

      const data = JSON.parse(content)
      recipeData = findRecipeInJsonLd(data)
    } catch {
      // Invalid JSON, skip
    }
  })

  if (!recipeData) {
    throw new Error('No recipe data found on that page')
  }

  // Type assertion after null check (TypeScript can't track this through cheerio's each callback)
  const recipe = recipeData as Record<string, unknown>

  // Extract and validate required fields
  const title = recipe.name as string
  if (!title) {
    throw new Error('Recipe is missing a title')
  }

  // Parse ingredients
  const ingredientStrings = recipe.recipeIngredient as string[] || []
  const ingredients = ingredientStrings.map(parseIngredient)

  // Parse instructions
  const instructions = parseInstructions(recipe.recipeInstructions)
  if (!instructions) {
    throw new Error('Recipe is missing instructions')
  }

  return {
    title,
    description: (recipe.description as string) || null,
    prepTimeMinutes: parseDuration(recipe.prepTime as string),
    cookTimeMinutes: parseDuration(recipe.cookTime as string),
    servings: parseServings(recipe.recipeYield as string | number | string[]),
    instructions,
    imageUrl: parseImageUrl(recipe.image),
    sourceUrl: parsedUrl.href,
    tags: parseTags(recipe),
    ingredients,
  }
}
