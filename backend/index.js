// backend/index.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SECRET = process.env.JWT_SECRET || 'your_secret_key';

const express = require('express');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

const { requireRole, requireOwnershipOrAdmin } = require('./authz');
const {
  zodValidate,
  loginSchema,
  createUserSchema,
  createEventSchema,
  updateEventSchema,
  createArtistSchema,
  updateArtistSchema,
  createVenueSchema,
  updateVenueSchema,
} = require('./validators');

const app = express();
app.use(express.json());
app.use(cookieParser());
const port = process.env.PORT || 4000;

/* ───────────────────────────── ENUM LOADER ───────────────────────────── */
const ENUMS = {
  USERROLE: new Set(),
  BOOKINGTYPE: new Set(),
  EVENTTYPE: new Set(),
  TICKETINGTYPE: new Set(),
  ALCOHOLPOLICY: new Set(),
  PRICERATE: new Set(),
};

async function loadEnum(typeName) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT e.enumlabel AS val
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE lower(t.typname) = $1
    ORDER BY e.enumsortorder
  `, typeName.toLowerCase());
  return Array.isArray(rows) ? rows.map(r => String(r.val)) : [];
}

async function loadEnums() {
  try {
    const [roles, bookingTypes, eventTypes, ticketingTypes, alcoholPolicies, priceRates] = await Promise.all([
      loadEnum('UserRole'),
      loadEnum('BookingType'),
      loadEnum('EventType'),
      loadEnum('TicketingType'),
      loadEnum('AlcoholPolicy'),
      loadEnum('PriceRate'),
    ]);
    if (roles.length) ENUMS.USERROLE = new Set(roles.map(v => v.toUpperCase()));
    if (bookingTypes.length) ENUMS.BOOKINGTYPE = new Set(bookingTypes.map(v => v.toUpperCase()));
    if (eventTypes.length) ENUMS.EVENTTYPE = new Set(eventTypes.map(v => v.toUpperCase()));
    if (ticketingTypes.length) ENUMS.TICKETINGTYPE = new Set(ticketingTypes.map(v => v.toUpperCase()));
    if (alcoholPolicies.length) ENUMS.ALCOHOLPOLICY = new Set(alcoholPolicies.map(v => v.toUpperCase()));
    if (priceRates.length) ENUMS.PRICERATE = new Set(priceRates.map(v => v.toUpperCase()));

    console.log('[Enums]', {
      roles, bookingTypes, eventTypes, ticketingTypes, alcoholPolicies, priceRates,
    });
  } catch (e) {
    console.warn('[Enums] load failed:', e?.message);
  }
}
loadEnums();

const allowedValues = (key) => Array.from(ENUMS[key] || new Set());

/* ───────────────────────────── RESOLVERS ───────────────────────────── */
function resolveRole(input) {
  if (!input || typeof input !== 'string') return undefined;
  const raw = input.trim();
  const upper = raw.toUpperCase();
  const allowed = ENUMS.USERROLE;
  if (allowed.has(upper)) return upper;

  const candidates = [];
  if (/(^|[^a-z])(fan|listener|audience)([^a-z]|$)/i.test(raw)) candidates.push('FAN','LISTENER');
  if (/(^|[^a-z])(artist|band|musician|performer)([^a-z]|$)/i.test(raw)) candidates.push('ARTIST','PERFORMER');
  if (/(^|[^a-z])(venue|place|organizer|host)([^a-z]|$)/i.test(raw)) candidates.push('VENUE','ORGANIZER');
  if (/(^|[^a-z])(admin|administrator|superadmin)([^a-z]|$)/i.test(raw)) candidates.push('ADMIN','SUPERADMIN');

  for (const c of candidates) if (allowed.has(c)) return c;
  return undefined;
}

function resolveBookingType(input) {
  if (!input || typeof input !== 'string') return undefined;
  const up = input.trim().toUpperCase();
  const a = ENUMS.BOOKINGTYPE;
  if (a.has(up)) return up;
  const map = {
    'FULL_BAND': ['FULL BAND','BAND'],
    'TRIO': ['TRIO'],
    'DUO': ['DUO'],
    'SOLO': ['SOLO','ONE'],
  };
  for (const [canon, list] of Object.entries(map)) {
    if (list.includes(up) && a.has(canon)) return canon;
  }
  return undefined;
}

function resolveAlcoholPolicy(input) {
  if (!input || typeof input !== 'string') return undefined;
  const up = input.trim().toUpperCase();
  const a = ENUMS.ALCOHOLPOLICY;
  if (a.has(up)) return up;
  const map = {
    'SERVE': ['SERVE','ALCOHOL','BAR'],
    'NONE': ['NONE','NO','DRY'],
    'BYOB': ['BYOB','BRING YOUR OWN'],
  };
  for (const [canon, list] of Object.entries(map)) {
    if (list.includes(up) && a.has(canon)) return canon;
  }
  return undefined;
}

function resolveEventType(input) {
  if (!input || typeof input !== 'string') return undefined;
  const up = input.trim().toUpperCase();
  const a = ENUMS.EVENTTYPE;
  if (a.has(up)) return up;
  const map = {
    'OUTDOOR': ['OUTDOOR','OUT-SIDE','OPEN AIR'],
    'INDOOR': ['INDOOR','INSIDE'],
    'HYBRID': ['HYBRID','MIXED'],
  };
  for (const [canon, list] of Object.entries(map)) {
    if (list.includes(up) && a.has(canon)) return canon;
  }
  return undefined;
}

function resolveTicketingType(input) {
  if (!input || typeof input !== 'string') return undefined;
  const up = input.trim().toUpperCase().replace(/\s|-/g, '');
  const a = new Set(Array.from(ENUMS.TICKETINGTYPE).map(v => v.replace(/-/g,'')));
  if (a.has(up)) return Array.from(ENUMS.TICKETINGTYPE).find(v => v.replace(/-/g,'') === up);

  const map = {
    'FREE': ['FREE'],
    'DONATION': ['DONATION','TIP'],
    'TICKET_MELON': ['TICKETMELON','MELON'],
    'DIRECT_CONTACT': ['DIRECTCONTACT','DIRECT','CONTACT','DM'],
    'ONSITE_SALES': ['ONSITESALES','ONSITE','ATDOOR','WALKIN','WALK-IN'],
  };
  for (const [canon, list] of Object.entries(map)) {
    if (list.includes(up) && ENUMS.TICKETINGTYPE.has(canon)) return canon;
  }
  return undefined;
}

/* ───────────────────────────── AUTH MIDDLEWARE ───────────────────────────── */
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.sendStatus(403);
  }
}

/* ───────────────────────────── AUTH ROUTES ───────────────────────────── */
app.post('/auth/login', zodValidate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1d' });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: false, // prod: true + SameSite=None + HTTPS
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

// meta enums
app.get('/meta/enums', (_req, res) => {
  res.json({
    roles: allowedValues('USERROLE'),
    bookingTypes: allowedValues('BOOKINGTYPE'),
    eventTypes: allowedValues('EVENTTYPE'),
    ticketingTypes: allowedValues('TICKETINGTYPE'),
    alcoholPolicies: allowedValues('ALCOHOLPOLICY'),
    priceRates: allowedValues('PRICERATE'),
  });
});

/* ───────────────────────────── USERS ───────────────────────────── */
app.post('/users', zodValidate(createUserSchema), async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const mapped = resolveRole(role);
    const data = {
      email,
      passwordHash,
      ...(mapped ? { role: mapped } : {}),
    };

    const user = await prisma.user.create({ data });
    res.status(201).json(user);
  } catch (err) {
    console.error('USER_CREATE_ERROR', err);
    res.status(400).json({ error: err.message });
  }
});

app.get('/users', authMiddleware, async (req, res) => {
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

/* ───────────────────────────── ARTISTS ───────────────────────────── */
app.post(
  '/artists',
  authMiddleware,
  requireRole('ARTIST', 'ADMIN'),
  zodValidate(createArtistSchema),
  async (req, res) => {
    try {
      const { userId, bookingType, ...rest } = req.body;

      if (req.user.role === 'ARTIST' && userId !== req.user.id) {
        return res.sendStatus(403);
      }

      const bt = resolveBookingType(bookingType);
      if (!bt) {
        return res.status(400).json({
          error: `Invalid bookingType; allowed values: ${allowedValues('BOOKINGTYPE').join(', ') || '(none loaded)'}`,
        });
      }

      const artist = await prisma.artistProfile.create({
        data: {
          ...rest,
          bookingType: bt,
          user: { connect: { id: userId } },
        },
      });
      res.status(201).json(artist);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.get('/artists', async (req, res) => {
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

app.put(
  '/artists/:id',
  authMiddleware,
  zodValidate(updateArtistSchema),
  requireOwnershipOrAdmin(async (req) => {
    const id = +req.params.id;
    const a = await prisma.artistProfile.findUnique({ where: { id } });
    return a && a.userId === req.user.id;
  }),
  async (req, res) => {
    try {
      const id = +req.params.id;
      const data = { ...req.body };

      if (typeof data.bookingType === 'string') {
        const bt = resolveBookingType(data.bookingType);
        if (!bt) {
          return res.status(400).json({
            error: `Invalid bookingType; allowed values: ${allowedValues('BOOKINGTYPE').join(', ') || '(none loaded)'}`,
          });
        }
        data.bookingType = bt;
      }

      // ห้ามแก้ owner
      delete data.userId;

      const artist = await prisma.artistProfile.update({
        where: { id },
        data,
      });
      res.json(artist);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

/* ───────────────────────────── VENUES ───────────────────────────── */
app.post(
  '/venues',
  authMiddleware,
  requireRole('VENUE', 'ADMIN', 'ORGANIZER'),
  zodValidate(createVenueSchema),
  async (req, res) => {
    try {
      const { userId, ...rest } = req.body;

      if (req.user.role !== 'ADMIN' && userId !== req.user.id) {
        return res.sendStatus(403);
      }

      const ap = resolveAlcoholPolicy(rest.alcoholPolicy);
      if (!ap) {
        return res.status(400).json({
          error: `Invalid alcoholPolicy; allowed values: ${allowedValues('ALCOHOLPOLICY').join(', ') || '(none loaded)'}`,
        });
      }

      const venue = await prisma.venueProfile.create({
        data: {
          ...rest,
          alcoholPolicy: ap,
          user: { connect: { id: userId } }, // ✅ ใช้ connect เท่านั้น
        },
      });
      res.status(201).json(venue);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.get('/venues', async (req, res) => {
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

app.put(
  '/venues/:id',
  authMiddleware,
  zodValidate(updateVenueSchema),
  requireOwnershipOrAdmin(async (req) => {
    const id = +req.params.id;
    const v = await prisma.venueProfile.findUnique({ where: { id } });
    return v && v.userId === req.user.id;
  }),
  async (req, res) => {
    try {
      const id = +req.params.id;
      const { userId, ...rest } = req.body; // ✅ กันไม่ให้แก้ owner

      const data = { ...rest };
      if (typeof data.alcoholPolicy === 'string') {
        const ap = resolveAlcoholPolicy(data.alcoholPolicy);
        if (!ap) {
          return res.status(400).json({
            error: `Invalid alcoholPolicy; allowed values: ${allowedValues('ALCOHOLPOLICY').join(', ') || '(none loaded)'}`,
          });
        }
        data.alcoholPolicy = ap;
      }

      const venue = await prisma.venueProfile.update({
        where: { id },
        data,
      });
      res.json(venue);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

/* ───────────────────────────── EVENTS ───────────────────────────── */
app.post(
  '/events',
  authMiddleware,
  requireRole('VENUE', 'ADMIN', 'ORGANIZER'),
  zodValidate(createEventSchema),
  async (req, res) => {
    try {
      const { artistIds = [], venueId, ...rest } = req.body;

      // alias: title → name
      if (!rest.name && typeof rest.title === 'string') rest.name = rest.title;
      delete rest.title;

      // map/validate enums
      const et = resolveEventType(rest.eventType);
      const tk = resolveTicketingType(rest.ticketing);
      const ap = resolveAlcoholPolicy(rest.alcoholPolicy);
      if (!et) return res.status(400).json({ error: `Invalid eventType; allowed: ${allowedValues('EVENTTYPE').join(', ')}` });
      if (!tk) return res.status(400).json({ error: `Invalid ticketing; allowed: ${allowedValues('TICKETINGTYPE').join(', ')}` });
      if (!ap) return res.status(400).json({ error: `Invalid alcoholPolicy; allowed: ${allowedValues('ALCOHOLPOLICY').join(', ')}` });
      rest.eventType = et; rest.ticketing = tk; rest.alcoholPolicy = ap;

      // ownership (ถ้าไม่ใช่ ADMIN ต้องเป็น venue ของตัวเอง)
      if (req.user.role !== 'ADMIN') {
        const venue = await prisma.venueProfile.findUnique({ where: { id: venueId } });
        if (!venue || venue.userId !== req.user.id) return res.sendStatus(403);
      }

      const event = await prisma.event.create({
        data: {
          ...rest,
          venue: { connect: { id: venueId } },
          artists: artistIds.length ? { connect: artistIds.map(id => ({ id })) } : undefined,
        },
        include: { venue: true, artists: true },
      });
      res.status(201).json(event);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.get('/events', async (req, res) => {
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

app.put(
  '/events/:id',
  authMiddleware,
  requireRole('VENUE', 'ADMIN', 'ORGANIZER'),
  zodValidate(updateEventSchema),
  async (req, res) => {
    try {
      const id = +req.params.id;

      const current = await prisma.event.findUnique({
        where: { id },
        include: { venue: true },
      });
      if (!current) return res.status(404).json({ error: 'Event not found' });

      if (req.user.role !== 'ADMIN') {
        if (!current.venue || current.venue.userId !== req.user.id) return res.sendStatus(403);
      }

      const data = { ...req.body };
      if (!data.name && typeof data.title === 'string') data.name = data.title;
      delete data.title;

      if (typeof data.eventType === 'string') {
        const et = resolveEventType(data.eventType);
        if (!et) return res.status(400).json({ error: `Invalid eventType; allowed: ${allowedValues('EVENTTYPE').join(', ')}` });
        data.eventType = et;
      }
      if (typeof data.ticketing === 'string') {
        const tk = resolveTicketingType(data.ticketing);
        if (!tk) return res.status(400).json({ error: `Invalid ticketing; allowed: ${allowedValues('TICKETINGTYPE').join(', ')}` });
        data.ticketing = tk;
      }
      if (typeof data.alcoholPolicy === 'string') {
        const ap = resolveAlcoholPolicy(data.alcoholPolicy);
        if (!ap) return res.status(400).json({ error: `Invalid alcoholPolicy; allowed: ${allowedValues('ALCOHOLPOLICY').join(', ')}` });
        data.alcoholPolicy = ap;
      }

      if (typeof data.venueId === 'number' && req.user.role !== 'ADMIN') {
        const newVenue = await prisma.venueProfile.findUnique({ where: { id: data.venueId } });
        if (!newVenue || newVenue.userId !== req.user.id) return res.sendStatus(403);
      }

      const event = await prisma.event.update({
        where: { id },
        data: {
          ...data,
          venue: typeof data.venueId === 'number' ? { connect: { id: data.venueId } } : undefined,
          artists: Array.isArray(data.artistIds)
            ? { set: data.artistIds.map(aid => ({ id: aid })) }
            : undefined,
        },
        include: { venue: true, artists: true },
      });
      res.json(event);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

/* ───────────────────────────── HEALTH ───────────────────────────── */
app.get('/', (_req, res) => res.send('🎵 API is up!'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
