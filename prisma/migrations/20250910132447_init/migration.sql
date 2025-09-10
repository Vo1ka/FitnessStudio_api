-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Intensity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('BOOKED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Coach" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClassType" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "intensity" "public"."Intensity" NOT NULL,

    CONSTRAINT "ClassType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClassSession" (
    "id" TEXT NOT NULL,
    "classTypeId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "ClassSession_startsAt_idx" ON "public"."ClassSession"("startsAt");

-- CreateIndex
CREATE INDEX "ClassSession_classTypeId_idx" ON "public"."ClassSession"("classTypeId");

-- CreateIndex
CREATE INDEX "ClassSession_coachId_idx" ON "public"."ClassSession"("coachId");

-- CreateIndex
CREATE INDEX "Booking_sessionId_status_idx" ON "public"."Booking"("sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_userId_sessionId_key" ON "public"."Booking"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "public"."ClassSession" ADD CONSTRAINT "ClassSession_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "public"."ClassType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClassSession" ADD CONSTRAINT "ClassSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "public"."Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
