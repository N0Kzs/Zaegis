/*
  Warnings:

  - You are about to drop the `deployment_recommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deployment_schedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "deployment_recommendation";

-- DropTable
DROP TABLE "deployment_schedule";

-- CreateTable
CREATE TABLE "patrolCar" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "patrolCar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrolSchedule" (
    "id" SERIAL NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "areas" TEXT[],
    "carId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patrolSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonnelOnSchedule" (
    "personnel_id" INTEGER NOT NULL,
    "schedule_id" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonnelOnSchedule_pkey" PRIMARY KEY ("personnel_id","schedule_id")
);

-- CreateTable
CREATE TABLE "WeeklyHours" (
    "id" SERIAL NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "WeeklyHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LastShift" (
    "id" SERIAL NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LastShift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patrolCar_name_key" ON "patrolCar"("name");

-- CreateIndex
CREATE INDEX "patrolSchedule_carId_idx" ON "patrolSchedule"("carId");

-- CreateIndex
CREATE INDEX "PersonnelOnSchedule_personnel_id_idx" ON "PersonnelOnSchedule"("personnel_id");

-- CreateIndex
CREATE INDEX "PersonnelOnSchedule_schedule_id_idx" ON "PersonnelOnSchedule"("schedule_id");

-- CreateIndex
CREATE INDEX "WeeklyHours_personnelId_idx" ON "WeeklyHours"("personnelId");

-- CreateIndex
CREATE INDEX "WeeklyHours_weekStartDate_idx" ON "WeeklyHours"("weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyHours_personnelId_weekStartDate_key" ON "WeeklyHours"("personnelId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "LastShift_personnelId_key" ON "LastShift"("personnelId");

-- CreateIndex
CREATE INDEX "LastShift_personnelId_idx" ON "LastShift"("personnelId");

-- CreateIndex
CREATE INDEX "LastShift_date_idx" ON "LastShift"("date");

-- AddForeignKey
ALTER TABLE "patrolSchedule" ADD CONSTRAINT "patrolSchedule_carId_fkey" FOREIGN KEY ("carId") REFERENCES "patrolCar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelOnSchedule" ADD CONSTRAINT "PersonnelOnSchedule_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelOnSchedule" ADD CONSTRAINT "PersonnelOnSchedule_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "patrolSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyHours" ADD CONSTRAINT "WeeklyHours_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LastShift" ADD CONSTRAINT "LastShift_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
