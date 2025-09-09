// prisma/seed.js
import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding artists...");

  // Clear existing data (optional, useful for dev only!)
  await prisma.artistProfile.deleteMany();
  await prisma.user.deleteMany({ where: { role: 'ARTIST' } });

  // Some sample artists
  const artists = [
    {
      name: "NewJeans",
      description: "K-pop girl group under ADOR.",
      genre: "K-Pop",
      bookingType: "FULL_BAND",
      foundingYear: 2022,
      memberCount: 5,
      label: "ADOR",
      instagramUrl: "https://instagram.com/newjeans_official",
      spotifyUrl: "https://open.spotify.com/artist/6HvZYsbFfjnjFrWF950C9d",
      profilePhotoUrl: "https://i.pinimg.com/736x/a7/39/8a/a7398a0e0e0d469d6314df8b73f228a2.jpg"
    },
    {
      name: "IU",
      description: "South Korean solo artist, singer-songwriter and actress.",
      genre: "K-Pop",
      bookingType: "SOLO",
      foundingYear: 2008,
      memberCount: 1,
      label: "EDAM Entertainment",
      instagramUrl: "https://instagram.com/dlwlrma",
      spotifyUrl: "https://open.spotify.com/artist/3HqSLMAZ3g3d5poNaI7GOU",
      profilePhotoUrl: "https://i.pinimg.com/736x/a7/39/8a/a7398a0e0e0d469d6314df8b73f228a2.jpg"
    },
  ];

  for (const artist of artists) {
    // Create a user first
    const user = await prisma.user.create({
      data: {
        email: `${artist.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
        passwordHash: await bcrypt.hash("password123", 10),
        role: "ARTIST",
      },
    });

    // Create artist profile linked to the user
    await prisma.artistProfile.create({
      data: {
        ...artist,
        userId: user.id,
      },
    });
  }

  console.log("✅ Artists seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

