// prisma/seed.js (CommonJS) — schema ตามที่ให้มา
const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/** วันที่ใน "เดือนปัจจุบัน" (Local) */
function dInThisMonth(day, hour = 19, minute = 30) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day, hour, minute, 0);
}

/** สร้าง Date แบบ UTC ตามปี/เดือน/วัน + HH:MM (กัน timezone shift) */
function makeUtcSameClock(dateLike, hhmm) {
  const d = new Date(dateLike);
  const [hh, mm] = String(hhmm || '19:00').split(':').map(n => parseInt(n, 10));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm, 0));
}

/* ---------- รูปสุ่ม ---------- */
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
function pickVenuePhotos(n = 4) {
  const out = [];
  while (out.length < n) out.push(VENUE_PICS[Math.floor(Math.random() * VENUE_PICS.length)]);
  return out;
}

/* ---------- ลิงก์ค้นหา ---------- */
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

/* ---------- ศิลปิน official (ตัวอย่าง) ---------- */
const OFFICIAL_ARTISTS = [
  { email:'newjeans@example.com', name:'NewJeans',  genre:'K-POP', bookingType:'FULL_BAND', profilePhotoUrl:'https://picsum.photos/id/250/640/400' },
  { email:'iu@example.com',       name:'IU',        genre:'K-POP', bookingType:'SOLO',      profilePhotoUrl:'https://picsum.photos/id/251/640/400' },
  { email:'blackpink@example.com',name:'BLACKPINK', genre:'K-POP', bookingType:'FULL_BAND', profilePhotoUrl:'https://picsum.photos/id/252/640/400' },
  { email:'bts@example.com',      name:'BTS',       genre:'K-POP', bookingType:'FULL_BAND', profilePhotoUrl:'https://picsum.photos/id/253/640/400' },
  { email:'ado@example.com',      name:'Ado',       genre:'J-POP', bookingType:'SOLO',      profilePhotoUrl:'https://picsum.photos/id/254/640/400' },
  { email:'yoasobi@example.com',  name:'YOASOBI',   genre:'J-POP', bookingType:'DUO',       profilePhotoUrl:'https://picsum.photos/id/255/640/400' },
  { email:'billie@example.com',   name:'Billie Eilish', genre:'Pop', bookingType:'SOLO',    profilePhotoUrl:'https://picsum.photos/id/256/640/400' },
  { email:'taylor@example.com',   name:'Taylor Swift', genre:'Pop', bookingType:'SOLO',     profilePhotoUrl:'https://picsum.photos/id/257/640/400' },
];

/* ---------- รายชื่อสมมติ ---------- */
const FAKE_NAMES = [
  'Siam Sunset','Nimman Lights','Ping River Echo','Old City Rhythm',
  'Tha Phae Folk','Santitham Lo-Fi','Chang Klan Beats','Wat Gate Ensemble',
  'Lanna Groove','Chiang Chill Trio','North Star Duo','Golden Lotus',
  'Jade Melody','Mountain Breeze','Lantern Pop','Indigo Night',
  'Rattan Rock','Palm Shade','Mango Funk','Coconut Jazz',
  'Hmong Harmony','Tribal Tide','Monsoon Sound','Saffron Soul',
  'Bamboo Notes','Ricefield Riff','Temple Tone','Elephant March',
  'Sukhothai Strings','Ayutthaya Echo','Khun Tan Crew','Doi Inthanon Band',
  'Mekong Whisper','Nan River Blues','Phayao Phase','Lampang Line',
  'Mae Ping Pulse','Chiang Dao Choir','Fang Forest','Mae Rim Mood'
];
const GENRES = ['Pop','Rock','Indie','Hip-hop','R&B','EDM','Jazz','Blues','Metal','Folk','Country','Lo-fi','K-POP','J-POP'];
const BOOKING_TYPES = ['FULL_BAND','TRIO','DUO','SOLO'];

const rand = (arr) => arr[Math.floor(Math.random()*arr.length)];
const randInt = (a,b) => a + Math.floor(Math.random()*(b-a+1));

/* ===== helpers for schedule (string HH:MM) ===== */
const toMin = (hhmm) => {
  const m = String(hhmm||'').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1],10)*60 + parseInt(m[2],10);
};
const minToHHMM = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

async function main() {
  console.log('🌱 Seeding with schema-accurate data…');

  /* ---------- truncate (ตาม dependency) ---------- */
  await prisma.likeEvent.deleteMany();
  await prisma.likePerformer.deleteMany();
  await prisma.artistEvent.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.event.deleteMany();
  await prisma.artistRecord.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.venueLocation.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.performer.deleteMany();
  await prisma.user.deleteMany();

  /* ---------- users base ---------- */
  await prisma.user.create({
    data: { email:'admin@example.com', passwordHash: await bcrypt.hash('admin123',10), role:'ADMIN', isVerified:true, profilePhotoUrl:'https://picsum.photos/id/259/640/400' }
  });
  await prisma.user.create({
    data: { email:'fan@example.com', passwordHash: await bcrypt.hash('password123',10), role:'AUDIENCE', isVerified:true }
  });

  /* ---------- artists (50) ---------- */
  const artistProfiles = [];

  // official
  for (const a of OFFICIAL_ARTISTS) {
    const user = await prisma.user.create({
      data: { email:a.email, passwordHash:await bcrypt.hash('password123',10), role:'ARTIST', isVerified:true, name:a.name, profilePhotoUrl:a.profilePhotoUrl }
    });
    const performer = await prisma.performer.create({ data: { userId: user.id }});
    const artist = await prisma.artist.create({
      data: {
        performerId: performer.userId,
        description: `${a.name} live performer`,
        genre: a.genre,
        bookingType: a.bookingType,
        foundingYear: randInt(2010, 2024),
        isIndependent: true,
        memberCount: a.bookingType==='FULL_BAND'?randInt(4,7):a.bookingType==='TRIO'?3:a.bookingType==='DUO'?2:1,
      }
    });
    artistProfiles.push({ user, performer, artist });
  }
  // fake
  for (const name of FAKE_NAMES) {
    const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}@example.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash:await bcrypt.hash('password123',10), role:'ARTIST', isVerified:true, name, profilePhotoUrl:`https://picsum.photos/seed/${encodeURIComponent(name)}/640/400` }
    });
    const performer = await prisma.performer.create({ data: { userId: user.id }});
    const artist = await prisma.artist.create({
      data: {
        performerId: performer.userId,
        description: `${name} from Chiang Mai`,
        genre: rand(GENRES),
        subGenre: Math.random()<0.4 ? rand(GENRES) : null,
        bookingType: rand(BOOKING_TYPES),
        foundingYear: randInt(2005, 2024),
        isIndependent: Math.random()<0.7,
        memberCount: randInt(1,7),
      }
    });
    artistProfiles.push({ user, performer, artist });
  }
  console.log('✅ Artists created:', artistProfiles.length);

  /* ---------- audience for likes ---------- */
  const likerUsers = [];
  for (let i=1;i<=100;i++){
    likerUsers.push(await prisma.user.create({
      data: { email:`aud${i}@example.com`, passwordHash:await bcrypt.hash('password123',10), role:'AUDIENCE', isVerified:true }
    }));
  }

  /* ---------- venues ---------- */
  const venueDefs = [
    { email:'nimman.studio@venue.example',   name:'Nimman Studio',        lat:18.79650, lng:98.97890, genre:'Indie/Alt' },
    { email:'oldcity.arena@venue.example',   name:'Old City Arena',       lat:18.79410, lng:98.98870, genre:'Pop/Rock' },
    { email:'riverside.stage@venue.example', name:'Ping Riverside Stage', lat:18.78760, lng:99.00190, genre:'Jazz/Blues' },
    { email:'thaphae.court@venue.example',   name:'Tha Phae Courtyard',   lat:18.78790, lng:98.99340, genre:'Acoustic/Folk' },
    { email:'changklan.wh@venue.example',    name:'Chang Klan Warehouse', lat:18.78060, lng:98.99980, genre:'EDM/Hip-Hop' },
    { email:'santitham.loft@venue.example',  name:'Santitham Loft',       lat:18.80550, lng:98.98170, genre:'Indie/Lo-fi' },
    { email:'onenimman.terr@venue.example',  name:'One Nimman Terrace',   lat:18.79930, lng:98.96790, genre:'Pop/Acoustic' },
    { email:'watgate.pav@venue.example',     name:'Wat Gate Pavilion',    lat:18.79280, lng:99.00800, genre:'Classical/Crossover' },
  ];

  const venues = [];
  for (const v of venueDefs) {
    const u = await prisma.user.create({
      data: { email:v.email, passwordHash:await bcrypt.hash('password123',10), role:'ORGANIZE', isVerified:true, name:v.name, profilePhotoUrl: pickVenuePhotos(1)[0] }
    });
    const performer = await prisma.performer.create({ data: { userId: u.id }});
    const venue = await prisma.venue.create({
      data: { performerId: performer.userId, genre:v.genre, alcoholPolicy:'SERVE', photoUrls: pickVenuePhotos(4) }
    });
    await prisma.venueLocation.create({
      data: { venueId: venue.performerId, latitude:v.lat, longitude:v.lng, locationUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name+' Chiang Mai')}` }
    });
    venues.push({ id: venue.performerId, name: v.name });
  }
  const venueByName = Object.fromEntries(venues.map(v=>[v.name, v.id]));
  console.log('🏟️ Venues created:', venues.length);

  /* ---------- events (เดือนนี้) ---------- */
  const plans = [
    { name:'Nimman Indie Night',       venue:'Nimman Studio',        date:dInThisMonth(3,20,0),  type:'INDOOR',  ticketing:'FREE',           genre:'Indie',   door:'19:00', end:'22:30' },
    { name:'Ping Riverside Jazz',      venue:'Ping Riverside Stage', date:dInThisMonth(4,19,30), type:'OUTDOOR', ticketing:'ONSITE_SALES',   genre:'Jazz',    door:'18:30', end:'21:30' },
    { name:'Old City Acoustic Eve',    venue:'Old City Arena',       date:dInThisMonth(6,18,30), type:'INDOOR',  ticketing:'DIRECT_CONTACT', genre:'Acoustic',door:'18:00', end:'21:00' },
    { name:'Tha Phae Folk Friday',     venue:'Tha Phae Courtyard',   date:dInThisMonth(7,19,0),  type:'OUTDOOR', ticketing:'DONATION',       genre:'Folk',    door:'18:00', end:'22:00' },
    { name:'Warehouse Beats',          venue:'Chang Klan Warehouse', date:dInThisMonth(9,21,0),  type:'INDOOR',  ticketing:'ONSITE_SALES',   genre:'EDM',     door:'20:00', end:'00:30' },
    { name:'Santitham Loft Session',   venue:'Santitham Loft',       date:dInThisMonth(10,20,0), type:'INDOOR',  ticketing:'FREE',           genre:'Lo-fi',   door:'19:00', end:'22:00' },
    { name:'Sunset Pop at One Nimman', venue:'One Nimman Terrace',   date:dInThisMonth(11,18,0), type:'OUTDOOR', ticketing:'FREE',           genre:'Pop',     door:'17:30', end:'20:30' },
    { name:'Crossover Night',          venue:'Wat Gate Pavilion',    date:dInThisMonth(12,19,30),type:'INDOOR',  ticketing:'DIRECT_CONTACT', genre:'Crossover',door:'19:00', end:'22:00' },
    { name:'Riverside Blues Jam',      venue:'Ping Riverside Stage', date:dInThisMonth(14,19,0), type:'OUTDOOR', ticketing:'DONATION',       genre:'Blues',   door:'18:00', end:'21:00' },
    { name:'Nimman Live Showcase',     venue:'Nimman Studio',        date:dInThisMonth(15,20,0), type:'INDOOR',  ticketing:'TICKET_MELON',   genre:'Mixed',   door:'19:00', end:'23:00', ticketLink:'https://ticketmelon.com' },
    { name:'Indigo Night Market Stage',venue:'One Nimman Terrace',   date:dInThisMonth(17,18,30),type:'OUTDOOR', ticketing:'FREE',           genre:'Indie',   door:'18:00', end:'21:30' },
    { name:'Loft Ambient Evening',     venue:'Santitham Loft',       date:dInThisMonth(18,19,30),type:'INDOOR',  ticketing:'FREE',           genre:'Ambient', door:'19:00', end:'22:00' },
    { name:'Warehouse Hip-Hop Clash',  venue:'Chang Klan Warehouse', date:dInThisMonth(20,21,0), type:'INDOOR',  ticketing:'ONSITE_SALES',   genre:'Hip-hop', door:'20:00', end:'00:30' },
    { name:'Old City Rock Revival',    venue:'Old City Arena',       date:dInThisMonth(22,19,0), type:'INDOOR',  ticketing:'DIRECT_CONTACT', genre:'Rock',    door:'18:30', end:'22:00' },
    { name:'Folk Under Lanterns',      venue:'Tha Phae Courtyard',   date:dInThisMonth(24,19,0), type:'OUTDOOR', ticketing:'DONATION',       genre:'Folk',    door:'18:00', end:'21:30' },
    { name:'Classics by the River',    venue:'Wat Gate Pavilion',    date:dInThisMonth(26,19,0), type:'INDOOR',  ticketing:'DIRECT_CONTACT', genre:'Classical',door:'18:30', end:'21:00' },
  ];

  const events = [];
  for (let i=0;i<plans.length;i++){
    const p = plans[i];
    const ev = await prisma.event.create({
      data: {
        name: p.name,
        description: `${p.genre} night in Chiang Mai`,
        posterUrl: EVENT_POSTERS[i % EVENT_POSTERS.length],
        conditions: null,
        eventType: p.type,
        ticketing: p.ticketing,
        ticketLink: p.ticketLink || null,
        alcoholPolicy: 'SERVE',
        ageRestriction: 'ALL',
        date: p.date,              // DateTime
        doorOpenTime: p.door,      // String
        endTime: p.end,            // String
        genre: p.genre,
        venueId: venueByName[p.venue],
      }
    });
    events.push(ev);
  }
  console.log('🎫 Events created:', events.length);

  /* ---------- schedule & artistEvent (ACCEPTED + UTC times) ---------- */
  const ROLES = ['OPENER','SUPPORT','GUEST','HEADLINER'];
  const feeByBookingType = (bt) => {
    switch (bt) {
      case 'SOLO': return randInt(3000, 12000);
      case 'DUO':  return randInt(6000, 18000);
      case 'TRIO': return randInt(9000, 28000);
      default:     return randInt(15000, 60000); // FULL_BAND
    }
  };

  for (const ev of events) {
    const startM = toMin(ev.doorOpenTime || '19:00') ?? 19*60;
    const endM   = toMin(ev.endTime       || '22:00') ?? 22*60;

    const shuffled = artistProfiles.slice().sort(()=>Math.random()-0.5);
    const count = randInt(3,5);
    const picked = shuffled.slice(0, count).map(x => x.artist);

    let cursor = startM;
    const buffer = 10;
    const stage = 'Main';

    for (let i=0;i<picked.length;i++){
      const a = picked[i];
      const dur = randInt(30, 50);
      const s = cursor;
      const e = s + dur;
      if (e + (i < picked.length-1 ? buffer : 0) > endM) break;

      // เวลาแบบ String และ Date(UTC)
      const startStr = minToHHMM(s);
      const endStr   = minToHHMM(e);
      const startAt  = makeUtcSameClock(ev.date, startStr);
      const endAt    = makeUtcSameClock(ev.date, endStr);

      // ScheduleSlot (จริง)
      await prisma.scheduleSlot.create({
        data: {
          eventId: ev.id,
          artistId: a.performerId,
          title: null,
          stage,
          startAt, endAt,
          note: null
        }
      });

      // ArtistEvent (คำเชิญ→ยืนยันแล้ว)
      const role =
        i === 0 ? 'OPENER' :
        i === count-1 ? 'HEADLINER' :
        rand(['SUPPORT','GUEST']);

      await prisma.artistEvent.create({
        data: {
          artistId: a.performerId,
          eventId:  ev.id,
          status:   'ACCEPTED',
          notes:    'confirmed and scheduled',
          slotStartAt: startAt,
          slotEndAt:   endAt,
          slotStage:   stage,
        }
      });

      cursor = e + buffer;
    }
  }
  console.log('✅ ScheduleSlots + ArtistEvents(ACCEPTED) created');

  /* ---------- likes ---------- */
  for (const ev of events) {
    const target = randInt(5, 80);
    const shuffled = likerUsers.slice().sort(()=>Math.random()-0.5);
    for (let i=0;i<target;i++){
      await prisma.likeEvent.create({ data: { userId: shuffled[i].id, eventId: ev.id }}).catch(()=>{});
    }
  }
  for (const { artist } of artistProfiles) {
    const target = randInt(5, 90);
    const shuffled = likerUsers.slice().sort(()=>Math.random()-0.5);
    for (let i=0;i<target;i++){
      await prisma.likePerformer.create({ data: { userId: shuffled[i].id, performerId: artist.performerId }}).catch(()=>{});
    }
  }
  console.log('👍 Likes created');

  console.log('✅ Done. All events have accepted artist schedules (UTC).');
}

main()
  .catch((e)=>{ console.error(e); process.exit(1); })
  .finally(async ()=>{ await prisma.$disconnect(); });
