import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Fetch grocery list for a meal plan
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mealPlanId = searchParams.get('mealPlanId')

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'mealPlanId is required' },
        { status: 400 }
      )
    }

    // Verify meal plan belongs to household
    const mealPlan = await db.mealPlan.findFirst({
      where: {
        id: mealPlanId,
        householdId: session.user.householdId,
      },
    })

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    const groceryList = await db.groceryList.findUnique({
      where: { mealPlanId },
      include: {
        items: {
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
      },
    })

    return NextResponse.json(groceryList)
  } catch (error) {
    console.error('Error fetching grocery list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grocery list' },
      { status: 500 }
    )
  }
}

// POST - Generate grocery list from meal plan
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mealPlanId } = await request.json()

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'mealPlanId is required' },
        { status: 400 }
      )
    }

    // Fetch meal plan with all recipes and ingredients
    const mealPlan = await db.mealPlan.findFirst({
      where: {
        id: mealPlanId,
        householdId: session.user.householdId,
      },
      include: {
        plannedMeals: {
          include: {
            recipe: {
              include: {
                ingredients: true,
              },
            },
          },
        },
      },
    })

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    // Fetch pantry staples to exclude
    const pantryStaples = await db.pantryStaple.findMany({
      where: { householdId: session.user.householdId },
    })
    const stapleNames = new Set(
      pantryStaples.map((s) => s.name.toLowerCase().trim())
    )

    // Aggregate ingredients
    const ingredientMap = new Map<
      string,
      { name: string; quantity: number; unit: string; category: string }
    >()

    for (const meal of mealPlan.plannedMeals) {
      if (!meal.recipe) continue

      for (const ingredient of meal.recipe.ingredients) {
        // Skip pantry staples
        if (stapleNames.has(ingredient.name.toLowerCase().trim())) {
          continue
        }

        const unitStr = ingredient.unit?.toLowerCase().trim() || ''
        const key = `${ingredient.name.toLowerCase().trim()}-${unitStr}`
        const existing = ingredientMap.get(key)
        const qty = ingredient.quantity ? Number(ingredient.quantity) : 1

        if (existing) {
          existing.quantity += qty
        } else {
          ingredientMap.set(key, {
            name: ingredient.name,
            quantity: qty,
            unit: ingredient.unit || '',
            category: categorizeIngredient(ingredient.name),
          })
        }
      }
    }

    // Delete existing grocery list if any
    await db.groceryList.deleteMany({
      where: { mealPlanId },
    })

    // Create new grocery list with items
    const groceryList = await db.groceryList.create({
      data: {
        mealPlanId,
        items: {
          create: Array.from(ingredientMap.values()).map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit || null,
            category: item.category,
            isChecked: false,
          })),
        },
      },
      include: {
        items: {
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
      },
    })

    return NextResponse.json(groceryList)
  } catch (error) {
    console.error('Error generating grocery list:', error)
    return NextResponse.json(
      { error: 'Failed to generate grocery list' },
      { status: 500 }
    )
  }
}

// Helper function to categorize ingredients
function categorizeIngredient(name: string): string {
  const nameLower = name.toLowerCase()

  const categories: Record<string, string[]> = {
    Produce: [
      'lettuce', 'tomato', 'onion', 'garlic', 'pepper', 'carrot', 'celery',
      'potato', 'broccoli', 'spinach', 'kale', 'cucumber', 'zucchini',
      'squash', 'mushroom', 'corn', 'pea', 'bean', 'asparagus', 'cabbage',
      'cauliflower', 'eggplant', 'leek', 'scallion', 'shallot', 'ginger',
      'lemon', 'lime', 'orange', 'apple', 'banana', 'berry', 'avocado',
      'cilantro', 'parsley', 'basil', 'mint', 'thyme', 'rosemary', 'sage',
      'dill', 'chive', 'oregano',
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
  }

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => nameLower.includes(keyword))) {
      return category
    }
  }

  return 'Other'
}
