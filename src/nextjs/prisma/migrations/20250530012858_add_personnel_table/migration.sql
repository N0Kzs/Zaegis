-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_uploads" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciras_data" (
    "blotterno" TEXT NOT NULL,
    "dateEncoded" TIMESTAMP(3) NOT NULL,
    "municipal" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "typeofPlace" TEXT NOT NULL,
    "dateReported" DATE,
    "timeReported" TIME,
    "dateCommitted" DATE,
    "timeCommitted" TIME,
    "incidentType" TEXT NOT NULL,
    "offense" TEXT,
    "offenseType" TEXT,
    "lat" DECIMAL(65,30),
    "lng" DECIMAL(65,30),
    "fileId" INTEGER,
    "weightId" INTEGER,

    CONSTRAINT "ciras_data_pkey" PRIMARY KEY ("blotterno")
);

-- CreateTable
CREATE TABLE "population" (
    "pop_id" INTEGER NOT NULL,
    "barangays" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "population" INTEGER NOT NULL,

    CONSTRAINT "population_pkey" PRIMARY KEY ("pop_id")
);

-- CreateTable
CREATE TABLE "crime_weights" (
    "cw_id" SERIAL NOT NULL,
    "offense" TEXT NOT NULL,
    "weight" INTEGER,

    CONSTRAINT "crime_weights_pkey" PRIMARY KEY ("cw_id")
);

-- CreateTable
CREATE TABLE "personnel" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_user_email_key" ON "User"("user_email");

-- CreateIndex
CREATE UNIQUE INDEX "file_uploads_fileHash_key" ON "file_uploads"("fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "crime_weights_offense_key" ON "crime_weights"("offense");

-- CreateIndex
CREATE INDEX "crime_weights_offense_idx" ON "crime_weights"("offense");

-- AddForeignKey
ALTER TABLE "ciras_data" ADD CONSTRAINT "ciras_data_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciras_data" ADD CONSTRAINT "ciras_data_weightId_fkey" FOREIGN KEY ("weightId") REFERENCES "crime_weights"("cw_id") ON DELETE SET NULL ON UPDATE CASCADE;
