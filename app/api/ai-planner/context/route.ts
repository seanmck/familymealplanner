import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuth } from '@/lib/api-auth'
import { Rating, FamilyRole } from '@prisma/client'
import type { PlannerContext, WebRecipeContext } from '@/lib/ai-planner/types'
import { searchWebRecipes, buildSearchQueries } from '@/lib/ai-planner/web-search'

const MAX_RECIPES = 30
const MIN_RECIPES_FOR_VARIETY = 10 // If fewer recipes, search the web
const MAX_RECENT_MEALS = 20
const WEEKS_TO_LOOK_BACK = 4
const PERISHABLE_DAYS_THRESHOLD = 7

export async function GET(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const weekStartParam = searchParams.get('weekStart')

    if (!weekStartParam) {
      return NextResponse.json(
        { error: 'weekStart query parameter is required' },
        { status: 400 }
      )
    }

    const weekStart = new Date(weekStartParam)
    if (isNaN(weekStart.getTime())) {
      return NextResponse.json(
        { error: 'Invalid weekStart date format' },
        { status: 400 }
      )
    }

    const householdId = authResult.householdId
    const today = new Date()

    // Fetch family members
    const familyMembers = await db.familyMember.findMany({
      where: { householdId },
      select: { name: true, role: true },
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

    // Fetch recent meal plans for last-used dates
    const weeksAgo = new Date()
    weeksAgo.setDate(weeksAgo.getDate() - WEEKS_TO_LOOK_BACK * 7)

    const recentMealPlans = await db.mealPlan.findMany({
      where: {
        householdId,
        weekStartDate: { gte: weeksAgo },
      },
      include: {
        plannedMeals: {
          where: { mealType: 'DINNER', familyMemberId: null },
          include: {
            recipes: {
              where: { role: 'MAIN' },
              select: { recipeId: true, recipe: { select: { title: true } } },
            },
          },
        },
      },
      orderBy: { weekStartDate: 'desc' },
    })

    // Build map of recipeId -> most recent usage date
    const lastUsedMap = new Map<string, Date>()
    const recentMealsData: Array<{ title: string; weeksAgo: number; weekStartDate: Date }> = []

    for (const plan of recentMealPlans) {
      const weeksAgoValue = Math.floor(
        (today.getTime() - plan.weekStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
      )

      for (const meal of plan.plannedMeals) {
        for (const pmr of meal.recipes) {
          // Track last used for scoring
          const existing = lastUsedMap.get(pmr.recipeId)
          if (!existing || plan.weekStartDate > existing) {
            lastUsedMap.set(pmr.recipeId, plan.weekStartDate)
          }

          // Track for recent meals list
          if (pmr.recipe?.title) {
            recentMealsData.push({
              title: pmr.recipe.title,
              weeksAgo: weeksAgoValue,
              weekStartDate: plan.weekStartDate,
            })
          }
        }
      }
    }

    // Score and categorize recipes
    type ScoredRecipe = {
      id: string
      title: string
      tags: string[]
      score: number
      daysSinceUsed: number | null
      kidDownVotes: number
    }

    const favoriteRecipes: ScoredRecipe[] = []
    const avoidRecipes: Array<{ id: string; title: string; kidDownVotes: number }> = []
    const tagScores = new Map<string, number>()

    for (const recipe of recipes) {
      const upVotes = recipe.ratings.filter((r) => r.rating === Rating.UP).length
      const downVotes = recipe.ratings.filter((r) => r.rating === Rating.DOWN).length
      const kidDownVotes = recipe.ratings.filter(
        (r) => r.rating === Rating.DOWN && r.member.role === FamilyRole.CHILD
      ).length

      // Calculate days since last used
      const lastUsed = lastUsedMap.get(recipe.id)
      const daysSinceUsed = lastUsed
        ? Math.floor((today.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24))
        : null

      // Recipes with kid downvotes should be avoided
      if (kidDownVotes > 0) {
        avoidRecipes.push({
          id: recipe.id,
          title: recipe.title,
          kidDownVotes,
        })
        continue // Don't include in favorites
      }

      // Calculate score: upvotes + recency bonus
      let score = upVotes * 20

      // Add recency bonus: newer = less bonus (prefer variety)
      if (daysSinceUsed !== null) {
        if (daysSinceUsed > 21) score += 30 // Haven't made in 3+ weeks
        else if (daysSinceUsed > 14) score += 15 // 2-3 weeks ago
        else if (daysSinceUsed > 7) score += 5 // 1-2 weeks ago
        // Recently made (< 1 week) gets no bonus
      } else {
        // Never made - slight bonus to encourage trying
        score += 10
      }

      // Tag scoring for preferences
      for (const tag of recipe.tags) {
        tagScores.set(tag, (tagScores.get(tag) || 0) + upVotes - downVotes)
      }

      favoriteRecipes.push({
        id: recipe.id,
        title: recipe.title,
        tags: recipe.tags,
        score,
        daysSinceUsed,
        kidDownVotes: 0,
      })
    }

    // Sort favorites by score and limit
    favoriteRecipes.sort((a, b) => b.score - a.score)
    const topFavorites = favoriteRecipes.slice(0, MAX_RECIPES).map((r) => ({
      id: r.id,
      title: r.title,
      tags: r.tags,
      score: r.score,
      daysSinceUsed: r.daysSinceUsed,
    }))

    // Sort avoid recipes by kid downvotes
    avoidRecipes.sort((a, b) => b.kidDownVotes - a.kidDownVotes)

    // Get preferred tags
    const preferredTags = Array.from(tagScores.entries())
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag)

    // Deduplicate recent meals and limit
    const seenTitles = new Set<string>()
    const recentMeals = recentMealsData
      .filter((m) => {
        if (seenTitles.has(m.title)) return false
        seenTitles.add(m.title)
        return true
      })
      .sort((a, b) => a.weeksAgo - b.weeksAgo)
      .slice(0, MAX_RECENT_MEALS)
      .map((m) => ({ title: m.title, weeksAgo: m.weeksAgo }))

    // Fetch perishables expiring soon
    const perishableDeadline = new Date()
    perishableDeadline.setDate(perishableDeadline.getDate() + PERISHABLE_DAYS_THRESHOLD)

    const perishables = await db.perishable.findMany({
      where: {
        householdId,
        expirationDate: {
          gte: today,
          lte: perishableDeadline,
        },
      },
      select: { displayName: true, expirationDate: true },
      orderBy: { expirationDate: 'asc' },
    })

    const perishablesContext = perishables.map((p) => ({
      name: p.displayName,
      daysUntilExpiration: p.expirationDate
        ? Math.ceil((p.expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : 7,
    }))

    // Fetch existing meals for this week
    const existingMealPlan = await db.mealPlan.findUnique({
      where: {
        householdId_weekStartDate: {
          householdId,
          weekStartDate: weekStart,
        },
      },
      include: {
        plannedMeals: {
          where: { mealType: 'DINNER', familyMemberId: null },
          include: {
            recipes: {
              where: { role: 'MAIN' },
              select: { recipe: { select: { title: true } } },
            },
          },
        },
      },
    })

    const existingMeals = (existingMealPlan?.plannedMeals || []).map((meal) => ({
      dayOfWeek: meal.dayOfWeek,
      title:
        meal.recipes[0]?.recipe?.title ||
        meal.placeholderTitle ||
        'Planned meal',
    }))

    // Check if we should search the web for more recipes
    const includeWebSearch = searchParams.get('includeWebSearch') === 'true'
    const userPrompt = searchParams.get('userPrompt') || undefined
    let webRecipes: WebRecipeContext[] | undefined
    let webSearchStatus: string | undefined

    // Search web if enabled AND (user requested OR local recipes are sparse)
    const shouldSearchWeb = includeWebSearch && (userPrompt || topFavorites.length < MIN_RECIPES_FOR_VARIETY)

    if (shouldSearchWeb) {
      // Check if API is configured
      if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
        console.log('Web search requested but Google API not configured')
        webSearchStatus = 'not_configured'
      } else {
        const perishableNames = perishablesContext.map((p) => p.name)
        const searchQueries = buildSearchQueries(perishableNames, preferredTags, userPrompt)

        console.log('Web search queries:', searchQueries)

        // Run searches in parallel (limit to save API quota)
        const searchPromises = searchQueries.slice(0, 2).map((q) => searchWebRecipes(q, 5))
        const searchResults = await Promise.all(searchPromises)

        // Deduplicate by URL and collect results
        const seenUrls = new Set<string>()
        webRecipes = []

        for (const result of searchResults) {
          for (const recipe of result.results) {
            if (!seenUrls.has(recipe.url)) {
              seenUrls.add(recipe.url)
              webRecipes.push({
                url: recipe.url,
                title: recipe.title,
                snippet: recipe.snippet,
                source: recipe.source,
              })
            }
          }
        }

        // Limit total web recipes
        webRecipes = webRecipes.slice(0, 10)
        console.log(`Web search found ${webRecipes.length} recipes`)

        if (webRecipes.length > 0) {
          webSearchStatus = 'success'
        } else {
          webSearchStatus = 'no_results'
        }
      }
    }

    const response: PlannerContext = {
      family: {
        members: familyMembers,
      },
      preferences: {
        favoriteRecipes: topFavorites,
        avoidRecipes,
        preferredTags,
      },
      recentMeals,
      perishables: perishablesContext,
      existingMeals,
      webRecipes,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching AI planner context:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI planner context' },
      { status: 500 }
    )
  }
}
