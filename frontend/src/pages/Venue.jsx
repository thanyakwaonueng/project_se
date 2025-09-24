// src/pages/Venue.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { extractErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";            // ✅ เพิ่ม
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
  const params = useParams();
  const id = Number(params.id ?? params.slugOrId);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const { user } = useAuth();                     // ✅ ใช้ข้อมูลผู้ใช้
  const canEdit = !!user && (user.role === "ADMIN" || user.id === id); // ✅ เงื่อนไขแสดงปุ่ม

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(""); setLoading(true);

        if (!Number.isFinite(id) || !Number.isInteger(id)) { // ✅ กัน NaN
          setErr("Invalid venue id");
          return;
        }

        const v = (await api.get(`/venues/${id}`)).data;

        if (!alive) return;
        if (!v) setErr("ไม่พบสถานที่ที่ต้องการ");
        else setVenue(v);
      } catch (e) {
        if (!alive) return;
        setErr(
          extractErrorMessage?.(e, "เกิดข้อผิดพลาดระหว่างดึงข้อมูลสถานที่") || "เกิดข้อผิดพลาด"
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const heroImg = useMemo(() => {
    if (!venue) return FALLBACK_IMG;
    return (
      venue.performer?.user?.profilePhotoUrl ||
      venue.bannerUrl ||
      venue.coverImage ||
      FALLBACK_IMG
    );
  }, [venue]);

  const mapPoint = useMemo(() => {
    return parseLatLng(
      venue?.location?.locationUrl || venue?.googleMapUrl,
      venue?.location?.latitude,
      venue?.location?.longitude
    );
  }, [venue]);

  const fmtEnLong = (v) => {
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d)) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "long", day: "numeric", year: "numeric"
    }).format(d);
  };

  const eventsUpcoming = useMemo(() => {
    const list = Array.isArray(venue?.events) ? venue.events : [];
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return list
      .filter(ev => ev?.date && !isNaN(new Date(ev.date)) && new Date(ev.date) >= todayMid)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [venue]);

  if (loading) return <div className="vn-page"><div className="vn-loading">กำลังโหลด…</div></div>;
  if (err) return (
    <div className="vn-page">
      <div className="vn-error">{err}</div>
      <div style={{ marginTop: 8 }}>
        <Link to="/venues" className="vn-btn-ghost">← กลับแผนที่</Link>
      </div>
    </div>
  );
  if (!venue) return null;

  const gallery = (venue.photoUrls || venue.photos || "")
    .toString()
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <div className="vn-page">
      {/* ===== HERO ===== */}
      <section className="vn-hero">
        <div className="vn-hero-media">
          <img
            src={heroImg}
            alt={venue.performer?.user?.name || 'Venue'}
            loading="lazy"
            onError={(e)=>{ e.currentTarget.src = FALLBACK_IMG; }}
          />
        </div>

        <div className="vn-hero-body">
          <div className="vn-title-row">
            <h1 className="vn-title">{venue.performer?.user?.name || "Unnamed Venue"}</h1>
            {/* ✅ ปุ่มแก้ไข: แสดงเฉพาะเจ้าของ/ADMIN */}
            {canEdit && (
              <Link
                to={`/venues/${id}/edit`}
                className="vn-btn"
                style={{ marginLeft: 12, whiteSpace: 'nowrap' }}
              >
                Edit
              </Link>
            )}
          </div>

          <div className="vn-chips">
            {venue.genre && <span className="vn-chip">{venue.genre}</span>}
            {venue.priceRate && <span className="vn-chip">Price: {venue.priceRate}</span>}
            {venue.alcoholPolicy && <span className="vn-chip">Alcohol: {venue.alcoholPolicy}</span>}
            {venue.ageRestriction && <span className="vn-chip">Age: {venue.ageRestriction}+</span>}
            {venue.capacity && <span className="vn-chip">Cap: {venue.capacity}</span>}
          </div>
          {venue.description && <p className="vn-desc">{venue.description}</p>}

          {/* โซเชียล/ลิงก์สำคัญ */}
          <div className="vn-actions">
            {venue.websiteUrl && <a className="vn-btn" href={venue.websiteUrl} target="_blank" rel="noreferrer">Website ↗</a>}
            {venue.performer?.facebookUrl && <a className="vn-btn-ghost" href={venue.performer.facebookUrl} target="_blank" rel="noreferrer">Facebook</a>}
            {venue.performer?.instagramUrl && <a className="vn-btn-ghost" href={venue.performer.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>}
            {venue.performer?.tiktokUrl && <a className="vn-btn-ghost" href={venue.performer.tiktokUrl} target="_blank" rel="noreferrer">TikTok</a>}
            {venue.performer?.lineUrl && <a className="vn-btn-ghost" href={venue.performer.lineUrl} target="_blank" rel="noreferrer">LINE</a>}
          </div>
        </div>

        <aside className="vn-hero-side">
          <div className="vn-card">
            <div className="vn-card-title">Contact</div>
            <div className="vn-kv"><div>Email</div><div>{venue.performer?.contactEmail ? <a className="vn-link" href={`mailto:${venue.performer.contactEmail}`}>{venue.performer.contactEmail}</a> : "—"}</div></div>
            <div className="vn-kv"><div>Phone</div><div>{venue.performer?.contactPhone ? <a className="vn-link" href={`tel:${venue.performer.contactPhone}`}>{venue.performer.contactPhone}</a> : "—"}</div></div>
            <div className="vn-kv"><div>Location</div>
              <div>
                {venue?.location?.locationUrl
                  ? <a className="vn-link" href={venue.location.locationUrl} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>
                  : (mapPoint ? <a className="vn-link" href={`https://www.google.com/maps?q=${mapPoint.lat},${mapPoint.lng}`} target="_blank" rel="noreferrer">Open in Google Maps ↗</a> : "—")
                }
              </div>
            </div>
          </div>

          <div className="vn-card">
            <div className="vn-card-title">Hours & Dates</div>
            <div className="vn-kv"><div>Open</div><div>{fmtTime(venue.timeOpen)}</div></div>
            <div className="vn-kv"><div>Close</div><div>{fmtTime(venue.timeClose)}</div></div>
            <div className="vn-kv"><div>Date Open</div><div>{fmtDate(venue.dateOpen)}</div></div>
            <div className="vn-kv"><div>Date Close</div><div>{fmtDate(venue.dateClose)}</div></div>
          </div>
        </aside>
      </section>

      {/* ===== INFO GRID ===== */}
      <section className="vn-section">
        <div className="vn-info-grid">
          <div className="vn-info-block">
            <div className="vn-info-title">Basics</div>
            <div className="vn-kv"><div>Genre</div><div>{venue.genre || "—"}</div></div>
            <div className="vn-kv"><div>Capacity</div><div>{venue.capacity || "—"}</div></div>
            <div className="vn-kv"><div>Alcohol</div><div>{venue.alcoholPolicy || "—"}</div></div>
            <div className="vn-kv"><div>Age Restriction</div><div>{venue.ageRestriction || "—"}</div></div>
          </div>

          <div className="vn-info-block">
            <div className="vn-info-title">Address</div>
            <div className="vn-text">{venue.address || "—"}</div>
            {mapPoint && (
              <a className="vn-btn-ghost" style={{ marginTop: 8, width: "fit-content" }}
                 href={`https://www.google.com/maps?q=${mapPoint.lat},${mapPoint.lng}`}
                 target="_blank" rel="noreferrer">Open in Maps ↗</a>
            )}
          </div>

          <div className="vn-info-block">
            <div className="vn-info-title">Links</div>
            <ul className="vn-links">
              {venue.websiteUrl && <li><a className="vn-link" href={venue.websiteUrl} target="_blank" rel="noreferrer">Website</a></li>}
              {venue.performer?.facebookUrl && <li><a className="vn-link" href={venue.performer.facebookUrl} target="_blank" rel="noreferrer">Facebook</a></li>}
              {venue.performer?.instagramUrl && <li><a className="vn-link" href={venue.performer.instagramUrl} target="_blank" rel="noreferrer">Instagram</a></li>}
              {venue.performer?.tiktokUrl && <li><a className="vn-link" href={venue.performer.tiktokUrl} target="_blank" rel="noreferrer">TikTok</a></li>}
              {venue.performer?.lineUrl && <li><a className="vn-link" href={venue.performer.lineUrl} target="_blank" rel="noreferrer">LINE</a></li>}
              {!(venue.websiteUrl||venue.performer?.facebookUrl||venue.performer?.instagramUrl||venue.performer?.tiktokUrl||venue.performer?.lineUrl) && <li>—</li>}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== GALLERY ===== */}
      {gallery.length > 0 && (
        <section className="vn-section">
          <div className="vn-section-title">Gallery</div>
          <div className="vn-gallery">
            {gallery.map((src, i) => (
              <div key={i} className="vn-thumb">
                <img src={src} alt={`photo ${i+1}`} loading="lazy"
                     onError={(e)=>{ e.currentTarget.style.opacity=0; }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== UPCOMING ===== */}
      <section className="vn-section">
        <h2 className="a-section-title">Upcoming</h2>
        <div className="a-panel">
          <ul className="a-schedule-list">
            {eventsUpcoming.map(ev => (
              <li key={ev.id || ev.slug || ev.title} className="a-schedule-item">
                <div className="a-date">{fmtEnLong(ev.date || ev.dateISO)}</div>
                <div className="a-event">
                  <div className="a-event-title">{ev.title || ev.name}</div>
                  <div className="a-event-sub">
                    {(ev.venue?.name || venue.performer?.user?.name) || ""}{/* ✅ กัน null */}
                    {ev.city ? ` • ${ev.city}` : ""}
                    {ev.price ? ` • ${ev.price}` : ""}
                  </div>
                </div>
                {(ev.id || ev.url || ev.ticketLink) && (
                  ev.id ? (
                    <Link className="a-link" to={`/events/${ev.id}`}>Detail</Link>
                  ) : ev.url ? (
                    <a className="a-link" href={ev.url} target="_blank" rel="noreferrer">Detail</a>
                  ) : (
                    <a className="a-link" href={ev.ticketLink} target="_blank" rel="noreferrer">Detail</a>
                  )
                )}
              </li>
            ))}

            {eventsUpcoming.length === 0 && (
              <li className="a-empty">ยังไม่มีกิจกรรมที่จะเกิดขึ้น</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
