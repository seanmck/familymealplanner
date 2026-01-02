import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { RecipeCard } from '@/components/recipe-card'
import { RecipeSearchFilter } from '@/components/recipe-search-filter'
import { Plus, BookOpen, ChefHat } from 'lucide-react'

interface Props {
  searchParams: Promise<{ search?: string; tag?: string }>
}

export default async function RecipesPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const { search = '', tag = '' } = await searchParams
  const activeTag = tag && tag !== '__all__' ? tag : ''

  // Fetch filtered recipes and all tags in parallel
  const [recipes, allRecipesForTags] = await Promise.all([
    db.recipe.findMany({
      where: {
        householdId: session.user.householdId,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { ingredients: { some: { name: { contains: search, mode: 'insensitive' } } } },
            { tags: { has: search } },
            { tags: { has: search.toLowerCase() } },
          ],
        }),
        ...(activeTag && { tags: { has: activeTag } }),
      },
      include: {
        ingredients: true,
        ratings: {
          include: { member: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    // Get all recipes (unfiltered) to extract all available tags
    db.recipe.findMany({
      where: { householdId: session.user.householdId },
      select: { tags: true },
    }),
  ])

  // Get all unique tags from all recipes
  const allTags = [...new Set(allRecipesForTags.flatMap((r) => r.tags))].sort()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Recipe Library</h1>
          </div>
          <p className="text-muted-foreground ml-13 pl-0.5">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} in your collection
          </p>
        </div>
        <Link href="/recipes/new">
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Recipe
          </Button>
        </Link>
      </div>

      {/* Search & Filter */}
      <RecipeSearchFilter allTags={allTags} />

      {/* Content */}
      {recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
            <ChefHat className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            {search || activeTag ? 'No recipes found' : 'Your recipe library is empty'}
          </h2>
          <p className="text-muted-foreground text-center max-w-sm mb-6">
            {search || activeTag
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'Start building your collection by adding your family\'s favorite recipes.'}
          </p>
          {!search && !activeTag && (
            <Link href="/recipes/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add your first recipe
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              id={recipe.id}
              title={recipe.title}
              description={recipe.description}
              prepTimeMinutes={recipe.prepTimeMinutes}
              cookTimeMinutes={recipe.cookTimeMinutes}
              servings={recipe.servings}
              tags={recipe.tags}
              ratings={recipe.ratings}
            />
          ))}
        </div>
      )}
    </div>
  )
}
