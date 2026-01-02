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
```

**Environment Setup**: Copy `.env.example` to `.env`. PostgreSQL runs on port 5434 (not default 5432).

## Architecture

**FamilyTable** is a family meal planning app built with Next.js 16 (App Router) + Prisma + PostgreSQL.

### Route Groups
- `app/(auth)/` - Login/register pages (no navigation)
- `app/(main)/` - Authenticated pages with navigation (recipes, planner, groceries, settings)
- `app/api/` - API routes

### Data Model Hierarchy
```
Household (container for all family data)
├── User (authenticated accounts)
├── FamilyMember (people who eat meals - adults/children, can rate recipes)
├── Recipe → Ingredient[]
│   └── RecipeRating (per family member: UP/DOWN/NEUTRAL)
├── MealPlan (one per week, keyed by weekStartDate)
│   ├── PlannedMeal (recipe or placeholder assigned to day/mealType)
│   ├── LunchboxItem (bento-style items per child per day)
│   └── GroceryList → GroceryItem[]
└── PantryStaple (items to auto-exclude from grocery lists)
```

### Key Patterns
- **Server Components by default**: Data fetching in page components, Client Components only where interactivity needed
- **Auth via NextAuth v5**: JWT strategy with credentials provider, session includes `householdId`
- **All data is household-scoped**: Queries filter by `householdId` from session
- **Recipe import**: `lib/recipe-parser.ts` extracts JSON-LD schema.org Recipe data from URLs using cheerio

### Type Extensions
Session types are extended in `types/next-auth.d.ts` to include `user.id` and `user.householdId`.
