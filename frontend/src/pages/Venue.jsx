// src/pages/Venue.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { extractErrorMessage } from "../lib/api";
import "../css/Venue.css";

const FALLBACK_IMG = "/img/fallback.jpg";

const parseLatLng = (locationUrl, lat, lng) => {
  if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  if (!locationUrl) return null;
  // รองรับทั้ง ...q=18.79,98.97 หรือ @18.79,98.97,15z
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
  const { slugOrId } = useParams();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(""); setLoading(true);
        let v = null;
        // ลองด้วย id ก่อน
        try { v = (await api.get(`/venues/${slugOrId}`)).data; }
        catch {
          // ถ้าไม่เจอ ลองค้นจาก slug
          try {
            const r2 = await api.get("/venues", { params: { slug: slugOrId } });
            if (Array.isArray(r2.data) && r2.data.length) v = r2.data[0];
          } catch {}
        }
        if (!alive) return;
        if (!v) setErr("ไม่พบสถานที่ที่ต้องการ");
        else setVenue(v);
      } catch (e) {
        if (!alive) return;
        setErr(extractErrorMessage?.(e, "เกิดข้อผิดพลาดระหว่างดึงข้อมูลสถานที่") || "เกิดข้อผิดพลาด");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slugOrId]);

  const heroImg = useMemo(() => {
    if (!venue) return FALLBACK_IMG;
    return (
      venue.profilePhotoUrl ||
      venue.bannerUrl ||
      venue.coverImage ||
      FALLBACK_IMG
    );
  }, [venue]);

  const mapPoint = useMemo(() => {
    return parseLatLng(venue?.locationUrl || venue?.googleMapUrl, venue?.latitude, venue?.longitude);
  }, [venue]);

  if (loading) return <div className="vn-page"><div className="vn-loading">กำลังโหลด…</div></div>;
  if (err) return (
    <div className="vn-page">
      <div className="vn-error">{err}</div>
      <div style={{ marginTop: 8 }}>
        <Link to="/page_venues" className="vn-btn-ghost">← กลับแผนที่</Link>
      </div>
    </div>
  );
  if (!venue) return null;

  // เตรียมแกลเลอรี (string comma -> string[])
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
            alt={venue.name}
            loading="lazy"
            onError={(e)=>{ e.currentTarget.src = FALLBACK_IMG; }}
          />
        </div>

        <div className="vn-hero-body">
          <h1 className="vn-title">{venue.name || "Unnamed Venue"}</h1>
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
            {venue.website && <a className="vn-btn" href={venue.website} target="_blank" rel="noreferrer">Website ↗</a>}
            {venue.facebook && <a className="vn-btn-ghost" href={venue.facebook} target="_blank" rel="noreferrer">Facebook</a>}
            {venue.instagram && <a className="vn-btn-ghost" href={venue.instagram} target="_blank" rel="noreferrer">Instagram</a>}
            {venue.tiktok && <a className="vn-btn-ghost" href={venue.tiktok} target="_blank" rel="noreferrer">TikTok</a>}
            {venue.line && <a className="vn-btn-ghost" href={venue.line} target="_blank" rel="noreferrer">LINE</a>}
          </div>
        </div>

        <aside className="vn-hero-side">
          <div className="vn-card">
            <div className="vn-card-title">Contact</div>
            <div className="vn-kv"><div>Email</div><div>{venue.email ? <a className="vn-link" href={`mailto:${venue.email}`}>{venue.email}</a> : "—"}</div></div>
            <div className="vn-kv"><div>Phone</div><div>{venue.phone ? <a className="vn-link" href={`tel:${venue.phone}`}>{venue.phone}</a> : "—"}</div></div>
            <div className="vn-kv"><div>Location</div>
              <div>
                {venue.locationUrl
                  ? <a className="vn-link" href={venue.locationUrl} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>
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
              {venue.website && <li><a className="vn-link" href={venue.website} target="_blank" rel="noreferrer">Website</a></li>}
              {venue.facebook && <li><a className="vn-link" href={venue.facebook} target="_blank" rel="noreferrer">Facebook</a></li>}
              {venue.instagram && <li><a className="vn-link" href={venue.instagram} target="_blank" rel="noreferrer">Instagram</a></li>}
              {venue.tiktok && <li><a className="vn-link" href={venue.tiktok} target="_blank" rel="noreferrer">TikTok</a></li>}
              {venue.line && <li><a className="vn-link" href={venue.line} target="_blank" rel="noreferrer">LINE</a></li>}
              {!(venue.website||venue.facebook||venue.instagram||venue.tiktok||venue.line) && <li>—</li>}
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

      {/* ===== EVENTS (ถ้ามี) ===== */}
      {Array.isArray(venue.events) && venue.events.length > 0 && (
        <section className="vn-section">
          <div className="vn-section-title">Upcoming Events</div>
          <ul className="vn-event-list">
            {venue.events.map(ev => (
              <li key={ev.id || ev.slug || ev.title} className="vn-event-item">
                <div className="vn-event-main">
                  <div className="vn-event-title">{ev.title || ev.name}</div>
                  <div className="vn-event-sub">
                    {ev.date && <span>{new Date(ev.date).toLocaleString()}</span>}
                    {ev.price && <span> • {ev.price}</span>}
                  </div>
                </div>
                {(ev.id || ev.url) && (
                  ev.id
                    ? <Link className="vn-btn-ghost" to={`/page_events/${ev.id}`}>Details</Link>
                    : <a className="vn-btn-ghost" href={ev.url} target="_blank" rel="noreferrer">Details</a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="vn-section" style={{ display: "flex", gap: 8 }}>
        <Link to="/page_venues" className="vn-btn-ghost">← กลับแผนที่</Link>
      </section>
    </div>
  );
}
