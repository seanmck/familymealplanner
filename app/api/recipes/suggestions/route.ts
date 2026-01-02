import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuth } from '@/lib/api-auth'
import {
  computeFavoriteScore,
  computeIngredientMatchScore,
  hasKidDownVotes,
} from '@/lib/suggestions/scoring'
import type {
  SuggestedRecipe,
  SuggestionsResponse,
  RecipeForSuggestion,
} from '@/lib/suggestions/types'

export async function GET(request: Request) {
  try {
    const authResult = await getAuth(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ingredientsParam = searchParams.get('ingredients') || ''
    const limitParam = searchParams.get('limit')
    const excludeKidDownvotesParam = searchParams.get('excludeKidDownvotes')

    const limit = limitParam ? parseInt(limitParam, 10) : 5
    const excludeKidDownvotes = excludeKidDownvotesParam !== 'false' // Default true
    const searchIngredients = ingredientsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const householdId = authResult.householdId

    // Fetch all recipes with ratings and ingredients
    const recipes = await db.recipe.findMany({
      where: { householdId },
      include: {
        ingredients: { select: { id: true, name: true } },
        ratings: {
          include: {
            member: { select: { name: true, role: true } },
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

    // Compute favorite scores
    const favoriteScores: SuggestedRecipe[] = []
    for (const recipe of recipes) {
      const recipeForSuggestion: RecipeForSuggestion = {
        id: recipe.id,
        title: recipe.title,
        tags: recipe.tags,
        type: recipe.type,
        ingredients: recipe.ingredients,
        ratings: recipe.ratings.map((r) => ({
          rating: r.rating,
          member: { name: r.member.name, role: r.member.role },
        })),
      }

      // Optionally filter out recipes with kid downvotes
      if (excludeKidDownvotes && hasKidDownVotes(recipeForSuggestion)) {
        continue
      }

      const lastUsed = lastUsedMap.get(recipe.id) || null
      const { score, reason } = computeFavoriteScore(
        recipeForSuggestion,
        lastUsed,
        today
      )

      if (score > 0) {
        favoriteScores.push({
          recipeId: recipe.id,
          recipe: recipeForSuggestion,
          score,
          reason,
        })
      }
    }

    // Sort by score descending and take top N
    favoriteScores.sort((a, b) => b.score - a.score)
    const favorites = favoriteScores.slice(0, limit)

    // Compute ingredient match scores if ingredients provided
    let ingredientMatches: SuggestedRecipe[] | undefined
    if (searchIngredients.length > 0) {
      const ingredientScores: SuggestedRecipe[] = []

      for (const recipe of recipes) {
        const recipeForSuggestion: RecipeForSuggestion = {
          id: recipe.id,
          title: recipe.title,
          tags: recipe.tags,
          type: recipe.type,
          ingredients: recipe.ingredients,
          ratings: recipe.ratings.map((r) => ({
            rating: r.rating,
            member: { name: r.member.name, role: r.member.role },
          })),
        }

        // Optionally filter out recipes with kid downvotes
        if (excludeKidDownvotes && hasKidDownVotes(recipeForSuggestion)) {
          continue
        }

        const { score, reason } = computeIngredientMatchScore(
          recipeForSuggestion,
          searchIngredients
        )

        if (score > 0) {
          ingredientScores.push({
            recipeId: recipe.id,
            recipe: recipeForSuggestion,
            score,
            reason,
          })
        }
      }

      // Sort by score descending and take top N
      ingredientScores.sort((a, b) => b.score - a.score)
      ingredientMatches = ingredientScores.slice(0, limit)
    }

    const response: SuggestionsResponse = {
      favorites,
      ingredientMatches,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}
