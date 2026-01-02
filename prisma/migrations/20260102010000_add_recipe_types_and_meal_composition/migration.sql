-- CreateEnum
CREATE TYPE "RecipeType" AS ENUM ('MAIN', 'SIDE');

-- AlterTable: Add type column to Recipe
ALTER TABLE "Recipe" ADD COLUMN "type" "RecipeType" NOT NULL DEFAULT 'MAIN';

-- CreateIndex
CREATE INDEX "Recipe_type_idx" ON "Recipe"("type");

-- CreateTable
CREATE TABLE "PlannedMealRecipe" (
    "id" TEXT NOT NULL,
    "role" "RecipeType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plannedMealId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,

    CONSTRAINT "PlannedMealRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannedMealRecipe_plannedMealId_idx" ON "PlannedMealRecipe"("plannedMealId");

-- CreateIndex
CREATE INDEX "PlannedMealRecipe_recipeId_idx" ON "PlannedMealRecipe"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedMealRecipe_plannedMealId_recipeId_key" ON "PlannedMealRecipe"("plannedMealId", "recipeId");

-- Migrate existing data: move recipeId from PlannedMeal to PlannedMealRecipe
INSERT INTO "PlannedMealRecipe" ("id", "role", "sortOrder", "plannedMealId", "recipeId")
SELECT
    gen_random_uuid()::text,
    'MAIN'::"RecipeType",
    0,
    "id",
    "recipeId"
FROM "PlannedMeal"
WHERE "recipeId" IS NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "PlannedMeal_recipeId_idx";

-- AlterTable: Remove recipeId from PlannedMeal
ALTER TABLE "PlannedMeal" DROP COLUMN "recipeId";

-- AddForeignKey
ALTER TABLE "PlannedMealRecipe" ADD CONSTRAINT "PlannedMealRecipe_plannedMealId_fkey" FOREIGN KEY ("plannedMealId") REFERENCES "PlannedMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedMealRecipe" ADD CONSTRAINT "PlannedMealRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
