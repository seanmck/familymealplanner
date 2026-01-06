-- AlterTable
ALTER TABLE "LunchboxItem" ADD COLUMN     "consumptionNote" TEXT,
ADD COLUMN     "wasConsumed" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PlannedMeal" ADD COLUMN     "hasLeftovers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leftoversQuantity" TEXT;

-- CreateTable
CREATE TABLE "MealFeedback" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plannedMealId" TEXT NOT NULL,
    "familyMemberId" TEXT,

    CONSTRAINT "MealFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealFeedback_plannedMealId_idx" ON "MealFeedback"("plannedMealId");

-- CreateIndex
CREATE INDEX "MealFeedback_familyMemberId_idx" ON "MealFeedback"("familyMemberId");

-- AddForeignKey
ALTER TABLE "MealFeedback" ADD CONSTRAINT "MealFeedback_plannedMealId_fkey" FOREIGN KEY ("plannedMealId") REFERENCES "PlannedMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealFeedback" ADD CONSTRAINT "MealFeedback_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
