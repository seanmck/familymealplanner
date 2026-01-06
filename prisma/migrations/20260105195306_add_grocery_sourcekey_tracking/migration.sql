-- AlterTable
ALTER TABLE "GroceryItem" ADD COLUMN     "sourceKey" TEXT;

-- AlterTable
ALTER TABLE "GroceryList" ADD COLUMN     "checkedSourceKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "editedItems" JSONB NOT NULL DEFAULT '{}';
