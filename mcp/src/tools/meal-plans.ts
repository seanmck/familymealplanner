import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { ApiClient } from '../api-client.js'

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export const mealPlanTools: Tool[] = [
  {
    name: 'get_meal_plan',
    description:
      'Get the meal plan for a specific week. Returns all planned meals including recipes assigned to each day.',
    inputSchema: {
      type: 'object',
      properties: {
        weekStart: {
          type: 'string',
          description:
            'The Monday of the week to fetch, in YYYY-MM-DD format (e.g., "2024-01-15")',
        },
      },
      required: ['weekStart'],
    },
  },
  {
    name: 'get_recent_meal_plans',
    description:
      'Get recent meal plan history to see what meals have been made recently. Useful for avoiding repetition when planning new meals.',
    inputSchema: {
      type: 'object',
      properties: {
        weeks: {
          type: 'number',
          description: 'Number of weeks of history to fetch (default: 4)',
        },
      },
    },
  },
  {
    name: 'add_planned_meal',
    description:
      'Add a meal to the meal plan for a specific day. Can add a recipe by ID or a placeholder for takeout/leftovers.',
    inputSchema: {
      type: 'object',
      properties: {
        weekStart: {
          type: 'string',
          description:
            'The Monday of the week, in YYYY-MM-DD format (e.g., "2024-01-15")',
        },
        dayOfWeek: {
          type: 'number',
          description:
            'Day of the week (0 = Monday, 1 = Tuesday, ..., 6 = Sunday)',
        },
        mealType: {
          type: 'string',
          enum: ['DINNER', 'LUNCH'],
          description: 'Type of meal (default: DINNER)',
        },
        recipeId: {
          type: 'string',
          description:
            'ID of the recipe to add. Either recipeId or placeholderTitle is required.',
        },
        placeholderTitle: {
          type: 'string',
          description:
            'Title for a placeholder meal (e.g., "Takeout", "Leftovers"). Use when not adding a specific recipe.',
        },
        notes: {
          type: 'string',
          description: 'Optional notes for the meal',
        },
        role: {
          type: 'string',
          enum: ['MAIN', 'SIDE'],
          description: 'Role of the recipe in the meal (default: MAIN)',
        },
        familyMemberId: {
          type: 'string',
          description:
            'Optional: ID of family member for per-person meal (e.g., alternate dinner for a child). Omit for shared family meal.',
        },
      },
      required: ['weekStart', 'dayOfWeek'],
    },
  },
]

export async function handleMealPlanTool(
  name: string,
  args: Record<string, unknown>,
  api: ApiClient
): Promise<string> {
  switch (name) {
    case 'get_meal_plan': {
      const weekStart = args.weekStart as string
      if (!weekStart) {
        throw new Error('weekStart is required (format: YYYY-MM-DD)')
      }

      const mealPlan = await api.getMealPlan(weekStart)

      if (!mealPlan) {
        return `No meal plan found for the week of ${weekStart}. The household hasn't created a plan for this week yet.`
      }

      // Organize meals by day
      const mealsByDay: Record<
        string,
        { dinner?: unknown; lunch?: unknown }
      > = {}

      for (const meal of mealPlan.plannedMeals) {
        const dayName = DAY_NAMES[meal.dayOfWeek] || `Day ${meal.dayOfWeek}`
        if (!mealsByDay[dayName]) {
          mealsByDay[dayName] = {}
        }

        const mealInfo = {
          recipes: meal.recipes.map((r) => ({
            title: r.recipe.title,
            role: r.role,
            type: r.recipe.type,
          })),
          placeholder: meal.placeholderTitle,
          notes: meal.notes,
          forMember: meal.familyMember?.name || 'Whole family',
        }

        if (meal.mealType === 'DINNER') {
          mealsByDay[dayName].dinner = mealInfo
        } else {
          mealsByDay[dayName].lunch = mealInfo
        }
      }

      return JSON.stringify(
        {
          weekStartDate: mealPlan.weekStartDate,
          meals: mealsByDay,
          lunchboxItemCount: mealPlan.lunchboxItems.length,
        },
        null,
        2
      )
    }

    case 'get_recent_meal_plans': {
      const weeks = (args.weeks as number) || 4
      const result = await api.getRecentMealPlans(weeks)

      if (result.mealPlans.length === 0) {
        return `No meal plans found in the last ${weeks} weeks.`
      }

      // Summarize what was made recently
      const recipeCounts = new Map<string, number>()
      const recentMeals: { week: string; day: string; meal: string; recipes: string[] }[] =
        []

      for (const plan of result.mealPlans) {
        for (const meal of plan.meals) {
          if (meal.recipes.length > 0) {
            recentMeals.push({
              week: plan.weekStartDate,
              day: meal.dayName,
              meal: meal.mealType,
              recipes: meal.recipes.map((r) => r.title),
            })

            for (const recipe of meal.recipes) {
              recipeCounts.set(
                recipe.title,
                (recipeCounts.get(recipe.title) || 0) + 1
              )
            }
          }
        }
      }

      // Get most frequently made recipes
      const frequentRecipes = Array.from(recipeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([title, count]) => ({ title, timesMade: count }))

      return JSON.stringify(
        {
          weeksAnalyzed: result.weeksIncluded,
          totalPlannedMeals: recentMeals.length,
          frequentlyMade: frequentRecipes,
          recentMeals: recentMeals.slice(0, 20), // Last 20 meals
        },
        null,
        2
      )
    }

    case 'add_planned_meal': {
      const weekStart = args.weekStart as string
      const dayOfWeek = args.dayOfWeek as number
      const mealType = (args.mealType as 'DINNER' | 'LUNCH') || 'DINNER'
      const recipeId = args.recipeId as string | undefined
      const placeholderTitle = args.placeholderTitle as string | undefined
      const notes = args.notes as string | undefined
      const role = (args.role as 'MAIN' | 'SIDE') || 'MAIN'
      const familyMemberId = args.familyMemberId as string | undefined

      if (!weekStart) {
        throw new Error('weekStart is required (format: YYYY-MM-DD)')
      }

      if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) {
        throw new Error('dayOfWeek is required (0 = Monday, 6 = Sunday)')
      }

      if (!recipeId && !placeholderTitle) {
        throw new Error('Either recipeId or placeholderTitle is required')
      }

      // Create or get the meal plan for this week
      const mealPlan = await api.createOrGetMealPlan(weekStart)

      // Add the planned meal
      const plannedMeal = await api.addPlannedMeal({
        mealPlanId: mealPlan.id,
        dayOfWeek,
        mealType,
        recipeId,
        placeholderTitle,
        notes,
        role,
        familyMemberId,
      })

      const dayName = DAY_NAMES[dayOfWeek] || `Day ${dayOfWeek}`
      const mealName = recipeId
        ? plannedMeal.recipes?.[0]?.recipe?.title || 'Recipe'
        : placeholderTitle
      const forMember = plannedMeal.familyMember?.name
        ? ` for ${plannedMeal.familyMember.name}`
        : ''

      return JSON.stringify(
        {
          message: `Added "${mealName}" to ${dayName} ${mealType.toLowerCase()}${forMember}`,
          plannedMeal: {
            id: plannedMeal.id,
            dayOfWeek,
            dayName,
            mealType,
            forMember: plannedMeal.familyMember?.name || null,
            recipes: plannedMeal.recipes?.map((r) => ({
              title: r.recipe.title,
              role: r.role,
            })),
            placeholder: plannedMeal.placeholderTitle,
            notes: plannedMeal.notes,
          },
        },
        null,
        2
      )
    }

    default:
      throw new Error(`Unknown meal plan tool: ${name}`)
  }
}
