# FamilyTable - Product Requirements Document

## Overview

FamilyTable is a family meal planning application that reduces the weekly burden of deciding what to cook, managing picky eaters, and generating grocery lists. The app helps families maintain variety while respecting the comfort levels of less adventurous eaters.

## Problem Statement

Weekly meal planning for families involves multiple compounding challenges:

1. **Decision fatigue** - Choosing 5-7 dinners weekly is mentally exhausting
2. **The pickiness paradox** - Kids need familiarity but families need variety
3. **Lunch logistics** - School lunches often depend on dinner planning (leftovers)
4. **Grocery coordination** - Translating a week of meals into a shopping list is error-prone
5. **Recipe fragmentation** - Family recipes live in books, apps, websites, and memory

## Target Users

### Primary: The Family Meal Planner
- Parent who handles most cooking and shopping
- Cooks from scratch most nights
- Has a mental catalog of "approved" family recipes
- Wants to occasionally introduce new meals without rebellion
- Values efficiency in planning and shopping

### Secondary: Other Household Members
- Co-parent who occasionally cooks or shops
- Kids who rate meals (building preference data)

## Core Principles

1. **Familiarity over novelty** - The app should help maintain comfort while introducing variety gradually
2. **Flexible structure** - Provide helpful defaults but never force rigid workflows
3. **Reduce friction** - Every interaction should save time, not add process
4. **Family-aware** - Individual preferences matter; one-size-fits-all doesn't work

---

## Features

### MVP (v1.0)

#### 1. Recipe Library

**Description:** Central repository for family recipes with ratings and metadata.

**Requirements:**
- Add recipes manually with:
  - Title
  - Description (optional)
  - Ingredients list (name, quantity, unit)
  - Instructions (free-form text or steps)
  - Prep time / cook time (optional)
  - Servings
  - Tags (e.g., "weeknight", "slow cooker", "kid-friendly")
  - Photo (optional)
- Edit and delete recipes
- Search recipes by title, ingredient, or tag
- Filter recipes by tag
- View recipe detail page

**Data Model:**
```
Recipe
├── id: uuid
├── title: string
├── description: string?
├── prepTimeMinutes: int?
├── cookTimeMinutes: int?
├── servings: int
├── instructions: text
├── imageUrl: string?
├── tags: string[]
├── createdAt: timestamp
└── updatedAt: timestamp

Ingredient
├── id: uuid
├── recipeId: uuid (FK)
├── name: string
├── quantity: decimal?
├── unit: string?
└── notes: string? (e.g., "divided", "optional")
```

#### 2. Family Members

**Description:** Household members who can rate meals and have preferences tracked.

**Requirements:**
- Add family members with name and role (adult/child)
- Each member can rate recipes (thumbs up / thumbs down / neutral)
- View aggregate family rating on recipe cards
- Simple household model (no multi-household in v1)

**Data Model:**
```
FamilyMember
├── id: uuid
├── name: string
├── role: enum (adult, child)
├── createdAt: timestamp
└── updatedAt: timestamp

RecipeRating
├── id: uuid
├── recipeId: uuid (FK)
├── memberId: uuid (FK)
├── rating: enum (up, down, neutral)
├── createdAt: timestamp
└── updatedAt: timestamp
```

#### 3. Weekly Meal Planner

**Description:** Calendar-style interface for planning dinners and lunches.

**Requirements:**
- View week at a glance (Mon-Sun)
- Two meal slots per day: Dinner, Kids Lunch (next day)
- Assign recipes to meal slots via:
  - Search/select from recipe library
  - Quick-add placeholder (just a title, no full recipe)
- Remove or swap assigned meals
- Navigate between weeks
- Copy previous week as starting point (optional)
- Visual indicator for:
  - Recipes with low kid ratings
  - "New to family" recipes (never rated)

**Data Model:**
```
MealPlan
├── id: uuid
├── weekStartDate: date (Monday of the week)
├── createdAt: timestamp
└── updatedAt: timestamp

PlannedMeal
├── id: uuid
├── mealPlanId: uuid (FK)
├── recipeId: uuid? (FK, nullable for placeholders)
├── placeholderTitle: string? (for quick-add without recipe)
├── dayOfWeek: int (0=Monday, 6=Sunday)
├── mealType: enum (dinner, lunch)
└── notes: string?
```

#### 4. Grocery List Generation

**Description:** Aggregate ingredients from the week's meal plan into a shopping list.

**Requirements:**
- Generate grocery list from current week's meal plan
- Combine duplicate ingredients (e.g., 2 recipes need onions → sum quantities)
- Organize by category (produce, dairy, meat, pantry, etc.)
- Check off items while shopping
- Manually add items not from recipes
- Clear completed items
- "Pantry staples" list - items to auto-exclude (user configurable)

**Data Model:**
```
GroceryList
├── id: uuid
├── mealPlanId: uuid (FK)
├── createdAt: timestamp
└── updatedAt: timestamp

GroceryItem
├── id: uuid
├── groceryListId: uuid (FK)
├── ingredientId: uuid? (FK, nullable for manual adds)
├── name: string
├── quantity: decimal?
├── unit: string?
├── category: string?
├── isChecked: boolean
├── isManualAdd: boolean
└── sortOrder: int

PantryStaple
├── id: uuid
├── name: string (normalized, e.g., "salt", "olive oil")
└── createdAt: timestamp
```

#### 5. Basic Authentication

**Description:** Simple authentication to protect family data.

**Requirements:**
- Email/password login
- Single household per account
- Session persistence
- Password reset flow

---

### Future Features (v2+)

#### Recipe Import
- Parse recipes from URLs (schema.org Recipe format)
- Import from photos using OCR/AI
- Bulk import from other apps (CSV, Paprika, etc.)

#### Smart Suggestions
- "Fill my week" button that auto-assigns meals based on:
  - Family ratings
  - Variety (don't repeat recent meals)
  - Configurable "adventure ratio"
  - Seasonal ingredients
- Suggest lunches based on dinner leftovers

#### Preference Learning
- Track which new recipes get approved vs. rejected
- Build ingredient affinity scores per family member
- "Comfort score" prediction for new recipes

#### Nutritional Information
- Auto-calculate nutrition from ingredients
- Weekly nutrition summary
- Balance indicators (protein, vegetables, etc.)

#### Mobile Apps
- iOS and Android native apps
- Offline grocery list access
- Push notifications for meal reminders

#### Sharing & Collaboration
- Share recipes with other FamilyTable users
- Multi-household support (grandparents, shared custody)
- Assign cooking duties to family members

#### Meal Prep Mode
- Batch cooking suggestions
- Prep day planning
- Freezer inventory tracking

---

## User Flows

### Flow 1: Weekly Planning (Happy Path)

```
1. User opens app on Sunday evening
2. Navigates to Planner (default view)
3. Sees empty week for upcoming Mon-Sun
4. Clicks Monday Dinner slot
5. Recipe picker opens with search + recent recipes
6. Selects "Chicken Tacos" → assigned to Monday
7. Clicks Monday Lunch slot
8. Quick-adds "Taco leftovers + fruit" (no recipe needed)
9. Repeats for remaining days
10. Clicks "Generate Grocery List"
11. Reviews list, checks pantry staples, removes items already owned
12. Goes shopping with list on phone
```

### Flow 2: Adding a New Recipe

```
1. User finds recipe online they want to try
2. Opens Recipe Library → Add Recipe
3. Enters title, ingredients, instructions manually (v1)
4. Tags as "new", "weeknight", "chicken"
5. Saves recipe
6. Recipe appears in library with "New to family" badge
7. Assigns to upcoming week
8. After dinner, family rates the meal
9. Recipe rating updates, "new" badge removed
```

### Flow 3: Grocery Shopping

```
1. User opens Grocery List for current week
2. Items organized by store section
3. In store, checks items as added to cart
4. Realizes they need paper towels (not from recipes)
5. Taps "Add item" → enters "paper towels"
6. Continues shopping
7. At home, clears checked items (or leaves for next week's reference)
```

---

## Technical Architecture

### Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14+ (App Router) | Full-stack React, good DX, easy deployment |
| Styling | Tailwind CSS | Rapid UI development, consistent design |
| Database | PostgreSQL | Relational data fits well, good ecosystem |
| ORM | Prisma | Type-safe queries, good migrations |
| Auth | NextAuth.js | Simple setup, extensible |
| Deployment | Vercel | Zero-config for Next.js |
| Storage | Vercel Blob or S3 | Recipe images |

### Project Structure

```
/app
  /api           # API routes
  /(auth)        # Login, register, etc.
  /recipes       # Recipe library pages
  /planner       # Weekly planner pages
  /groceries     # Grocery list pages
  /settings      # Family members, pantry staples
/components      # Shared UI components
/lib             # Utilities, database client
/prisma          # Schema and migrations
```

### Key Technical Decisions

1. **Server Components by default** - Use React Server Components for data fetching, Client Components only where interactivity needed

2. **Optimistic updates** - Meal planning and grocery checking should feel instant

3. **Mobile-responsive from day one** - Grocery list must work well on phone in store

4. **Ingredient normalization** - Fuzzy matching for combining groceries (e.g., "onion" vs "onions" vs "yellow onion")

---

## Success Metrics

### Quantitative
- Weekly active planners (≥1 meal planned per week)
- Recipes added per household
- Grocery lists generated per week
- Recipe rating participation rate

### Qualitative
- "Do you feel less stressed about meal planning?" (survey)
- "Has your family tried more new recipes?" (survey)
- Time spent planning meals (should decrease over time)

---

## Open Questions

1. **Ingredient parsing** - How structured should ingredient entry be? Free-form is easier but harder to aggregate. Structured is more work but better grocery lists.

2. **Recipe scaling** - Should recipes auto-scale when assigned to a meal? (e.g., recipe serves 4 but family is 5)

3. **Leftover intelligence** - How to model "this dinner makes good lunch leftovers"? Tag? Explicit linking?

4. **Multi-cook households** - Does the shopping person need a different view than the cooking person?

5. **Week boundaries** - Does everyone's week start Monday? Should this be configurable?

---

## Appendix: Competitive Landscape

| App | Strengths | Gaps |
|-----|-----------|------|
| Mealime | Good recipe discovery, auto grocery list | No family ratings, limited customization |
| Paprika | Excellent recipe management | Weak meal planning, no family features |
| Plan to Eat | Strong planning calendar | Dated UI, no preference learning |
| Whisk | Recipe import works well | No kid/picky eater considerations |
| Notion/Spreadsheets | Fully customizable | No grocery aggregation, high effort |

FamilyTable differentiates by focusing specifically on **families with picky eaters** and the **gradual introduction of variety**.
