import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, ThumbsUp, ThumbsDown, Sparkles, AlertTriangle } from 'lucide-react'

interface RecipeRating {
  rating: 'UP' | 'DOWN' | 'NEUTRAL'
  member: { name: string; role: 'ADULT' | 'CHILD' }
}

interface RecipeCardProps {
  id: string
  title: string
  description?: string | null
  prepTimeMinutes?: number | null
  cookTimeMinutes?: number | null
  servings: number
  tags: string[]
  ratings?: RecipeRating[]
}

export function RecipeCard({
  id,
  title,
  description,
  prepTimeMinutes,
  cookTimeMinutes,
  servings,
  tags,
  ratings = [],
}: RecipeCardProps) {
  const totalTime = (prepTimeMinutes || 0) + (cookTimeMinutes || 0) || null

  const upVotes = ratings.filter((r) => r.rating === 'UP').length
  const downVotes = ratings.filter((r) => r.rating === 'DOWN').length
  const hasKidDownVotes = ratings.some(
    (r) => r.rating === 'DOWN' && r.member.role === 'CHILD'
  )
  const isNew = ratings.length === 0

  return (
    <Link href={`/recipes/${id}`} className="group block">
      <Card className="h-full overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-snug group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
            <div className="flex flex-col gap-1 shrink-0">
              {isNew && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-accent/80 text-accent-foreground border-0"
                >
                  <Sparkles className="h-3 w-3" />
                  New
                </Badge>
              )}
              {hasKidDownVotes && !isNew && (
                <Badge
                  variant="destructive"
                  className="gap-1 bg-destructive/10 text-destructive border-0"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Picky
                </Badge>
              )}
            </div>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {totalTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {totalTime} min
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {servings}
            </span>
            {ratings.length > 0 && (
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {upVotes}
                </span>
                <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
                  <ThumbsDown className="h-3.5 w-3.5" />
                  {downVotes}
                </span>
              </span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs font-normal bg-muted/50 border-border/60 hover:bg-muted transition-colors"
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-xs font-normal bg-muted/50 border-border/60"
                >
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
