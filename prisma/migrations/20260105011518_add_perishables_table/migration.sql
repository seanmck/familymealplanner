-- CreateTable
CREATE TABLE "Perishable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "quantity" DECIMAL(10,3),
    "unit" TEXT,
    "expirationDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "householdId" TEXT NOT NULL,

    CONSTRAINT "Perishable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Perishable_householdId_idx" ON "Perishable"("householdId");

-- CreateIndex
CREATE INDEX "Perishable_expirationDate_idx" ON "Perishable"("expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "Perishable_householdId_name_key" ON "Perishable"("householdId", "name");

-- AddForeignKey
ALTER TABLE "Perishable" ADD CONSTRAINT "Perishable_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
