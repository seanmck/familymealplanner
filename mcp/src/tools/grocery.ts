import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { ApiClient } from '../api-client.js'

export const groceryTools: Tool[] = [
  {
    name: 'get_grocery_list',
    description:
      'Get the grocery list for a specific meal plan. Returns items organized by category with checked status.',
    inputSchema: {
      type: 'object',
      properties: {
        mealPlanId: {
          type: 'string',
          description: 'The ID of the meal plan to get the grocery list for',
        },
      },
      required: ['mealPlanId'],
    },
  },
  {
    name: 'get_pantry_staples',
    description:
      'Get the list of pantry staples for the household. These are items that are typically always in stock and are excluded from grocery lists.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

export async function handleGroceryTool(
  name: string,
  args: Record<string, unknown>,
  api: ApiClient
): Promise<string> {
  switch (name) {
    case 'get_grocery_list': {
      const mealPlanId = args.mealPlanId as string
      if (!mealPlanId) {
        throw new Error('mealPlanId is required')
      }

      const groceryList = await api.getGroceryList(mealPlanId)

      if (!groceryList) {
        return 'No grocery list found for this meal plan. Generate one in the app by clicking the grocery list button.'
      }

      // Organize by category
      const byCategory: Record<
        string,
        { name: string; quantity: string | null; unit: string | null; checked: boolean }[]
      > = {}

      for (const item of groceryList.items) {
        const category = item.category || 'Other'
        if (!byCategory[category]) {
          byCategory[category] = []
        }
        byCategory[category].push({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          checked: item.isChecked,
        })
      }

      const totalItems = groceryList.items.length
      const checkedItems = groceryList.items.filter((i) => i.isChecked).length

      return JSON.stringify(
        {
          groceryListId: groceryList.id,
          summary: {
            totalItems,
            checkedItems,
            remainingItems: totalItems - checkedItems,
          },
          itemsByCategory: byCategory,
        },
        null,
        2
      )
    }

    case 'get_pantry_staples': {
      const staples = await api.getPantryStaples()

      if (staples.length === 0) {
        return 'No pantry staples configured. Add common items like salt, oil, and spices in the app settings to automatically exclude them from grocery lists.'
      }

      return JSON.stringify(
        {
          totalStaples: staples.length,
          staples: staples.map((s) => s.displayName),
        },
        null,
        2
      )
    }

    default:
      throw new Error(`Unknown grocery tool: ${name}`)
  }
}
