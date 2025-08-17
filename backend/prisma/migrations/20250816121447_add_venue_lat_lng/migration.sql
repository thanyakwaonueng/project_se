-- AlterTable
ALTER TABLE "VenueProfile" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "VenueProfile_latitude_longitude_idx" ON "VenueProfile"("latitude", "longitude");
