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
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    console.error(err);
    return res.sendStatus(403);
  }
}

/* ───────────────────────────── META ENUMS (for dropdowns) ───────────────── */
async function fetchEnum(typeName) {
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT e.enumlabel AS val
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE lower(t.typname) = $1
    ORDER BY e.enumsortorder
  `,
    typeName.toLowerCase()
  );
  return Array.isArray(rows) ? rows.map((r) => String(r.val)) : [];
}

app.get('/meta/enums', async (_req, res) => {
  try {
    const [
      roles,
      bookingTypes,
      eventTypes,
      ticketingTypes,
      alcoholPolicies,
      priceRates,
    ] = await Promise.all([
      fetchEnum('UserRole'),
      fetchEnum('BookingType'),
      fetchEnum('EventType'),
      fetchEnum('TicketingType'),
      fetchEnum('AlcoholPolicy'),
      fetchEnum('PriceRate'),
    ]);
    res.json({
      roles,
      bookingTypes,
      eventTypes,
      ticketingTypes,
      alcoholPolicies,
      priceRates,
    });
  } catch (e) {
    console.error('ENUMS_ERROR', e);
    res.status(500).json({ error: 'Failed to load enums' });
  }
});

/* ───────────────────────────── AUTH ROUTES ───────────────────────────── */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1d' });

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

/* ───────────────────────────── USERS ───────────────────────────── */
app.post('/users', async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const passwordHash = await bcrypt.hash(password, 10);

    // 🔧 normalize เฉพาะตัวพิมพ์ (ยังคงให้ DB ตรวจ enum)
    const roleNorm =
      typeof role === 'string' && role.trim()
        ? role.trim().toUpperCase()
        : undefined;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        ...(roleNorm ? { role: roleNorm } : {}), // ถ้าไม่มี role → ให้ DB ใส่ default (ถ้าตั้งไว้)
      },
    });
    res.status(201).json(user);
  } catch (err) {
    console.error('USER_CREATE_ERROR', err);
    res.status(400).json({ error: err.message });
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
app.post(
  '/artists',
  authMiddleware,
  requireRole('ARTIST', 'ADMIN'),
  async (req, res) => {
    try {
      const { userId, bookingType, ...rest } = req.body || {};
      if (!userId) return res.status(400).json({ error: 'userId is required' });

      if (req.user.role === 'ARTIST' && userId !== req.user.id) {
        return res.sendStatus(403);
      }

      const existing = await prisma.artistProfile.findFirst({ where: { userId } });
      const data = {
        ...rest,
        ...(bookingType ? { bookingType } : {}),
      };

      let result;
      if (existing) {
        result = await prisma.artistProfile.update({
          where: { id: existing.id },
          data,
        });
      } else {
        result = await prisma.artistProfile.create({
          data: {
            ...data,
            user: { connect: { id: userId } },
          },
        });
      }

      res.status(existing ? 200 : 201).json(result);
    } catch (err) {
      console.error('ARTIST_UPSERT_ERROR', err);
      res.status(400).json({ error: err.message });
    }
  }
);

app.get('/artists', async (_req, res) => {
  const artists = await prisma.artistProfile.findMany({
    include: { user: true, events: true },
  });
  res.json(artists);
});

app.get('/artists/:id', async (req, res) => {
  const id = +req.params.id;
  const artist = await prisma.artistProfile.findUnique({
    where: { id },
    include: { user: true, events: true },
  });
  artist ? res.json(artist) : res.status(404).send('Artist not found');
});

/* ───────────────────────────── VENUES (POST = upsert by userId) ─────────── */
app.post(
  '/venues',
  authMiddleware,
  requireRole('VENUE', 'ADMIN', 'ORGANIZER'),
  async (req, res) => {
    try {
      const { userId, alcoholPolicy, ...rest } = req.body || {};
      if (!userId) return res.status(400).json({ error: 'userId is required' });

      if (req.user.role !== 'ADMIN' && userId !== req.user.id) {
        return res.sendStatus(403);
      }

      const existing = await prisma.venueProfile.findFirst({ where: { userId } });
      const data = {
        ...rest,
        ...(alcoholPolicy ? { alcoholPolicy } : {}),
      };

      let result;
      if (existing) {
        result = await prisma.venueProfile.update({
          where: { id: existing.id },
          data,
        });
      } else {
        result = await prisma.venueProfile.create({
          data: {
            ...data,
            user: { connect: { id: userId } },
          },
        });
      }

      res.status(existing ? 200 : 201).json(result);
    } catch (err) {
      console.error('VENUE_UPSERT_ERROR', err);
      res.status(400).json({ error: err.message });
    }
  }
);

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
app.post(
  '/events',
  authMiddleware,
  requireRole('VENUE', 'ADMIN', 'ORGANIZER'),
  async (req, res) => {
    try {
      const {
        id,
        artistIds = [],
        venueId,
        eventType,
        ticketing,
        alcoholPolicy,
        title,
        ...rest
      } = req.body || {};

      if (id) {
        const current = await prisma.event.findUnique({
          where: { id: Number(id) },
          include: { venue: true },
        });
        if (!current) return res.status(404).json({ error: 'Event not found' });

        if (req.user.role !== 'ADMIN') {
          if (!current.venue || current.venue.userId !== req.user.id) {
            return res.sendStatus(403);
          }
        }

        const data = {
          ...rest,
          ...(rest.name ? { name: rest.name } : (typeof title === 'string' ? { name: title } : {})),
        };
        if (eventType) data.eventType = eventType;
        if (ticketing) data.ticketing = ticketing;
        if (alcoholPolicy) data.alcoholPolicy = alcoholPolicy;

        if (typeof venueId === 'number' && req.user.role !== 'ADMIN') {
          const newVenue = await prisma.venueProfile.findUnique({ where: { id: venueId } });
          if (!newVenue || newVenue.userId !== req.user.id) return res.sendStatus(403);
        }

        const updated = await prisma.event.update({
          where: { id: Number(id) },
          data: {
            ...data,
            venue: typeof venueId === 'number' ? { connect: { id: venueId } } : undefined,
            artists: Array.isArray(artistIds)
              ? { set: artistIds.map((aid) => ({ id: aid })) }
              : undefined,
          },
          include: { venue: true, artists: true },
        });
        return res.json(updated);
      }

      if (!venueId) return res.status(400).json({ error: 'venueId is required' });

      if (req.user.role !== 'ADMIN') {
        const venue = await prisma.venueProfile.findUnique({ where: { id: venueId } });
        if (!venue || venue.userId !== req.user.id) return res.sendStatus(403);
      }

      const data = {
        ...rest,
        name: rest.name || (typeof title === 'string' ? title : undefined),
      };
        if (eventType) data.eventType = eventType;
        if (ticketing) data.ticketing = ticketing;
        if (alcoholPolicy) data.alcoholPolicy = alcoholPolicy;

      const created = await prisma.event.create({
        data: {
          ...data,
          venue: { connect: { id: venueId } },
          artists: artistIds.length ? { connect: artistIds.map((id) => ({ id })) } : undefined,
        },
        include: { venue: true, artists: true },
      });
      res.status(201).json(created);
    } catch (err) {
      console.error('EVENT_UPSERT_ERROR', err);
      res.status(400).json({ error: err.message });
    }
  }
);

app.get('/events', async (_req, res) => {
  const events = await prisma.event.findMany({
    include: { venue: true, artists: true },
  });
  res.json(events);
});

app.get('/events/:id', async (req, res) => {
  const id = +req.params.id;
  const ev = await prisma.event.findUnique({
    where: { id },
    include: { venue: true, artists: true },
  });
  ev ? res.json(ev) : res.status(404).send('Event not found');
});

/* ───────────────────────────── HEALTH ───────────────────────────── */
app.get('/', (_req, res) => res.send('🎵 API is up!'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
