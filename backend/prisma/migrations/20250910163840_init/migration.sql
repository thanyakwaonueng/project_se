/*
  Warnings:

  - The `status` column on the `ArtistEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ArtistEventStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "ArtistEvent" DROP COLUMN "status",
ADD COLUMN     "status" "ArtistEventStatus" NOT NULL DEFAULT 'PENDING';
