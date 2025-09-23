// prisma/seed.js (CommonJS)
const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/** วันที่ภายใน "เดือนปัจจุบัน" ตาม day/hour/minute */
function dInThisMonth(day, hour = 19, minute = 30) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day, hour, minute, 0);
}

/* ---------- รูปสุ่มจาก picsum (เสถียร ใช้ได้จริง) ---------- */
const VENUE_PICS = [
  "https://picsum.photos/id/1011/800/600",
  "https://picsum.photos/id/1015/800/600",
  "https://picsum.photos/id/1025/800/600",
  "https://picsum.photos/id/1035/800/600",
  "https://picsum.photos/id/1043/800/600",
  "https://picsum.photos/id/1050/800/600",
  "https://picsum.photos/id/1062/800/600",
  "https://picsum.photos/id/1074/800/600",
];
function pickVenuePhotos(n = 4) {
  const out = [];
  while (out.length < n) {
    const idx = Math.floor(Math.random() * VENUE_PICS.length);
    out.push(VENUE_PICS[idx]); // ยอมซ้ำได้ เพื่อความเสถียร
  }
  return out;
}

/* ---------- โปสเตอร์ Event (picsum) ---------- */
const EVENT_POSTERS = [
  "https://picsum.photos/id/237/800/600",
  "https://picsum.photos/id/238/800/600",
  "https://picsum.photos/id/239/800/600",
  "https://picsum.photos/id/240/800/600",
  "https://picsum.photos/id/241/800/600",
  "https://picsum.photos/id/242/800/600",
  "https://picsum.photos/id/243/800/600",
  "https://picsum.photos/id/244/800/600",
  "https://picsum.photos/id/245/800/600",
  "https://picsum.photos/id/246/800/600",
];

/* ---------- ยูทิลลิงก์ค้นหา (ลิงก์กดได้จริงทุกโดเมน) ---------- */
const searchLinks = (name) => {
  const q = encodeURIComponent(name);
  return {
    instagramUrl: `https://www.instagram.com/explore/tags/${q}/`,
    facebookUrl:  `https://www.facebook.com/search/top?q=${q}`,
    youtubeUrl:   `https://www.youtube.com/results?search_query=${q}`,
    spotifyUrl:   `https://open.spotify.com/search/${q}`,
    appleMusicUrl:`https://music.apple.com/search?term=${q}`,
    soundcloudUrl:`https://soundcloud.com/search?q=${q}`,
    bandcampUrl:  `https://bandcamp.com/search?q=${q}`,
    shazamUrl:    `https://www.shazam.com/search/${q}`,
    tiktokUrl:    `https://www.tiktok.com/search?q=${q}`,
    twitterUrl:   `https://twitter.com/search?q=${q}`
  };
};

/* ---------- ศิลปิน official (ปรับ profilePhotoUrl เป็น picsum) ---------- */
const OFFICIAL_ARTISTS = [
  {
    email: 'newjeans@example.com',
    name: 'NewJeans',
    description: 'K-pop girl group under ADOR.',
    genre: 'K-POP', bookingType: 'FULL_BAND',
    foundingYear: 2022, memberCount: 5, label: 'ADOR',
    instagramUrl: 'https://www.instagram.com/newjeans_official/',
    facebookUrl:  'https://www.facebook.com/NewJeansOfficial/',
    youtubeUrl:   'https://www.youtube.com/@NewJeans_official',
    spotifyUrl:   'https://open.spotify.com/artist/6HvZYsbFfjnjFrWF950C9d',
    appleMusicUrl:'https://music.apple.com/artist/newjeans/1636058531',
    tiktokUrl:    'https://www.tiktok.com/@newjeans_official',
    twitterUrl:   'https://twitter.com/NewJeans_ADOR',
    profilePhotoUrl: 'https://picsum.photos/id/250/640/400',
  },
  {
    email: 'iu@example.com',
    name: 'IU',
    description: 'South Korean solo artist, singer-songwriter and actress.',
    genre: 'K-POP', bookingType: 'SOLO',
    foundingYear: 2008, memberCount: 1, label: 'EDAM Entertainment',
    instagramUrl:  'https://www.instagram.com/dlwlrma/',
    youtubeUrl:    'https://www.youtube.com/@dlwlrma',
    spotifyUrl:    'https://open.spotify.com/artist/3HqSLMAZ3g3d5poNaI7GOU',
    appleMusicUrl: 'https://music.apple.com/artist/iu/1434084167',
    twitterUrl:    'https://twitter.com/search?q=IU',
    profilePhotoUrl: 'https://picsum.photos/id/251/640/400',
  },
  {
    email: 'blackpink@example.com',
    name: 'BLACKPINK',
    description: 'K-pop group from YG.',
    genre: 'K-POP', bookingType: 'FULL_BAND',
    foundingYear: 2016, memberCount: 4, label: 'YG Entertainment',
    instagramUrl:  'https://www.instagram.com/blackpinkofficial/',
    facebookUrl:   'https://www.facebook.com/BLACKPINKOFFICIAL/',
    youtubeUrl:    'https://www.youtube.com/@BLACKPINK',
    spotifyUrl:    'https://open.spotify.com/artist/41MozSoPIsD1dJM0CLPjZF',
    appleMusicUrl: 'https://music.apple.com/artist/blackpink/1162650776',
    tiktokUrl:     'https://www.tiktok.com/@blackpinkofficial',
    shazamUrl:     'https://www.shazam.com/artist/204939476/blackpink',
    twitterUrl:    'https://twitter.com/search?q=BLACKPINK',
    profilePhotoUrl: 'https://picsum.photos/id/252/640/400',
  },
  {
    email: 'bts@example.com',
    name: 'BTS',
    description: 'K-pop group from HYBE.',
    genre: 'K-POP', bookingType: 'FULL_BAND',
    foundingYear: 2013, memberCount: 7, label: 'BIGHIT MUSIC',
    instagramUrl:  'https://www.instagram.com/bts.bighitofficial/',
    facebookUrl:   'https://www.facebook.com/bangtan.official/',
    youtubeUrl:    'https://www.youtube.com/@BANGTANTV',
    spotifyUrl:    'https://open.spotify.com/artist/3Nrfpe0tUJi4K4DXYWgMUX',
    appleMusicUrl: 'https://music.apple.com/artist/bts/883131348',
    tiktokUrl:     'https://www.tiktok.com/@bts_official_bighit',
    twitterUrl:    'https://twitter.com/BTS_twt',
    profilePhotoUrl: 'https://picsum.photos/id/253/640/400',
  },
  {
    email: 'ado@example.com',
    name: 'Ado',
    description: 'Japanese solo singer.',
    genre: 'J-POP', bookingType: 'SOLO',
    foundingYear: 2020, memberCount: 1, label: 'Universal Music Japan',
    instagramUrl:  'https://www.instagram.com/ado1024imokenp/',
    youtubeUrl:    'https://www.youtube.com/@Ado1024',
    spotifyUrl:    'https://open.spotify.com/artist/3bUqLQ8N9d2EapD5YdLK4Q',
    appleMusicUrl: 'https://music.apple.com/artist/ado/1530426666',
    twitterUrl:    'https://twitter.com/ado1024imokenp',
    profilePhotoUrl: 'https://picsum.photos/id/254/640/400',
  },
  {
    email: 'yoasobi@example.com',
    name: 'YOASOBI',
    description: 'Japanese duo.',
    genre: 'J-POP', bookingType: 'DUO',
    foundingYear: 2019, memberCount: 2, label: 'Sony Music',
    instagramUrl:  'https://www.instagram.com/yoasobi_staff/',
    youtubeUrl:    'https://www.youtube.com/@Ayase_YOASOBI',
    spotifyUrl:    'https://open.spotify.com/artist/64tJ2EAv1R6UaZqc4iOCyj',
    appleMusicUrl: 'https://music.apple.com/artist/yoasobi/1490250505',
    twitterUrl:    'https://twitter.com/YOASOBI_staff',
    profilePhotoUrl: 'https://picsum.photos/id/254/640/400',
  },
  {
    email: 'billie@example.com',
    name: 'Billie Eilish',
    description: 'American singer-songwriter.',
    genre: 'Pop', bookingType: 'SOLO',
    foundingYear: 2015, memberCount: 1, label: 'Darkroom/Interscope',
    instagramUrl:  'https://www.instagram.com/billieeilish/',
    facebookUrl:   'https://www.facebook.com/billieeilish',
    youtubeUrl:    'https://www.youtube.com/@BillieEilish',
    spotifyUrl:    'https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH',
    appleMusicUrl: 'https://music.apple.com/artist/billie-eilish/1065981054',
    tiktokUrl:     'https://www.tiktok.com/@billieeilish',
    shazamUrl:     'https://www.shazam.com/artist/201911193/billie-eilish',
    soundcloudUrl: 'https://soundcloud.com/billieeilish',
    twitterUrl:    'https://twitter.com/billieeilish',
    profilePhotoUrl: 'https://picsum.photos/id/256/640/400',
  },
  {
    email: 'taylor@example.com',
    name: 'Taylor Swift',
    description: 'American singer-songwriter.',
    genre: 'Pop', bookingType: 'SOLO',
    foundingYear: 2006, memberCount: 1, label: 'Republic Records',
    instagramUrl:  'https://www.instagram.com/taylorswift/',
    facebookUrl:   'https://www.facebook.com/TaylorSwift',
    youtubeUrl:    'https://www.youtube.com/@TaylorSwift',
    spotifyUrl:    'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02',
    appleMusicUrl: 'https://music.apple.com/artist/taylor-swift/159260351',
    tiktokUrl:     'https://www.tiktok.com/@taylorswift',
    shazamUrl:     'https://www.shazam.com/artist/4095465/taylor-swift',
    twitterUrl:    'https://twitter.com/taylorswift13',
    profilePhotoUrl: 'https://picsum.photos/id/257/640/400',
  },
  {
    email: 'milli@example.com',
    name: 'MILLI',
    description: 'Thai rapper and singer.',
    genre: 'Hip-hop', bookingType: 'SOLO',
    foundingYear: 2019, memberCount: 1, label: 'YUPP!',
    instagramUrl:  'https://www.instagram.com/phuckitol/',
    youtubeUrl:    'https://www.youtube.com/@MILLIOfficialTH',
    spotifyUrl:    'https://open.spotify.com/artist/6JpZEz9eJjwZ2tM4Xa7Y5Z',
    twitterUrl:    'https://twitter.com/search?q=Milli',
    profilePhotoUrl: 'https://picsum.photos/id/258/640/400',
  },
  {
    email: 'threemandown@example.com',
    name: 'Three Man Down',
    description: 'Thai pop band.',
    genre: 'Pop', bookingType: 'FULL_BAND',
    foundingYear: 2016, memberCount: 5, label: 'GMM Grammy',
    facebookUrl:   'https://www.facebook.com/3mandown',
    youtubeUrl:    'https://www.youtube.com/@ThreeManDownOfficial',
    spotifyUrl:    'https://open.spotify.com/artist/3zAZgRKo23s83RGwhx8Rr2',
    instagramUrl:  'https://www.instagram.com/3.man.down/',
    twitterUrl:    'https://twitter.com/search?q=Three%20Man%20Down',
    profilePhotoUrl: 'https://picsum.photos/id/259/640/400',
  },
];

/* ---------- รายชื่อสมมติ (จะสร้าง 40 ศิลปินด้วยลิงก์ค้นหา) ---------- */
const FAKE_NAMES = [
  'Siam Sunset', 'Nimman Lights', 'Ping River Echo', 'Old City Rhythm',
  'Tha Phae Folk', 'Santitham Lo-Fi', 'Chang Klan Beats', 'Wat Gate Ensemble',
  'Lanna Groove', 'Chiang Chill Trio', 'North Star Duo', 'Golden Lotus',
  'Jade Melody', 'Mountain Breeze', 'Lantern Pop', 'Indigo Night',
  'Rattan Rock', 'Palm Shade', 'Mango Funk', 'Coconut Jazz',
  'Hmong Harmony', 'Tribal Tide', 'Monsoon Sound', 'Saffron Soul',
  'Bamboo Notes', 'Ricefield Riff', 'Temple Tone', 'Elephant March',
  'Sukhothai Strings', 'Ayutthaya Echo', 'Khun Tan Crew', 'Doi Inthanon Band',
  'Mekong Whisper', 'Nan River Blues', 'Phayao Phase', 'Lampang Line',
  'Mae Ping Pulse', 'Chiang Dao Choir', 'Fang Forest', 'Mae Rim Mood'
]; // 40 รายชื่อ

/* ---------- Genres & Booking Types helper ---------- */
const GENRES = [
  'Pop','Rock','Indie','Hip-hop','R&B','EDM','Jazz','Blues','Metal','Folk','Country','Lo-fi','K-POP','J-POP'
];
const BOOKING_TYPES = ['FULL_BAND','TRIO','DUO','SOLO'];

function rand(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function randInt(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }

async function main() {
  console.log('🌱 Seeding… (users, 50 artists, venues, events, likes, links)');

  // ---------- ล้างข้อมูลที่มีความสัมพันธ์ก่อน ----------
  await prisma.likeEvent.deleteMany();
  await prisma.likePerformer.deleteMany();
  await prisma.event.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.performer.deleteMany();
  await prisma.user.deleteMany();

  // ---------- ผู้ใช้ระบบพื้นฐาน ----------
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      isVerified: true,
      profilePhotoUrl: 'https://picsum.photos/id/259/640/400'

    }
  });

  await prisma.user.create({
    data: {
      email: 'fan@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'AUDIENCE',
    }
  });

  /* ---------- Artists: 50 คน ---------- */
  const artistUsers = [];
  // 1) กลุ่ม official (~10 คน)
  for (const a of OFFICIAL_ARTISTS) {
    const user = await prisma.user.create({
      data: {
        email: a.email,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'ARTIST',
        name: a.name || null,
        profilePhotoUrl: a.profilePhotoUrl || null,
        birthday: a.birthday || null,
        isVerified: true,
      },
    });
    const performer = await prisma.performer.create({
      data: {
        instagramUrl: a.instagramUrl || null,
        facebookUrl: a.facebookUrl || null,
        tiktokUrl: a.tiktokUrl || null,
        lineUrl: a.lineUrl || null,
        twitterUrl: a.twitterUrl || null,
        youtubeUrl: a.youtubeUrl || null,
        contactEmail: a.contactEmail || null,
        contactPhone: a.contactPhone || null,

        user: { connect: { id: user.id } },
      },
    });
    const artist = await prisma.artist.create({
      data: {
        description: a.description ?? null,
        genre: a.genre,
        subGenre: a.subGenre ?? null,
        bookingType: a.bookingType,
        foundingYear: a.foundingYear ?? null,
        label: a.label ?? null,
        isIndependent: typeof a.isIndependent === 'boolean' ? a.isIndependent : true,
        memberCount: a.memberCount ?? null,
        priceMin: a.priceMin != null ? Number(a.priceMin) : null,
        priceMax: a.priceMax != null ? Number(a.priceMax) : null,
        rateCardUrl: a.rateCardUrl ?? null,
        epkUrl: a.epkUrl ?? null,
        riderUrl: a.riderUrl ?? null,
        appleMusicUrl: a.appleMusicUrl ?? null,
        soundcloudUrl: a.soundcloudUrl ?? null,
        shazamUrl: a.shazamUrl ?? null,
        bandcampUrl: a.bandcampUrl ?? null,
        spotifyUrl: a.spotifyUrl || null,

        performer: { connect: { userId: performer.userId } },
      },
    });
    artistUsers.push({ user, artist });
  }

  // 2) กลุ่มสมมติ 40 คน (ใช้ลิงก์ค้นหา + รูป picsum แบบ seed)
  for (let i = 0; i < FAKE_NAMES.length; i++) {
    const name = FAKE_NAMES[i];
    const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}@example.com`;
    const links = searchLinks(name);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'ARTIST',
        name: name,
        profilePhotoUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/640/400`,
        isVerified: true
      }
    });

    const performer = await prisma.performer.create({
      data: {
        facebookUrl:  Math.random() < 0.5  ? links.facebookUrl  : null,
        instagramUrl: Math.random() < 0.9  ? links.instagramUrl : null,
        tiktokUrl:    Math.random() < 0.6  ? links.tiktokUrl    : null,
        twitterUrl:   Math.random() < 0.7  ? links.twitterUrl   : null,
        lineUrl: links.lineUrl || null,
        youtubeUrl:   Math.random() < 0.9  ? links.youtubeUrl   : null,
        contactEmail: `booking+${user.id}@${name.replace(/\s+/g,'').toLowerCase()}.example`,
        contactPhone: Math.random() < 0.4 ? `+66-8${randInt(10,99)}-${randInt(100,999)}-${randInt(1000,9999)}` : null,

        user: { connect: { id: user.id } },
      },
    });

    const artist = await prisma.artist.create({
      data: {
        description: `${name} live act from Chiang Mai with intimate shows and unique vibe.`,
        genre: rand(GENRES),
        subGenre: Math.random() < 0.5 ? rand(GENRES) : null,
        bookingType: rand(BOOKING_TYPES),
        foundingYear: randInt(2005, 2024),
        label: Math.random() < 0.3 ? 'Independent' : (Math.random()<0.5?'Local Circle':'-'),
        isIndependent: Math.random() < 0.6,
        memberCount: randInt(1, 7),
        priceMin: Math.random() < 0.7 ? randInt(3000, 15000) : null,
        priceMax: Math.random() < 0.7 ? randInt(15000, 60000) : null,
        // เอกสารแนบปล่อยเป็น null เพื่อเลี่ยงลิงก์เสีย
        rateCardUrl: null,
        epkUrl: null,
        riderUrl: null,

        spotifyUrl:   Math.random() < 0.85 ? links.spotifyUrl   : null,
        appleMusicUrl:Math.random() < 0.6  ? links.appleMusicUrl: null,
        soundcloudUrl:Math.random() < 0.4  ? links.soundcloudUrl: null,
        shazamUrl:    Math.random() < 0.3  ? links.shazamUrl    : null,
        bandcampUrl:  Math.random() < 0.3  ? links.bandcampUrl  : null,

        performer: { connect: { userId: performer.userId } },
      },
    });

    artistUsers.push({ user, artist });
  }

  console.log(`✅ Created artists: ${artistUsers.length}`);

  /* ---------- ผู้ใช้ AUDIENCE สำหรับสุ่มไลก์ ---------- */
  const likerUsers = [];
  for (let i = 1; i <= 120; i++) {
    const u = await prisma.user.create({
      data: {
        email: `aud${i}@example.com`,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'AUDIENCE',
        isVerified: true
      }
    });
    likerUsers.push(u);
  }

  // สุ่ม like ให้แต่ละศิลปิน (⭐ แก้ให้ชี้ performerId เท่านั้น)
  for (const { artist } of artistUsers) {
    const likeCountTarget = randInt(5, 90);
    const shuffled = likerUsers.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < likeCountTarget; i++) {
      await prisma.likePerformer.create({
        data: { userId: shuffled[i].id, performerId: artist.performerId }  // ← ใช้ performerId (ถูกต้องตาม schema)
      }).catch(()=>{});
    }
  }
  console.log('👍 Random likes (artists only) generated');

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
    const photos = pickVenuePhotos(4);
    const u = await prisma.user.create({
      data: {
        email: v.email,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'ORGANIZE',
        name: v.name,
        profilePhotoUrl: photos[0],
        isVerified: true,
      }
    });
    const performer = await prisma.performer.create({
      data: {
        instagramUrl: v.instagramUrl || null,
        facebookUrl: v.facebookUrl || null,
        tiktokUrl: v.tiktokUrl || null,
        lineUrl: v.lineUrl || null,
        youtubeUrl: v.youtubeUrl || null,
        contactEmail: v.contactEmail || null,
        contactPhone: v.contactPhone || null,
        userId: u.id,
      },
    });
    const vp = await prisma.venue.create({
      data: {
        performerId: performer.userId,
        genre: v.genre,
        alcoholPolicy: 'SERVE',
        photoUrls: photos,
      }
    });
    await prisma.venueLocation.create({
      data: {
        venueId: vp.performerId,
        locationUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name+' Chiang Mai')}`,
        latitude: v.lat || null,
        longitude: v.lng || null,
      }
    });

    venueProfiles.push({
      id: vp.performerId,
      name: u.name,
    });
  }
  const venueByName = Object.fromEntries(venueProfiles.map(v => [v.name, v.id]));
  console.log(`🏟️ Venues created: ${venueProfiles.length}`);

  // ---------- Events (16 งานในเดือนนี้) ----------
  const eventsPlan = [
    { name: 'Nimman Indie Night',       venue: 'Nimman Studio',        date: dInThisMonth(3, 20, 0),  type: 'INDOOR',  ticketing: 'FREE',           genre: 'Indie',     door: '19:00', end: '22:30' },
    { name: 'Ping Riverside Jazz',      venue: 'Ping Riverside Stage', date: dInThisMonth(4, 19, 30), type: 'OUTDOOR', ticketing: 'ONSITE_SALES',   genre: 'Jazz',      door: '18:30', end: '21:30' },
    { name: 'Old City Acoustic Eve',    venue: 'Old City Arena',       date: dInThisMonth(6, 18, 30), type: 'INDOOR',  ticketing: 'DIRECT_CONTACT', genre: 'Acoustic',  door: '18:00', end: '21:00' },
    { name: 'Tha Phae Folk Friday',     venue: 'Tha Phae Courtyard',   date: dInThisMonth(7, 19, 0),  type: 'OUTDOOR', ticketing: 'DONATION',       genre: 'Folk',      door: '18:00', end: '22:00' },
    { name: 'Warehouse Beats',          venue: 'Chang Klan Warehouse', date: dInThisMonth(9, 21, 0),  type: 'INDOOR',  ticketing: 'ONSITE_SALES',   genre: 'EDM',       door: '20:00', end: '00:30' },
    { name: 'Santitham Loft Session',   venue: 'Santitham Loft',       date: dInThisMonth(10, 20, 0), type: 'INDOOR',  ticketing: 'FREE',           genre: 'Lo-fi',     door: '19:00', end: '22:00' },
    { name: 'Sunset Pop at One Nimman', venue: 'One Nimman Terrace',   date: dInThisMonth(11, 18, 0), type: 'OUTDOOR', ticketing: 'FREE',           genre: 'Pop',       door: '17:30', end: '20:30' },
    { name: 'Crossover Night',          venue: 'Wat Gate Pavilion',    date: dInThisMonth(12, 19, 30),type: 'INDOOR',  ticketing: 'DIRECT_CONTACT', genre: 'Crossover', door: '19:00', end: '22:00' },
    { name: 'Riverside Blues Jam',      venue: 'Ping Riverside Stage', date: dInThisMonth(14, 19, 0), type: 'OUTDOOR', ticketing: 'DONATION',       genre: 'Blues',     door: '18:00', end: '21:00' },
    { name: 'Nimman Live Showcase',     venue: 'Nimman Studio',        date: dInThisMonth(15, 20, 0), type: 'INDOOR',  ticketing: 'TICKET_MELON',   genre: 'Mixed',     door: '19:00', end: '23:00', ticketLink: 'https://ticketmelon.com' },
    { name: 'Indigo Night Market Stage',venue: 'One Nimman Terrace',   date: dInThisMonth(17, 18, 30),type: 'OUTDOOR', ticketing: 'FREE',           genre: 'Indie',     door: '18:00', end: '21:30' },
    { name: 'Loft Ambient Evening',     venue: 'Santitham Loft',       date: dInThisMonth(18, 19, 30),type: 'INDOOR',  ticketing: 'FREE',           genre: 'Ambient',   door: '19:00', end: '22:00' },
    { name: 'Warehouse Hip-Hop Clash',  venue: 'Chang Klan Warehouse', date: dInThisMonth(20, 21, 0), type: 'INDOOR',  ticketing: 'ONSITE_SALES',   genre: 'Hip-hop',   door: '20:00', end: '00:30' },
    { name: 'Old City Rock Revival',    venue: 'Old City Arena',       date: dInThisMonth(22, 19, 0), type: 'INDOOR',  ticketing: 'DIRECT_CONTACT', genre: 'Rock',      door: '18:30', end: '22:00' },
    { name: 'Folk Under Lanterns',      venue: 'Tha Phae Courtyard',   date: dInThisMonth(24, 19, 0), type: 'OUTDOOR', ticketing: 'DONATION',       genre: 'Folk',      door: '18:00', end: '21:30' },
    { name: 'Classics by the River',    venue: 'Wat Gate Pavilion',    date: dInThisMonth(26, 19, 0), type: 'INDOOR',  ticketing: 'DIRECT_CONTACT', genre: 'Classical', door: '18:30', end: '21:00' },
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
        posterUrl: EVENT_POSTERS[i % EVENT_POSTERS.length], // ✅ ไม่มีการ assign ซ้ำ
      }
    });
    createdEvents.push(ev);
  }
  console.log(`🎫 Events created: ${createdEvents.length}`);

  /* ---------- Link Artists ↔ Events (สุ่ม 3–6 วงต่ออีเวนต์) ---------- */
  for (const ev of createdEvents) {
    const shuffledArtists = artistUsers.slice().sort(() => Math.random() - 0.5);
    const n = randInt(3, 6);
    for (let i = 0; i < n; i++) {
      const a = shuffledArtists[i].artist;
      await prisma.artistEvent.create({
        data: {
          artistId: a.performerId,
          eventId: ev.id,
          status: 'PENDING',
        }
      }).catch(()=>{});
    }
  }

  // ---------- เชิญศิลปิน id ต่ำสุดเข้าทุกงาน (เดโม) ----------
  const artistOne = await prisma.artist.findFirst({
    orderBy: { performerId: 'asc' },
    include: {
      performer: {
        include: {
          user: true
        }
      }
    }
  });
  if (artistOne) {
    for (const ev of createdEvents) {
      const exists = await prisma.artistEvent.findUnique({
        where: { artistId_eventId: { artistId: artistOne.performerId, eventId: ev.id } },
      });
      if (!exists) {
        await prisma.artistEvent.create({
          data: { artistId: artistOne.performerId, eventId: ev.id, status: 'PENDING' }
        });
      }
    }
    console.log(`✅ Invited artist id=${artistOne.performerId} (${artistOne.performer.user.name}) to all events.`);
  }

  console.log('✅ Done! 50 artists, venues, events, likes & links seeded.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
