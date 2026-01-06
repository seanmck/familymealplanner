'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Utensils, Plus, ChefHat } from 'lucide-react'

interface Recipe {
  id: string
  title: string
  type: 'MAIN' | 'SIDE'
}

interface PlannedMealRecipe {
  id: string
  role: 'MAIN' | 'SIDE'
  recipe: Recipe
}

interface PlannedMeal {
  id: string
  dayOfWeek: number
  mealType: 'DINNER' | 'LUNCH'
  placeholderTitle: string | null
  recipes: PlannedMealRecipe[]
  familyMemberId?: string | null
  familyMember?: {
    id: string
    name: string
    role: 'ADULT' | 'CHILD'
  } | null
}

interface LunchboxItem {
  id: string
  dayOfWeek: number
  category: string | null
  name: string
  wasConsumed?: boolean
  consumptionNote?: string | null
  familyMemberId: string
  familyMember: {
    id: string
    name: string
    role: 'ADULT' | 'CHILD'
  }
}

interface FamilyMember {
  id: string
  name: string
  role: 'ADULT' | 'CHILD'
}

interface LunchGridProps {
  familyMembers: FamilyMember[]
  memberLunchMeals: PlannedMeal[]
  lunchboxItems: LunchboxItem[]
  onMemberClick: (memberId: string) => void
  onMemberRecipeClick: (memberId: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  main: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  side: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  fruit: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  snack: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  treat: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
}

export function LunchGrid({
  familyMembers,
  memberLunchMeals,
  lunchboxItems,
  onMemberClick,
  onMemberRecipeClick,
}: LunchGridProps) {
  // Get a member's lunch meal
  const getMemberMeal = (memberId: string) => {
    return memberLunchMeals.find((m) => m.familyMemberId === memberId)
  }

  // Get a member's lunchbox items
  const getMemberItems = (memberId: string) => {
    return lunchboxItems.filter((item) => item.familyMemberId === memberId)
  }

  // Group items by category
  const groupByCategory = (items: LunchboxItem[]) => {
    const groups: Record<string, LunchboxItem[]> = {}
    items.forEach((item) => {
      const category = item.category || 'other'
      if (!groups[category]) groups[category] = []
      groups[category].push(item)
    })
    return groups
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <Package className="h-4 w-4" />
        Family Lunches
      </h2>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {familyMembers.map((member) => {
          const meal = getMemberMeal(member.id)
          const items = getMemberItems(member.id)
          const mainRecipe = meal?.recipes?.find((r) => r.role === 'MAIN')?.recipe
          const hasContent = mainRecipe || meal?.placeholderTitle || items.length > 0
          const groupedItems = groupByCategory(items)

          return (
            <Card
              key={member.id}
              className={`
                overflow-hidden transition-all duration-200
                ${hasContent
                  ? 'border-border hover:border-primary/40'
                  : 'border-dashed border-muted-foreground/25 hover:border-primary/50'
                }
              `}
            >
              <CardContent className="p-4">
                {/* Member Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{member.name}</h3>
                      {member.role === 'CHILD' && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          Child
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {hasContent
                        ? `${items.length} item${items.length !== 1 ? 's' : ''} packed`
                        : 'Nothing planned yet'}
                    </p>
                  </div>
                </div>

                {hasContent ? (
                  <div className="space-y-3">
                    {/* Recipe Section */}
                    <div
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => onMemberRecipeClick(member.id)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <ChefHat className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {mainRecipe?.title || meal?.placeholderTitle ? (
                          <p className="text-sm font-medium truncate">
                            {mainRecipe?.title || meal?.placeholderTitle}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Add a recipe</p>
                        )}
                      </div>
                    </div>

                    {/* Lunchbox Items */}
                    {items.length > 0 && (
                      <div
                        className="space-y-2 cursor-pointer"
                        onClick={() => onMemberClick(member.id)}
                      >
                        {Object.entries(groupedItems).map(([category, categoryItems]) => (
                          <div key={category} className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {categoryItems.map((item) => {
                                const notConsumed = item.wasConsumed === false
                                return (
                                  <Badge
                                    key={item.id}
                                    variant="secondary"
                                    className={`text-xs ${CATEGORY_COLORS[category] || 'bg-muted'} ${
                                      notConsumed ? 'line-through opacity-60' : ''
                                    }`}
                                  >
                                    {item.name}
                                  </Badge>
                                )
                              })}
                            </div>
                            {/* Show consumption notes for items that weren't eaten */}
                            {categoryItems.filter(i => i.wasConsumed === false && i.consumptionNote).map((item) => (
                              <p key={`${item.id}-note`} className="text-xs text-muted-foreground italic ml-1">
                                {item.name}: {item.consumptionNote}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add more items button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs text-muted-foreground"
                      onClick={() => onMemberClick(member.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {items.length > 0 ? 'Edit lunchbox items' : 'Add lunchbox items'}
                    </Button>
                  </div>
                ) : (
                  /* Empty State */
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => onMemberRecipeClick(member.id)}
                    >
                      <Utensils className="h-4 w-4" />
                      Add recipe
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => onMemberClick(member.id)}
                    >
                      <Package className="h-4 w-4" />
                      Add lunchbox items
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
