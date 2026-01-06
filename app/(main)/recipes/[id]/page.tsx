import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ThumbsUp, ThumbsDown, Meh } from 'lucide-react'
import { DeleteRecipeButton } from './delete-button'
import { RatingButtons } from '@/components/rating-buttons'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RecipeDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.householdId) {
    redirect('/login')
  }

  const { id } = await params

  const [recipe, familyMembers] = await Promise.all([
    db.recipe.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      include: {
        ingredients: { orderBy: { sortOrder: 'asc' } },
        ratings: {
          include: { member: true },
        },
      },
    }),
    db.familyMember.findMany({
      where: { householdId: session.user.householdId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    }),
  ])

  if (!recipe) {
    notFound()
  }

  const totalTime =
    (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) || null

  const existingRatings = recipe.ratings.map((r) => ({
    memberId: r.memberId,
    rating: r.rating,
  }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{recipe.title}</h1>
          {recipe.description && (
            <p className="text-muted-foreground mt-2">{recipe.description}</p>
          )}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
            >
              View original recipe
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/recipes/${id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <DeleteRecipeButton recipeId={id} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {recipe.prepTimeMinutes && (
          <div>
            <span className="text-muted-foreground">Prep:</span>{' '}
            {recipe.prepTimeMinutes} min
          </div>
        )}
        {recipe.cookTimeMinutes && (
          <div>
            <span className="text-muted-foreground">Cook:</span>{' '}
            {recipe.cookTimeMinutes} min
          </div>
        )}
        {totalTime && (
          <div>
            <span className="text-muted-foreground">Total:</span> {totalTime} min
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Servings:</span>{' '}
          {recipe.servings}
        </div>
      </div>

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex">
                  <span className="w-20 text-muted-foreground shrink-0">
                    {ing.quantity && (
                      <>
                        {Number(ing.quantity)}{' '}
                        {ing.unit && <span>{ing.unit}</span>}
                      </>
                    )}
                  </span>
                  <span>
                    {ing.name}
                    {ing.notes && (
                      <span className="text-muted-foreground"> ({ing.notes})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Family Ratings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recipe.ratings.length > 0 && (
              <ul className="space-y-2">
                {recipe.ratings.map((rating) => (
                  <li key={rating.id} className="flex items-center gap-2">
                    {rating.rating === 'UP' && (
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                    )}
                    {rating.rating === 'DOWN' && (
                      <ThumbsDown className="h-4 w-4 text-red-500" />
                    )}
                    {rating.rating === 'NEUTRAL' && (
                      <Meh className="h-4 w-4 text-amber-500" />
                    )}
                    <span>{rating.member.name}</span>
                    {rating.member.role === 'CHILD' && (
                      <Badge variant="outline" className="text-xs">
                        Kid
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Separator />
            <RatingButtons
              recipeId={id}
              familyMembers={familyMembers}
              existingRatings={existingRatings}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap">{recipe.instructions}</div>
        </CardContent>
      </Card>

      {recipe.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap">{recipe.notes}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
