import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { ApiClient } from '../api-client.js'

export const recipeTools: Tool[] = [
  {
    name: 'get_recipes',
    description:
      'Search and retrieve recipes from the household collection. Returns recipes with ingredients and family member ratings.',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description:
            'Search text to match against recipe titles, descriptions, and ingredients',
        },
        tag: {
          type: 'string',
          description: 'Filter by a specific tag (e.g., "quick", "vegetarian")',
        },
        type: {
          type: 'string',
          enum: ['MAIN', 'SIDE'],
          description: 'Filter by recipe type',
        },
      },
    },
  },
  {
    name: 'get_recipe_suggestions',
    description:
      'Get personalized recipe suggestions based on family ratings and recent meal history. Returns scored suggestions with reasons.',
    inputSchema: {
      type: 'object',
      properties: {
        ingredients: {
          type: 'string',
          description: 'Comma-separated list of ingredients to match recipes against',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of suggestions to return (default: 5)',
        },
        excludeKidDownvotes: {
          type: 'boolean',
          description:
            'Exclude recipes that children have downvoted (default: true)',
        },
      },
    },
  },
  {
    name: 'import_recipe_from_url',
    description:
      'Import and parse a recipe from a website URL. Extracts structured recipe data including ingredients, instructions, and timing.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the recipe page to import',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'save_recipe',
    description:
      'Save a new recipe to the household collection. Can be used after importing a recipe or to create a new one from scratch.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Recipe title',
        },
        description: {
          type: 'string',
          description: 'Brief description of the recipe',
        },
        instructions: {
          type: 'string',
          description: 'Step-by-step cooking instructions',
        },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Ingredient name' },
              quantity: { type: 'number', description: 'Amount of ingredient' },
              unit: { type: 'string', description: 'Unit of measurement' },
              notes: { type: 'string', description: 'Additional notes (e.g., "chopped")' },
            },
            required: ['name'],
          },
          description: 'List of ingredients',
        },
        prepTimeMinutes: {
          type: 'number',
          description: 'Preparation time in minutes',
        },
        cookTimeMinutes: {
          type: 'number',
          description: 'Cooking time in minutes',
        },
        servings: {
          type: 'number',
          description: 'Number of servings',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization (e.g., ["quick", "vegetarian"])',
        },
        type: {
          type: 'string',
          enum: ['MAIN', 'SIDE'],
          description: 'Recipe type (default: MAIN)',
        },
        sourceUrl: {
          type: 'string',
          description: 'Original source URL if imported',
        },
        imageUrl: {
          type: 'string',
          description: 'URL of recipe image',
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the recipe (tips, variations, substitutions)',
        },
      },
      required: ['title', 'instructions'],
    },
  },
]

export async function handleRecipeTool(
  name: string,
  args: Record<string, unknown>,
  api: ApiClient
): Promise<string> {
  switch (name) {
    case 'get_recipes': {
      const recipes = await api.getRecipes({
        search: args.search as string | undefined,
        tag: args.tag as string | undefined,
        type: args.type as 'MAIN' | 'SIDE' | undefined,
      })

      if (recipes.length === 0) {
        return 'No recipes found matching your criteria.'
      }

      // Format recipes for readability
      const formatted = recipes.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        tags: r.tags,
        prepTime: r.prepTimeMinutes ? `${r.prepTimeMinutes} min` : null,
        cookTime: r.cookTimeMinutes ? `${r.cookTimeMinutes} min` : null,
        servings: r.servings,
        ingredientCount: r.ingredients.length,
        ratings: {
          up: r.ratings.filter((rating) => rating.rating === 'UP').length,
          down: r.ratings.filter((rating) => rating.rating === 'DOWN').length,
        },
      }))

      return JSON.stringify(formatted, null, 2)
    }

    case 'get_recipe_suggestions': {
      const suggestions = await api.getSuggestions({
        ingredients: args.ingredients as string | undefined,
        limit: args.limit as number | undefined,
        excludeKidDownvotes: args.excludeKidDownvotes as boolean | undefined,
      })

      const result: Record<string, unknown> = {
        favorites: suggestions.favorites.map((s) => ({
          title: s.recipe.title,
          score: s.score,
          reason: s.reason,
          tags: s.recipe.tags,
          type: s.recipe.type,
        })),
      }

      if (suggestions.ingredientMatches) {
        result.ingredientMatches = suggestions.ingredientMatches.map((s) => ({
          title: s.recipe.title,
          score: s.score,
          reason: s.reason,
          tags: s.recipe.tags,
        }))
      }

      if (suggestions.perishableMatches) {
        result.perishableMatches = suggestions.perishableMatches.map((s) => ({
          title: s.recipe.title,
          score: s.score,
          reason: s.reason,
          tags: s.recipe.tags,
          note: 'Uses perishable items - prioritize to reduce waste',
        }))
      }

      return JSON.stringify(result, null, 2)
    }

    case 'import_recipe_from_url': {
      const url = args.url as string
      if (!url) {
        throw new Error('URL is required')
      }

      const parsed = await api.importRecipe(url)

      return JSON.stringify(
        {
          message: 'Recipe parsed successfully. Use save_recipe to add it to your collection.',
          recipe: {
            title: parsed.title,
            description: parsed.description,
            prepTimeMinutes: parsed.prepTimeMinutes,
            cookTimeMinutes: parsed.cookTimeMinutes,
            servings: parsed.servings,
            ingredientCount: parsed.ingredients.length,
            tags: parsed.tags,
            sourceUrl: parsed.sourceUrl,
            imageUrl: parsed.imageUrl,
          },
          fullRecipe: parsed,
        },
        null,
        2
      )
    }

    case 'save_recipe': {
      const recipe = await api.createRecipe({
        title: args.title as string,
        description: args.description as string | undefined,
        instructions: args.instructions as string,
        ingredients: args.ingredients as
          | { name: string; quantity?: number; unit?: string; notes?: string }[]
          | undefined,
        prepTimeMinutes: args.prepTimeMinutes as number | undefined,
        cookTimeMinutes: args.cookTimeMinutes as number | undefined,
        servings: args.servings as number | undefined,
        tags: args.tags as string[] | undefined,
        type: args.type as 'MAIN' | 'SIDE' | undefined,
        sourceUrl: args.sourceUrl as string | undefined,
        imageUrl: args.imageUrl as string | undefined,
        notes: args.notes as string | undefined,
      })

      return JSON.stringify(
        {
          message: 'Recipe saved successfully!',
          recipe: {
            id: recipe.id,
            title: recipe.title,
            type: recipe.type,
          },
        },
        null,
        2
      )
    }

    default:
      throw new Error(`Unknown recipe tool: ${name}`)
  }
}
