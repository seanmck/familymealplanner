import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { RecipeForm } from '@/components/recipe-form'

export default async function NewRecipePage() {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Add Recipe</h1>
      <RecipeForm />
    </div>
  )
}
