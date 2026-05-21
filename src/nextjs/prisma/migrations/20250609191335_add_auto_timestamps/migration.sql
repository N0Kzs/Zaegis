/*
  Warnings:

  - Added the required column `updatedAt` to the `LastShift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `WeeklyHours` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LastShift" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "WeeklyHours" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ciras_data" ALTER COLUMN "dateEncoded" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "file_uploads" ALTER COLUMN "uploadedAt" SET DEFAULT CURRENT_TIMESTAMP;
