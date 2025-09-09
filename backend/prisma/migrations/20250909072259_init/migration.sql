/*
  Warnings:

  - You are about to drop the `_ArtistPerformances` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ArtistPerformances" DROP CONSTRAINT "_ArtistPerformances_A_fkey";

-- DropForeignKey
ALTER TABLE "_ArtistPerformances" DROP CONSTRAINT "_ArtistPerformances_B_fkey";

-- DropTable
DROP TABLE "_ArtistPerformances";

-- CreateTable
CREATE TABLE "ArtistEvent" (
    "artistId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "role" TEXT,
    "fee" INTEGER,
    "order" INTEGER,
    "status" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistEvent_pkey" PRIMARY KEY ("artistId","eventId")
);

-- CreateIndex
CREATE INDEX "ArtistEvent_eventId_idx" ON "ArtistEvent"("eventId");

-- CreateIndex
CREATE INDEX "ArtistEvent_artistId_idx" ON "ArtistEvent"("artistId");

-- AddForeignKey
ALTER TABLE "ArtistEvent" ADD CONSTRAINT "ArtistEvent_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistEvent" ADD CONSTRAINT "ArtistEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
