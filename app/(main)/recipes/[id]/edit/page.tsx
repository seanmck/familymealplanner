import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { RecipeForm } from '@/components/recipe-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditRecipePage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const { id } = await params

  const recipe = await db.recipe.findFirst({
    where: {
      id,
      householdId: session.user.householdId,
    },
    include: {
      ingredients: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!recipe) {
    notFound()
  }

  // Convert Decimal to number for the form
  const recipeForForm = {
    ...recipe,
    ingredients: recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: ing.quantity ? Number(ing.quantity) : null,
    })),
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Edit Recipe</h1>
      <RecipeForm recipe={recipeForForm} />
    </div>
  )
}
