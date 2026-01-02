# Health Tracking Feature Spec

> **Status**: Future consideration
> **Goal**: Prevent the "grilled cheese every night" pattern by surfacing variety and nutritional balance in the weekly planner.

## Problem Statement

Left to their own devices, kids would happily eat grilled cheese, chicken nuggets, and mac & cheese every night. Parents need a lightweight way to see if the week's meal plan has reasonable variety and nutritional balance - without calorie counting or macro tracking.

## Proposed Solution

### Recipe Health Profile (4 categories)

| Profile | Description | Visual | Example Meals |
|---------|-------------|--------|---------------|
| **BALANCED** | Well-rounded, includes vegetables | 🥗 Green | Stir fry, salmon with veggies, chicken salad |
| **COMFORT** | Comfort food, heavier/richer | 🍕 Orange | Mac & cheese, grilled cheese, pizza, lasagna |
| **LIGHT** | Salads, soups, lighter fare | 🥬 Blue | Garden salad, soup, veggie wraps |
| **INDULGENT** | Special treats, celebrations | 🎂 Purple | Birthday dinner, holiday meals, dessert-focused |

### Optional Nutrition Tags (multi-select)
- `veggie-heavy` - Vegetables are the star
- `protein-rich` - Good protein source
- `homemade` - Made from scratch
- `processed` - Relies on frozen/boxed ingredients
- `quick-prep` - Under 30 min total time

---

## Data Model

```prisma
enum HealthProfile {
  BALANCED
  COMFORT
  LIGHT
  INDULGENT
}

model Recipe {
  // ... existing fields
  healthProfile  HealthProfile?  // Optional single classification
  nutritionTags  String[]  @default([])

  @@index([healthProfile])
}
```

---

## UI Design

### Weekly Balance in Planner

Add to existing `WeeklySummary` component in `week-view.tsx`:

```
Weekly Balance
[====BALANCED====][==COMFORT==][L]  • 7 unique recipes
      4 meals        2 meals   1
```

**Visual**: Stacked horizontal bar with color-coded segments showing profile distribution.

**Warnings surface when**:
- COMFORT > 50% of planned meals
- Variety < 5 unique recipes for the week

### Recipe Categorization

**HealthProfileSelector component**: Four icon buttons in a row (similar to rating thumbs). Single-select, nullable.

**Where it appears**:
- Recipe creation/edit form (after recipe type)
- Import flow (as auto-suggested value user can override)

### Auto-Suggestion on Import

When importing a recipe via URL, analyze:
1. **Ingredient keywords**: vegetables → suggest BALANCED; cheese/cream/fried → suggest COMFORT
2. **Source tags**: "salad", "light", "healthy" → suggest LIGHT
3. **Recipe category**: desserts → suggest INDULGENT

Present as suggestion, not forced assignment.

---

## Implementation Phases

### Phase 1: Schema & Backend
1. Add HealthProfile enum to schema
2. Add `healthProfile` and `nutritionTags` fields to Recipe
3. Run migration
4. Update recipe API routes to accept/return new fields

### Phase 2: Recipe Categorization UI
5. Create `HealthProfileSelector` component
6. Add to recipe form
7. Add auto-inference to `recipe-parser.ts`

### Phase 3: Weekly Balance Display
8. Enhance `WeeklySummary` in `week-view.tsx`
9. Add profile breakdown visualization
10. Add variety indicator (unique recipe count)

---

## Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add HealthProfile enum, Recipe fields |
| `app/api/recipes/route.ts` | Accept/return health fields |
| `app/api/recipes/[id]/route.ts` | Accept/return health fields |
| `lib/recipe-parser.ts` | Add health inference for imports |
| `components/week-view.tsx` | Enhance WeeklySummary |
| `components/health-profile-selector.tsx` | New component |
| Recipe form component | Add profile selector |

---

## Success Metrics

- Users can see at a glance if week is "comfort-heavy"
- Variety score encourages trying different recipes
- Categorization takes < 2 seconds per recipe
- 80%+ of imported recipes get auto-suggested profile

---

## Out of Scope (intentionally)

- Calorie counting
- Macro tracking (protein/carbs/fat grams)
- Detailed nutritional analysis
- Dietary restriction enforcement
- Per-person health profiles
