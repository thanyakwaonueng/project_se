// backend/index.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SECRET = process.env.JWT_SECRET || 'your_secret_key';

const express = require('express');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

const { requireRole } = require('./authz');

const app = express();
app.use(express.json());
app.use(cookieParser());
const port = process.env.PORT || 4000;

/* ───────────────────────────── AUTH MIDDLEWARE ───────────────────────────── */
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (err) {
    console.error(err);
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

    // ✅ Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: false, // production: true + SameSite=None + HTTPS
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

app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        artistProfile: true,
        venueProfile: true,
      },
    });
    if (!me) return res.sendStatus(404);
    res.json(me);
  } catch (err) {
    console.error('AUTH_ME_ERROR', err);
    res.status(500).json({ error: 'Failed to load current user' });
  }
});

/*------------Function for checking email by using Regex-----------*/ 
function validateEmail(email) {
  const regex = //Regex สำหรับเช็ค email
   /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  return regex.test(email);
}

/* ───────────────────────────── USERS ───────────────────────────── */
app.post('/users', async (req, res) => {
  try {
    
    const { email, password, role } = req.body;

    const user_db = await prisma.user.findUnique({where: {email: email},})
    const passwordHash = await bcrypt.hash(password, 10);

    //Password check
    if(!password || password.length < 6){ //Password สั้นเกินไป
      return res.status(400).json({error: "Password ต้องมีอย่างน้อย 6 ตัวอักษรขึ้นไป!"})
    }
    
    //Email and User check
    if(user_db){ //User already exist! can't sign up
      return res.status(400).json({error: "This User is already exist!"})
    } else if(!validateEmail(email)){  
      return res.status(400).json({error: "Invalid email!"})
    }else{ //New User
      const user = await prisma.user.create({ data: { email, passwordHash, role } });
      return res.status(201).json(user);
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.get('/users', authMiddleware, async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { artistProfile: true, venueProfile: true },
  });
  res.json(users);
});

app.get('/users/:id', async (req, res) => {
  const id = +req.params.id;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { artistProfile: true, venueProfile: true },
  });
  user ? res.json(user) : res.status(404).send('User not found');
});

/* ───────────────────────────── ARTISTS (POST = upsert by userId) ────────── */
app.post('/artists', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    // Check if profile already exists for this user
    const existing = await prisma.artistProfile.findUnique({ where: { userId } });

    if (existing) {
      // Update existing profile
      const updated = await prisma.artistProfile.update({
        where: { userId },
        data,
      });
      return res.json(updated);
    }

    // Create new profile
    const artist = await prisma.artistProfile.create({
      data: {
        ...data,
        user: { connect: { id: userId } },
      },
    });

    res.status(201).json(artist);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create/update artist' });
  }
});

app.get('/artists', async (req, res) => {
  try {
    const artists = await prisma.artistProfile.findMany({ include: { user: true, events: true } });
    res.json(artists);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch artists' });
  }
});

app.get('/artists/:id', async (req, res) => {
  const id = +req.params.id;
  const artist = await prisma.artistProfile.findUnique({
    where: { id },
    include: { user: true, events: true },
  });
  artist ? res.json(artist) : res.status(404).send('Artist not found');
});

app.get("/groups", async (req, res) => {
  try {
    // fetch artists and their artistEvents -> event -> venue
    const artists = await prisma.artistProfile.findMany({
      include: {
        artistEvents: {
          include: {
            event: {
              include: { venue: true }
            }
          }
        }
      }
    });

    const groups = artists.map(a => {
      // build schedule from the join rows (artistEvents)
      const schedule = (Array.isArray(a.artistEvents) ? a.artistEvents : [])
        .map(ae => {
          const e = ae.event;
          if (!e) return null; // defensive: if join row exists but event missing
          return {
            id: e.id,
            dateISO: e.date.toISOString(),
            title: e.name,
            venue: e.venue?.name ?? "",
            city: e.venue?.locationUrl ? "" : "", // replace with logic if you store city separately
            ticketUrl: e.ticketLink ?? "#",
            // optionally include metadata from the join model (role, order, fee, etc.)
            performanceRole: ae.role ?? null,
            performanceOrder: ae.order ?? null,
            performanceFee: ae.fee ?? null
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));

      return {
        id: a.id,
        slug: a.name.toLowerCase().replace(/\s+/g, "-"),
        name: a.name,
        //image: a.profilePhotoUrl ?? "/img/default.jpg",
        image: a.profilePhotoUrl ?? "https://i.pinimg.com/736x/a7/39/8a/a7398a0e0e0d469d6314df8b73f228a2.jpg",
        description: a.description ?? "",
        details: a.genre ?? "",
        stats: {
          members: a.memberCount ?? 1,
          debut: a.foundingYear ? String(a.foundingYear) : "N/A",
          followers: "N/A"
        },
        followersCount: 0,
        artists: [],

        socials: {
          instagram: a.instagramUrl,
          youtube: a.youtubeUrl,
          spotify: a.spotifyUrl
        },

        schedule, // mapped and sorted

        techRider: {
          summary: "", // add fields in schema if you want real data
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
    const userId = req.user.id;
    const data = req.body;

    // Check if profile already exists for this user
    const existing = await prisma.venueProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      // Update existing profile
      const updated = await prisma.venueProfile.update({
        where: { userId },
        data,
      });
      return res.json(updated);
    }

    // Create new profile
    const venue = await prisma.venueProfile.create({
      data: {
        ...data,
        user: { connect: { id: userId } },
      },
    });

    res.status(201).json(venue);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create/update venue' });
  }
});

app.get('/venues', async (_req, res) => {
  const venues = await prisma.venueProfile.findMany({
    include: { user: true, events: true },
  });
  res.json(venues);
});

app.get('/venues/:id', async (req, res) => {
  const id = +req.params.id;
  const venue = await prisma.venueProfile.findUnique({
    where: { id },
    include: { user: true, events: true },
  });
  venue ? res.json(venue) : res.status(404).send('Venue not found');
});

/* ───────────────────────────── EVENTS (POST create or update if id) ───────
   - ถ้ามี body.id → update (ต้องเป็นของ venue ตัวเอง เว้นแต่ ADMIN)
   - ถ้าไม่มี id → create (ต้องสร้างใน venue ที่เป็นของตัวเอง เว้นแต่ ADMIN)
*/

/* ───────────────────────────── EVENTS ─────────── */
app.post('/events', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    //make sure this user has venue profile
    const venue = await prisma.venueProfile.findUnique({
      where: { userId },
    });

    if(!venue){
        return res.status(400).json({ error: "Venue profile not found for this user" });
    }

    let event;

    if(data.id){ //event already exist -> check credential -> then do update if user own this event

      //check if event exists and belongs to this user(venue, admin, sp-admin)
      const existing = await prisma.event.findUnique({
        where: { id: data.id },
      });

      if(existing && existing.venueId === venue.id){
        //update existing
        event = await prisma.event.update({
          where: {id: data.id},
          data,
        });
      } else { 
        // create new (ignore the passed id to prevent conflict) 
        const { id, ...createData } = data;
        event = await prisma.event.create({
          data: {
            ...createData, 
            venue: { connect: { id: venue.id } },
          },
        });
      }
    } else {
      // no id provided -> always create
      event = await prisma.event.create({
        data: {
          ...data,
          venue: { connect: { id: venue.id} },
        },
      });
    }

    return res.json(event);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create/update event' });
  }
});

/* ───────────────────────────── EVENTS (GET all) ─────────── */
app.get('/events', async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        venue: true,
        artistEvents: {
          include: { artist: true },
        },
      },
    });
    res.json(events);
  } catch (err) {
    console.error('GET /events error:', err);
    res.status(500).json({ error: 'Could not fetch events' });
  }
});

/* ───────────────────────────── EVENT (GET by id) ─────────── */
app.get('/events/:id', async (req, res) => {
  try {
    const id = +req.params.id;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
        artistEvents: {
          include: { artist: true },
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


/* ───────────────────────────── VENUE SENDS INVITE TO ARTIST ─────────── */

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

/* ───────────────────────────── ARTIST RESPONDS TO INVITE(APPROVE/DECLINE) ─────────── */

app.post('/artist-events/respond', authMiddleware, async (req, res) => {
  try {
    const { artistId, eventId, decision } = req.body; // decision: "ACCEPTED" or "DECLINED"

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

/* ───────────────────────────── GET PENDING INVITES FOR AN ARTIST ─────────── */

app.get('/artist-events/pending/:artistId', authMiddleware, async (req, res) => {
  try {
    const { artistId } = req.params;
    const pending = await prisma.artistEvent.findMany({
      where: { artistId: Number(artistId), status: "PENDING" },
      include: { event: true, artist: true },
    });
    res.json(pending);
  } catch (err) {
    console.error("Get pending invites error:", err);
    res.status(500).json({ error: "Could not fetch pending invites" });
  }
});


/* ───────────────────────────── HEALTH ───────────────────────────── */
app.get('/', (_req, res) => res.send('🎵 API is up!'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
