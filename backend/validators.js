// backend/validators.js
const { z } = require('zod');

/** ===== Plain JS enum lists ===== */
const roles = ['SUPERADMIN','ADMIN','ORGANIZER','ARTIST','VENUE','FAN'];
const bookingTypes = ['FULL_BAND','TRIO','DUO','SOLO'];
const eventTypes = ['OUTDOOR','INDOOR','HYBRID'];
const ticketingTypes = ['FREE','DONATION','TICKET_MELON','DIRECT_CONTACT','ONSITE_SALES'];
const alcoholPolicies = ['SERVE','NONE','BYOB'];
const priceRates = ['BUDGET','STANDARD','PREMIUM','VIP','LUXURY'];

/** ===== Zod Schemas ===== */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional(), // จะ uppercased ใน handler
});

const artistCreateSchema = z.object({
  userId: z.number().int(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  genre: z.string().min(1),
  subGenre: z.string().nullable().optional(),
  bookingType: z.enum(bookingTypes),
  foundingYear: z.number().int().nullable().optional(),
  label: z.string().nullable().optional(),
  isIndependent: z.boolean().optional(),
  memberCount: z.number().int().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  priceMin: z.number().nullable().optional(),
  priceMax: z.number().nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  profilePhotoUrl: z.string().url().nullable().optional(),
  rateCardUrl: z.string().url().nullable().optional(),
  epkUrl: z.string().url().nullable().optional(),
  riderUrl: z.string().url().nullable().optional(),
  spotifyUrl: z.string().url().nullable().optional(),
  youtubeUrl: z.string().url().nullable().optional(),
  appleMusicUrl: z.string().url().nullable().optional(),
  facebookUrl: z.string().url().nullable().optional(),
  instagramUrl: z.string().url().nullable().optional(),
  soundcloudUrl: z.string().url().nullable().optional(),
  shazamUrl: z.string().url().nullable().optional(),
  bandcampUrl: z.string().url().nullable().optional(),
  tiktokUrl: z.string().url().nullable().optional(),
});
const artistUpdateSchema = artistCreateSchema.partial().omit({ userId: true });

const venueCreateSchema = z.object({
  userId: z.number().int(),
  name: z.string().min(1),
  locationUrl: z.string().url(),
  genre: z.string().min(1),
  description: z.string().nullable().optional(),
  capacity: z.number().int().nullable().optional(),
  dateOpen: z.string().datetime().nullable().optional(),
  dateClose: z.string().datetime().nullable().optional(),
  priceRate: z.enum(priceRates).nullable().optional(),
  timeOpen: z.string().nullable().optional(),
  timeClose: z.string().nullable().optional(),
  alcoholPolicy: z.enum(alcoholPolicies),
  ageRestriction: z.string().nullable().optional(),
  profilePhotoUrl: z.string().url().nullable().optional(),
  photoUrls: z.array(z.string().url()).optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  facebookUrl: z.string().url().nullable().optional(),
  instagramUrl: z.string().url().nullable().optional(),
  lineUrl: z.string().url().nullable().optional(),
  tiktokUrl: z.string().url().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});
const venueUpdateSchema = venueCreateSchema.partial().omit({ userId: true });

const eventCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  posterUrl: z.string().url().nullable().optional(),
  conditions: z.string().nullable().optional(),
  eventType: z.enum(eventTypes),
  ticketing: z.enum(ticketingTypes),
  ticketLink: z.string().url().nullable().optional(),
  alcoholPolicy: z.enum(alcoholPolicies),
  ageRestriction: z.string().nullable().optional(),
  date: z.string().datetime(),
  doorOpenTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  genre: z.string().nullable().optional(),
  venueId: z.number().int(),
  artistIds: z.array(z.number().int()).optional().default([]),
});
const eventUpdateSchema = eventCreateSchema.partial().omit({ venueId: true });

/** ====== เพิ่ม alias ให้ตรงกับตัวแปรที่ route เดิมเรียก ====== */
const createUserSchema    = userCreateSchema;
const createArtistSchema  = artistCreateSchema;
const updateArtistSchema  = artistUpdateSchema;
const createVenueSchema   = venueCreateSchema;
const updateVenueSchema   = venueUpdateSchema;
const createEventSchema   = eventCreateSchema;
const updateEventSchema   = eventUpdateSchema;

/** ===== Express middleware (Zod) ===== */
function zodValidate(schema) {
  return (req, res, next) => {
    if (!schema || typeof schema.safeParse !== 'function') {
      console.error('[zodValidate] invalid schema on', req.method, req.originalUrl);
      return res.status(500).json({ error: 'Validator misconfigured for this route' });
    }
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.format ? result.error.format() : String(result.error),
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  // enums
  roles, bookingTypes, eventTypes, ticketingTypes, alcoholPolicies, priceRates,
  // middleware
  zodValidate,
  // schemas (ทั้งชื่อเดิมและ alias)
  loginSchema,
  userCreateSchema,  createUserSchema,
  artistCreateSchema, createArtistSchema,
  artistUpdateSchema, updateArtistSchema,
  venueCreateSchema,  createVenueSchema,
  venueUpdateSchema,  updateVenueSchema,
  eventCreateSchema,  createEventSchema,
  eventUpdateSchema,  updateEventSchema,
};
