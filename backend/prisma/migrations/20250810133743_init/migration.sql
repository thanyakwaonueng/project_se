/*
  Warnings:

  - Added the required column `bookingType` to the `ArtistProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `genre` to the `ArtistProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `ArtistProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `alcoholPolicy` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventType` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticketing` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `alcoholPolicy` to the `VenueProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `genre` to the `VenueProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locationUrl` to the `VenueProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `VenueProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ArtistProfile" ADD COLUMN     "appleMusicUrl" TEXT,
ADD COLUMN     "bandcampUrl" TEXT,
ADD COLUMN     "bookingType" "BookingType" NOT NULL,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "epkUrl" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "foundingYear" INTEGER,
ADD COLUMN     "genre" TEXT NOT NULL,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "isIndependent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "memberCount" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "priceMax" DOUBLE PRECISION,
ADD COLUMN     "priceMin" DOUBLE PRECISION,
ADD COLUMN     "profilePhotoUrl" TEXT,
ADD COLUMN     "rateCardUrl" TEXT,
ADD COLUMN     "riderUrl" TEXT,
ADD COLUMN     "shazamUrl" TEXT,
ADD COLUMN     "soundcloudUrl" TEXT,
ADD COLUMN     "spotifyUrl" TEXT,
ADD COLUMN     "subGenre" TEXT,
ADD COLUMN     "tiktokUrl" TEXT,
ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "ageRestriction" TEXT,
ADD COLUMN     "alcoholPolicy" "AlcoholPolicy" NOT NULL,
ADD COLUMN     "conditions" TEXT,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "doorOpenTime" TEXT,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "eventType" "EventType" NOT NULL,
ADD COLUMN     "genre" TEXT,
ADD COLUMN     "posterUrl" TEXT,
ADD COLUMN     "ticketLink" TEXT,
ADD COLUMN     "ticketing" "TicketingType" NOT NULL;

-- AlterTable
ALTER TABLE "VenueProfile" ADD COLUMN     "ageRestriction" TEXT,
ADD COLUMN     "alcoholPolicy" "AlcoholPolicy" NOT NULL,
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "dateClose" TIMESTAMP(3),
ADD COLUMN     "dateOpen" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "genre" TEXT NOT NULL,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "lineUrl" TEXT,
ADD COLUMN     "locationUrl" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "photoUrls" TEXT[],
ADD COLUMN     "priceRate" "PriceRate",
ADD COLUMN     "profilePhotoUrl" TEXT,
ADD COLUMN     "tiktokUrl" TEXT,
ADD COLUMN     "timeClose" TEXT,
ADD COLUMN     "timeOpen" TEXT,
ADD COLUMN     "websiteUrl" TEXT;
