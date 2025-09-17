// prisma/seed.js (CommonJS)
const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/** วันที่ภายใน "เดือนปัจจุบัน" ตาม day/hour/minute */
function dInThisMonth(day, hour = 19, minute = 30) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day, hour, minute, 0);
}

/* ---------- รูปสุ่มสำหรับ Venue ---------- */
const VENUE_PICS = [
  "https://images.pexels.com/photos/210922/pexels-photo-210922.jpeg",
  "https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg",
  "https://images.pexels.com/photos/3359713/pexels-photo-3359713.jpeg",
  "https://images.pexels.com/photos/109669/pexels-photo-109669.jpeg",
  "https://images.pexels.com/photos/21067/pexels-photo.jpg",
  "https://images.pexels.com/photos/164938/pexels-photo-164938.jpeg",
  "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
  "https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg"
];
function pickVenuePhotos(n = 4) {
  const out = [];
  const used = new Set();
  while (out.length < n) {
    const idx = Math.floor(Math.random() * VENUE_PICS.length);
    if (!used.has(idx)) {
      used.add(idx);
      out.push(VENUE_PICS[idx]);
    }
  }
  return out;
}

/* ---------- โปสเตอร์ Event (แนวคอนเสิร์ต/เวที/ไฟสวยๆ) ---------- */
const EVENT_POSTERS = [
  "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg",
  "https://images.pexels.com/photos/3359713/pexels-photo-3359713.jpeg",
  "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg",
  "https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg",
  "https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg",
  "https://images.pexels.com/photos/210922/pexels-photo-210922.jpeg",
  "https://images.pexels.com/photos/109669/pexels-photo-109669.jpeg",
  "https://images.pexels.com/photos/21067/pexels-photo.jpg",
  "https://images.pexels.com/photos/164938/pexels-photo-164938.jpeg",
  "https://images.pexels.com/photos/164931/pexels-photo-164931.jpeg"
];

async function main() {
  console.log('🌱 Seeding… (users, artists, Chiang Mai venues, this-month events)');

  // ---------- ล้างข้อมูลที่มีความสัมพันธ์ก่อน (dev เท่านั้น — อย่าใช้ใน prod) ----------
  await prisma.artistEvent.deleteMany();
  await prisma.event.deleteMany();
  await prisma.artistProfile.deleteMany();
  await prisma.venueProfile.deleteMany();

  // เพื่อลดผลข้างเคียง เราไม่ลบผู้ใช้ทั้งหมด แต่ลบเฉพาะอีเมลที่จะ seed ทับ
  const seedEmails = [
    'admin@example.com',
    'fan@example.com',
    'newjeans@example.com','iu@example.com',
    'blackpink@example.com','bts@example.com',
    'ado@example.com','yoasobi@example.com',
    'nimman.studio@venue.example',
    'oldcity.arena@venue.example',
    'riverside.stage@venue.example',
    'thaphae.court@venue.example',
    'changklan.wh@venue.example',
    'santitham.loft@venue.example',
    'onenimman.terr@venue.example',
    'watgate.pav@venue.example',
  ];
  await prisma.user.deleteMany({ where: { email: { in: seedEmails } } });

  // ---------- ผู้ใช้ระบบพื้นฐาน ----------
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    }
  });

  const fanUser = await prisma.user.create({
    data: {
      email: 'fan@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'AUDIENCE',
    }
  });

  // ---------- Artists (6) ----------
  const artistDefs = [
    {
      email: 'newjeans@example.com',
      name: 'NewJeans', description: 'K-pop girl group under ADOR.',
      genre: 'K-POP', bookingType: 'FULL_BAND',
      foundingYear: 2022, memberCount: 5, label: 'ADOR',
      instagramUrl: 'https://instagram.com/newjeans_official',
      spotifyUrl: 'https://open.spotify.com/artist/6HvZYsbFfjnjFrWF950C9d',
      profilePhotoUrl: 'https://i.pinimg.com/736x/a7/39/8a/a7398a0e0e0d469d6314df8b73f228a2.jpg',
    },
    {
      email: 'iu@example.com',
      name: 'IU', description: 'South Korean solo artist, singer-songwriter and actress.',
      genre: 'K-POP', bookingType: 'SOLO',
      foundingYear: 2008, memberCount: 1, label: 'EDAM Entertainment',
      instagramUrl: 'https://instagram.com/dlwlrma',
      spotifyUrl: 'https://open.spotify.com/artist/3HqSLMAZ3g3d5poNaI7GOU',
      profilePhotoUrl: 'https://i.pinimg.com/736x/a7/39/8a/a7398a0e0e0d469d6314df8b73f228a2.jpg',
    },
    {
      email: 'blackpink@example.com',
      name: 'BLACKPINK', description: 'K-pop group from YG.',
      genre: 'K-POP', bookingType: 'FULL_BAND',
      foundingYear: 2016, memberCount: 4, label: 'YG',
      instagramUrl: 'https://instagram.com/blackpinkofficial',
      spotifyUrl: 'https://open.spotify.com/artist/41MozSoPIsD1dJM0CLPjZF',
      profilePhotoUrl: 'https://i.pinimg.com/736x/a7/39/8a/a7398a0e0e0d469d6314df8b73f228a2.jpg',
    },
    {
      email: 'bts@example.com',
      name: 'BTS', description: 'K-pop group from HYBE.',
      genre: 'K-POP', bookingType: 'FULL_BAND',
      foundingYear: 2013, memberCount: 7, label: 'HYBE',
      instagramUrl: 'https://instagram.com/bts.bighitofficial',
      spotifyUrl: 'https://open.spotify.com/artist/3Nrfpe0tUJi4K4DXYWgMUX',
      profilePhotoUrl: 'https://i.pinimg.com/736x/a7/39/8a/a7398a0e0e0d469d6314df8b73f228a2.jpg',
    },
    {
      email: 'ado@example.com',
      name: 'Ado', description: 'Japanese solo singer.',
      genre: 'J-POP', bookingType: 'SOLO',
      foundingYear: 2020, memberCount: 1, label: 'Universal',
      instagramUrl: 'https://instagram.com/ado1024imokenp',
      spotifyUrl: 'https://open.spotify.com/artist/3bO3uNnW1n7IAw7G9q5G5O',
      profilePhotoUrl: 'https://i.pinimg.com/736x/a7/39/8a/a7398a0e0e0d469d6314df8b73f228a2.jpg',
    },
    {
      email: 'yoasobi@example.com',
      name: 'YOASOBI', description: 'Japanese duo.',
      genre: 'J-POP', bookingType: 'DUO',
      foundingYear: 2019, memberCount: 2, label: 'Sony',
      instagramUrl: 'https://instagram.com/yoasobi_staff',
      spotifyUrl: 'https://open.spotify.com/artist/64tJ2EAv1R6UaZqc4iOCyj',
      profilePhotoUrl: 'https://i.pinimg.com/736x/a7/39/8a/a7398a0e0e0d469d6314df8b73f228a2.jpg',
    },
  ];

  const artistUsers = [];
  for (const a of artistDefs) {
    const user = await prisma.user.create({
      data: {
        email: a.email,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'ARTIST',
      },
    });
    const { email, ...raw } = a;
    const artist = await prisma.artistProfile.create({
      data: {
        name: raw.name,
        description: raw.description || null,
        genre: raw.genre,
        bookingType: raw.bookingType,
        foundingYear: raw.foundingYear || null,
        memberCount: raw.memberCount || null,
        label: raw.label || null,
        instagramUrl: raw.instagramUrl || null,
        youtubeUrl: raw.youtubeUrl || null,
        spotifyUrl: raw.spotifyUrl || null,
        profilePhotoUrl: raw.profilePhotoUrl || null,
        userId: user.id,
      },
    });
    artistUsers.push({ user, artist });
  }

  // ---------- Venues (เชียงใหม่) ----------
  const venueDefs = [
    { email: 'nimman.studio@venue.example',   name: 'Nimman Studio',        lat: 18.79650, lng: 98.97890, genre: 'Indie/Alt' },
    { email: 'oldcity.arena@venue.example',   name: 'Old City Arena',       lat: 18.79410, lng: 98.98870, genre: 'Pop/Rock' },
    { email: 'riverside.stage@venue.example', name: 'Ping Riverside Stage', lat: 18.78760, lng: 99.00190, genre: 'Jazz/Blues' },
    { email: 'thaphae.court@venue.example',   name: 'Tha Phae Courtyard',   lat: 18.78790, lng: 98.99340, genre: 'Acoustic/Folk' },
    { email: 'changklan.wh@venue.example',    name: 'Chang Klan Warehouse', lat: 18.78060, lng: 98.99980, genre: 'EDM/Hip-Hop' },
    { email: 'santitham.loft@venue.example',  name: 'Santitham Loft',       lat: 18.80550, lng: 98.98170, genre: 'Indie/Lo-fi' },
    { email: 'onenimman.terr@venue.example',  name: 'One Nimman Terrace',   lat: 18.79930, lng: 98.96790, genre: 'Pop/Acoustic' },
    { email: 'watgate.pav@venue.example',     name: 'Wat Gate Pavilion',    lat: 18.79280, lng: 99.00800, genre: 'Classical/Crossover' },
  ];

  const venueProfiles = [];
  for (const v of venueDefs) {
    const u = await prisma.user.create({
      data: {
        email: v.email,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'ORGANIZE',
      }
    });
    const photos = pickVenuePhotos(4);
    const vp = await prisma.venueProfile.create({
      data: {
        userId: u.id,
        name: v.name,
        locationUrl: v.name,
        genre: v.genre,
        alcoholPolicy: 'SERVE',
        latitude: v.lat,
        longitude: v.lng,
        profilePhotoUrl: photos[0],
        photoUrls: photos,
      }
    });
    venueProfiles.push(vp);
  }

  const venueByName = Object.fromEntries(venueProfiles.map(v => [v.name, v.id]));

  // ---------- Events ----------
  const eventsPlan = [
    { name: 'Nimman Indie Night',       venue: 'Nimman Studio',        date: dInThisMonth(5, 20, 0),  type: 'INDOOR',  ticketing: 'FREE',           genre: 'Indie',     door: '19:00', end: '22:30' },
    { name: 'Ping Riverside Jazz',      venue: 'Ping Riverside Stage', date: dInThisMonth(8, 19, 30), type: 'OUTDOOR', ticketing: 'ONSITE_SALES',   genre: 'Jazz',      door: '18:30', end: '21:30' },
    { name: 'Old City Acoustic Eve',    venue: 'Old City Arena',       date: dInThisMonth(12, 18, 30),type: 'INDOOR',  ticketing: 'DIRECT_CONTACT', genre: 'Acoustic',  door: '18:00', end: '21:00' },
    { name: 'Tha Phae Folk Friday',     venue: 'Tha Phae Courtyard',   date: dInThisMonth(13, 19, 0), type: 'OUTDOOR', ticketing: 'DONATION',       genre: 'Folk',      door: '18:00', end: '22:00' },
    { name: 'Warehouse Beats',          venue: 'Chang Klan Warehouse', date: dInThisMonth(15, 21, 0), type: 'INDOOR',  ticketing: 'ONSITE_SALES',   genre: 'EDM',       door: '20:00', end: '00:30' },
    { name: 'Santitham Loft Session',   venue: 'Santitham Loft',       date: dInThisMonth(18, 20, 0), type: 'INDOOR',  ticketing: 'FREE',           genre: 'Lo-fi',     door: '19:00', end: '22:00' },
    { name: 'Sunset Pop at One Nimman', venue: 'One Nimman Terrace',   date: dInThisMonth(20, 18, 0), type: 'OUTDOOR', ticketing: 'FREE',           genre: 'Pop',       door: '17:30', end: '20:30' },
    { name: 'Crossover Night',          venue: 'Wat Gate Pavilion',    date: dInThisMonth(22, 19, 30),type: 'INDOOR',  ticketing: 'DIRECT_CONTACT', genre: 'Crossover', door: '19:00', end: '22:00' },
    { name: 'Riverside Blues Jam',      venue: 'Ping Riverside Stage', date: dInThisMonth(25, 19, 0), type: 'OUTDOOR', ticketing: 'DONATION',       genre: 'Blues',     door: '18:00', end: '21:00' },
    { name: 'Nimman Live Showcase',     venue: 'Nimman Studio',        date: dInThisMonth(28, 20, 0), type: 'INDOOR',  ticketing: 'TICKET_MELON',   genre: 'Mixed',     door: '19:00', end: '23:00', ticketLink: 'https://ticketmelon.com/demo/nimman-live' },
  ];

  const createdEvents = [];
  for (let i = 0; i < eventsPlan.length; i++) {
    const plan = eventsPlan[i];
    const ev = await prisma.event.create({
      data: {
        name: plan.name,
        description: `${plan.genre} night in Chiang Mai`,
        eventType: plan.type,
        ticketing: plan.ticketing,
        ticketLink: plan.ticketLink || null,
        alcoholPolicy: 'SERVE',
        date: plan.date,
        doorOpenTime: plan.door,
        endTime: plan.end,
        genre: plan.genre,
        venueId: venueByName[plan.venue],
        posterUrl: EVENT_POSTERS[i % EVENT_POSTERS.length], // ✅ ใส่โปสเตอร์สวยๆ
      }
    });
    createdEvents.push(ev);
  }

  // ---------- Link Artists ↔ Events ----------
  const linkPlan = [
    { evIdx: 0, artists: [0, 1] },
    { evIdx: 1, artists: [1, 2] },
    { evIdx: 2, artists: [3] },
    { evIdx: 3, artists: [4, 5] },
    { evIdx: 4, artists: [2, 4] },
    { evIdx: 5, artists: [5] },
    { evIdx: 6, artists: [0, 3] },
    { evIdx: 7, artists: [1, 4] },
    { evIdx: 8, artists: [2, 5] },
    { evIdx: 9, artists: [0] },
  ];

  for (const lp of linkPlan) {
    const ev = createdEvents[lp.evIdx];
    for (let i = 0; i < lp.artists.length; i++) {
      const a = artistUsers[lp.artists[i]].artist;
      await prisma.artistEvent.create({
        data: {
          artistId: a.id,
          eventId: ev.id,
          status: 'PENDING',
        }
      });
    }
  }

  // ---------- Invite artist with id = 1 ----------
  const artistOne = await prisma.artistProfile.findUnique({ where: { id: 1 } });
  if (artistOne) {
    for (const ev of createdEvents) {
      const exists = await prisma.artistEvent.findUnique({
        where: { artistId_eventId: { artistId: artistOne.id, eventId: ev.id } },
      });
      if (!exists) {
        await prisma.artistEvent.create({
          data: { artistId: artistOne.id, eventId: ev.id, status: 'PENDING' }
        });
      }
    }
    console.log(`✅ Invited artist id=1 (${artistOne.name}) to all events.`);
  } else {
    console.warn('⚠️ Artist with id=1 not found — skipping invites for artistId=1');
  }

  console.log('✅ Done! Chiang Mai venues + this-month events seeded.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
