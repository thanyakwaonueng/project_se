const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Required External Modules
const express = require('express');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

// App Variables
const app = express();
app.use(express.json());
app.use(cookieParser()); // ✅ needed 
const port = process.env.PORT || 4000; // Use environment variable PORT or default to 4000

//**__LOGIN

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


app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return res.status(401).json({ error: 'User not found' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1d' });

  // ✅ Set cookie
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: false, // set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000,
  });

  //res.json({ token });
  res.json({ message: 'Logged in' });
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });
  res.json({ message: 'Logged out successfully' });
});

/**
 * ── USERS ──────────────────────────────────────────────────────────────────────
 */
// Create user

app.post('/users', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash, role } });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List users (with their profiles)
app.get('/users', authMiddleware,  async (req, res) => {
  const users = await prisma.user.findMany({
    include: { artistProfile: true, venueProfile: true },
  });
  res.json(users);
});
// Get single user
app.get('/users/:id', async (req, res) => {
  const id = +req.params.id;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { artistProfile: true, venueProfile: true },
  });
  user ? res.json(user) : res.status(404).send('User not found');
});

/**
 * ── ARTISTS ───────────────────────────────────────────────────────────────────
 */
// Create artist profile
app.post('/artists', async (req, res) => {
  try {
    const data = { ...req.body };
    // ensure date parsing etc if needed
    const artist = await prisma.artistProfile.create({
      data: {
        ...data,
        user: { connect: { id: data.userId } },
      },
    });
    res.status(201).json(artist);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// List artists (with user + events)
app.get('/artists', async (req, res) => {
  const artists = await prisma.artistProfile.findMany({
    include: { user: true, events: true },
  });
  res.json(artists);
});
// Get single artist
app.get('/artists/:id', async (req, res) => {
  const id = +req.params.id;
  const artist = await prisma.artistProfile.findUnique({
    where: { id },
    include: { user: true, events: true },
  });
  artist ? res.json(artist) : res.status(404).send('Artist not found');
});
// Update artist
app.put('/artists/:id', async (req, res) => {
  try {
    const id = +req.params.id;
    const artist = await prisma.artistProfile.update({
      where: { id },
      data: req.body,
    });
    res.json(artist);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ── VENUES ────────────────────────────────────────────────────────────────────
 */
// Create venue profile
app.post('/venues', async (req, res) => {
  try {
    const data = { ...req.body };
    const venue = await prisma.venueProfile.create({
      data: {
        ...data,
        user: { connect: { id: data.userId } },
      },
    });
    res.status(201).json(venue);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// List venues (with user + events)
app.get('/venues', async (req, res) => {
  const venues = await prisma.venueProfile.findMany({
    include: { user: true, events: true },
  });
  res.json(venues);
});
// Get single venue
app.get('/venues/:id', async (req, res) => {
  const id = +req.params.id;
  const venue = await prisma.venueProfile.findUnique({
    where: { id },
    include: { user: true, events: true },
  });
  venue ? res.json(venue) : res.status(404).send('Venue not found');
});
// Update venue
app.put('/venues/:id', async (req, res) => {
  try {
    const id = +req.params.id;
    const venue = await prisma.venueProfile.update({
      where: { id },
      data: req.body,
    });
    res.json(venue);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ── EVENTS ────────────────────────────────────────────────────────────────────
 */
// Create event (link to venue + artists)
app.post('/events', async (req, res) => {
  try {
    const { artistIds = [], venueId, ...rest } = req.body;
    const event = await prisma.event.create({
      data: {
        ...rest,
        venue: { connect: { id: venueId } },
        artists: { connect: artistIds.map(id => ({ id })) },
      },
      include: { venue: true, artists: true },
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// List events
app.get('/events', async (req, res) => {
  const events = await prisma.event.findMany({
    include: { venue: true, artists: true },
  });
  res.json(events);
});
// Get single event
app.get('/events/:id', async (req, res) => {
  const id = +req.params.id;
  const ev = await prisma.event.findUnique({
    where: { id },
    include: { venue: true, artists: true },
  });
  ev ? res.json(ev) : res.status(404).send('Event not found');
});
// Update event
app.put('/events/:id', async (req, res) => {
  try {
    const id = +req.params.id;
    const { artistIds, venueId, ...rest } = req.body;
    const event = await prisma.event.update({
      where: { id },
      data: {
        ...rest,
        venue: venueId ? { connect: { id: venueId } } : undefined,
        artists: artistIds
          ? { set: artistIds.map(aid => ({ id: aid })) }
          : undefined,
      },
      include: { venue: true, artists: true },
    });
    res.json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Health check
app.get('/', (_req, res) => res.send('🎵 API is up!'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

