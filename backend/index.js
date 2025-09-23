const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SECRET = process.env.JWT_SECRET || 'your_secret_key';
require('dotenv').config({path:'.env.dev'}) //อ่านข้อมูลใน .env.dev

const express = require('express');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer')
const { OAuth2Client } = require('google-auth-library')
//const { requireRole } = require('./authz');

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

async function notify(client, userId, type, message, data = null) {
  return client.notification.create({
    data: { userId, type, message, data },
  });
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
      from: `"Chiang Mai Original website" <no-reply@myapp.com`,
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


app.get("/groups", async (req, res) => {
  try {
    let meId = null;
    try {
      await authMiddleware(req, res, () => { });
      meId = req.user?.id ?? null;
    } catch { }

    const artists = await prisma.artist.findMany({
      include: {
        performer: {
          include: {
            user: true,
            likedBy: meId
              ? {
                where: { userId: meId },
                select: { userId: true },
                take: 1,
              }
              : false,
          },
        },
        artistEvents: {
          include: {
            event: {
              include: {
                venue: {
                  include: {
                    performer: {
                      include: {
                        user: true,
                      },
                    },
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

      const schedule = (Array.isArray(a.artistEvents) ? a.artistEvents : [])
        .map((ae) => {
          const e = ae.event;
          if (!e) return null;

          const venue = e.venue;
          const venueName =
            venue?.performer?.user?.name ?? "Unknown Venue";

          return {
            id: e.id,
            dateISO: e.date.toISOString(),
            title: e.name,
            venue: venueName,
            city: venue?.venueLocation?.locationUrl ? "" : "",
            ticketUrl: e.ticketLink ?? "#",
            performanceRole: ae.role ?? null,
            performanceOrder: ae.order ?? null,
            performanceFee: ae.fee ?? null,
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));

      return {
        id: a.performerId,
        slug:
          (a.performer?.user?.name ?? "unknown")
            .toLowerCase()
            .replace(/\s+/g, "-") || `artist-${a.performerId}`,
        name: a.performer?.user?.name ?? "Unnamed Artist",
        image:
          a.performer?.user?.profilePhotoUrl ??
          "https://i.pinimg.com/736x/a7/39/8a/a7398a0e0e0d469d6314df8b73f228a2.jpg",
        description: a.description ?? "",
        details: a.genre ?? "",
        stats: {
          members: a.memberCount ?? 1,
          debut: a.foundingYear ? String(a.foundingYear) : "N/A",
          followers: "N/A",
        },
        followersCount: a._count?.performer?.likedBy ?? 0,
        likedByMe: !!(a.performer.likedBy && a.performer.likedBy.length),
        socials: {
          instagram: a.performer.instagramUrl,
          youtube: a.performer.youtubeUrl,
          tiktok: a.performer.tiktokUrl,
          facebook: a.performer.facebookUrl,
          spotify: a.spotifyUrl || null,
          line: a.performer.lineUrl,
        },
        schedule,

        techRider: {
          summary: "",
          items: [],
          downloadUrl: a.riderUrl ?? ""
        },

        playlistEmbedUrl: a.spotifyUrl
          ? a.spotifyUrl.replace("open.spotify.com/artist", "open.spotify.com/embed/artist")
          : null
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

app.get('/venues/:id', async (req, res) => {
  const id = +req.params.id;
  const venue = await prisma.venue.findUnique({
    where: { performerId: id },
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
  venue ? res.json(venue) : res.status(404).send('Venue not found');
});


/* ───────────────────────────── EVENTS ─────────── */
app.post('/events', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    const venue = await prisma.venue.findUnique({
      where: { performerId: userId },
      include: {
        performer: {
          include: {
            user: true
          }
        },
        location: true,
      },
    });

    if (!venue) {
      return res.status(400).json({ error: "Venue profile not found for this user" });
    }

    let event;

    if (data.id) {

      const existing = await prisma.event.findUnique({
        where: { id: data.id },
      });

      if (existing && existing.venueId === venue.performerId) {
        event = await prisma.event.update({
          where: { id: data.id },
          data,
        });
      } else {
        const { id, ...createData } = data;
        event = await prisma.event.create({
          data: {
            ...createData,
            venue: { connect: { performerId: venue.performerId } },
          },
        });
      }
    } else {
      event = await prisma.event.create({
        data: {
          ...data,
          venue: { connect: { performerId: venue.performerId } },
        },
      });
    }

    return res.json(event);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create/update event' });
  }
});

app.get('/events', async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        venue: {
          include: {
            performer: {
              include: { user: true }
            },
            location: true,
          }
        },
        artistEvents: {
          include: {
            artist: {
              include: {
                performer: {
                  include: { user: true }
                },
                artistEvents: true,
                artistRecords: true,
              }

            }
          },
        },
      },
    });
    res.json(events);
  } catch (err) {
    console.error('GET /events error:', err);
    res.status(500).json({ error: 'Could not fetch events' });
  }
});

app.get('/events/:id', async (req, res) => {
  try {
    const id = +req.params.id;
    const event = await prisma.event.findUnique({
      where: { id: id },
      include: {
        venue: {
          include: {
            performer: {
              include: { user: true }
            },
            location: true,
          }
        },
        artistEvents: {
          include: {
            artist: {
              include: {
                performer: {
                  include: { user: true }
                },
                artistEvents: true,
                artistRecords: true,
              }
            }
          },
        },
      },
    });

    event
      ? res.json(event)
      : res.status(404).send('Event not found');
  } catch (err) {
    console.error('GET /events/:id error:', err);
    res.status(500).json({ error: 'Could not fetch event' });
  }
});

/* ───────────────────────────── ARTIST INVITES ─────────── */
app.post('/artist-events/invite', authMiddleware, async (req, res) => {
  try {
    const { artistId, eventId, ...rest } = req.body;

    const invite = await prisma.artistEvent.upsert({
      where: { artistId_eventId: { artistId, eventId } },
      update: { ...rest, status: "PENDING" },
      create: { artistId, eventId, ...rest, status: "PENDING" },
    });

    res.status(201).json(invite);
  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({ error: "Could not send invite" });
  }
});

app.post('/artist-events/respond', authMiddleware, async (req, res) => {
  try {
    const { artistId, eventId, decision } = req.body;

    if (!["ACCEPTED", "DECLINED"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision" });
    }

    const updated = await prisma.artistEvent.update({
      where: { artistId_eventId: { artistId, eventId } },
      data: { status: decision },
    });

    res.json(updated);
  } catch (err) {
    console.error("Respond error:", err);
    res.status(500).json({ error: "Could not respond to invite" });
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
    if (!rr || rr.status !== 'PENDING') return res.status(404).json({ error: 'Request not found' });

    await prisma.$transaction(async (tx) => {
      // ถ้าขอเป็น ARTIST และมี application -> สร้าง/อัปเดต ArtistProfile
      if (rr.requestedRole === 'ARTIST' && rr.application) {
        const js = rr.application; // JSON from AccountSetup

        const userData = {
          name: js.name?.trim() || 'Untitled',
          profilePhotoUrl: js.profilePhotoUrl || null,
          id: rr.userId,
        };

        const performerData = {
          contactEmail: a.contactEmail || null,
          contactPhone: a.contactPhone || null,
          spotifyUrl: a.spotifyUrl || null,
          youtubeUrl: a.youtubeUrl || null,
          facebookUrl: a.facebookUrl || null,
          instagramUrl: a.instagramUrl || null,
          tiktokUrl: a.tiktokUrl || null,
          twitterUrl: a.twitterUrl || null,
          userId: rr.userId,
        };

        const artistData = {
          description: a.description || null,
          genre: a.genre || 'Pop',
          subGenre: a.subGenre || null,
          bookingType: a.bookingType || 'FULL_BAND',
          foundingYear: a.foundingYear ?? null,
          label: a.label || null,
          isIndependent: a.isIndependent !== false,
          memberCount: a.memberCount ?? null,
          priceMin: a.priceMin ?? null,
          priceMax: a.priceMax ?? null,
          rateCardUrl: a.rateCardUrl || null,
          epkUrl: a.epkUrl || null,
          riderUrl: a.riderUrl || null,
          spotifyUrl: a.spotifyUrl || null,
          appleMusicUrl: a.appleMusicUrl || null,
          soundcloudUrl: a.soundcloudUrl || null,
          shazamUrl: a.shazamUrl || null,
          bandcampUrl: a.bandcampUrl || null,
          performerId: rr.userId,
        };

        const exists = await tx.artistProfile.findUnique({ where: { performerId: rr.userId } });
        if (exists) {
          await tx.user.update({ where: { performerId: rr.userId }, data: userData });
          await tx.performer.update({ where: { performerId: rr.userId }, data: performerData });
          await tx.artist.update({ where: { performerId: rr.userId }, data: artistData });
        } else {
          await tx.performer.create({ data: performerData });
          await tx.artist.create({ data: artistData });
        }
      }
      await tx.roleRequest.update({
        where: { id: rr.id },
        data: {
          status: 'APPROVED',
          reviewedById: req.user.id,
          reviewNote: note || null,
          reviewedAt: new Date(),
        },
      });

      await tx.user.update({ where: { id: rr.userId }, data: { role: rr.requestedRole } });

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


/* ───────────── ONBOARDING / EDIT PROFILE ───────────── */
/* ✅ รับ artistApplication + desiredRole และเก็บลง RoleRequest.application */
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
    let venueequestIgnored = false;

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
      venueequestIgnored,
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

    await prisma.user.upsert({
      where: { userId: req.user.id },
      update: {
        name: name ?? null,
        favoriteGenres: genres,
        profileImageUrl: profileImageUrl ?? null,
        birthday: birthday ? new Date(birthday) : null,
      },
      create: {
        userId: req.user.id,
        name: name ?? null,
        favoriteGenres: genres,
        profileImageUrl: profileImageUrl ?? null,
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
    const artistId = Number(req.params.id);
    const userId = req.user.id;

    const exists = await prisma.artist.findUnique({ where: { performerId: artistId } });
    if (!exists) return res.status(404).json({ error: 'Artist not found' });

    await prisma.likePerformer.create({
      data: { userId, artistId },
    }).catch(() => { });

    const count = await prisma.likePerformer.count({ where: { performerId: artistId } });
    res.json({ liked: true, count });
  } catch (e) {
    console.error('POST /artists/:id/like error', e);
    res.status(500).json({ error: 'Like failed' });
  }
});

app.delete('/artists/:id/like', authMiddleware, async (req, res) => {
  try {
    const artistId = Number(req.params.id);
    const userId = req.user.id;

    await prisma.likePerformer.delete({
      where: { userId_artistId: { userId, artistId } },
    }).catch(() => { });

    const count = await prisma.likePerformer.count({ where: {performerId: artistId } });
    res.json({ liked: false, count });
  } catch (e) {
    console.error('DELETE /artists/:id/like error', e);
    res.status(500).json({ error: 'Unlike failed' });
  }
});

/* ───────────────────────────── HEALTH ───────────────────────────── */
app.get('/', (_req, res) => res.send('🎵 API is up!'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
