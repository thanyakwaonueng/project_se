// prisma/seed.js — rich, realistic, consistency-safe seed
const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/* =========================================
   Helpers
========================================= */
function dInThisMonth(day, hour = 19, minute = 30) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day, hour, minute, 0);
}
function makeUtcSameClock(dateLike, hhmm = '19:00') {
  const d = new Date(dateLike);
  const [hh, mm] = String(hhmm).split(':').map(n => parseInt(n, 10));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm, 0));
}
const VENUE_PICS = [
  "https://picsum.photos/id/1011/800/600","https://picsum.photos/id/1015/800/600","https://picsum.photos/id/1025/800/600",
  "https://picsum.photos/id/1035/800/600","https://picsum.photos/id/1043/800/600","https://picsum.photos/id/1050/800/600",
  "https://picsum.photos/id/1062/800/600","https://picsum.photos/id/1074/800/600",
];
const EVENT_POSTERS = [
  "https://picsum.photos/id/237/800/600","https://picsum.photos/id/238/800/600","https://picsum.photos/id/239/800/600",
  "https://picsum.photos/id/240/800/600","https://picsum.photos/id/241/800/600","https://picsum.photos/id/242/800/600",
  "https://picsum.photos/id/243/800/600","https://picsum.photos/id/244/800/600","https://picsum.photos/id/245/800/600",
  "https://picsum.photos/id/246/800/600",
];
const pickVenuePhotos = (n = 4) => Array.from({length:n}, () => VENUE_PICS[Math.floor(Math.random()*VENUE_PICS.length)]);
const socialLinks = (name) => {
  const q = encodeURIComponent(name);
  return {
    instagramUrl:`https://www.instagram.com/explore/tags/${q}/`,
    facebookUrl:`https://www.facebook.com/search/top?q=${q}`,
    youtubeUrl:`https://www.youtube.com/results?search_query=${q}`,
    tiktokUrl:`https://www.tiktok.com/search?q=${q}`,
    twitterUrl:`https://twitter.com/search?q=${q}`,
    lineUrl: Math.random()<0.5 ? `https://line.me/R/ti/p/@${q.slice(0,16)}` : null,
  };
};
const musicLinks = (name) => {
  const q = encodeURIComponent(name);
  return {
    spotifyUrl:`https://open.spotify.com/search/${q}`,
    appleMusicUrl:`https://music.apple.com/search?term=${q}`,
    soundcloudUrl:`https://soundcloud.com/search?q=${q}`,
    bandcampUrl:`https://bandcamp.com/search?q=${q}`,
    shazamUrl:`https://www.shazam.com/search/${q}`,
  };
};
const docLinks = (slug) => ({
  rateCardUrl:`https://files.example.com/${slug}/rate-card.pdf`,
  epkUrl:`https://files.example.com/${slug}/epk.pdf`,
  riderUrl:`https://files.example.com/${slug}/rider.pdf`,
});
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
const PENDING_ARTISTS = [
  { email:'echonova@example.com',     name:'Echo Nova',       profilePhotoUrl:'https://picsum.photos/id/250/640/400' },
  { email:'velourbloom@example.com',  name:'Velour Bloom',    profilePhotoUrl:'https://picsum.photos/id/251/640/400' },
  { email:'ashharbor@example.com',    name:'Ash Harbor',      profilePhotoUrl:'https://picsum.photos/id/252/640/400' },
  { email:'neonserenade@example.com', name:'Neon Serenade',   profilePhotoUrl:'https://picsum.photos/id/253/640/400' },
  { email:'lunastatic@example.com',   name:'Luna Static',     profilePhotoUrl:'https://picsum.photos/id/254/640/400' },
  { email:'crimsonvale@example.com',  name:'Crimson Vale',    profilePhotoUrl:'https://picsum.photos/id/255/640/400' },
  { email:'solstice@example.com',     name:'Solstice Avenue', profilePhotoUrl:'https://picsum.photos/id/256/640/400' },
  { email:'drifttheory@example.com',  name:'Drift Theory',    profilePhotoUrl:'https://picsum.photos/id/257/640/400' },
  { email:'glassmonarch@example.com', name:'Glass Monarch',   profilePhotoUrl:'https://picsum.photos/id/257/640/400' },
  { email:'aurorafade@example.com',   name:'Aurora Fade',     profilePhotoUrl:'https://picsum.photos/id/257/640/400' }
];
const FAKE_NAMES = [
  'Siam Sunset','Nimman Lights','Ping River Echo','Old City Rhythm','Tha Phae Folk','Santitham Lo-Fi','Chang Klan Beats',
  'Wat Gate Ensemble','Lanna Groove','Chiang Chill Trio','North Star Duo','Golden Lotus','Jade Melody','Mountain Breeze',
  'Lantern Pop','Indigo Night','Rattan Rock','Palm Shade','Mango Funk','Coconut Jazz','Hmong Harmony','Tribal Tide',
  'Monsoon Sound','Saffron Soul','Bamboo Notes','Ricefield Riff'
];
const GENRES = ['Pop','Rock','Indie','Hip-hop','R&B','EDM','Jazz','Blues','Metal','Folk','Country','Lo-fi','K-POP','J-POP'];
const BOOKING_TYPES = ['FULL_BAND','TRIO','DUO','SOLO'];
const PRICE_RATES = ['BUDGET','STANDARD','PREMIUM','VIP','LUXURY'];
const rand = (arr) => arr[Math.floor(Math.random()*arr.length)];
const randInt = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const maybe = (p=0.5) => Math.random() < p;
const toMin = (hhmm) => {
  const m = String(hhmm||'').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1],10)*60 + parseInt(m[2],10);
};
const minToHHMM = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

/* =========================================
   Main
========================================= */
async function main() {
  console.log('🌱 Seeding realistic demo…');

  // truncate in dependency order
  await prisma.notification.deleteMany();
  await prisma.likeEvent.deleteMany();
  await prisma.likePerformer.deleteMany();
  await prisma.artistEvent.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.artistRecord.deleteMany();
  await prisma.event.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.venueLocation.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.performer.deleteMany();
  await prisma.user.deleteMany();

  /* ---------- core users ---------- */
  const admin = await prisma.user.create({
    data: { email:'admin@example.com', passwordHash:await bcrypt.hash('admin123',10), role:'ADMIN', isVerified:true, name:'Admin', profilePhotoUrl:'https://picsum.photos/id/259/640/400' }
  });
  await prisma.user.create({
    data: { email:'fan@example.com', passwordHash:await bcrypt.hash('password123',10), role:'AUDIENCE', isVerified:true, name:'Super Fan' }
  });

    /* ---------- pending artists (~10) ---------- */
  for (const pa of PENDING_ARTISTS){
    const user = await prisma.user.create({
      data: { email: pa.email, passwordHash:await bcrypt.hash('password123',10), role:'AUDIENCE', isVerified:true, name:pa.name, profilePhotoUrl:pa.profilePhotoUrl }
    });

    const r = "I’m an independent artist who produces and releases original tracks. \
    I’d like an artist profile so I can share my work, connect with listeners, \
    and collaborate with other musicians."

    const artistApplication  = {
          name: user.name,
          description: null,
          genre: "POP",
          subGenre: "ROCK",
          bookingType: "SOLO",
          foundingYear: null,
          label: null,
          isIndependent: null,
          memberCount: null,
          priceMin: null,
          priceMax: null,
          profilePhotoUrl: user.profilePhotoUrl,
          photoUrl: null,
          videoUrl: null,
          rateCardUrl: null,
          epkUrl: null,
          riderUrl: null,
          contactEmail: user.email,
          contactPhone: "000-000-0000",
          spotifyUrl: null,
          youtubeUrl: "https://www.youtube.com/",
          appleMusicUrl: null,
          facebookUrl: null,
          instagramUrl: null,
          twitterUrl: null,
          soundcloudUrl: null,
          shazamUrl: null,
          bandcampUrl: null,
          tiktokUrl: null,
        };

    const createdRoleRequest = await prisma.roleRequest.create({
      data: { userId: user.id, requestedRole: "ARTIST", reason: r, application : artistApplication}
    })

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
          await Promise.all(
            admins.map((a) =>
              prisma.notification.create({
                data: {
                  userId: a.id,
                  type: 'role_request.new',
                  message: `New role request: ${user.email} -> ARTIST`,
                  data: { roleRequestId: createdRoleRequest.id },
                },
              })
            )
          );
  }
  console.log('✅ Pending Artists = 10');

  /* ---------- artists ---------- */
  const artistProfiles = [];

  for (const a of OFFICIAL_ARTISTS) {
    const user = await prisma.user.create({
      data: { email:a.email, passwordHash:await bcrypt.hash('password123',10), role:'ARTIST', isVerified:true, name:a.name, profilePhotoUrl:a.profilePhotoUrl }
    });
    const performer = await prisma.performer.create({
      data: { userId:user.id, contactEmail:`${a.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}@mgmt.example`, contactPhone:`+66${randInt(800000000, 899999999)}`, ...socialLinks(a.name) }
    });
    const slug = a.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const artist = await prisma.artist.create({
      data: {
        performerId: performer.userId,
        description: `${a.name} live performer`,
        genre: a.genre,
        subGenre: maybe(0.4) ? rand(GENRES) : null,
        bookingType: a.bookingType,
        foundingYear: randInt(2008, 2024),
        label: maybe(0.6) ? 'Universal/Example' : null,
        isIndependent: !maybe(0.6),
        memberCount: a.bookingType==='FULL_BAND'?randInt(4,7):a.bookingType==='TRIO'?3:a.bookingType==='DUO'?2:1,
        priceMin: maybe(0.8) ? randInt(20000, 250000) : null,
        priceMax: maybe(0.8) ? randInt(250000, 1500000) : null,
        ...musicLinks(a.name),
        ...docLinks(slug),
      }
    });
    await prisma.artistRecord.create({
      data: {
        artistId: artist.performerId,
        title: `${a.name} Live at Chiang Mai`,
        description: 'A memorable live showcase in the north.',
        thumbnailUrl: `https://picsum.photos/seed/${encodeURIComponent(a.name)}_rec/600/400`,
        photoUrls: [
          `https://picsum.photos/seed/${encodeURIComponent(a.name)}_p1/800/600`,
          `https://picsum.photos/seed/${encodeURIComponent(a.name)}_p2/800/600`
        ],
        videoUrls: [`https://example.com/videos/${slug}_1.mp4`],
        date: dInThisMonth(randInt(1, 2)),
        source: 'official'
      }
    });
    artistProfiles.push({ user, performer, artist });
  }

  for (const name of FAKE_NAMES) {
    const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}@example.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash:await bcrypt.hash('password123',10), role:'ARTIST', isVerified:true, name, profilePhotoUrl:`https://picsum.photos/seed/${encodeURIComponent(name)}/640/400` }
    });
    const pSocial = maybe(0.75) ? socialLinks(name) : { instagramUrl:null, facebookUrl:null, youtubeUrl:null, twitterUrl:null, tiktokUrl:null, lineUrl:null };
    const performer = await prisma.performer.create({
      data: {
        userId: user.id,
        contactEmail: maybe(0.85) ? `${name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}@contact.example` : null,
        contactPhone: maybe(0.6) ? `+66${randInt(800000000, 899999999)}` : null,
        ...pSocial
      }
    });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const complete = maybe(0.7);
    const music = complete ? musicLinks(name) : { spotifyUrl:null, appleMusicUrl:null, soundcloudUrl:null, bandcampUrl:null, shazamUrl:null };
    const docs  = complete ? docLinks(slug)   : { rateCardUrl:null, epkUrl:null, riderUrl:null };

    const artist = await prisma.artist.create({
      data: {
        performerId: performer.userId,
        description: complete ? `${name} independent act from Chiang Mai.` : null,
        genre: rand(GENRES),
        subGenre: maybe(0.4) ? rand(GENRES) : null,
        bookingType: rand(BOOKING_TYPES),
        foundingYear: maybe(0.8) ? randInt(2005, 2024) : null,
        label: maybe(0.25) ? 'Indie Label' : null,
        isIndependent: maybe(0.75),
        memberCount: maybe(0.9) ? randInt(1,7) : null,
        priceMin: maybe(0.5) ? randInt(3000, 30000) : null,
        priceMax: maybe(0.5) ? randInt(30000, 120000) : null,
        ...music,
        ...docs,
      }
    });

    if (maybe(0.45)) {
      await prisma.artistRecord.create({
        data: {
          artistId: artist.performerId,
          title: `${name} — Studio Session`,
          description: maybe(0.6) ? 'Live session in local studio' : null,
          thumbnailUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}_rec/600/400`,
          photoUrls: [`https://picsum.photos/seed/${encodeURIComponent(name)}_p1/800/600`],
          videoUrls: maybe(0.4) ? [`https://example.com/videos/${slug}_sesh.mp4`] : [],
          date: dInThisMonth(randInt(2, 5)),
          source: maybe(0.5) ? 'fan-captured' : 'official'
        }
      });
    }
    artistProfiles.push({ user, performer, artist });
  }
  console.log('✅ Artists =', artistProfiles.length);

  /* ---------- audience pool ---------- */
  const likerUsers = [];
  for (let i=1;i<=140;i++){
    likerUsers.push(await prisma.user.create({
      data: { email:`aud${i}@example.com`, passwordHash:await bcrypt.hash('password123',10), role:'AUDIENCE', isVerified:true, name:`Audience ${i}` }
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
    const performer = await prisma.performer.create({
      data: { userId:u.id, contactEmail:v.email, contactPhone:`+66${randInt(200000000, 299999999)}`, ...socialLinks(v.name) }
    });
    const venue = await prisma.venue.create({
      data: {
        performerId: performer.userId,
        genre: v.genre,
        description: `${v.name} — live music venue in Chiang Mai.`,
        capacity: maybe(0.85) ? randInt(120, 1200) : null,
        dateOpen: dInThisMonth(1, 10, 0),
        dateClose: null,
        priceRate: rand(PRICE_RATES),
        timeOpen: maybe(0.9) ? '17:00' : null,
        timeClose: maybe(0.9) ? '01:00' : null,
        alcoholPolicy: 'SERVE',
        ageRestriction: maybe(0.1) ? 'E20' : 'ALL',
        photoUrls: pickVenuePhotos(randInt(3,5)),
        websiteUrl: maybe(0.8) ? `https://www.${v.name.toLowerCase().replace(/[^a-z0-9]+/g,'')}.example` : null,
      }
    });
    await prisma.venueLocation.create({
      data: { venueId: venue.performerId, latitude:v.lat, longitude:v.lng, locationUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name+' Chiang Mai')}` }
    });
    venues.push({ id: venue.performerId, name: v.name, userId: u.id });
  }
  const venueByName = Object.fromEntries(venues.map(v=>[v.name, v.id]));
  console.log('🏟️ Venues =', venues.length);

  /* ---------- events (this month) ---------- */
  const plans = [
    { name:'Nimman Indie Night',       venue:'Nimman Studio',        date:dInThisMonth(3,20,0),  type:'INDOOR',  ticketing:'FREE',           genre:'Indie',   door:'19:00', end:'22:30', publish:true },
    { name:'Ping Riverside Jazz',      venue:'Ping Riverside Stage', date:dInThisMonth(4,19,30), type:'OUTDOOR', ticketing:'ONSITE_SALES',   genre:'Jazz',    door:'18:30', end:'21:30', publish:true },
    { name:'Old City Acoustic Eve',    venue:'Old City Arena',       date:dInThisMonth(6,18,30), type:'INDOOR',  ticketing:'DIRECT_CONTACT', genre:'Acoustic',door:'18:00', end:'21:00', publish:false },
    { name:'Tha Phae Folk Friday',     venue:'Tha Phae Courtyard',   date:dInThisMonth(7,19,0),  type:'OUTDOOR', ticketing:'DONATION',       genre:'Folk',    door:'18:00', end:'22:00', publish:true },
    { name:'Warehouse Beats',          venue:'Chang Klan Warehouse', date:dInThisMonth(9,21,0),  type:'INDOOR',  ticketing:'ONSITE_SALES',   genre:'EDM',     door:'20:00', end:'00:30', publish:false },
    { name:'Santitham Loft Session',   venue:'Santitham Loft',       date:dInThisMonth(10,20,0), type:'INDOOR',  ticketing:'FREE',           genre:'Lo-fi',   door:'19:00', end:'22:00', publish:true },
    { name:'Sunset Pop at One Nimman', venue:'One Nimman Terrace',   date:dInThisMonth(11,18,0), type:'OUTDOOR', ticketing:'FREE',           genre:'Pop',     door:'17:30', end:'20:30', publish:true },
    { name:'Crossover Night',          venue:'Wat Gate Pavilion',    date:dInThisMonth(12,19,30),type:'INDOOR',  ticketing:'DIRECT_CONTACT', genre:'Crossover',door:'19:00', end:'22:00', publish:false },
    { name:'Riverside Blues Jam',      venue:'Ping Riverside Stage', date:dInThisMonth(14,19,0), type:'OUTDOOR', ticketing:'DONATION',       genre:'Blues',   door:'18:00', end:'21:00', publish:true },
    { name:'Nimman Live Showcase',     venue:'Nimman Studio',        date:dInThisMonth(15,20,0), type:'INDOOR',  ticketing:'TICKET_MELON',   genre:'Mixed',   door:'19:00', end:'23:00', ticketLink:'https://ticketmelon.com', publish:true },
    { name:'Indigo Night Market Stage',venue:'One Nimman Terrace',   date:dInThisMonth(17,18,30),type:'OUTDOOR', ticketing:'FREE',           genre:'Indie',   door:'18:00', end:'21:30', publish:false },
    { name:'Loft Ambient Evening',     venue:'Santitham Loft',       date:dInThisMonth(18,19,30),type:'INDOOR',  ticketing:'FREE',           genre:'Ambient', door:'19:00', end:'22:00', publish:true },
    { name:'Warehouse Hip-Hop Clash',  venue:'Chang Klan Warehouse', date:dInThisMonth(20,21,0), type:'INDOOR',  ticketing:'ONSITE_SALES',   genre:'Hip-hop', door:'20:00', end:'00:30', publish:true },
    { name:'Old City Rock Revival',    venue:'Old City Arena',       date:dInThisMonth(22,19,0), type:'INDOOR',  ticketing:'DIRECT_CONTACT', genre:'Rock',    door:'18:30', end:'22:00', publish:false },
    { name:'Folk Under Lanterns',      venue:'Tha Phae Courtyard',   date:dInThisMonth(24,19,0), type:'OUTDOOR', ticketing:'DONATION',       genre:'Folk',    door:'18:00', end:'21:30', publish:true },
    { name:'Classics by the River',    venue:'Wat Gate Pavilion',    date:dInThisMonth(26,19,0), type:'INDOOR',  ticketing:'DIRECT_CONTACT', genre:'Classical',door:'18:30', end:'21:00', publish:true },
  ];

  const events = [];
  for (let i=0;i<plans.length;i++){
    const p = plans[i];
    const ev = await prisma.event.create({
      data: {
        name:p.name, description:`${p.genre} night in Chiang Mai`,
        posterUrl: EVENT_POSTERS[i % EVENT_POSTERS.length],
        conditions: maybe(0.35) ? 'No outside food & beverage.' : null,
        eventType: p.type, ticketing: p.ticketing, ticketLink: p.ticketLink || null,
        alcoholPolicy:'SERVE', ageRestriction: maybe(0.1) ? 'E20' : 'ALL',
        date:p.date, doorOpenTime:p.door, endTime:p.end, genre:p.genre,
        venueId: venueByName[p.venue], isPublished: !!p.publish, publishedAt: p.publish ? new Date() : null,
      }
    });
    events.push(ev);
  }
  console.log('🎫 Events =', events.length);

  /* ---------- schedule & artist invitations ---------- */
  const addInviteNoti = ({ artistUserId, event }) =>
    prisma.notification.create({ data:{ userId:artistUserId, type:'INVITE', message:`คุณถูกเชิญให้แสดงในงาน “${event.name}”`, data:{ eventId:event.id, date:event.date, venueId:event.venueId } }});
  const addArtistDecisionNoti = ({ organizerUserId, event, artistName, decision }) =>
    prisma.notification.create({ data:{ userId:organizerUserId, type: decision==='ACCEPTED'?'ARTIST_ACCEPT':'ARTIST_DECLINE', message:`ศิลปิน ${artistName} ${decision==='ACCEPTED'?'ยืนยันร่วมงาน':'ปฏิเสธคำเชิญ'} ใน “${event.name}”`, data:{ eventId:event.id } }});

  for (const ev of events) {
    const startM = toMin(ev.doorOpenTime || '19:00') ?? 19*60;
    const endM   = toMin(ev.endTime       || '22:00') ?? 22*60;

    const shuffled = artistProfiles.slice().sort(()=>Math.random()-0.5);
    const count = randInt(3,5);
    const picked = shuffled.slice(0, count);

    let cursor = startM;
    const buffer = 10;
    const stage = 'Main';

    for (let i=0;i<picked.length;i++){
      const { artist, performer, user } = picked[i];
      const dur = randInt(30, 50);
      const s = cursor;
      const e = Math.min(s + dur, endM);
      if (e + (i < picked.length-1 ? buffer : 0) > endM) break;

      const startStr = minToHHMM(s);
      const endStr   = minToHHMM(e);
      const startAt  = makeUtcSameClock(ev.date, startStr);
      const endAt    = makeUtcSameClock(ev.date, endStr);

      // ถ้า event publish → บังคับ ACCEPTED ทั้งหมดให้สมจริง (ไม่มี pending ในงานที่ประกาศแล้ว)
      const st = ev.isPublished ? 'ACCEPTED' : rand(['ACCEPTED','PENDING','DECLINED','ACCEPTED','PENDING']);

      if (st === 'ACCEPTED') {
        await prisma.scheduleSlot.create({
          data: { eventId: ev.id, artistId: artist.performerId, title: null, stage, startAt, endAt, note: null }
        });
      }

      await prisma.artistEvent.create({
        data: {
          artistId: artist.performerId,
          eventId:  ev.id,
          status:   st,
          notes:    st==='ACCEPTED' ? 'confirmed and scheduled' : (st==='DECLINED' ? 'schedule conflict' : 'waiting for response'),
          slotStartAt: st==='ACCEPTED' ? startAt : null,
          slotEndAt:   st==='ACCEPTED' ? endAt : null,
          slotStage:   st==='ACCEPTED' ? stage : null,
        }
      });

      await addInviteNoti({ artistUserId: user.id, event: ev });
      const ownerVenue = venues.find(v => v.id === ev.venueId);
      if (ownerVenue && st !== 'PENDING') {
        await addArtistDecisionNoti({ organizerUserId: ownerVenue.userId, event: ev, artistName: user.name || `Artist #${artist.performerId}`, decision: st });
      }

      cursor = e + buffer;
    }
  }
  console.log('✅ ScheduleSlots + ArtistEvents created');

  /* ---------- FOLLOWERS (likePerformer) ---------- */
  // ให้ทุก artist มีผู้ติดตาม 6–110 แบบสุ่ม
  for (const { artist } of artistProfiles) {
    const target = randInt(6, 110);
    const shuffled = likerUsers.slice().sort(()=>Math.random()-0.5);
    for (let i=0;i<target;i++){
      try {
        await prisma.likePerformer.create({ data: { userId: shuffled[i].id, performerId: artist.performerId }});
      } catch { /* unique dup safe */ }
    }
  }

  // ให้ event มีคนกดสนใจ/ถูกใจ 8–95 (เดิม)
  for (const ev of events) {
    const target = randInt(8, 95);
    const shuffled = likerUsers.slice().sort(()=>Math.random()-0.5);
    for (let i=0;i<target;i++){
      try { await prisma.likeEvent.create({ data: { userId: shuffled[i].id, eventId: ev.id }}); } catch {}
    }
  }

  // 🔁 Denormalize followers → performer.followersCount (ถ้ามีคอลัมน์นี้)
  try {
    const counts = await prisma.likePerformer.groupBy({
      by: ['performerId'],
      _count: { performerId: true }
    });
    // set >0
    for (const c of counts) {
      await prisma.performer.update({
        where: { userId: c.performerId },
        data:  { followersCount: c._count.performerId }
      }).catch(()=>{});
    }
    // set 0 for who has none
    const allPerf = await prisma.performer.findMany({ select: { userId:true }});
    const hasIds = new Set(counts.map(c=>c.performerId));
    for (const p of allPerf) {
      if (!hasIds.has(p.userId)) {
        await prisma.performer.update({ where:{ userId:p.userId }, data:{ followersCount: 0 }}).catch(()=>{});
      }
    }
    console.log('👥 Denormalized followersCount updated (if column exists).');
  } catch (e) {
    console.log('ℹ️ Skip followersCount denormalization (no column?)');
  }

  console.log('👍 Likes created for events & performers');

  /* ---------- Example notifications (publish/reschedule/cancel) ---------- */
  const publishedEvents = events.filter(e => e.isPublished);
  const draftEvents     = events.filter(e => !e.isPublished);

  const addPublishNoti = ({ followerUserId, event }) =>
    prisma.notification.create({ data:{ userId:followerUserId, type:'FOLLOWER_PUBLISH', message:`งานใหม่เผยแพร่แล้ว: “${event.name}”`, data:{ eventId:event.id } }});
  const addRescheduleNoti = ({ userId, event, newDate }) =>
    prisma.notification.create({ data:{ userId, type:'RESCHEDULE', message:`งาน “${event.name}” มีการเลื่อนกำหนดเป็น ${new Date(newDate).toLocaleDateString()}`, data:{ eventId:event.id, newDate } }});

  if (publishedEvents.length) {
    const ev = rand(publishedEvents);
    const newDate = dInThisMonth(Math.min(28, new Date(ev.date).getDate() + 2), 20, 0);
    const aes = await prisma.artistEvent.findMany({ where: { eventId: ev.id } });
    for (const ae of aes) {
      const perf = await prisma.performer.findUnique({ where: { userId: ae.artistId } });
      if (perf) await addRescheduleNoti({ userId: perf.userId, event: ev, newDate });
    }
    const someFans = likerUsers.slice(0, 10);
    await Promise.all(someFans.map(u => addRescheduleNoti({ userId: u.id, event: ev, newDate })));
  }

  if (draftEvents.length) {
    const ev = rand(draftEvents);
    const aes = await prisma.artistEvent.findMany({ where: { eventId: ev.id } });
    for (const ae of aes) {
      const perf = await prisma.performer.findUnique({ where: { userId: ae.artistId } });
      if (perf) {
        await prisma.notification.create({
          data: { userId: perf.userId, type: 'CANCEL', message: `งาน “${ev.name}” ถูกยกเลิกโดยผู้จัด`, data: { eventId: ev.id } }
        });
      }
    }
  }

  if (draftEvents.length > 1) {
    const ev = draftEvents[1];
    await prisma.event.update({ where: { id: ev.id }, data: { isPublished: true, publishedAt: new Date() } });
    const followers = await prisma.likeEvent.findMany({ where: { eventId: ev.id } });
    for (const f of followers.slice(0, 20)) {
      await addPublishNoti({ followerUserId: f.userId, event: ev });
    }
  }

  // Debug log followers per first 8 artists
  const first8 = artistProfiles.slice(0,8);
  for (const a of first8) {
    const c = await prisma.likePerformer.count({ where: { performerId: a.artist.performerId } });
    console.log(`👤 ${a.user.name} followers: ${c}`);
  }

  console.log('✅ Done. Rich demo data seeded.');
}

/* ========================================= */
main()
  .catch((e)=>{ console.error(e); process.exit(1); })
  .finally(async ()=>{ await prisma.$disconnect(); });
