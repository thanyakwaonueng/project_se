const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SECRET = process.env.JWT_SECRET || 'your_secret_key';
require('dotenv').config({path:'.env.dev'}) //อ่านข้อมูลใน .env.dev
require('dotenv').config({path:'.env'}) 

const express = require('express');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer')
const { OAuth2Client } = require('google-auth-library')
//const { requireRole } = require('./authz');

//for dealing with multipart form-data(those one where it send file along with other form field)
//since express cannot handle it by default(it will gives undefined)
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const { createClient } = require('@supabase/supabase-js')
const path = require('path');
const fs = require('fs');

// Supabase client (service role key, backend-only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

//Google OAuth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, "http://localhost:5173")

const app = express();
app.use(express.json());
app.use(cookieParser());
const port = process.env.PORT || 4000;


/**
 * ✅ รองรับ FE ที่เรียก /api/* โดยรีไรท์เป็นเส้นทางเดิม
 *    เช่น /api/groups -> /groups
 *    วาง middleware นี้ไว้ "ก่อน" ประกาศ route ทั้งหมด
 */
app.use((req, _res, next) => {
  if (req.url.startsWith('/api/')) {
    req.url = req.url.slice(4); // ตัด "/api"
  }
  next();
});

/* ───────────────────────────── HELPERS / AUTHZ ───────────────────────────── */
const ALLOW_REQUEST_ROLES = ['ARTIST', 'ORGANIZE'];

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') return res.sendStatus(403);
  next();
}



// ───────── NOTIFICATION HELPER ─────────────────────────────────────────────
async function notify(prismaClient, userId, type, message, data = null) {
  return prismaClient.notification.create({
    data: { userId, type, message, data },
  });
}
const uniq = (arr) => Array.from(new Set(arr)).filter(Boolean);

function diffFields(before, after, fields) {
  const changed = [];
  for (const f of fields) {
    const bv = before?.[f] instanceof Date ? before[f].toISOString() : before?.[f];
    const av = after?.[f]  instanceof Date ? after[f].toISOString()  : after?.[f];
    if (JSON.stringify(bv) !== JSON.stringify(av)) changed.push(f);
  }
  return changed;
}

async function getFollowersOfArtist(prismaClient, artistId /* = performerId */) {
  const rows = await prismaClient.likePerformer.findMany({
    where: { performerId: Number(artistId) },
    select: { userId: true },
  });
  return rows.map(r => r.userId);
}

async function getAudienceForEventUpdate(prismaClient, eventId) {
  const [eventLikers, artistFollowers] = await Promise.all([
    prismaClient.likeEvent.findMany({
      where: { eventId: Number(eventId) },
      select: { userId: true },
    }),
    prismaClient.artistEvent.findMany({
      where: { eventId: Number(eventId), status: 'ACCEPTED' },
      select: { artistId: true },
    }).then(async (aes) => {
      const lists = await Promise.all(aes.map(ae => getFollowersOfArtist(prismaClient, ae.artistId)));
      return lists.flat();
    }),
  ]);
  return uniq([
    ...eventLikers.map(x => x.userId),
    ...artistFollowers,
  ]);
}

async function fanout(prismaClient, userIds, type, message, data) {
  if (!userIds?.length) return;
  await prismaClient.$transaction(
    userIds.map(uid => prismaClient.notification.create({
      data: { userId: uid, type, message, data },
    }))
  );
}

// ช็อตคัตยิง event.updated
async function eventUpdatedFanout(prismaClient, eventId, changedFields) {
  const ev = await prismaClient.event.findUnique({
    where: { id: Number(eventId) },
    select: { id: true, name: true },
  });
  if (!ev) return;
  const audience = await getAudienceForEventUpdate(prismaClient, ev.id);
  await fanout(
    prismaClient,
    audience,
    'event.updated',
    `อัปเดตงาน: ${ev.name}`,
    { eventId: ev.id, changedFields }
  );
}



// ===== Event readiness helpers (ทุกคำเชิญต้อง ACCEPTED ถึงจะ "พร้อม") =====
function summarizeReadiness(artistEvents = []) {
  const total = artistEvents.length;
  const accepted = artistEvents.filter(ae => ae.status === 'ACCEPTED').length;
  return {
    totalInvited: total,
    accepted,
    declined: artistEvents.filter(ae => ae.status === 'DECLINED').length,
    pending: artistEvents.filter(ae => ae.status === 'PENDING').length,
    isReady: total > 0 && accepted === total,
  };
}

/* ───────────────────────────── AUTH MIDDLEWARE ───────────────────────────── */
async function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, email: true },
    });
    if (!user) return res.sendStatus(401);
    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch (err) {
    console.error('AUTH_MIDDLEWARE_ERROR', err);
    return res.sendStatus(403);
  }
}

/* ───────────────────────────── AUTH ROUTES ───────────────────────────── */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(401).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Password isn't correct!" });

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1d' });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ message: 'Logged in' });
  } catch (err) {
    console.error('LOGIN_ERROR', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });
  res.json({ message: 'Logged out successfully' });
});

/*  ส่ง pendingRoleRequest + application ให้ FE preload ได้ */
app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        name: true,
        profilePhotoUrl: true,
        birthday: true,
        favoriteGenres: true,
        performerInfo: {
          include: {
            artistInfo: {
              include: {
                artistRecords: true,
              }
            },
            venueInfo: {
              include: {
                location: true,
              }
            },
            likedBy: true,
          }
        },
        roleRequests: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            requestedRole: true,
            status: true,
            application: true,
            createdAt: true,
          }
        }
      },
    });
    if (!me) return res.sendStatus(404);

    const pendingRoleRequest = me.roleRequests?.[0] || null;
    delete me.roleRequests;

    res.json({ ...me, pendingRoleRequest });
  } catch (err) {
    console.error('AUTH_ME_ERROR', err);
    res.status(500).json({ error: 'Failed to load current user' });
  }
});

/*------------Function for checking email by using Regex-----------*/
function validateEmail(email) {
  const regex =
    /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  return regex.test(email);
}



//ใช้สำหรับส่งเมลไปหา user
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth:{
    user: process.env.EMAIL_USER, // กำหนดใน .env Email ที่ใช้ส่ง
    pass: process.env.EMAIL_PASS, // App Password email ที่ใช้ส่งใน .env
  },
  authMethod: 'PLAIN'
})



/* ───────────────────────────── OTP ───────────────────────────── */
app.post('/verifyOTP', async (req, res) => {
  console.log("Verifying OTP...")
  try {
    const { email, otp } = req.body
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email!' });
    }

    const user = await prisma.user.findUnique({ where: { email } })
    const valid = user ? await bcrypt.compare(otp, user.otpHash || '') : false;

    if (!user) {
      return res.status(404).json({ error: "User not found!" })
    } else if (user.isVerified) {
      return res.status(400).json({ error: "User already verified!" })
    } else if (!valid || (user.otpExpiredAt && user.otpExpiredAt < new Date())) {
      return res.status(400).json({ error: "Invalid or Expired OTP!" })
    }


    await prisma.user.update({
      where: { email },
      data: { isVerified: true, otpHash: null, otpExpiredAt: null }
    })

    return res.status(201).json({ message: "Email verified successfully!" })
  } catch (err) {
    console.error('POST /verifyOTP error:', err);
    return res.status(400).json({ error: err.message || 'OTP failed' });
  }
});

app.post("/resendOTP", async (req, res) => {
  console.log("Resending OTP...")
  try {
    const { email } = req.body
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email!' });
    }
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return res.status(404).json({ error: "User not found!" })
    }

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`
    const otp_expired = new Date(Date.now() + 15 * 60 * 1000)

    const mailOption = {
      from: `"Chiang Mai Original website" <no-reply@myapp.com>`,
      to: email,
      subject: "Verify your email",
      html: `<p>Enter <b>${otp}</b> in the app to verify your email and complete sign up</p> 
          <p>This code <b>expired in 15 minutes</b></p>`,
    }
    await transporter.sendMail(mailOption)


    const hashotp = await bcrypt.hash(otp, 10)
    await prisma.user.update({
      where: { email },
      data: { otpHash: hashotp, otpExpiredAt: otp_expired }
    })

    return res.status(201).json({ status: "PENDING", message: "OTP has been resent" })
  } catch (err) {
    console.error('POST /resendOTP error:', err)
    return res.status(400).json({ error: err.message || 'Resend OTP failed' })
  }
})

/* ───────────────────────────── Google Sign UP ───────────────────────────── */
app.post('/googlesignup', async(req, res) =>{
  console.log("Signing up Google...")
  try {
    const { code } = req.body; 
    
    // แลก code -> tokens (access_token + id_token)
    const { tokens } = await client.getToken(code);
    //console.log("Tokens:", tokens);

    //Verify id token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    let { email, name, picture } = payload;

    // sanitize
    email = (email || '').trim().toLowerCase();
    
    let user = await prisma.user.findUnique({where: {email}})
    //ถ้าไม่มีให้สร้าง user ใหม่
    if(!user){
      user = await prisma.user.create({data:{email, passwordHash: "", role: 'AUDIENCE', 
                                      isVerified: true}}) //No need for OTP
    }
    
    //Create Cookie like login function
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1d' });

    // ✅ Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: false, // production: true + SameSite=None + HTTPS
      maxAge: 24 * 60 * 60 * 1000, //24 Hours (1 Day)
    });
    
    return res.status(201).json({message: 'Logged in', user})
  } catch (err) {
    console.error('POST /googlesignup error:', err);
    return res.status(400).json({ error: err.message || 'Google sign up failed' });
  }
})

/* ───────────────────────────── Forget Password ───────────────────────────── */

// Forget password กรอก email -> send Otp(Call /resendOTP) -> Verify OTP(Call /verifyOTP) -> ใส่ new password (Call /resetpassword)

app.post('/resetpassword', async(req, res)=>{
  try {
    const { email, password, confirm_password } = req.body
    let user = await prisma.user.findUnique({where:{email}})
    if(password !== confirm_password){
      return res.status(400).json({error: "Password doesn't match!"})
    }
    if(!user){
      return res.status(400).json({error: "User not found!"})
    }

    const passwordHash = await bcrypt.hash(password, 10)
     await prisma.user.update({
      where: { email },
      data: { passwordHash: passwordHash, otpHash: null, otpExpiredAt: null }
    })
  } catch (err) {
    return res.status(400).json({error: err.message || 'Reset password failed!'})
  }
})



/* ───────────────────────────── USERS ───────────────────────────── */
app.post('/users', async (req, res) => {
  try {
    let { email, password } = req.body;

    email = (email || '').trim().toLowerCase();

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email!' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password ต้องมีอย่างน้อย 6 ตัวอักษรขึ้นไป!' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'This User is already exist!' });
    }

    const otp = `${Math.floor(100000 + Math.random() * 900000)}` //สุ่มเลข OTP 6 หลัก
    const otp_expired = new Date(Date.now() + 15 * 60 * 1000) //อายุ otp 15 นาที

    const hashotp = await bcrypt.hash(otp, 10)
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email, passwordHash, role: 'AUDIENCE',
        otpHash: hashotp, otpExpiredAt: otp_expired
      },
    });

    return res.status(201).json(user);
  } catch (err) {
    console.error('POST /users error:', err);
    return res.status(400).json({ error: err.message || 'Signup failed' });
  }
});

app.get('/users', authMiddleware, async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { performerInfo: true },
  });
  res.json(users);
});

app.get('/users/:id', async (req, res) => {
  const id = +req.params.id;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { performerInfo: true },
  });
  user ? res.json(user) : res.status(404).send('User not found');
});

/* ───────────────────────────── ARTISTS (POST = upsert by userId) ────────── */
app.post('/artists', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    // Split data into performer fields vs artist fields
    const performerData = {
      contactEmail: data.contact.email,
      contactPhone: data.contact.phone,
      youtubeUrl: data.links.youtube,
      tiktokUrl: data.links.tiktok,
      facebookUrl: data.links.facebook,
      instagramUrl: data.links.instagram,
      twitterUrl: data.links.twitter,
      lineUrl: data.links.line,
    };

    const artistData = {
      description: data.description,
      genre: data.genre,
      subGenre: data.subGenre,
      bookingType: data.bookingType,
      foundingYear: data.foundingYear,
      label: data.label,
      isIndependent: data.isIndependent,
      memberCount: data.memberCount,
      priceMin: data.priceMin,
      priceMax: data.priceMax,
      spotifyUrl: data.links.spotify,
      appleMusicUrl: data.links.appleMusic,
      soundcloudUrl: data.links.soundcloud,
      shazamUrl: data.links.shazam,
      bandcampUrl: data.links.bandcamp,
    };

    const result = await prisma.$transaction(async (tx) => {
      const performer = await tx.performer.upsert({
        where: { userId: userId },
        update: performerData,
        create: {
          userId,
          ...performerData,
        },
      });

      const artist = await tx.artist.upsert({
        where: { performerId: userId },
        update: artistData,
        create: {
          performerId: userId,
          ...artistData,
        },
      });

      return { performer, artist };
    });

    res.status(201).json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create/update artist' });
  }
});

app.get('/artists', async (req, res) => {
  try {
    const artists = await prisma.artist.findMany({
      include: {
        performer: {
          include: {
            user: true,
            // [LIKES] include ตัวนับไลก์ของ performer
            _count: { select: { likedBy: true } },
          },
        },
        artistRecords: true,
      },
    });
    res.json(artists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch artists' });
  }
});

app.get('/artists/:id', async (req, res) => {
  const id = +req.params.id;
  try {
    const artist = await prisma.artist.findUnique({
      where: { performerId: id },
      include: {
        performer: {
          include: {
            user: true,
          },
        },
        artistRecords: true,
      },
    });

    if (artist) {
      res.json(artist);
    } else {
      res.status(404).send('Artist not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch artist' });
  }
});


app.get('/groups', async (req, res) => {
  try {
    let meId = null;
    try {
      const token = req.cookies?.token;
      if (token) {
        const decoded = jwt.verify(token, SECRET);
        meId = decoded?.id ?? null;
      }
    } catch {}

    const artists = await prisma.artist.findMany({
      include: {
        performer: {
          include: {
            user: true,
            _count: { select: { likedBy: true } },
            likedBy: meId
              ? { where: { userId: meId }, select: { userId: true }, take: 1 }
              : false,
          },
        },
        artistRecords: true,
        artistEvents: {
          include: {
            event: {
              include: {
                venue: {
                  include: {
                    performer: { include: { user: true } },
                    location: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const groups = artists.map((a) => {
      // ---- เลือก ArtistRecord ล่าสุด (by date || createdAt) ----
      const records = Array.isArray(a.artistRecords) ? a.artistRecords.slice() : [];
      records.sort((r1, r2) => {
        const d1 = r1.date ? new Date(r1.date).getTime() : 0;
        const d2 = r2.date ? new Date(r2.date).getTime() : 0;
        // ถ้าไม่มี date ให้ fallback createdAt
        const c1 = new Date(r1.createdAt).getTime();
        const c2 = new Date(r2.createdAt).getTime();
        const t1 = Math.max(d1, c1);
        const t2 = Math.max(d2, c2);
        return t2 - t1; // ล่าสุดมาก่อน
      });
      const latest = records[0];

      // hero photo/ video มาจาก ArtistRecord
      const heroPhoto =
        latest?.thumbnailUrl ||
        (Array.isArray(latest?.photoUrls) && latest.photoUrls.length ? latest.photoUrls[0] : null);
      const heroVideo =
        Array.isArray(latest?.videoUrls) && latest.videoUrls.length ? latest.videoUrls[0] : null;

      // ---- สร้าง schedule ----
      const schedule = (Array.isArray(a.artistEvents) ? a.artistEvents : [])
        .map((ae) => {
          const e = ae.event;
          if (!e) return null;
          const venue = e.venue;
          const venueName = venue?.performer?.user?.name ?? "Unknown Venue";
          return {
            id: e.id,
            dateISO: e.date.toISOString(),
            title: e.name,
            venue: venueName,
            // schema จริงใช้ venue.location (ไม่ใช่ venue.venueLocation)
            city: venue?.location?.locationUrl ? "" : "",
            ticketUrl: e.ticketLink ?? "#",
            performanceRole: ae.role ?? null,
            performanceOrder: ae.order ?? null,
            performanceFee: ae.fee ?? null,
          };
        })
        .filter(Boolean)
        .sort((x, y) => new Date(x.dateISO) - new Date(y.dateISO));

      return {
        id: a.performerId,
        slug:
          (a.performer?.user?.name ?? "unknown").toLowerCase().replace(/\s+/g, "-") ||
          `artist-${a.performerId}`,
        name: a.performer?.user?.name ?? "Unnamed Artist",
        // ถ้าไม่มีรูปใน ArtistRecord ให้ fallback ไปที่รูป user.profilePhotoUrl
        image:
          heroPhoto ||
          a.performer?.user?.profilePhotoUrl ||
          "https://i.pinimg.com/736x/a7/39/8a/a7398a0e0e0d469d6314df8b73f228a2.jpg",

        // ✅ ส่งต่อ photo/video จาก ArtistRecord (ให้หน้า FE ใช้ได้เลย)
        photoUrl: heroPhoto || null,
        videoUrl: heroVideo || null,

        description: a.description ?? "",
        details: a.genre ?? "",
        stats: {
          members: a.memberCount ?? 1,
          debut: a.foundingYear ? String(a.foundingYear) : "N/A",
          followers: String(a.performer?._count?.likedBy ?? 0),
        },
        followersCount: a.performer?._count?.likedBy ?? 0,
        likedByMe: !!(a.performer.likedBy && a.performer.likedBy.length),

        socials: {
          instagram: a.performer.instagramUrl,
          youtube: a.performer.youtubeUrl,
          tiktok: a.performer.tiktokUrl,
          facebook: a.performer.facebookUrl,
          twitter: a.performer.twitterUrl,
          spotify: a.spotifyUrl || null,
          line: a.performer.lineUrl,
        },

        schedule,

        techRider: {
          summary: "",
          items: [],
          downloadUrl: a.riderUrl ?? "",
        },

        playlistEmbedUrl: a.spotifyUrl
          ? a.spotifyUrl.replace("open.spotify.com/artist", "open.spotify.com/embed/artist")
          : null,
      };
    });

    res.json(groups);
  } catch (err) {
    console.error("GET /groups error:", err);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

/* ───────────────────────────── VENUES (POST = upsert by userId) ─────────── */
app.post('/venues', authMiddleware, async (req, res) => {
  try {

    if (!['ORGANIZE', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only ORGANIZE or ADMIN can manage venues' });
    }
    const userId = req.user.id;
    const data = req.body;

    const performerData = {
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      youtubeUrl: data.youtubeUrl,
      tiktokUrl: data.tiktokUrl,
      facebookUrl: data.facebookUrl,
      instagramUrl: data.instagramUrl,
      lineUrl: data.lineUrl,
    };

    const venueData = {
      description: data.description,
      genre: data.genre,
      capacity: data.capacity,
      dateOpen: data.dateOpen,
      dateClose: data.dateClose,
      priceRate: data.priceRate,
      timeOpen: data.timeOpen,
      timeClose: data.timeClose,
      alcoholPolicy: data.alcoholPolicy,
      ageRestriction: data.ageRestriction,
      photoUrls: data.photoUrls,
      websiteUrl: data.websiteUrl,
      shazamUrl: data.shazamUrl,
      bandcampUrl: data.bandcampUrl,
    };

    const venueLocationData = {
      latitude: data.latitude,
      longitude: data.longitude,
      locationUrl: data.locationUrl,
    };

    const existing = await prisma.performer.findUnique({
      where: { userId },
      include: { venueInfo: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const performer = await tx.performer.upsert({
        where: { userId },
        update: performerData,
        create: {
          userId,
          ...performerData,
        },
      });

      const venue = await tx.venue.upsert({
        where: { performerId: userId },
        update: venueData,
        create: {
          performerId: userId,
          ...venueData,
        },
      });

      return { performer, venue };
    });

    res.status(201).json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create/update venue' });
  }
});





// // GET /me/venue — ดึง venue ของผู้ใช้ปัจจุบัน
// app.get('/me/venue', authMiddleware, async (req, res) => {
//   try {
//     const venue = await prisma.venue.findUnique({
//       where: { performerId: req.user.id },
//       include: {
//         performer: { include: { user: true } },
//         location: true,
//         events: true,
//       },
//     });
//     if (!venue) return res.status(404).json({ error: 'No venue for this user' });
//     res.json(venue);
//   } catch (err) {
//     console.error('GET /me/venue error:', err);
//     res.status(500).json({ error: 'Could not fetch my venue' });
//   }
// });









app.get('/venues', async (_req, res) => {
  const venues = await prisma.venue.findMany({
    include: {
      performer: {
        include: {
          user: true,
        },
      },
      location: true,
      events: true
    },
  });
  res.json(venues);
});

// ✅ GET /venues/:id — ใช้ id อย่างเดียว (ไม่ใช้ slug) และส่งค่า number จริงให้ Prisma
app.get('/venues/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const venue = await prisma.venue.findUnique({
      // ❌ ห้ามเขียน performerId: Int
      // ✅ ต้องส่งค่า id จริง
      where: { performerId: id },
      include: {
        performer: { include: { user: true } },
        location: true,
        events: true,
      },
    });

    if (!venue) return res.status(404).send('Venue not found');
    res.json(venue);
  } catch (err) {
    console.error('GET /venues/:id error:', err);
    res.status(500).json({ error: 'Could not fetch venue' });
  }
});

/* ───────── PUT /venues/:id (id = performerId) ───────── */
app.put('/venues/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);            // <- performerId / owner userId
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    // สิทธิ์: ADMIN ได้หมด / ORGANIZE ต้องแก้เฉพาะของตัวเอง
    if (!(req.user.role === 'ADMIN' || (req.user.role === 'ORGANIZE' && req.user.id === id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const body = req.body || {};

    // เตรียมข้อมูล (แปลงค่าสำคัญเป็น number ถ้าจำเป็น)
    const toInt = (v) => (v === '' || v == null ? null : (Number.isFinite(+v) ? Math.trunc(+v) : null));
    const toFloat = (v) => (v === '' || v == null ? null : (Number.isFinite(+v) ? +v : null));

    const userData = {
      // ชื่อ venue เก็บที่ user.name ของเจ้าของ (ตามสคีมาเดิม)
      name: (body.name ?? '').trim() || null,
    };

    const performerData = {
      contactEmail: body.contactEmail ?? null,
      contactPhone: body.contactPhone ?? null,
      youtubeUrl: body.youtubeUrl ?? null,
      tiktokUrl: body.tiktokUrl ?? null,
      facebookUrl: body.facebookUrl ?? null,
      instagramUrl: body.instagramUrl ?? null,
      lineUrl: body.lineUrl ?? null,
      twitterUrl: body.twitterUrl ?? null,
    };

    const venueData = {
      description: body.description ?? null,
      genre: body.genre ?? null,
      capacity: toInt(body.capacity),
      dateOpen: body.dateOpen ? new Date(body.dateOpen) : null,
      dateClose: body.dateClose ? new Date(body.dateClose) : null,
      priceRate: body.priceRate ?? null,
      timeOpen: body.timeOpen ?? null,
      timeClose: body.timeClose ?? null,
      alcoholPolicy: body.alcoholPolicy ?? null,
      ageRestriction: toInt(body.ageRestriction),
      websiteUrl: body.websiteUrl ?? null,
      photoUrls: Array.isArray(body.photoUrls)
        ? body.photoUrls
        : (typeof body.photoUrls === 'string'
            ? body.photoUrls.split(',').map(s => s.trim()).filter(Boolean)
            : []),
    };

    const locationData = {
      latitude: toFloat(body.latitude),
      longitude: toFloat(body.longitude),
      locationUrl: body.locationUrl ?? null,
    };

    // ตรวจว่ามี venue นี้อยู่จริงก่อน
    const exists = await prisma.venue.findUnique({ where: { performerId: id } });
    if (!exists) return res.status(404).json({ error: 'Venue not found' });

    const updated = await prisma.$transaction(async (tx) => {
      // 1) อัปเดตชื่อบน user
      await tx.user.update({
        where: { id },
        data: userData,
      });

      // 2) performer (ช่องทางติดต่อ/โซเชียล)
      await tx.performer.update({
        where: { userId: id },
        data: performerData,
      });

      // 3) venue หลัก (***อย่าใส่ 173 อีกแล้ว***)
      await tx.venue.update({
        where: { performerId: id },
        data: venueData,
      });

      // 4) location: upsert โดยใช้ venueId = performerId
      await tx.venueLocation.upsert({
        where: { venueId: id },
        update: locationData,
        create: { venueId: id, ...locationData },
      });

      // ส่งข้อมูลล่าสุดกลับ
      return tx.venue.findUnique({
        where: { performerId: id },
        include: {
          performer: { include: { user: true } },
          location: true,
          events: true,
        },
      });
    });

    res.json(updated);
  } catch (err) {
    console.error('PUT /venues/:id error', err);
    res.status(500).json({ error: 'Could not update venue' });
  }
});


/* ───────────────────────────── EVENTS ─────────── */
app.post('/events', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    const venue = await prisma.venue.findUnique({
  where: { performerId: userId },
  include: {
    performer: { include: { user: true } },
    location: true,
  },
});
    if (!venue) return res.status(400).json({ error: "Venue profile not found for this user" });

    let event;
    let changed = [];

    if (data.id) {
      const before = await prisma.event.findUnique({ where: { id: data.id } });

      if (before && before.venueId === venue.performerId) {
        event = await prisma.event.update({ where: { id: data.id }, data });
        // ⬇️ ตรวจฟิลด์สำคัญ
        changed = diffFields(before, event, ['date','doorOpenTime','endTime','venueId']);
      } else {
        const { id, ...createData } = data;
        event = await prisma.event.create({
          data: { ...createData, venue: { connect: { performerId: venue.performerId } } },
        });
        // create ใหม่—ยังไม่ถือว่า “อัปเดต”
      }
    } else {
      event = await prisma.event.create({
        data: { ...data, venue: { connect: { performerId: venue.performerId } } },
      });
    }

    // 🔔 ถ้ามีการเปลี่ยนฟิลด์สำคัญ → แจ้งผู้ติดตามงาน + แฟนศิลปินในงาน
    if (changed.length) {
      try { await eventUpdatedFanout(prisma, event.id, changed); } catch(e) { console.error(e); }
    }

    return res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create/update event' });
  }
});

app.get('/events', async (req, res) => {
  try {
    // optional auth
    let meId = null;
    try {
      const token = req.cookies?.token;
      if (token) {
        const decoded = jwt.verify(token, SECRET);
        meId = decoded?.id ?? null;
      }
    } catch {}

    const events = await prisma.event.findMany({
      where: {
        // แสดงเฉพาะที่ “พร้อม”: มีเชิญอย่างน้อย 1 และทุกเชิญ ACCEPTED
        artistEvents: {
          some: {},                  // มีอย่างน้อย 1
          every: { status: 'ACCEPTED' }, // ทุกคน ACCEPTED
        },
      },
      include: {
        venue: {
          include: {
            performer: { include: { user: true } },
            location: true,
          },
        },
        artistEvents: {
          include: {
            artist: {
              include: {
                performer: { include: { user: true } },
                artistEvents: true,
                artistRecords: true,
              },
            },
          },
        },
        _count: { select: { likedBy: true } },
        likedBy: meId
          ? { where: { userId: meId }, select: { userId: true }, take: 1 }
          : false,
      },
      orderBy: { date: 'asc' },
    });

    const mapped = events.map(e => {
      const readiness = summarizeReadiness(e.artistEvents || []);
      return {
        ...e,
        followersCount: e._count?.likedBy ?? 0,
        likedByMe: !!(Array.isArray(e.likedBy) && e.likedBy.length),
        _ready: readiness,
      };
    });

    return res.json(mapped);
  } catch (err) {
    console.error('GET /events error:', err);
    return res.status(500).json({ error: 'Could not fetch events' });
  }
});


app.get('/events/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    // decode token เพื่อรู้ว่าใครเรียก
    const me = (() => {
      try {
        const token = req.cookies?.token;
        if (!token) return null;
        const d = jwt.verify(token, SECRET);
        return d && typeof d === 'object' ? { id: d.id, role: d.role } : null;
      } catch { return null; }
    })();

    const ev = await prisma.event.findUnique({
      where: { id },
      include: {
        venue: {
          include: { performer: { include: { user: true } }, location: true },
        },
        artistEvents: {
          include: {
            artist: { include: { performer: { include: { user: true } } } },
          },
          orderBy: [{ slotStartAt: 'asc' }, { updatedAt: 'asc' }],
        },
        scheduleSlots: true,
        likedBy: me?.id
          ? { where: { userId: me.id }, select: { userId: true }, take: 1 }
          : false,
        _count: { select: { likedBy: true } },
      },
    });
    if (!ev) return res.status(404).json({ message: 'not found' });

    const readiness = summarizeReadiness(ev.artistEvents || []);
    const isOwnerOrAdmin = !!(me && (me.role === 'ADMIN' || me.id === ev.venueId));
    //  อนุญาตศิลปินที่ถูกเชิญ (มี artistEvent ของ user.id) เห็นงานได้แม้ยังไม่ ready
    const isInvitedArtist =
      !!(me && me.role === 'ARTIST' && (ev.artistEvents || []).some(ae => ae.artistId === me.id));

    // เดิม: if (!isOwnerOrAdmin && !readiness.isReady) return 404
    if (!isOwnerOrAdmin && !isInvitedArtist && !readiness.isReady) {
      return res.status(404).json({ message: 'not found' });
    }

    const followersCount = ev._count?.likedBy ?? 0;
    const likedByMe = !!(Array.isArray(ev.likedBy) && ev.likedBy.length);

    res.json({
      ...ev,
      followersCount,
      likedByMe,
      _ready: readiness,
      _isOwner: isOwnerOrAdmin,
    });
  } catch (e) {
    console.error('GET /events/:id error', e);
    res.status(500).json({ message: 'failed to fetch event' });
  }
});






/* ───────────────────── EVENT SCHEDULE ───────────────────── */
// helper: ตรวจสิทธิ์แก้ไขตารางเวลางานนี้ (ADMIN หรือ ORGANIZE เจ้าของ venue)
async function canManageEventSchedule(tx, user, eventId) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;

  // หา event -> venueId (คือ performerId ของเจ้าของสถานที่)
  const ev = await tx.event.findUnique({
    where: { id: Number(eventId) },
    select: { venueId: true },
  });
  if (!ev) return false;

  // ถ้าเป็น ORGANIZE และเป็นเจ้าของ venue (venueId = user.id) ให้ผ่าน
  return user.role === 'ORGANIZE' && ev.venueId === user.id;
}

// GET schedule
app.get('/events/:id/schedule', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid event id' });

    const schedule = await prisma.eventSchedule.findUnique({
      where: { eventId: id },
      include: { slots: { orderBy: { startAt: 'asc' } } },
    });

    if (!schedule) {
      // คืนโครงเปล่า (FE จะยังโชว์ปุ่มถ้าคุณมีสิทธิ์)
      const ev = await prisma.event.findUnique({
        where: { id },
        select: { id: true, date: true, doorOpenTime: true, endTime: true },
      });
      return res.json({ event: { id: ev?.id, startAt: ev?.date || null, endAt: null }, slots: [] });
    }

    res.json({
      event: { id: schedule.eventId, startAt: schedule.startAt, endAt: schedule.endAt },
      slots: schedule.slots.map(s => ({
        id: s.id,
        stage: s.stage,
        title: s.title,
        artistId: s.artistId,
        artistName: s.artistName,
        startAt: s.startAt,
        endAt: s.endAt,
        note: s.note,
      })),
    });
  } catch (e) {
    console.error('GET /events/:id/schedule error', e);
    res.status(500).json({ error: 'Failed to load schedule' });
  }
});

// POST slot
app.post('/events/:id/schedule/slots', authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) return res.status(400).json({ error: 'Invalid event id' });

    const allowed = await canManageEventSchedule(prisma, req.user, eventId);
    if (!allowed) return res.sendStatus(403);

    const { stage = 'Main', title, artistId, artistName, startAt, endAt, note } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // สร้าง schedule ถ้ายังไม่มี
      const sched = await tx.eventSchedule.upsert({
        where: { eventId },
        update: {},
        create: { eventId, startAt: startAt ? new Date(startAt) : null, endAt: endAt ? new Date(endAt) : null },
      });

      // (optional) ตรวจซ้อนทับใน DB ชั้นที่สอง (กันแข่งกันยิง request)
      const overlap = await tx.eventScheduleSlot.findFirst({
        where: {
          scheduleId: sched.id,
          stage,
          NOT: [
            { endAt: { lte: new Date(startAt) } },
            { startAt: { gte: new Date(endAt) } },
          ],
        },
      });
      if (overlap) throw new Error('ช่วงเวลาซ้อนกับรายการอื่น');

      const slot = await tx.eventScheduleSlot.create({
        data: {
          scheduleId: sched.id,
          stage,
          title: title || null,
          artistId: artistId ?? null,
          artistName: artistName || null,
          startAt: new Date(startAt),
          endAt: new Date(endAt),
          note: note || null,
        },
      });
      return slot;
    });

    res.status(201).json(result);
  } catch (e) {
    console.error('POST /events/:id/schedule/slots error', e);
    res.status(400).json({ error: e.message || 'Create slot failed' });
  }
});

// PATCH slot
app.patch('/events/:id/schedule/slots/:slotId', authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const slotId = Number(req.params.slotId);
    if (!Number.isFinite(eventId) || !Number.isFinite(slotId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const allowed = await canManageEventSchedule(prisma, req.user, eventId);
    if (!allowed) return res.sendStatus(403);

    const { stage, title, artistId, artistName, startAt, endAt, note } = req.body;

    const slot = await prisma.eventScheduleSlot.findUnique({
      where: { id: slotId },
      include: { schedule: true },
    });
    if (!slot || slot.schedule.eventId !== eventId) return res.sendStatus(404);

    const result = await prisma.$transaction(async (tx) => {
      // ตรวจซ้อนทับ
      if (startAt && endAt) {
        const overlap = await tx.eventScheduleSlot.findFirst({
          where: {
            scheduleId: slot.scheduleId,
            stage: stage ?? slot.stage,
            id: { not: slotId },
            NOT: [
              { endAt: { lte: new Date(startAt) } },
              { startAt: { gte: new Date(endAt) } },
            ],
          },
        });
        if (overlap) throw new Error('ช่วงเวลาซ้อนกับรายการอื่น');
      }

      return tx.eventScheduleSlot.update({
        where: { id: slotId },
        data: {
          stage: stage ?? undefined,
          title: title ?? undefined,
          artistId: artistId === undefined ? undefined : (artistId ?? null),
          artistName: artistName ?? undefined,
          startAt: startAt ? new Date(startAt) : undefined,
          endAt: endAt ? new Date(endAt) : undefined,
          note: note ?? undefined,
        },
      });
    });

    res.json(result);
  } catch (e) {
    console.error('PATCH /events/:id/schedule/slots/:slotId error', e);
    res.status(400).json({ error: e.message || 'Update slot failed' });
  }
});

// DELETE slot
app.delete('/events/:id/schedule/slots/:slotId', authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const slotId = Number(req.params.slotId);

    const allowed = await canManageEventSchedule(prisma, req.user, eventId);
    if (!allowed) return res.sendStatus(403);

    const slot = await prisma.eventScheduleSlot.findUnique({
      where: { id: slotId },
      include: { schedule: true },
    });
    if (!slot || slot.schedule.eventId !== eventId) return res.sendStatus(404);

    await prisma.eventScheduleSlot.delete({ where: { id: slotId } });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /events/:id/schedule/slots/:slotId error', e);
    res.status(400).json({ error: 'Delete slot failed' });
  }
});


app.get('/myevents', authMiddleware, async (req, res) => {
  try {
    if (!['ORGANIZE', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const ownerId =
      req.user.role === 'ADMIN' && req.query.venueId
        ? Number(req.query.venueId)
        : req.user.id;

    const events = await prisma.event.findMany({
      where: { venueId: ownerId },
      include: {
        venue: {
          include: {
            performer: { include: { user: true } },
            location: true,
          },
        },
        artistEvents: {
          include: {
            artist: {
              include: {
                performer: { include: { user: true } },
                artistEvents: true,
                artistRecords: true,
              },
            },
          },
        },
        _count: { select: { likedBy: true } },
      },
      orderBy: { date: 'desc' },
    });

    const mapped = events.map(e => ({
      ...e,
      followersCount: e._count?.likedBy ?? 0,
      _ready: summarizeReadiness(e.artistEvents || []),
    }));

    res.json(mapped);
  } catch (err) {
    console.error('GET /myevents error:', err);
    res.status(500).json({ error: 'Could not fetch my events' });
  }
});











/* ───────────────────────────── ARTIST INVITES ─────────── */
app.post('/artist-events/invite', authMiddleware, async (req, res) => {
  try {
    const { artistId, eventId, startTime, endTime, stage } = req.body || {};
    const aid = Number(artistId);
    const eid = Number(eventId);

    if (!Number.isInteger(aid) || !Number.isInteger(eid)) {
      return res.status(400).json({ message: 'artistId/eventId ไม่ถูกต้อง' });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'ต้องมี startTime และ endTime (HH:MM)' });
    }

    const ev = await prisma.event.findUnique({ where: { id: eid } });
    if (!ev) return res.status(404).json({ message: 'ไม่พบอีเวนต์' });

    // สิทธิ์
    if (!(req.user.role === 'ADMIN' || (req.user.role === 'ORGANIZE' && ev.venueId === req.user.id))) {
      return res.sendStatus(403);
    }

    // HH:MM -> Date ของวันงาน
    const h2d = (hhmm) => {
      const m = String(hhmm).match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return null;
      const [y, m0, d] = [ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate()];
      return new Date(y, m0, d, Math.min(23, +m[1]), Math.min(59, +m[2]), 0, 0);
    };
    const startAt = h2d(startTime);
    const endAt = h2d(endTime);
    if (!startAt || !endAt || endAt <= startAt) {
      return res.status(400).json({ message: 'ช่วงเวลาไม่ถูกต้อง' });
    }

    // กันชน
    const overlapped = await prisma.scheduleSlot.findFirst({
      where: {
        eventId: eid,
        NOT: { artistId: aid },
        AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
      },
    });
    if (overlapped) {
      return res.status(409).json({ message: 'ช่วงเวลาชนกับศิลปินคนอื่น' });
    }

    // Upsert ArtistEvent
    const ae = await prisma.artistEvent.upsert({
      where: { artistId_eventId: { artistId: aid, eventId: eid } },
      update: { slotStartAt: startAt, slotEndAt: endAt, slotStage: stage || null, status: 'PENDING' },
      create: {
        artistId: aid,
        eventId: eid,
        status: 'PENDING',
        slotStartAt: startAt,
        slotEndAt: endAt,
        slotStage: stage || null,
      },
    });

    // Upsert ScheduleSlot
    const existed = await prisma.scheduleSlot.findFirst({
      where: { eventId: eid, artistId: aid },
      orderBy: { id: 'asc' },
    });

    const slot = existed
      ? await prisma.scheduleSlot.update({
          where: { id: existed.id },
          data: { startAt, endAt, stage: stage || null, title: null, note: null },
        })
      : await prisma.scheduleSlot.create({
          data: { eventId: eid, artistId: aid, startAt, endAt, stage: stage || null },
        });

    // 🔔 ส่ง noti ถึงศิลปิน (aid = performerId = userId ของศิลปิน)
    try {
      await notify(
        prisma,
        aid,
        'artist_event.invited',
        `คุณถูกเชิญให้แสดงในงาน "${ev.name}" เวลา ${startTime}–${endTime}`,
        { eventId: eid, artistId: aid, startTime, endTime }
      );
    } catch (e) {
      console.error('NOTIFY_INVITE_ERROR', e);
    }

    // 🔔 fanout: แจ้งแฟนคลับศิลปินว่า "ศิลปินที่กดไลค์มีงานใหม่"
    try {
      const followerIds = await getFollowersOfArtist(prisma, aid);
      if (followerIds.length) {
        await fanout(
          prisma,
          followerIds,
          'artist.new_event',
          `ศิลปิน #${aid} มีงานใหม่: ${ev.name}`,
          { eventId: eid, artistId: aid, startTime, endTime }
        );
      }
    } catch (e) {
      console.error('FANOUT_artist.new_event_ERROR', e);
    }

    res.json({ ok: true, artistEvent: ae, scheduleSlot: slot });
  } catch (e) {
    console.error('POST /artist-events/invite failed:', e);
    res.status(500).json({ message: 'Invite failed', error: e?.message || String(e) });
  }
});


app.post('/artist-events/respond', authMiddleware, async (req, res) => {
  try {
    const { artistId, eventId, decision } = req.body;
    const aid = Number(artistId);
    const eid = Number(eventId);

    if (!["ACCEPTED", "DECLINED"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision" });
    }

    // อนุญาตเฉพาะ ARTIST เจ้าของเอง หรือ ADMIN
    if (!(req.user.role === 'ARTIST' || req.user.role === 'ADMIN')) {
      return res.sendStatus(403);
    }
    if (req.user.role !== 'ADMIN' && req.user.id !== aid) {
      return res.status(403).json({ error: 'You can respond only for your own artistId' });
    }

    // อัปเดตสถานะคำเชิญ
    const updated = await prisma.artistEvent.update({
      where: { artistId_eventId: { artistId: aid, eventId: eid } },
      data: { status: decision },
      include: {
        artist: { include: { performer: { include: { user: true } } } },
        event:  { include: { _count: { select: { likedBy: true } } } }
      }
    });

    // ------ แจ้ง organizer ------
    try {
      const ev = await prisma.event.findUnique({
        where: { id: eid },
        select: { id: true, name: true, venueId: true },
      });

      if (ev?.venueId) {
        const type = decision === 'ACCEPTED' ? 'artist_event.accepted' : 'artist_event.declined';
        const msg  = decision === 'ACCEPTED'
          ? `ศิลปิน #${aid} ยืนยันเข้าร่วมงาน "${ev.name}"`
          : `ศิลปิน #${aid} ปฏิเสธคำเชิญงาน "${ev.name}"`;

        await notify(prisma, ev.venueId, type, msg, {
          eventId: ev.id,
          artistId: aid,
          status: decision
        });
      }

      // ------ แจ้งผู้ติดตามอีเวนต์ว่า "งานมีการอัปเดต (ไลน์อัป)" ------
      // ตรงกับสเปค: event.updated — งานเปลี่ยนวัน/เวลา/สถานที่/ไลน์อัป
      const likers = await prisma.likeEvent.findMany({
        where: { eventId: eid },
        select: { userId: true },
      });

      if (likers.length) {
        const lineupMsg = decision === 'ACCEPTED'
          ? `งาน "${ev.name}" อัปเดตไลน์อัป: ศิลปิน #${aid} ตอบรับเข้าร่วม`
          : `งาน "${ev.name}" อัปเดตไลน์อัป: ศิลปิน #${aid} ปฏิเสธ/ถอนตัว`;

        await Promise.all(
          likers.map(({ userId }) =>
            notify(prisma, userId, 'event.updated', lineupMsg, {
              eventId: ev.id,
              change: { type: 'lineup', artistId: aid, status: decision }
            })
          )
        );
      }
    } catch (e) {
      console.error('NOTIFY_RESPOND_ERROR', e);
      // ไม่ทำให้ request ล้ม — การแจ้งเตือนล้มเหลวไม่ควรบล็อกการตอบรับ
    }

    return res.json(updated);
  } catch (err) {
    console.error("Respond error:", err);
    return res.status(500).json({ error: "Could not respond to invite" });
  }
});

app.get('/artist-events/pending/:artistId', authMiddleware, async (req, res) => {
  try {
    const { artistId } = req.params;
    const pending = await prisma.artistEvent.findMany({
      where: { artistId: Number(artistId), status: "PENDING" },
      include: {
        event: true, 
        artist: {
          include: {
            performer: {
              include: { user: true }
            }
          }
        }
      },
    });
    res.json(pending);
  } catch (err) {
    console.error("Get pending invites error:", err);
    res.status(500).json({ error: "Could not fetch pending invites" });
  }
});

app.get('/artist-events/accepted/:artistId', authMiddleware, async (req, res) => {
  try {
    const { artistId } = req.params;
    const pending = await prisma.artistEvent.findMany({
      where: { artistId: Number(artistId), status: "ACCEPTED" },
      include: {
        event: true,
        artist: {
          include: {
            performer: {
              include: { user: true }
            }
          }
        }
      },
    });
    res.json(pending);
  } catch (err) {
    console.error("Get accepted invites error:", err);
    res.status(500).json({ error: "Could not fetch accepted invites" });
  }
});

app.get('/artist-events/declined/:artistId', authMiddleware, async (req, res) => {
  try {
    const { artistId } = req.params;
    const pending = await prisma.artistEvent.findMany({
      where: { artistId: Number(artistId), status: "DECLINED" },
      include: {
        event: true,
        artist: {
          include: {
            performer: {
              include: { user: true }
            }
          }
        }
      },
    });
    res.json(pending);
  } catch (err) {
    console.error("Get declined invites error:", err);
    res.status(500).json({ error: "Could not fetch declined invites" });
  }
});

// Get all artist-event entries for an event(using eventId)
app.get('/artist-events/event/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const id = Number(eventId);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid eventId' });

    const rows = await prisma.artistEvent.findMany({
      where: { eventId: id },
      include: { artist: true, event: true }, // include relations as you did before
      orderBy: { createdAt: 'desc' }, // optional
    });

    res.json(rows);
  } catch (err) {
    console.error('Get artist-events by eventId error:', err);
    res.status(500).json({ error: 'Could not fetch artist-events for this event' });
  }
});

// Get artist-event entries for an event filtered by status (PENDING, ACCEPTED, DECLINED)
app.get('/artist-events/event/:eventId/status/:status', authMiddleware, async (req, res) => {
  try {
    const { eventId, status } = req.params;
    const id = Number(eventId);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid eventId' });

    // Validate status to avoid invalid enum values hitting Prisma
    const allowed = ['PENDING', 'ACCEPTED', 'DECLINED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${allowed.join(', ')}` });
    }

    const rows = await prisma.artistEvent.findMany({
      where: { eventId: id, status },
      include: { artist: true, event: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rows);
  } catch (err) {
    console.error('Get artist-events by eventId & status error:', err);
    res.status(500).json({ error: 'Could not fetch filtered artist-events' });
  }
});


/* ───────────────────────────── ROLE REQUESTS ───────────────────────────── */

app.post('/role-requests', authMiddleware, async (req, res) => {
  try {
    const { role, reason } = req.body;
    if (!ALLOW_REQUEST_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid requested role' });
    }

    const exist = await prisma.roleRequest.findFirst({
      where: { userId: req.user.id, status: 'PENDING' },
    });
    if (exist) return res.status(400).json({ error: 'You already have a pending request' });

    const rr = await prisma.roleRequest.create({
      data: { userId: req.user.id, requestedRole: role, reason: reason || null },
    });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    await Promise.all(
      admins.map((a) =>
        notify(
          prisma,
          a.id,
          'role_request.new',
          `New role request: ${req.user.email} -> ${role}`,
          { roleRequestId: rr.id }
        )
      )
    );

    res.json(rr);
  } catch (e) {
    console.error('CREATE_ROLE_REQUEST_ERROR', e);
    res.status(400).json({ error: 'Create role request failed' });
  }
});

app.get('/role-requests', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const list = await prisma.roleRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
    res.json(list);
  } catch (e) {
    console.error('LIST_ROLE_REQUEST_ERROR', e);
    res.status(400).json({ error: 'Fetch role requests failed' });
  }
});

/*  อนุมัติ ARTIST: สร้าง/อัปเดต ArtistProfile จาก application */
app.post('/role-requests/:id/approve', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { note } = req.body;

    const rr = await prisma.roleRequest.findUnique({ where: { id } });
    if (!rr || rr.status !== 'PENDING') {
      return res.status(404).json({ error: 'Request not found' });
    }

    await prisma.$transaction(async (tx) => {
      if (rr.requestedRole === 'ARTIST' && rr.application) {
        const appData = rr.application; // JSON ที่แนบจาก AccountSetup

        // ---- user (ตาราง User) ----
        const userData = {
          name: (appData.name || '').trim() || 'Untitled',
          profilePhotoUrl: appData.profilePhotoUrl || null,
        };

        // ---- performer ---- (ช่องทางติดต่อ + โซเชียล)
        const performerData = {
          contactEmail: appData.contactEmail || null,
          contactPhone: appData.contactPhone || null,
          youtubeUrl: appData.youtubeUrl || null,
          tiktokUrl: appData.tiktokUrl || null,
          facebookUrl: appData.facebookUrl || null,
          instagramUrl: appData.instagramUrl || null,
          lineUrl: appData.lineUrl || null,
          twitterUrl: appData.twitterUrl || null,
          userId: rr.userId,
        };

        // ---- artist ---- (อย่าใส่ photo/video ที่นี่ตามที่ขอ)
        const artistData = {
          description: appData.description || null,
          genre: appData.genre || 'Pop',
          subGenre: appData.subGenre || null,
          bookingType: appData.bookingType || 'FULL_BAND',
          foundingYear: appData.foundingYear ?? null,
          label: appData.label || null,
          isIndependent: appData.isIndependent !== false,
          memberCount: appData.memberCount ?? null,
          priceMin: appData.priceMin ?? null,
          priceMax: appData.priceMax ?? null,

          rateCardUrl: appData.rateCardUrl || null,
          epkUrl: appData.epkUrl || null,
          riderUrl: appData.riderUrl || null,

          spotifyUrl: appData.spotifyUrl || null,
          appleMusicUrl: appData.appleMusicUrl || null,
          soundcloudUrl: appData.soundcloudUrl || null,
          shazamUrl: appData.shazamUrl || null,
          bandcampUrl: appData.bandcampUrl || null,

          performerId: rr.userId,
        };

        // อัปเดต User ก่อน
        await tx.user.update({
          where: { id: rr.userId },
          data: userData,
        });

        // upsert performer / artist
        const exists = await tx.artist.findUnique({
          where: { performerId: rr.userId },
        });

        if (exists) {
          await tx.performer.update({
            where: { userId: rr.userId },
            data: performerData,
          });
          await tx.artist.update({
            where: { performerId: rr.userId },
            data: artistData,
          });
        } else {
          await tx.performer.create({ data: performerData });
          await tx.artist.create({ data: artistData });
        }

        // ✅ ถ้ามีสื่อจากใบสมัคร → สร้าง ArtistRecord (เก็บ photo/video ไว้ที่นี่)
        const photos = [];
        const videos = [];
        if (appData.photoUrl) photos.push(appData.photoUrl);
        if (appData.videoUrl) videos.push(appData.videoUrl);

        // เผื่อในอนาคตส่งมาเป็นอาร์เรย์ก็รองรับ
        if (Array.isArray(appData.photoUrls)) photos.push(...appData.photoUrls.filter(Boolean));
        if (Array.isArray(appData.videoUrls)) videos.push(...appData.videoUrls.filter(Boolean));

        if (photos.length || videos.length) {
          await tx.artistRecord.create({
            data: {
              artistId: rr.userId,                 // อ้าง performerId
              title: appData.name ? `${appData.name} - Media` : 'Application Media',
              description: appData.description || null,
              thumbnailUrl: photos[0] || null,
              photoUrls: photos,
              videoUrls: videos,
              date: new Date(),                    // ตีตราเวลาที่อนุมัติ
              source: 'application',
            },
          });
        }
      }

      // ปิดคำขอ + อัปเดต role เป็น ARTIST
      await tx.roleRequest.update({
        where: { id: rr.id },
        data: {
          status: 'APPROVED',
          reviewedById: req.user.id,
          reviewNote: note || null,
          reviewedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: rr.userId },
        data: { role: rr.requestedRole },
      });

      await notify(
        tx,
        rr.userId,
        'role_request.approved',
        `Your role was approved: ${rr.requestedRole}`,
        { roleRequestId: rr.id }
      );
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('APPROVE_ROLE_REQUEST_ERROR', e);
    res.status(400).json({ error: 'Approve failed' });
  }
});



app.post('/role-requests/:id/reject', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { note } = req.body;

    const rr = await prisma.roleRequest.findUnique({ where: { id } });
    if (!rr || rr.status !== 'PENDING') return res.status(404).json({ error: 'Request not found' });

    await prisma.roleRequest.update({
      where: { id: rr.id },
      data: {
        status: 'REJECTED',
        reviewedById: req.user.id,
        reviewNote: note || null,
        reviewedAt: new Date(),
      },
    });

    await notify(
      prisma,
      rr.userId,
      'role_request.rejected',
      `Your role request was rejected`,
      { roleRequestId: rr.id, note }
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('REJECT_ROLE_REQUEST_ERROR', e);
    res.status(400).json({ error: 'Reject failed' });
  }
});


/*  แอดมินดูรายละเอียดคำขอ จาก application ที่แนบใน RoleRequest */
app.get('/role-requests/:id/detail', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const request = await prisma.roleRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
    if (!request) return res.sendStatus(404);

    let application = null;
    if (request.requestedRole === 'ARTIST') {
      application = { artist: request.application || null };
    }
    res.json({ request, application });
  } catch (e) {
    console.error('GET /role-requests/:id/detail error', e);
    res.status(500).json({ error: 'Failed to load request detail' });
  }
});


/* fallback details */
app.get('/role-requests/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const request = await prisma.roleRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
    if (!request) return res.sendStatus(404);
    res.json({ request });
  } catch (e) {
    console.error('GET /role-requests/:id error', e);
    res.status(500).json({ error: 'Failed to load request' });
  }
});

/* ───────────────────────────── NOTIFICATIONS ───────────────────────────── */

// GET /notifications?unread=1  → ถ้า unread=1 จะกรองเฉพาะที่ยังไม่อ่าน
app.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const where = { userId: req.user.id };
    if (String(req.query.unread) === '1') where.isRead = false;

    const list = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json(list);
  } catch (e) {
    console.error('GET_NOTIFICATIONS_ERROR', e);
    res.status(400).json({ error: 'Fetch notifications failed' });
  }
});

// POST /notifications/:id/read → มาร์คอ่านรายการเดียว
app.post('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: Number(req.params.id) },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('MARK_READ_NOTIFICATION_ERROR', e);
    res.status(400).json({ error: 'Mark read failed' });
  }
});

// (ทางเลือก) POST /notifications/read_all → มาร์คอ่านทั้งหมดของผู้ใช้
app.post('/notifications/read_all', authMiddleware, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('MARK_ALL_READ_NOTIFICATION_ERROR', e);
    res.status(400).json({ error: 'Mark all read failed' });
  }
});

// (ทางเลือก) GET /notifications/unread_count → จำนวนที่ยังไม่อ่าน
app.get('/notifications/unread_count', authMiddleware, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ count });
  } catch (e) {
    console.error('UNREAD_COUNT_ERROR', e);
    res.status(400).json({ error: 'Get count failed' });
  }
});

/* ───────────── ONBOARDING / EDIT PROFILE ───────────── */
/*  รับ artistApplication + desiredRole และเก็บลง RoleRequest.application */
// ---------- REPLACE: /me/setup ----------
app.post('/me/setup', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      favoriteGenres,
      profileImageUrl,
      birthday,
      desiredRole,          // 'ARTIST' หรือ undefined
      artistApplication,    // ฟอร์มศิลปินเต็มจาก FE (จะเก็บลง RoleRequest.application)
    } = req.body;

    // normalize favoriteGenres -> string[]
    const genres = Array.isArray(favoriteGenres)
      ? favoriteGenres.map(String).map(s => s.trim()).filter(Boolean)
      : typeof favoriteGenres === 'string'
        ? favoriteGenres.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    // update เฉพาะฟิลด์ที่มีจริงใน UserProfile
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name ?? null,
        favoriteGenres: genres,
        profilePhotoUrl: profileImageUrl ?? null,
        birthday: birthday ? new Date(birthday) : null,
      },
    });

    // อัปเกรดบทบาท: ให้ "ยื่นขอ" ได้เฉพาะ ARTIST เท่านั้น
    // ORGANIZE ต้องให้แอดมินกำหนดเอง
    let createdRoleRequest = null;
    let organizeRequestIgnored = false;

    if (desiredRole === 'ORGANIZE') {
      // ตอนนี้ยังไม่รองรับยื่น ORGANIZE จากหน้านี้
      organizeRequestIgnored = true;
    }

    if (desiredRole === 'ARTIST') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id } });

      // ถ้าเป็น ARTIST/ADMIN อยู่แล้ว ไม่ต้องยื่น
      if (me.role !== 'ARTIST' && me.role !== 'ADMIN') {
        const pending = await prisma.roleRequest.findFirst({
          where: { userId: req.user.id, status: 'PENDING' },
        });

        if (!pending) {
          // สร้างคำขอใหม่ + แนบใบสมัครลง JSON
          createdRoleRequest = await prisma.roleRequest.create({
            data: {
              userId: req.user.id,
              requestedRole: 'ARTIST',
              reason: 'Requested via account setup',
              application: artistApplication || null,
            },
          });

          // แจ้งเตือนแอดมิน
          const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
          await Promise.all(
            admins.map((a) =>
              prisma.notification.create({
                data: {
                  userId: a.id,
                  type: 'role_request.new',
                  message: `New role request: ${me.email} -> ARTIST`,
                  data: { roleRequestId: createdRoleRequest.id },
                },
              })
            )
          );
        } else {
          // มี pending อยู่แล้ว → อัปเดต application ให้เป็นเวอร์ชันล่าสุด
          await prisma.roleRequest.update({
            where: { id: pending.id },
            data: { application: artistApplication || pending.application || null },
          });
        }
      }
    }

    res.json({
      ok: true,
      createdRoleRequest: Boolean(createdRoleRequest),
      organizeRequestIgnored,
    });
  } catch (e) {
    console.error('POST /me/setup error', e);
    res.status(400).json({ error: 'Save profile failed' });
  }
});


app.patch('/me/profile', authMiddleware, async (req, res) => {
  try {
    const { name, favoriteGenres, profileImageUrl, birthday } = req.body;
    const genres = Array.isArray(favoriteGenres)
      ? favoriteGenres.map(String).map(s => s.trim()).filter(Boolean)
      : typeof favoriteGenres === 'string'
        ? favoriteGenres.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name ?? null,
        favoriteGenres: genres,
        profilePhotoUrl: profileImageUrl ?? null, // ใช้ชื่อเดียวกับจุดอื่น
        birthday: birthday ? new Date(birthday) : null,
      },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('PATCH /me/profile error', e);
    res.status(400).json({ error: 'Update profile failed' });
  }
});


// ---------- LIKE / UNLIKE ARTIST ----------
app.post('/artists/:id/like', authMiddleware, async (req, res) => {
  try {
    const artistId = Number(req.params.id); // performerId ของศิลปิน
    const userId = req.user.id;

    const exists = await prisma.artist.findUnique({ where: { performerId: artistId } });
    if (!exists) return res.status(404).json({ error: 'Artist not found' });

    // [LIKES] ใช้ upsert กับคีย์คอมโพสิต userId_performerId ให้ตรงสคีมา
    await prisma.likePerformer.upsert({
      where: { userId_performerId: { userId, performerId: artistId } },
      create: { userId, performerId: artistId },
      update: {},
    });

    const count = await prisma.likePerformer.count({ where: { performerId: artistId } });
    res.json({ liked: true, count });
  } catch (e) {
    console.error('POST /artists/:id/like error', e);
    res.status(500).json({ error: 'Like failed' });
  }
});

app.delete('/artists/:id/like', authMiddleware, async (req, res) => {
  try {
    const artistId = Number(req.params.id); // performerId ของศิลปิน
    const userId = req.user.id;

    // [LIKES] ลบโดยใช้คีย์คอมโพสิตที่ถูกต้อง
    await prisma.likePerformer.delete({
      where: { userId_performerId: { userId, performerId: artistId } },
    }).catch(() => { /* ไม่มีอยู่ก็ไม่เป็นไร */ });

    const count = await prisma.likePerformer.count({ where: { performerId: artistId } });
    res.json({ liked: false, count });
  } catch (e) {
    console.error('DELETE /artists/:id/like error', e);
    res.status(500).json({ error: 'Unlike failed' });
  }
});


// ---------- LIKE / UNLIKE EVENT ----------
app.post('/events/:id/like', authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const userId = req.user.id;

    const exists = await prisma.event.findUnique({ where: { id: eventId } });
    if (!exists) return res.status(404).json({ error: 'Event not found' });

    await prisma.likeEvent.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId },
      update: {},
    });

    const count = await prisma.likeEvent.count({ where: { eventId } });
    res.json({ liked: true, count });
  } catch (e) {
    console.error('POST /events/:id/like error', e);
    res.status(500).json({ error: 'Like event failed' });
  }
});

app.delete('/events/:id/like', authMiddleware, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const userId = req.user.id;

    await prisma.likeEvent.delete({
      where: { userId_eventId: { userId, eventId } },
    }).catch(() => {});

    const count = await prisma.likeEvent.count({ where: { eventId } });
    res.json({ liked: false, count });
  } catch (e) {
    console.error('DELETE /events/:id/like error', e);
    res.status(500).json({ error: 'Unlike event failed' });
  }
});


/* ───────────────────────────── bucket from supabase ───────────────────────────── */

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const caption = req.body.caption || '';
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = `${Date.now()}-${file.originalname}`;
    const bucketName = 'project-se-file-server';
    const filePath = `user-uploads/${fileName}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Get public URL
    const { data: publicData, error: publicError } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (publicError) {
      console.error('Supabase public URL error:', publicError);
      return res.status(500).json({ error: publicError.message });
    }

    res.json({ url: publicData.publicUrl, caption });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});


/* ───────────────────────────── HEALTH ───────────────────────────── */
app.get('/', (_req, res) => res.send('🎵 API is up!'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
