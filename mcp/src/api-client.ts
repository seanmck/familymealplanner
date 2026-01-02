interface ApiClientConfig {
  baseUrl: string
  apiToken: string
}

interface Recipe {
  id: string
  title: string
  description: string | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  servings: number
  instructions: string
  imageUrl: string | null
  sourceUrl: string | null
  tags: string[]
  type: 'MAIN' | 'SIDE'
  ingredients: Ingredient[]
  ratings: RecipeRating[]
}

interface Ingredient {
  id: string
  name: string
  quantity: string | null
  unit: string | null
  notes: string | null
}

interface RecipeRating {
  id: string
  rating: 'UP' | 'DOWN' | 'NEUTRAL'
  member: {
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

interface CreateRecipeInput {
  title: string
  description?: string
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  servings?: number
  instructions: string
  imageUrl?: string
  sourceUrl?: string
  tags?: string[]
  type?: 'MAIN' | 'SIDE'
  ingredients?: {
    name: string
    quantity?: number
    unit?: string
    notes?: string
  }[]
}

interface ParsedRecipe {
  title: string
  description: string | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  servings: number | null
  instructions: string
  imageUrl: string | null
  sourceUrl: string
  tags: string[]
  ingredients: {
    name: string
    quantity: number | null
    unit: string | null
    notes: string | null
  }[]
}

interface SuggestionsResponse {
  favorites: SuggestedRecipe[]
  ingredientMatches?: SuggestedRecipe[]
}

interface SuggestedRecipe {
  recipeId: string
  recipe: {
    id: string
    title: string
    tags: string[]
    type: string
  }
  score: number
  reason: string
}

interface PreferencesSummary {
  members: FamilyMember[]
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

interface MealPlan {
  id: string
  weekStartDate: string
  plannedMeals: PlannedMeal[]
  lunchboxItems: LunchboxItem[]
}

interface PlannedMeal {
  id: string
  dayOfWeek: number
  mealType: 'DINNER' | 'LUNCH'
  placeholderTitle: string | null
  notes: string | null
  recipes: {
    id: string
    role: 'MAIN' | 'SIDE'
    recipe: Recipe
  }[]
  familyMember: FamilyMember | null
}

interface LunchboxItem {
  id: string
  dayOfWeek: number
  category: string | null
  name: string
  notes: string | null
  familyMember: FamilyMember
}

interface RecentMealPlansResponse {
  mealPlans: {
    id: string
    weekStartDate: string
    meals: {
      dayOfWeek: number
      dayName: string
      mealType: string
      recipes: {
        id: string
        title: string
        type: string
      }[]
      placeholder?: string
    }[]
  }[]
  weeksIncluded: number
}

interface GroceryList {
  id: string
  items: GroceryItem[]
}

interface GroceryItem {
  id: string
  name: string
  quantity: string | null
  unit: string | null
  category: string | null
  isChecked: boolean
  isManualAdd: boolean
}

interface PantryStaple {
  id: string
  name: string
  displayName: string
}

export class ApiClient {
  private baseUrl: string
  private apiToken: string

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.apiToken = config.apiToken
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
      throw new Error(errorBody.error || `API error: ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  // Recipe methods
  async getRecipes(params?: {
    search?: string
    tag?: string
    type?: 'MAIN' | 'SIDE'
  }): Promise<Recipe[]> {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.tag) searchParams.set('tag', params.tag)
    if (params?.type) searchParams.set('type', params.type)

    const query = searchParams.toString()
    return this.request(`/api/recipes${query ? `?${query}` : ''}`)
  }

  async getSuggestions(params?: {
    ingredients?: string
    limit?: number
    excludeKidDownvotes?: boolean
  }): Promise<SuggestionsResponse> {
    const searchParams = new URLSearchParams()
    if (params?.ingredients) searchParams.set('ingredients', params.ingredients)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.excludeKidDownvotes !== undefined) {
      searchParams.set('excludeKidDownvotes', String(params.excludeKidDownvotes))
    }

    const query = searchParams.toString()
    return this.request(`/api/recipes/suggestions${query ? `?${query}` : ''}`)
  }

  async importRecipe(url: string): Promise<ParsedRecipe> {
    return this.request('/api/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url }),
    })
  }

  async createRecipe(recipe: CreateRecipeInput): Promise<Recipe> {
    return this.request('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    })
  }

  // Family methods
  async getFamilyMembers(): Promise<FamilyMember[]> {
    return this.request('/api/family')
  }

  async getPreferencesSummary(): Promise<PreferencesSummary> {
    return this.request('/api/mcp/preferences-summary')
  }

  // Meal plan methods
  async getMealPlan(weekStart: string): Promise<MealPlan | null> {
    return this.request(`/api/meal-plans?weekStart=${encodeURIComponent(weekStart)}`)
  }

  async getRecentMealPlans(weeks: number = 4): Promise<RecentMealPlansResponse> {
    return this.request(`/api/mcp/recent-meal-plans?weeks=${weeks}`)
  }

  async createOrGetMealPlan(weekStartDate: string): Promise<MealPlan> {
    return this.request('/api/meal-plans', {
      method: 'POST',
      body: JSON.stringify({ weekStartDate }),
    })
  }

  async addPlannedMeal(params: {
    mealPlanId: string
    recipeId?: string
    placeholderTitle?: string
    dayOfWeek: number
    mealType: 'DINNER' | 'LUNCH'
    notes?: string
    role?: 'MAIN' | 'SIDE'
  }): Promise<PlannedMeal> {
    return this.request('/api/planned-meals', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  // Grocery methods
  async getGroceryList(mealPlanId: string): Promise<GroceryList | null> {
    return this.request(`/api/grocery-lists?mealPlanId=${encodeURIComponent(mealPlanId)}`)
  }

  async getPantryStaples(): Promise<PantryStaple[]> {
    return this.request('/api/pantry-staples')
  }
}
