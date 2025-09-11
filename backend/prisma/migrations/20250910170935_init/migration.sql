-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'ORGANIZER', 'ARTIST', 'VENUE', 'FAN');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('FULL_BAND', 'TRIO', 'DUO', 'SOLO');

-- CreateEnum
CREATE TYPE "PriceRate" AS ENUM ('BUDGET', 'STANDARD', 'PREMIUM', 'VIP', 'LUXURY');

-- CreateEnum
CREATE TYPE "AlcoholPolicy" AS ENUM ('SERVE', 'NONE', 'BYOB');

-- CreateEnum
CREATE TYPE "ArtistEventStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('OUTDOOR', 'INDOOR', 'HYBRID');

-- CreateEnum
CREATE TYPE "TicketingType" AS ENUM ('FREE', 'DONATION', 'TICKET_MELON', 'DIRECT_CONTACT', 'ONSITE_SALES');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "displayName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "bio" TEXT,
    "favoriteGenres" TEXT[],
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistProfile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "genre" TEXT NOT NULL,
    "subGenre" TEXT,
    "bookingType" "BookingType" NOT NULL,
    "foundingYear" INTEGER,
    "label" TEXT,
    "isIndependent" BOOLEAN NOT NULL DEFAULT true,
    "memberCount" INTEGER,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "videoUrl" TEXT,
    "profilePhotoUrl" TEXT,
    "rateCardUrl" TEXT,
    "epkUrl" TEXT,
    "riderUrl" TEXT,
    "spotifyUrl" TEXT,
    "youtubeUrl" TEXT,
    "appleMusicUrl" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "soundcloudUrl" TEXT,
    "shazamUrl" TEXT,
    "bandcampUrl" TEXT,
    "tiktokUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ArtistProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueProfile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "locationUrl" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "dateOpen" TIMESTAMP(3),
    "dateClose" TIMESTAMP(3),
    "priceRate" "PriceRate",
    "timeOpen" TEXT,
    "timeClose" TEXT,
    "alcoholPolicy" "AlcoholPolicy" NOT NULL,
    "ageRestriction" TEXT,
    "profilePhotoUrl" TEXT,
    "photoUrls" TEXT[],
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "lineUrl" TEXT,
    "tiktokUrl" TEXT,
    "websiteUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "VenueProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "posterUrl" TEXT,
    "conditions" TEXT,
    "eventType" "EventType" NOT NULL,
    "ticketing" "TicketingType" NOT NULL,
    "ticketLink" TEXT,
    "alcoholPolicy" "AlcoholPolicy" NOT NULL,
    "ageRestriction" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "doorOpenTime" TEXT,
    "endTime" TEXT,
    "genre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "venueId" INTEGER NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistEvent" (
    "artistId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "role" TEXT,
    "fee" INTEGER,
    "order" INTEGER,
    "status" "ArtistEventStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistEvent_pkey" PRIMARY KEY ("artistId","eventId")
);

-- CreateTable
CREATE TABLE "RoleRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "requestedRole" "UserRole" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "reviewedById" INTEGER,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistProfile_userId_key" ON "ArtistProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueProfile_userId_key" ON "VenueProfile"("userId");

-- CreateIndex
CREATE INDEX "VenueProfile_latitude_longitude_idx" ON "VenueProfile"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "ArtistEvent_eventId_idx" ON "ArtistEvent"("eventId");

-- CreateIndex
CREATE INDEX "ArtistEvent_artistId_idx" ON "ArtistEvent"("artistId");

-- CreateIndex
CREATE INDEX "RoleRequest_userId_idx" ON "RoleRequest"("userId");

-- CreateIndex
CREATE INDEX "RoleRequest_status_idx" ON "RoleRequest"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistProfile" ADD CONSTRAINT "ArtistProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueProfile" ADD CONSTRAINT "VenueProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "VenueProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistEvent" ADD CONSTRAINT "ArtistEvent_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistEvent" ADD CONSTRAINT "ArtistEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleRequest" ADD CONSTRAINT "RoleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleRequest" ADD CONSTRAINT "RoleRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
