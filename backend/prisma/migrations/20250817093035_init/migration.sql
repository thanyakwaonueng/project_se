/*
  Warnings:

  - You are about to drop the column `latitude` on the `VenueProfile` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `VenueProfile` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "VenueProfile_latitude_longitude_idx";

-- AlterTable
ALTER TABLE "VenueProfile" DROP COLUMN "latitude",
DROP COLUMN "longitude";
