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

/**
 * ── MIDDLEWARE + HELPER FUNCTION  ──────────────────────────────────────────────────────────────────────
 */

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (err){
    console.error(err);
    return res.sendStatus(403);
  }
}

/**
 * ── AUTH ROUTES  ──────────────────────────────────────────────────────────────────────
 */
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

// return current user
app.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { artistProfile: true, venueProfile: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch user' });
  }
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

/**
 * ── VENUES ────────────────────────────────────────────────────────────────────
 */

/**
 * ── EVENTS ────────────────────────────────────────────────────────────────────
 */

// Health check
app.get('/', (_req, res) => res.send('🎵 API is up!'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

