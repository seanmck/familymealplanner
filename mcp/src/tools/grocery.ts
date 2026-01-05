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
  {
    name: 'get_perishables',
    description:
      'Get the list of perishable items in the household inventory. Returns items with optional quantities and expiration dates. Items expiring soon should be prioritized when planning meals to reduce food waste.',
    inputSchema: {
      type: 'object',
      properties: {
        expiringWithinDays: {
          type: 'number',
          description:
            'Filter to only show items expiring within this many days (optional)',
        },
      },
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

    case 'get_perishables': {
      const perishables = await api.getPerishables()
      const expiringWithinDays = args.expiringWithinDays as number | undefined

      let filtered = perishables
      if (expiringWithinDays !== undefined) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const cutoffDate = new Date(today)
        cutoffDate.setDate(cutoffDate.getDate() + expiringWithinDays)

        filtered = perishables.filter((p) => {
          if (!p.expirationDate) return false
          const expDate = new Date(p.expirationDate)
          return expDate <= cutoffDate
        })
      }

      if (filtered.length === 0) {
        return expiringWithinDays
          ? `No perishables expiring within ${expiringWithinDays} days.`
          : 'No perishables in inventory. Add items in the app settings under Perishables.'
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const formatted = filtered.map((p) => {
        const result: Record<string, unknown> = {
          name: p.displayName,
        }

        if (p.quantity) {
          result.quantity = p.unit ? `${p.quantity} ${p.unit}` : p.quantity
        }

        if (p.expirationDate) {
          const expDate = new Date(p.expirationDate)
          expDate.setHours(0, 0, 0, 0)
          const daysUntil = Math.floor(
            (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          )
          result.expirationDate = p.expirationDate
          result.daysUntilExpiration = daysUntil
          result.status =
            daysUntil < 0
              ? 'expired'
              : daysUntil === 0
                ? 'expires_today'
                : daysUntil <= 3
                  ? 'expiring_soon'
                  : 'fresh'
        }

        return result
      })

      return JSON.stringify(
        {
          totalItems: filtered.length,
          perishables: formatted,
        },
        null,
        2
      )
    }

    default:
      throw new Error(`Unknown grocery tool: ${name}`)
  }
}
