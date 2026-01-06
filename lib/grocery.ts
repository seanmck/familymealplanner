import { db } from '@/lib/db'

interface GroceryItem {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  category: string | null
  isChecked: boolean
  sourceKey: string | null
}

export interface GroceryList {
  id: string
  mealPlanId: string
  excludedItems: string[]
  editedItems: Record<string, string>
  checkedSourceKeys: string[]
  items: GroceryItem[]
}

/**
 * Generates a fresh grocery list from the current meal plan.
 * Always regenerates to ensure accuracy - replaces any existing list.
 * @param excludedItems - sourceKeys of items deleted by user (persist across regeneration)
 * @param editedItems - Map of sourceKey -> edited name (persist edits across regeneration)
 * @param checkedSourceKeys - sourceKeys of checked items (persist across regeneration)
 */
export async function generateGroceryList(
  mealPlanId: string,
  householdId: string,
  excludedItems: string[] = [],
  editedItems: Record<string, string> = {},
  checkedSourceKeys: string[] = []
): Promise<GroceryList | null> {
  // Fetch meal plan with all recipes and ingredients
  const mealPlan = await db.mealPlan.findFirst({
    where: {
      id: mealPlanId,
      householdId,
    },
    include: {
      plannedMeals: {
        include: {
          recipes: {
            include: {
              recipe: {
                include: {
                  ingredients: true,
                },
              },
            },
          },
        },
      },
      lunchboxItems: true,
    },
  })

  if (!mealPlan) {
    return null
  }

  // Fetch pantry staples to exclude
  const pantryStaples = await db.pantryStaple.findMany({
    where: { householdId },
  })
  const stapleNames = new Set(
    pantryStaples.map((s) => s.name.toLowerCase().trim())
  )

  // Create set of excluded items (normalized)
  const excludedSet = new Set(excludedItems.map((s) => s.toLowerCase().trim()))

  // Aggregate ingredients from all recipes (mains and sides)
  const ingredientMap = new Map<
    string,
    { name: string; quantity: number; unit: string; category: string; sourceKey: string }
  >()

  for (const meal of mealPlan.plannedMeals) {
    for (const plannedRecipe of meal.recipes) {
      const recipe = plannedRecipe.recipe

      for (const ingredient of recipe.ingredients) {
        // Skip pantry staples (using substring matching to handle variants like "extra-virgin olive oil" matching "olive oil")
        const normalizedName = ingredient.name.toLowerCase().trim()
        const isStaple = [...stapleNames].some((staple) =>
          normalizedName.includes(staple)
        )
        if (isStaple) {
          continue
        }

        const unitStr = ingredient.unit?.toLowerCase().trim() || ''
        const sourceKey = `ingredient:${normalizedName}-${unitStr}`

        // Skip user-excluded items (by sourceKey)
        if (excludedSet.has(sourceKey)) {
          continue
        }

        const existing = ingredientMap.get(sourceKey)
        const qty = ingredient.quantity ? Number(ingredient.quantity) : 1

        if (existing) {
          existing.quantity += qty
        } else {
          ingredientMap.set(sourceKey, {
            name: ingredient.name,
            quantity: qty,
            unit: ingredient.unit || '',
            category: categorizeIngredient(ingredient.name),
            sourceKey,
          })
        }
      }
    }
  }

  // Aggregate lunchbox items by name (no quantity/unit - count occurrences)
  const lunchboxMap = new Map<
    string,
    { name: string; count: number; category: string; sourceKey: string }
  >()

  for (const item of mealPlan.lunchboxItems) {
    const normalizedName = item.name.toLowerCase().trim()

    // Skip pantry staples
    const isStaple = [...stapleNames].some((staple) =>
      normalizedName.includes(staple)
    )
    if (isStaple) {
      continue
    }

    const sourceKey = `lunchbox:${normalizedName}`

    // Skip user-excluded items (by sourceKey)
    if (excludedSet.has(sourceKey)) {
      continue
    }

    const existing = lunchboxMap.get(sourceKey)
    if (existing) {
      existing.count += 1
    } else {
      lunchboxMap.set(sourceKey, {
        name: item.name,
        count: 1,
        category: categorizeLunchboxItem(item.name, item.category),
        sourceKey,
      })
    }
  }

  // Create set of checked sourceKeys for quick lookup
  const checkedSet = new Set(checkedSourceKeys)

  // Delete existing grocery list if any
  await db.groceryList.deleteMany({
    where: { mealPlanId },
  })

  // Create new grocery list with items (preserving excluded items, edits, and checked status)
  const groceryList = await db.groceryList.create({
    data: {
      mealPlanId,
      excludedItems,
      editedItems,
      checkedSourceKeys,
      items: {
        create: [
          // Recipe ingredients
          ...Array.from(ingredientMap.values()).map((item) => ({
            name: editedItems[item.sourceKey] ?? item.name,
            quantity: item.quantity,
            unit: item.unit || null,
            category: item.category,
            isChecked: checkedSet.has(item.sourceKey),
            sourceKey: item.sourceKey,
          })),
          // Lunchbox items (show frequency in name if > 1)
          ...Array.from(lunchboxMap.values()).map((item) => {
            const baseName = item.count > 1 ? `${item.name} (${item.count}x)` : item.name
            return {
              name: editedItems[item.sourceKey] ?? baseName,
              quantity: null,
              unit: null,
              category: item.category,
              isChecked: checkedSet.has(item.sourceKey),
              sourceKey: item.sourceKey,
            }
          }),
        ],
      },
    },
    include: {
      items: {
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      },
    },
  })

  return groceryList as GroceryList
}

// Helper function to categorize ingredients
function categorizeIngredient(name: string): string {
  const nameLower = name.toLowerCase()

  // Check if a keyword matches as a whole word (not substring)
  const matchesKeyword = (text: string, keyword: string): boolean => {
    const regex = new RegExp(`\\b${keyword}s?\\b`, 'i')
    return regex.test(text)
  }

  const categories: Record<string, string[]> = {
    Produce: [
      'lettuce', 'tomato', 'onion', 'garlic', 'pepper', 'carrot', 'celery',
      'potato', 'broccoli', 'spinach', 'kale', 'cucumber', 'zucchini',
      'squash', 'mushroom', 'corn', 'pea', 'bean', 'asparagus', 'cabbage',
      'cauliflower', 'eggplant', 'leek', 'scallion', 'shallot', 'ginger',
      'lemon', 'lime', 'orange', 'apple', 'banana', 'berry', 'avocado',
      'cilantro', 'parsley', 'basil', 'mint', 'thyme', 'rosemary', 'sage',
      'dill', 'chive', 'oregano', 'herb',
    ],
    Meat: [
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage',
      'ham', 'steak', 'ground', 'roast', 'chop', 'rib', 'wing', 'thigh',
      'breast', 'tenderloin', 'brisket',
    ],
    Seafood: [
      'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallop',
      'cod', 'tilapia', 'halibut', 'trout', 'mahi', 'snapper', 'bass',
      'clam', 'mussel', 'oyster', 'squid', 'octopus',
    ],
    Dairy: [
      'milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream',
      'cottage', 'ricotta', 'mozzarella', 'parmesan', 'cheddar', 'feta',
      'egg', 'eggs',
    ],
    Bakery: [
      'bread', 'roll', 'bun', 'bagel', 'croissant', 'muffin', 'tortilla',
      'pita', 'naan', 'baguette', 'ciabatta', 'sourdough',
    ],
    Pantry: [
      'rice', 'pasta', 'noodle', 'flour', 'sugar', 'oil', 'vinegar',
      'sauce', 'broth', 'stock', 'can', 'canned', 'dried', 'bean',
      'lentil', 'quinoa', 'oat', 'cereal', 'honey', 'maple', 'soy',
    ],
    Frozen: [
      'frozen', 'ice cream',
    ],
    Beverages: [
      'juice', 'soda', 'water', 'tea', 'coffee', 'wine', 'beer',
    ],
    Snacks: [
      'cracker', 'chip', 'pretzel', 'popcorn', 'granola', 'bar',
      'fruit snack', 'gummy', 'goldfish', 'cheez-it', 'ritz',
      'cookie', 'treat', 'snack',
    ],
  }

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => matchesKeyword(nameLower, keyword))) {
      return category
    }
  }

  return 'Other'
}

// Helper function to categorize lunchbox items
// Uses item category if available, otherwise falls back to name-based categorization
function categorizeLunchboxItem(name: string, category: string | null): string {
  // Map lunchbox categories to grocery categories
  const categoryMapping: Record<string, string> = {
    main: 'Deli',
    side: 'Produce',
    fruit: 'Produce',
    snack: 'Snacks',
    treat: 'Snacks',
  }

  if (category && categoryMapping[category]) {
    return categoryMapping[category]
  }

  // Fall back to name-based categorization
  return categorizeIngredient(name)
}
