// src/pages/Venue.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { extractErrorMessage } from "../lib/api";
import "../css/Venue.css";

const FALLBACK_IMG = "/img/fallback.jpg";

/* ---------- helpers ---------- */
const asDate = (v) => (v ? new Date(v) : null);
const fmtDate = (v) => {
  const d = asDate(v);
  return d ? d.toLocaleDateString() : "—";
};
const fmtTime = (v) => (v ? v : "—");

// robust to array / csv / null
const toArr = (v) => {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

// add cache-busting for static public URLs (เช่น supabase public object) เวลาเพิ่งอัปโหลดใหม่
const bust = (url) => {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set("v", Date.now().toString());
    return u.toString();
  } catch {
    // relative path
    const sep = url.includes("?") ? "&" : "?";
    return url + sep + "v=" + Date.now();
  }
};

const parseLatLng = (locationUrl, lat, lng) => {
  if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  if (!locationUrl) return null;
  const m = locationUrl.match(/@?\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
};

export default function Venue() {
  // /venues/:id  (id = performerId/userId ของเจ้าของ venue)
  const { id } = useParams();
  const vid = Number(id);

  const [venueData, setVenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  // Lightbox state for gallery
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // ผู้ใช้ปัจจุบันเพื่อแสดงปุ่มแก้ไข
  const [me, setMe] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/auth/me", { withCredentials: true });
        if (alive) setMe(data);
      } catch {
        /* not logged in */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);

        if (!Number.isInteger(vid)) {
          if (alive) setErr("Invalid venue id");
          return;
        }

        // ✅ backend ควร include performer{user}, location, events
        const v = (await api.get(`/venues/${vid}`, { withCredentials: true })).data;
        if (!alive) return;
        setVenueData(v || null);
      } catch (e) {
        if (!alive) return;
        setErr(
          extractErrorMessage?.(e, "เกิดข้อผิดพลาดระหว่างดึงข้อมูลสถานที่") ||
            "เกิดข้อผิดพลาด"
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [vid]);

  // ชื่อจาก performer.user.name
  const displayName = useMemo(() => {
    return (
      venueData?.performer?.user?.name ||
      venueData?.name ||
      "Unnamed Venue"
    );
  }, [venueData]);

  /* ---------- HERO IMAGE: ใช้ venue.profilePhotoUrl ก่อน! ---------- */
  const heroImg = useMemo(() => {
    const v = venueData;
    if (!v) return FALLBACK_IMG;

    // 1) รูปโปรไฟล์ของ Venue (บันทึกจาก VenueEditor)
    if (v.profilePhotoUrl) return bust(v.profilePhotoUrl);

    // 2) รูปแรกจากแกลเลอรี venue.photoUrls
    const photos = toArr(v.photoUrls);
    if (photos.length) return bust(photos[0]);

    // 3) ตกมาใช้ user.profilePhotoUrl (ค่าเดิมก่อน migrate)
    if (v.performer?.user?.profilePhotoUrl) return bust(v.performer.user.profilePhotoUrl);

    // 4) เผื่อบางโปรเจกต์ยังมี banner/cover เดิม
    if (v.bannerUrl) return bust(v.bannerUrl);
    if (v.coverImage) return bust(v.coverImage);

    // 5) fallback
    return FALLBACK_IMG;
  }, [venueData]);

  // จุดแผนที่
  const mapPoint = useMemo(() => {
    const loc = venueData?.location;
    return parseLatLng(
      loc?.locationUrl || venueData?.googleMapUrl,
      loc?.latitude,
      loc?.longitude
    );
  }, [venueData]);

  const fmtEnLong = (v) => {
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d)) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(d);
  };

  // ✅ เช็คสิทธิ์แก้ไข: ORGANIZE/ADMIN + เป็นเจ้าของ venue นี้
  const canEdit = useMemo(() => {
    if (!me || !venueData) return false;
    const roleOK = me.role === "ORGANIZE" || me.role === "ADMIN";
    const ownerMatches =
      Number(me.id) === Number(venueData.performerId) ||
      Number(me.id) === Number(venueData.ownerId) ||
      Number(me.id) === Number(venueData?.performer?.user?.id) ||
      Number(me.id) === Number(id);
    return roleOK && ownerMatches;
  }, [me, venueData, id]);

  // ✅ ใครมองเห็น Draft ได้บ้าง (เจ้าของ/ADMIN เท่านั้น)
  const canSeeDrafts = (me?.role === "ADMIN") || canEdit;

  // ✅ Upcoming events: โชว์เฉพาะที่ publish แล้ว (ถ้าไม่ใช่เจ้าของ/ADMIN)
  const eventsUpcoming = useMemo(() => {
    const list = Array.isArray(venueData?.events) ? venueData.events : [];
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return list
      .filter((ev) => ev?.date && !isNaN(new Date(ev.date)) && new Date(ev.date) >= todayMid)
      .filter((ev) => ev?.isPublished || canSeeDrafts)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [venueData, canSeeDrafts]);

  if (loading) {
    return (
      <div className="vn-page" aria-busy="true">
        <div style={{ height: '70vh', display: 'grid', placeItems: 'center', padding: 32 }}>
          <div className="loader" aria-label="Loading venue" />
        </div>
      </div>
    );
  }

  if (err)
    return (
      <div className="vn-page">
        <div className="vn-error">{err}</div>
        <div style={{ marginTop: 8 }}>
          <Link to="/venues" className="vn-btn-ghost">
            ← Return to map
          </Link>
        </div>
      </div>
    );

  if (!venueData) return null;

  /* ---------- GALLERY: รองรับ array หรือ csv ---------- */
  const gallery = toArr(venueData.photoUrls);

  // ถ้ามี videoUrls ในสคีม่า/หลังบ้าน
  const videos = toArr(venueData.videoUrls);

  // โซเชียล/คอนแทกต์จาก performer
  const socials = venueData.performer || {};

  return (
    <div className="vn-page">
      {/* ===== HERO ===== */}
      <div className="vn-hero">
        <div className="vn-hero-body">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <h1 className="vn-title" style={{ marginBottom: 0 }}>
              {displayName}
            </h1>

            {/* 🔧 ปุ่มแก้ไข */}
            {canEdit && (
              <Link to={`/venue/edit`} className="vn-btn-img">
                <img src="/img/edit-text.png" alt="Edit" />
              </Link>
            )}
          </div>

          {venueData.description && (
            <p className="vn-desc">{venueData.description}</p>
          )}

          <div className="vn-chips">
            {venueData.genre && <span className="vn-chip">{venueData.genre}</span>}
            {venueData.priceRate && (
              <span className="vn-chip-transparent">Price: {venueData.priceRate}</span>
            )}
            {venueData.alcoholPolicy && (
              <span className="vn-chip-transparent">Alcohol: {venueData.alcoholPolicy}</span>
            )}
            {venueData.ageRestriction && (
              <span className="vn-chip-transparent">Age: {venueData.ageRestriction}+</span>
            )}
            {venueData.capacity && (
              <span className="vn-chip-transparent">Capacity: {venueData.capacity}</span>
            )}
          </div>
        </div>

        <div className="vn-hero-media">
          <img
            key={heroImg}            /* บังคับ re-render เมื่อ url เปลี่ยน */
            src={heroImg}
            alt={displayName}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMG;
            }}
          />
        </div>
      </div>

      {/* ===== INFO GRID ===== */}
      <section className="vn-section">
        <div className="vn-info-grid">
          {/* Contact */}
          <div className="vn-info-block">
            <div className="vn-info-title">Contact</div>

            <div className="vn-kv">
              <div>Email</div>
              <div>
                {socials.contactEmail ? (
                  <a className="vn-link" href={`mailto:${socials.contactEmail}`}>
                    {socials.contactEmail}
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div className="vn-kv">
              <div>Phone</div>
              <div>
                {socials.contactPhone ? (
                  <a className="vn-link" href={`tel:${socials.contactPhone}`}>
                    {socials.contactPhone}
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div className="vn-kv">
              <div>Location</div>
              <div>
                {venueData.location?.locationUrl ? (
                  <a
                    className="vn-link"
                    href={venueData.location.locationUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Google Maps ↗
                  </a>
                ) : mapPoint ? (
                  <a
                    className="vn-link"
                    href={`https://www.google.com/maps?q=${mapPoint.lat},${mapPoint.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Google Maps ↗
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>

          <div className="vn-info-block">
            <div className="vn-info-title">Hours & Dates</div>

            {(venueData.timeOpen ||
              venueData.timeClose ||
              venueData.dateOpen ||
              venueData.dateClose) ? (
              <div className="vn-hours">
                <div className="vn-kv">
                  <div>Open</div>
                  <div>{fmtTime(venueData.timeOpen)}</div>
                </div>
                <div className="vn-kv">
                  <div>Close</div>
                  <div>{fmtTime(venueData.timeClose)}</div>
                </div>
                <div className="vn-kv">
                  <div>Date Open</div>
                  <div>{fmtDate(venueData.dateOpen)}</div>
                </div>
                <div className="vn-kv">
                  <div>Date Close</div>
                  <div>{fmtDate(venueData.dateClose)}</div>
                </div>
              </div>
            ) : (
              <div className="vn-kv">No schedule available</div>
            )}
          </div>

          {/* Links / Socials */}
          <div className="vn-info-block">
            <div className="vn-info-title">social media</div>
            <div className="vn-social-icons">
              {venueData.websiteUrl && (
                <a href={venueData.websiteUrl} target="_blank" rel="noreferrer">
                  <img src="/img/web.png" alt="Website" />
                </a>
              )}
              {socials.facebookUrl && (
                <a href={socials.facebookUrl} target="_blank" rel="noreferrer">
                  <img src="/img/facebook.png" alt="Facebook" />
                </a>
              )}
              {socials.instagramUrl && (
                <a href={socials.instagramUrl} target="_blank" rel="noreferrer">
                  <img src="/img/instagram.png" alt="Instagram" />
                </a>
              )}
              {socials.tiktokUrl && (
                <a href={socials.tiktokUrl} target="_blank" rel="noreferrer">
                  <img src="/img/tiktok.png" alt="TikTok" />
                </a>
              )}
              {socials.youtubeUrl && (
                <a href={socials.youtubeUrl} target="_blank" rel="noreferrer">
                  <img src="/img/youtube.png" alt="YouTube" />
                </a>
              )}
              {!(
                venueData.websiteUrl ||
                socials.facebookUrl ||
                socials.instagramUrl ||
                socials.lineUrl ||
                socials.tiktokUrl ||
                socials.youtubeUrl
              ) && <span>—</span>}
            </div>
          </div>
        </div>
      </section>

      {/* ===== UPCOMING ===== */}
      <section className="vn-section">
        <h2 className="vn-section-title">Upcoming</h2>
        <div className="a-panel">
          <ul className="a-schedule-list">
            {eventsUpcoming
              .filter((ev) => ev.isPublished && new Date(ev.date || ev.dateISO) >= new Date()) // <-- กรอง published และยังไม่ผ่าน
              .map((ev) => (
                <li key={ev.id || ev.slug || ev.title} className="a-schedule-item">
                  <div className="a-date">{fmtEnLong(ev.date || ev.dateISO)}</div>
                  <div className="a-event">
                    <div className="a-event-title">{ev.title || ev.name}</div>
                    <div className="a-event-sub">
                      {(ev.venue?.name ||
                        venueData?.performer?.user?.name ||
                        displayName) || ""}
                      {ev.city ? ` • ${ev.city}` : ""}
                      {ev.price ? ` • ${ev.price}` : ""}
                    </div>
                  </div>
                  {(ev.id || ev.url || ev.ticketLink) &&
                    (ev.id ? (
                      <Link className="a-link" to={`/events/${ev.id}`}>
                        Detail
                      </Link>
                    ) : ev.url ? (
                      <a
                        className="a-link"
                        href={ev.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Detail
                      </a>
                    ) : (
                      <a
                        className="a-link"
                        href={ev.ticketLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Detail
                      </a>
                    ))}
                </li>
              ))}

            {eventsUpcoming.filter((ev) => ev.isPublished && new Date(ev.date || ev.dateISO) >= new Date()).length === 0 && (
              <li className="a-empty">There are no upcoming events.</li>
            )}
          </ul>
        </div>
      </section>



      {/* ===== GALLERY (Photos) ===== */}
      {gallery.length > 0 && (
        <section className="vn-section">
          <div className="vn-section-title">Gallery</div>
          <div className="vn-gallery">
            {gallery.map((src, i) => (
              <div key={i} className="vn-thumb">
                <img
                  src={bust(src)}
                  alt={`photo ${i + 1}`}
                  loading="lazy"
                  onClick={() => setLightboxUrl(bust(src))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLightboxUrl(bust(src));
                    }
                  }}
                  onError={(e) => {
                    e.currentTarget.style.opacity = 0;
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== VIDEOS (optional) ===== */}
      {videos.length > 0 && (
        <section className="vn-section">
          <div className="vn-section-title">Videos</div>
          <div className="vn-gallery">
            {videos.map((src, i) => (
              <div key={`v-${i}`} className="vn-thumb">
                <video
                  className="vn-videoThumb"
                  controls
                  preload="metadata"
                >
                  <source src={src} />
                </video>
              </div>
            ))}
          </div>
        </section>
      )}

      {lightboxUrl && (
        <div
          className="vn-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxUrl(null);
          }}
          tabIndex={-1}
        >
          <button
            className="vn-lightbox-close"
            type="button"
            aria-label="Close"
            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
          >
            ×
          </button>
          <img src={lightboxUrl} alt="enlarged" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
