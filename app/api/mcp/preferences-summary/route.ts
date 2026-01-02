import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuth } from '@/lib/api-auth'
import { Rating, FamilyRole } from '@prisma/client'

interface PreferencesSummary {
  members: {
    id: string
    name: string
    role: FamilyRole
  }[]
  favoriteRecipes: {
    recipeId: string
    title: string
    upVotes: number
    hasNoDownVotes: boolean
    tags: string[]
  }[]
  avoidRecipes: {
    recipeId: string
    title: string
    downVotes: number
    kidDownVotes: number
  }[]
  preferredTags: {
    tag: string
    score: number
  }[]
  recentlyMade: {
    recipeId: string
    title: string
    lastUsedDate: string
    daysSinceUsed: number
  }[]
  stats: {
    totalRecipes: number
    recipesWithRatings: number
    totalFamilyMembers: number
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const householdId = authResult.householdId

    // Fetch family members
    const members = await db.familyMember.findMany({
      where: { householdId },
      select: { id: true, name: true, role: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })

    // Fetch all recipes with ratings
    const recipes = await db.recipe.findMany({
      where: { householdId },
      include: {
        ratings: {
          include: {
            member: { select: { role: true } },
          },
        },
      },
    })

    // Fetch recent meal plans (past 4 weeks) to find last-used dates
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    const recentMealPlans = await db.mealPlan.findMany({
      where: {
        householdId,
        weekStartDate: { gte: fourWeeksAgo },
      },
      include: {
        plannedMeals: {
          include: {
            recipes: { select: { recipeId: true } },
          },
        },
      },
      orderBy: { weekStartDate: 'desc' },
    })

    // Build a map of recipeId -> most recent usage date
    const lastUsedMap = new Map<string, Date>()
    for (const plan of recentMealPlans) {
      for (const meal of plan.plannedMeals) {
        for (const pmr of meal.recipes) {
          const existing = lastUsedMap.get(pmr.recipeId)
          if (!existing || plan.weekStartDate > existing) {
            lastUsedMap.set(pmr.recipeId, plan.weekStartDate)
          }
        }
      }
    }

    const today = new Date()

    // Aggregate recipe scores
    const favoriteRecipes: PreferencesSummary['favoriteRecipes'] = []
    const avoidRecipes: PreferencesSummary['avoidRecipes'] = []
    const tagScores = new Map<string, number>()
    let recipesWithRatings = 0

    for (const recipe of recipes) {
      const upVotes = recipe.ratings.filter((r) => r.rating === Rating.UP).length
      const downVotes = recipe.ratings.filter((r) => r.rating === Rating.DOWN).length
      const kidDownVotes = recipe.ratings.filter(
        (r) => r.rating === Rating.DOWN && r.member.role === FamilyRole.CHILD
      ).length

      if (recipe.ratings.length > 0) {
        recipesWithRatings++
      }

      // Recipes with at least one upvote and no downvotes are favorites
      if (upVotes > 0 && downVotes === 0) {
        favoriteRecipes.push({
          recipeId: recipe.id,
          title: recipe.title,
          upVotes,
          hasNoDownVotes: true,
          tags: recipe.tags,
        })

        // Boost tags from favorite recipes
        for (const tag of recipe.tags) {
          tagScores.set(tag, (tagScores.get(tag) || 0) + upVotes)
        }
      } else if (upVotes > 0) {
        // Has both upvotes and downvotes - still consider if more upvotes
        if (upVotes > downVotes) {
          favoriteRecipes.push({
            recipeId: recipe.id,
            title: recipe.title,
            upVotes,
            hasNoDownVotes: false,
            tags: recipe.tags,
          })
          for (const tag of recipe.tags) {
            tagScores.set(tag, (tagScores.get(tag) || 0) + (upVotes - downVotes))
          }
        }
      }

      // Recipes with downvotes (especially from kids) should be avoided
      if (downVotes > 0) {
        avoidRecipes.push({
          recipeId: recipe.id,
          title: recipe.title,
          downVotes,
          kidDownVotes,
        })
        // Reduce tag scores for avoided recipes
        for (const tag of recipe.tags) {
          tagScores.set(tag, (tagScores.get(tag) || 0) - downVotes)
        }
      }
    }

    // Sort favorites by upvotes
    favoriteRecipes.sort((a, b) => b.upVotes - a.upVotes)

    // Sort avoid recipes by kid downvotes first, then total downvotes
    avoidRecipes.sort((a, b) => {
      if (b.kidDownVotes !== a.kidDownVotes) {
        return b.kidDownVotes - a.kidDownVotes
      }
      return b.downVotes - a.downVotes
    })

    // Get preferred tags (positive scores only)
    const preferredTags = Array.from(tagScores.entries())
      .filter(([, score]) => score > 0)
      .map(([tag, score]) => ({ tag, score }))
      .sort((a, b) => b.score - a.score)

    // Get recently made recipes
    const recentlyMade = Array.from(lastUsedMap.entries())
      .map(([recipeId, lastUsed]) => {
        const recipe = recipes.find((r) => r.id === recipeId)
        const daysSinceUsed = Math.floor(
          (today.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24)
        )
        return {
          recipeId,
          title: recipe?.title || 'Unknown',
          lastUsedDate: lastUsed.toISOString().split('T')[0],
          daysSinceUsed,
        }
      })
      .sort((a, b) => a.daysSinceUsed - b.daysSinceUsed)

    const response: PreferencesSummary = {
      members,
      favoriteRecipes: favoriteRecipes.slice(0, 10),
      avoidRecipes: avoidRecipes.slice(0, 10),
      preferredTags: preferredTags.slice(0, 10),
      recentlyMade: recentlyMade.slice(0, 10),
      stats: {
        totalRecipes: recipes.length,
        recipesWithRatings,
        totalFamilyMembers: members.length,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching preferences summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences summary' },
      { status: 500 }
    )
  }
}
