// backend/validators.js
const { z } = require('zod');

// middleware สำหรับ validate body ด้วย zod
function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    req.body = parsed.data;
    next();
  };
}

// ===== Schemas =====
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional(), // ให้ backend map/validate เองตาม enum จริง
});

// Event: ยอมให้ส่ง name หรือ title (ต้องมีอย่างน้อยหนึ่ง)
const createEventSchema = z
  .object({
    name: z.string().min(1).optional(),
    title: z.string().min(1).optional(), // alias → จะ map เป็น name ที่ layer ถัดไป
    description: z.string().optional(),
    date: z.string().datetime().or(z.string().min(1)).optional(),
    venueId: z.number().int().positive(),
    artistIds: z.array(z.number().int().positive()).optional().default([]),
    // ต้องส่ง 3 enum เป็นสตริงมาก่อน แล้วค่อย map/validate ที่ backend
    eventType: z.string().min(1),
    ticketing: z.string().min(1),
    alcoholPolicy: z.string().min(1),
  })
  .superRefine((val, ctx) => {
    if (!val.name && !val.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either "name" or "title" is required.',
        path: ['name'],
      });
    }
  });

const updateEventSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().min(1).optional(), // alias
  description: z.string().optional(),
  date: z.string().datetime().or(z.string().min(1)).optional(),
  venueId: z.number().int().positive().optional(),
  artistIds: z.array(z.number().int().positive()).optional(),
  eventType: z.string().min(1).optional(),
  ticketing: z.string().min(1).optional(),
  alcoholPolicy: z.string().min(1).optional(),
});

// Artist: bookingType เป็น required string (backend จะ map/validate อีกชั้น)
const createArtistSchema = z.object({
  userId: z.number().int().positive(),
  name: z.string().min(1).optional(),
  genre: z.string().optional(),
  subGenre: z.string().optional(),
  bookingType: z.string().min(1),
  foundingYear: z.number().int().optional(),
  label: z.string().optional(),
  isIndependent: z.boolean().optional(),
  memberCount: z.number().int().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  photoUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  profilePhotoUrl: z.string().url().optional(),
  rateCardUrl: z.string().url().optional(),
  epkUrl: z.string().url().optional(),
  riderUrl: z.string().url().optional(),
  spotifyUrl: z.string().url().optional(),
  youtubeUrl: z.string().url().optional(),
  appleMusicUrl: z.string().url().optional(),
  facebookUrl: z.string().url().optional(),
  instagramUrl: z.string().url().optional(),
  soundcloudUrl: z.string().url().optional(),
  shazamUrl: z.string().url().optional(),
  bandcampUrl: z.string().url().optional(),
  tiktokUrl: z.string().url().optional(),
  description: z.string().optional(),
});

const updateArtistSchema = createArtistSchema.partial();

// Venue: ต้องมี name, locationUrl, genre, alcoholPolicy อย่างน้อย
const createVenueSchema = z.object({
  userId: z.number().int().positive(),
  name: z.string().min(1),
  locationUrl: z.string().min(1),
  genre: z.string().min(1),
  alcoholPolicy: z.string().min(1), // backend จะ map/validate
  description: z.string().optional(),
  capacity: z.number().int().optional(),
  dateOpen: z.string().datetime().optional(),
  dateClose: z.string().datetime().optional(),
  priceRate: z.string().optional(),
  timeOpen: z.string().optional(),
  timeClose: z.string().optional(),
  ageRestriction: z.string().optional(),
  profilePhotoUrl: z.string().url().optional(),
  photoUrls: z.array(z.string().url()).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  facebookUrl: z.string().url().optional(),
  instagramUrl: z.string().url().optional(),
  lineUrl: z.string().url().optional(),
  tiktokUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
});

const updateVenueSchema = createVenueSchema.partial();

module.exports = {
  validateBody,
  loginSchema,
  createUserSchema,
  createEventSchema,
  updateEventSchema,
  createArtistSchema,
  updateArtistSchema,
  createVenueSchema,
  updateVenueSchema,
};
