# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Full development setup (starts Docker DB, runs migrations, starts dev server)
npm run dev:full

# Start dev server only (requires DB already running)
npm run dev

# Database management
npm run db:start        # Start PostgreSQL container
npm run db:stop         # Stop PostgreSQL container
npm run db:push         # Push schema changes to database
npm run db:studio       # Open Prisma Studio for database inspection

# Stop all services
npm run stop

# Linting
npm run lint

# MCP Server (in /mcp directory)
cd mcp && npm run build  # Build MCP server
cd mcp && npm run dev    # Watch mode for development
```

**Environment Setup**: Copy `.env.example` to `.env`. PostgreSQL runs on port 5434 (not default 5432).

## Architecture

**FamilyTable** is a family meal planning app built with Next.js 16 (App Router) + Prisma + PostgreSQL.

### Route Groups
- `app/(auth)/` - Login/register pages (no navigation)
- `app/(main)/` - Authenticated pages with navigation (recipes, planner, groceries, settings)
- `app/api/` - API routes
- `app/api/mcp/` - MCP-specific endpoints (preferences summary, recent meal plans)

### Data Model Hierarchy
```
Household (container for all family data)
├── User (authenticated accounts)
├── ApiToken (for MCP/CLI access, hashed tokens with last-used tracking)
├── FamilyMember (ADULT/CHILD roles, can rate recipes)
├── Recipe (MAIN/SIDE types) → Ingredient[]
│   └── RecipeRating (per family member: UP/DOWN/NEUTRAL)
├── MealPlan (one per week, keyed by weekStartDate)
│   ├── PlannedMeal (day/mealType, optional familyMemberId for personal meals)
│   │   └── PlannedMealRecipe (junction: multiple recipes per meal with MAIN/SIDE roles)
│   ├── LunchboxItem (bento-style items per child per day, categorized)
│   └── GroceryList → GroceryItem[]
└── PantryStaple (items to auto-exclude from grocery lists, normalized names)
```

### Key Patterns
- **Server Components by default**: Data fetching in page components, Client Components only where interactivity needed
- **Auth via NextAuth v5**: JWT strategy with credentials provider, session includes `householdId`
- **All data is household-scoped**: Queries filter by `householdId` from session
- **Recipe import**: `lib/recipe-parser.ts` extracts JSON-LD schema.org Recipe data from URLs using cheerio
- **Pantry staple matching**: Uses substring matching to exclude ingredient variants (e.g., "olive oil" matches "extra virgin olive oil")

### Type Extensions
Session types are extended in `types/next-auth.d.ts` to include `user.id` and `user.householdId`.

## MCP Server Integration

The `/mcp` directory contains a Model Context Protocol server for Claude Code integration, enabling AI-assisted meal planning.

### Setup
1. Generate API token: Settings → API Tokens (or POST to `/api/settings/api-tokens`)
2. Build server: `cd mcp && npm install && npm run build`
3. Configure in `.mcp.json` with `FAMILYTABLE_API_URL` and `FAMILYTABLE_API_TOKEN`

### Available MCP Tools
- **Recipes**: `get_recipes`, `get_recipe_suggestions`, `import_recipe_from_url`, `save_recipe`
- **Family**: `get_family_members`, `get_family_preferences_summary`
- **Meal Planning**: `get_meal_plan`, `get_recent_meal_plans`, `add_planned_meal`
- **Grocery**: `get_grocery_list`, `get_pantry_staples`
- **Discovery**: `search_recipes_web`

### API Token Authentication
MCP and external tools authenticate via `Authorization: Bearer ft_xxx` header. Tokens are hashed (SHA-256) before storage.
