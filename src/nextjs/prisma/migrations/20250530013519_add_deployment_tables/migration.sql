-- CreateTable
CREATE TABLE "deployment_recommendation" (
    "id" SERIAL NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "recommendedCount" INTEGER NOT NULL,
    "severityScore" DOUBLE PRECISION NOT NULL,
    "crimeCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployment_recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_schedule" (
    "id" SERIAL NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "assignedCount" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployment_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deployment_recommendation_timeSlot_barangay_key" ON "deployment_recommendation"("timeSlot", "barangay");

-- CreateIndex
CREATE UNIQUE INDEX "deployment_schedule_timeSlot_barangay_date_key" ON "deployment_schedule"("timeSlot", "barangay", "date");
