import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RecipeCard } from '@/components/recipe-card'
import { Plus, Search, BookOpen, ChefHat } from 'lucide-react'

interface Props {
  searchParams: Promise<{ search?: string; tag?: string }>
}

export default async function RecipesPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const { search = '', tag = '' } = await searchParams

  const recipes = await db.recipe.findMany({
    where: {
      householdId: session.user.householdId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { ingredients: { some: { name: { contains: search, mode: 'insensitive' } } } },
        ],
      }),
      ...(tag && { tags: { has: tag } }),
    },
    include: {
      ingredients: true,
      ratings: {
        include: { member: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Get all unique tags
  const allTags = [...new Set(recipes.flatMap((r) => r.tags))].sort()

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
      <form className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search recipes..."
            defaultValue={search}
            className="pl-10 h-11 bg-background border-border/60"
          />
        </div>
        {allTags.length > 0 && (
          <Select name="tag" defaultValue={tag}>
            <SelectTrigger className="w-full sm:w-[180px] h-11 bg-background border-border/60">
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">All tags</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button type="submit" variant="secondary" className="h-11">
          Search
        </Button>
      </form>

      {/* Content */}
      {recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
            <ChefHat className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            {search || tag ? 'No recipes found' : 'Your recipe library is empty'}
          </h2>
          <p className="text-muted-foreground text-center max-w-sm mb-6">
            {search || tag
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'Start building your collection by adding your family\'s favorite recipes.'}
          </p>
          {!search && !tag && (
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
