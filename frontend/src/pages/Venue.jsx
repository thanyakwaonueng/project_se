// src/pages/Venue.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { extractErrorMessage } from "../lib/api";
import "../css/Venue.css";

const FALLBACK_IMG = "/img/fallback.jpg";

const parseLatLng = (locationUrl, lat, lng) => {
  if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  if (!locationUrl) return null;
  const m = locationUrl.match(/@?\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
};

const asDate = (v) => (v ? new Date(v) : null);
const fmtDate = (v) => {
  const d = asDate(v);
  return d ? d.toLocaleDateString() : "—";
};
const fmtTime = (v) => (v ? v : "—");

export default function Venue() {
  // /venues/:id  (id = performerId/userId ของเจ้าของ venue)
  const { id } = useParams();
  const vid = Number(id);

  const [venueData, setVenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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

        // ✅ backend ส่ง include performer{user}, location, events
        const v = (await api.get(`/venues/${vid}`, { withCredentials: true })).data;
        if (!alive) return;
        if (!v) setVenueData(null);
        else setVenueData(v);
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

  // รูปหลัก (ตามเดิม)
  const heroImg = useMemo(() => {
    const v = venueData;
    if (!v) return FALLBACK_IMG;
    return (
      v.performer?.user?.profilePhotoUrl ||
      v.bannerUrl ||
      v.coverImage ||
      FALLBACK_IMG
    );
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

  // ✅ Upcoming events: โชว์เฉพาะที่ "publish แล้ว" สำหรับผู้ชมทั่วไป
  const eventsUpcoming = useMemo(() => {
    const list = Array.isArray(venueData?.events) ? venueData.events : [];
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return list
      .filter((ev) => ev?.date && !isNaN(new Date(ev.date)) && new Date(ev.date) >= todayMid)
      .filter((ev) => ev?.isPublished || canSeeDrafts) // ⬅️ สำคัญ: กรอง Draft ออก
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [venueData, canSeeDrafts]);

  if (loading)
    return (
      <div className="vn-page">
        <div className="vn-loading">กำลังโหลด…</div>
      </div>
    );

  if (err)
    return (
      <div className="vn-page">
        <div className="vn-error">{err}</div>
        <div style={{ marginTop: 8 }}>
          <Link to="/venues" className="vn-btn-ghost">
            ← กลับแผนที่
          </Link>
        </div>
      </div>
    );

  if (!venueData) return null;

  // แกลเลอรี (ตามเดิม)
  const gallery = (venueData.photoUrls || venueData.photos || "")
    .toString()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

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

            {/* 🔧 ปุ่มแก้ไข → กลับไป route เดิม /venue/edit */}
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
            <div className="vn-info-title">Links</div>
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
            {eventsUpcoming.map((ev) => (
              <li key={ev.id || ev.slug || ev.title} className="a-schedule-item">
                <div className="a-date">{fmtEnLong(ev.date || ev.dateISO)}</div>
                <div className="a-event">
                  <div className="a-event-title">
                    {ev.title || ev.name}{" "}
                    {!ev.isPublished && canSeeDrafts && (
                      <span className="vn-chip" style={{ marginLeft: 8, background: "#6b7280", color: "#fff" }}>
                        Draft
                      </span>
                    )}
                  </div>
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
                    <a className="a-link" href={ev.url} target="_blank" rel="noreferrer">
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

            {eventsUpcoming.length === 0 && (
              <li className="a-empty">ยังไม่มีกิจกรรมที่จะเกิดขึ้น</li>
            )}
          </ul>
        </div>
      </section>

      {/* ===== GALLERY ===== */}
      {gallery.length > 0 && (
        <section className="vn-section">
          <div className="vn-section-title">Gallery</div>
          <div className="vn-gallery">
            {gallery.map((src, i) => (
              <div key={i} className="vn-thumb">
                <img
                  src={src}
                  alt={`photo ${i + 1}`}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.opacity = 0;
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
