import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { ApiClient } from '../api-client.js'

export const webSearchTools: Tool[] = [
  {
    name: 'search_recipes_web',
    description:
      'Search the web for new recipe ideas. This tool provides search guidance - use your web search capability to find recipes, then use import_recipe_from_url to add them to the household collection.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'What kind of recipe to search for (e.g., "easy chicken dinner for kids", "vegetarian pasta", "30 minute weeknight meals")',
        },
        dietary: {
          type: 'string',
          description:
            'Any dietary requirements to include in the search (e.g., "vegetarian", "gluten-free", "dairy-free")',
        },
        cuisine: {
          type: 'string',
          description:
            'Specific cuisine type (e.g., "Italian", "Mexican", "Asian")',
        },
      },
      required: ['query'],
    },
  },
]

export async function handleWebSearchTool(
  name: string,
  args: Record<string, unknown>,
  _api: ApiClient
): Promise<string> {
  switch (name) {
    case 'search_recipes_web': {
      const query = args.query as string
      const dietary = args.dietary as string | undefined
      const cuisine = args.cuisine as string | undefined

      if (!query) {
        throw new Error('query is required')
      }

      // Build a search query
      const searchParts = [query]
      if (dietary) searchParts.push(dietary)
      if (cuisine) searchParts.push(cuisine)
      searchParts.push('recipe')

      const searchQuery = searchParts.join(' ')

      // Provide instructions for using web search
      return JSON.stringify(
        {
          instruction:
            'Use your web search capability to find recipes matching this query. Look for URLs from popular recipe sites.',
          searchQuery,
          recommendedSites: [
            'seriouseats.com',
            'bonappetit.com',
            'allrecipes.com',
            'foodnetwork.com',
            'epicurious.com',
            'budgetbytes.com',
            'skinnytaste.com',
            'minimalistbaker.com',
          ],
          nextSteps: [
            '1. Use web search with the query above',
            '2. Find a recipe that looks good',
            '3. Use import_recipe_from_url with the recipe URL',
            '4. Review the parsed recipe',
            '5. Use save_recipe to add it to the household collection',
          ],
        },
        null,
        2
      )
    }

    default:
      throw new Error(`Unknown web search tool: ${name}`)
  }
}
