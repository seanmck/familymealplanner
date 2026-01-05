-- AlterTable
ALTER TABLE "GroceryList" ADD COLUMN     "excludedItems" TEXT[] DEFAULT ARRAY[]::TEXT[];
