// frontend/src/pages/VenueMap.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { extractErrorMessage } from '../lib/api';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvent, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import "../css/Venuemap.css";

// ----- Fix default marker paths (สำหรับ Vite) -----
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const CNX = { lat: 18.7883, lng: 98.9853 }; // Chiang Mai

// // ===== สร้าง SVG pin เป็น data URL =====
// const pinSvg = (stroke = '#111') => `
// <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'
//      fill='none' stroke='${stroke}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
//   <path d='M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0'/>
//   <circle cx='12' cy='10' r='3'/>
// </svg>`;
// const toDataUrl = s => `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;

// // ===== divIcon พร้อมพื้นหลัง + hover =====
// function makePinDivIcon({ stroke = '#111', size = 28, extraClass = '' }) {
//   const box = size + 8;     // กล่องพื้นหลัง (ใหญ่กว่า SVG นิดหน่อย)
//   const height = box + 12;  // เผื่อส่วนปลายหมุด
//   const html = `
//     <div class="vmap-pin-wrap ${extraClass}" style="width:${box}px;height:${box}px;">
//       <img class="vmap-pin-svg" alt="pin" src="${toDataUrl(pinSvg(stroke))}"
//            style="width:${size}px;height:${size}px"/>
//     </div>
//   `;
//   return L.divIcon({
//     className: 'vmap-pin',
//     html,
//     iconSize: [box, height],
//     iconAnchor: [box / 2, height],
//     popupAnchor: [0, -height],
//   });
// }

// // Venue = ดำ, Event = ดำ (ให้โทนเดียวกัน)
// const ICON_VENUE = makePinDivIcon({ stroke: '#111', size: 28, extraClass: 'venue-pin' });
// const ICON_EVENT = makePinDivIcon({ stroke: '#000', size: 28, extraClass: 'event-pin' });

// ===== ใช้รูปภาพ pin.png เป็นไอคอนแทน =====
// วาง pin.png ไว้ที่ public/img/pin.png
const PIN_URL = '/img/pin.png';
const PIN_SIZE = 34; // ปรับได้ 28–40 ตามขนาดรูปจริง

// กำหนด anchor ให้ปลายไอคอนอยู่ชี้ที่พิกัดพอดี (กึ่งกลางล่าง)
const ICON_VENUE = L.icon({
  iconUrl: PIN_URL,
  iconRetinaUrl: PIN_URL,     // ใช้ไฟล์เดียวกันไปก่อน
  iconSize: [PIN_SIZE, PIN_SIZE],
  iconAnchor: [PIN_SIZE / 2, PIN_SIZE],
  popupAnchor: [0, -PIN_SIZE + 4],
  className: 'vmap-imgPin venue-pin'
});

const ICON_EVENT = L.icon({
  iconUrl: PIN_URL,
  iconRetinaUrl: PIN_URL,
  iconSize: [PIN_SIZE, PIN_SIZE],
  iconAnchor: [PIN_SIZE / 2, PIN_SIZE],
  popupAnchor: [0, -PIN_SIZE + 4],
  className: 'vmap-imgPin event-pin'
});

// -------- Geo helpers --------
function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function useBounds(onChange) {
  const [bounds, setBounds] = useState(null);
  useMapEvent('moveend', (e) => {
    const b = e.target.getBounds();
    const payload = {
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    };
    setBounds(payload);
    onChange?.(payload);
  });
  return bounds;
}

// ===== formatter =====
function formatDT(iso) {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(dt);
  } catch {
    return iso;
  }
}

// ===== path helpers =====
const toEventDetailPath = (ev) => {
  const key = ev?.id ?? ev?._id ?? ev?.slug;
  return key ? `/page_events/${encodeURIComponent(key)}` : (ev?.url || "#");
};
const toVenueDetailPath = (v) => {
  const key = v?.performerId ?? v?._id ?? v?.slug ?? v?.slugOrId;
  return key ? `/page_venues/${encodeURIComponent(key)}` : "#";
};

// ===== เวลาเปิด–ปิด (รองรับหลายคีย์) =====
const getOpenCloseText = (v) => {
  const open =
    v?.timeOpen ??
    v?.openTime ??
    v?.openingTime ??
    v?.open ??
    v?.hours?.open ??
    v?.opening_hours?.open;

  const close =
    v?.timeClose ??
    v?.closeTime ??
    v?.closingTime ??
    v?.close ??
    v?.hours?.close ??
    v?.opening_hours?.close;

  if (!open && !close) return null;
  return `${open || '—'}–${close || '—'}`;
};

export default function VenueMap() {
  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState('VENUES');

  // ฟิลเตอร์
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('ALL');
  const [eventType, setEventType] = useState('ALL');
  const [daysForward, setDaysForward] = useState('60');

  const [bounds, setBounds] = useState(null);
  const [myLoc, setMyLoc] = useState(null);
  const [geoErr, setGeoErr] = useState('');
  const [radiusKm, setRadiusKm] = useState('ALL');

  // แผนที่
  const mapRef = useRef(null);
  const [center, setCenter] = useState(CNX);
  const [zoom, setZoom] = useState(13);

  // โหลดข้อมูล
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr('');
        setLoading(true);
        const [vRes, eRes] = await Promise.all([
          api.get('/venues'),
          api.get('/events'),
        ]);
        if (!alive) return;
        setVenues(Array.isArray(vRes.data) ? vRes.data : []);
        setEvents(Array.isArray(eRes.data) ? eRes.data : []);
      } catch (e) {
        if (!alive) return;
        setErr(extractErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const genres = useMemo(() => {
    const s = new Set();
    venues.forEach(v => v.genre && s.add(v.genre));
    return Array.from(s).sort();
  }, [venues]);

  // ===== กรอง VENUES =====
  const visibleVenuesBase = useMemo(() => {
    return venues.filter(v => {
      if (v.location.latitude == null || v.location.longitude == null) return false;
      if (bounds) {
        const inLat = v.location.latitude <= bounds.north && v.location.latitude >= bounds.south;
        const inLng = bounds.west <= bounds.east
          ? (v.location.longitude >= bounds.west && v.location.longitude <= bounds.east)
          : (v.location.longitude >= bounds.west || v.location.longitude <= bounds.east);
        if (!(inLat && inLng)) return false;
      }
      if (q.trim()) {
        const hit = (v.performer.user.name || '').toLowerCase().includes(q.trim().toLowerCase());
        if (!hit) return false;
      }
      if (genre !== 'ALL' && v.genre !== genre) return false;
      return true;
    });
  }, [venues, bounds, q, genre]);

  const visibleVenues = useMemo(() => {
    if (!myLoc || radiusKm === 'ALL') return visibleVenuesBase;
    const r = Number(radiusKm);
    return visibleVenuesBase.filter(v => {
      const d = haversineKm(myLoc, { lat: v.location.latitude, lng: v.location.longitude });
      return d <= r;
    });
  }, [visibleVenuesBase, myLoc, radiusKm]);

  // ===== กรอง EVENTS =====
  const visibleEvents = useMemo(() => {
    const now = new Date();
    const maxDays = Number(daysForward) || 60;
    const until = new Date(now.getFullYear(), now.getMonth(), now.getDate() + maxDays);

    let filtered = events.filter(ev => {
      const v = ev.venue;
      if (!v || v.location.latitude == null || v.location.longitude == null) return false;

      const dt = ev?.date ? new Date(ev.date) : null;
      if (!dt) return false;
      if (dt < now || dt > until) return false;

      if (bounds) {
        const inLat = v.location.latitude <= bounds.north && v.location.latitude >= bounds.south;
        const inLng = bounds.west <= bounds.east
          ? (v.location.longitude >= bounds.west && v.location.longitude <= bounds.east)
          : (v.location.longitude >= bounds.west || v.location.longitude <= bounds.east);
        if (!(inLat && inLng)) return false;
      }

      if (q.trim()) {
        const hit = (ev.name || ev.title || '').toLowerCase().includes(q.trim().toLowerCase());
        if (!hit) return false;
      }

      if (eventType !== 'ALL' && ev.eventType !== eventType) return false;

      return true;
    });

    if (myLoc && radiusKm !== 'ALL') {
      const r = Number(radiusKm);
      filtered = filtered.filter(ev => {
        const v = ev.venue;
        const d = haversineKm(myLoc, { lat: v.location.latitude, lng: v.location.longitude });
        return d <= r;
      });
    }

    return filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [events, bounds, q, eventType, daysForward, myLoc, radiusKm]);

  const totalVenuesWithCoords = useMemo(
    () => venues.filter(v => v.location.latitude != null && v.location.longitude != null).length,
    [venues]
  );

  const nearestVenue = useMemo(() => {
    if (!myLoc) return null;
    const source = visibleVenues.length ? visibleVenues : visibleVenuesBase;
    if (!source.length) return null;
    let best = null;
    for (const v of source) {
      const d = haversineKm(myLoc, { lat: v.location.latitude, lng: v.location.longitude });
      if (!best || d < best.distanceKm) best = { venue: v, distanceKm: d };
    }
    return best;
  }, [myLoc, visibleVenues, visibleVenuesBase]);

  const requestMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoErr('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
      return;
    }
    setGeoErr('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLoc(loc);
        if (mapRef.current) mapRef.current.setView(loc, 15);
      },
      (e) => setGeoErr(e.message || 'ไม่สามารถอ่านตำแหน่งได้'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  const flyToNearestVenue = () => {
    if (!nearestVenue || !mapRef.current) return;
    const v = nearestVenue.venue;
    mapRef.current.flyTo([v.location.latitude, v.location.longitude], 17, { duration: 0.8 });
  };

  if (loading) return <div style={{ padding: 16 }}>กำลังโหลด…</div>;

  return (
    <div className="vmap-page">
      {/* Header / Controls */}
      <div className="vmap-controls">
        <div className="vmap-filterBtns" role="group" aria-label="mode">
          <button
            type="button"
            className={`vmap-filterBtn ${mode === 'VENUES' ? 'is-active' : ''}`}
            onClick={() => setMode('VENUES')}
          >
            Venues
          </button>
          <button
            type="button"
            className={`vmap-filterBtn ${mode === 'EVENTS' ? 'is-active' : ''}`}
            onClick={() => setMode('EVENTS')}
          >
            Events
          </button>
        </div>

        {/* Search */}
        <div className="vmap-searchBox">
          <input
            className="vmap-searchInput"
            placeholder={mode === 'VENUES' ? 'ค้นหาชื่อสถานที่…' : 'ค้นหาชื่ออีเวนต์…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="vmap-searchIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
        </div>

        {mode === 'VENUES' ? (
          <div className="vmap-selectWrap vmap-genreBox" title="แนวเพลง">
            <select
              className="vmap-select"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              <option value="ALL">ทุกแนว</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <span className="vmap-selectCaret" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        ) : (
          <>
            <div className="vmap-selectWrap" title="ประเภทอีเวนต์">
              <select className="vmap-select" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option value="ALL">ทุกประเภท</option>
                <option value="OUTDOOR">OUTDOOR</option>
                <option value="INDOOR">INDOOR</option>
                <option value="HYBRID">HYBRID</option>
              </select>
              <span className="vmap-selectCaret" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </div>

            <div className="vmap-selectWrap" title="ช่วงเวลา">
              <select className="vmap-select" value={daysForward} onChange={(e) => setDaysForward(e.target.value)}>
                <option value="7">7 วันข้างหน้า</option>
                <option value="30">30 วันข้างหน้า</option>
                <option value="60">60 วันข้างหน้า</option>
                <option value="90">90 วันข้างหน้า</option>
              </select>
              <span className="vmap-selectCaret" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </div>
          </>
        )}

        {/* GPS + Radius */}
        <button className="vmap-ghostBtn" onClick={requestMyLocation}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s7-4.5 7-11a7 7 0 0 0-14 0c0 6.5 7 11 7 11z"></path>
            <circle cx="12" cy="11" r="3"></circle>
          </svg>
          ตำแหน่งของฉัน
        </button>
        <div className="vmap-selectWrap vmap-radiusSelectWrap" title="รัศมี">
          <select
            className="vmap-select"
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value)}
          >
            <option value="ALL">ทุกรัศมี</option>
            <option value="1">≤ 1 km</option>
            <option value="3">≤ 3 km</option>
            <option value="5">≤ 5 km</option>
            <option value="10">≤ 10 km</option>
          </select>
          <span className="vmap-selectCaret" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </div>

        <button
          className="vmap-ghostBtn"
          onClick={flyToNearestVenue}
          disabled={!nearestVenue}
          title={nearestVenue ? `ใกล้สุด ≈ ${nearestVenue.distanceKm.toFixed(2)} km` : 'ยังไม่มีตำแหน่งฉัน'}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          ใกล้ฉัน
        </button>

        {(err || geoErr) && (
          <div className="vmap-alert">
            {err || geoErr}
          </div>
        )}
      </div>

      {/* ====== Layout 2 คอลัมน์: ซ้าย (Map) / ขวา (List) ====== */}
      <div className="vmap-twoCol">
        {/* ซ้าย: แผนที่ */}
        <div className="vmap-mapCol">
          <div className="vmap-mapBox">
            <MapContainer
              whenCreated={(map) => {
                mapRef.current = map;
                map.on('moveend', () => {
                  const c = map.getCenter();
                  setCenter({ lat: c.lat, lng: c.lng });
                  setZoom(map.getZoom());
                });
              }}
              center={[center.lat, center.lng]}
              zoom={zoom}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
<TileLayer
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
  url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
/>

              {/* อัปเดตขอบเขตแผนที่เข้ากับ state */}
              <BoundsTracker onChange={setBounds} />

              {/* วาดรัศมีจากตำแหน่งฉัน (ถ้ามี) */}
              {myLoc && radiusKm !== 'ALL' && (
                <Circle
                  center={[myLoc.lat, myLoc.lng]}
                  radius={Number(radiusKm) * 1000}
                  pathOptions={{ color: '#111', fillOpacity: 0.08 }}
                />
              )}

              {/* หมุดตามโหมด */}
              {mode === 'VENUES'
                ? visibleVenues.map(v => (
                    <Marker
                      key={`v-${v.performerId || v.slug}`}
                      position={[v.location.latitude, v.location.longitude]}
                      icon={ICON_VENUE}
                    >
                      {/* Popup โหมด VENUES: ชื่อ + เวลาเปิด–ปิด */}
                      <Popup>
                        <div className="vmap-popupTitle">
                          <Link to={toVenueDetailPath(v)} className="vmap-popupTitleLink">
                            {v.performer.user.name || 'Unnamed Venue'}
                          </Link>
                        </div>
                        {(() => {
                          const oc = getOpenCloseText(v);
                          return oc ? <div className="vmap-popupSub">{oc}</div> : null;
                        })()}
                      </Popup>
                    </Marker>
                  ))
                : visibleEvents.map(ev => (
                    <Marker
                      key={`e-${ev.id || ev._id || ev.slug}`}
                      position={[ev.venue.location.latitude, ev.venue.location.longitude]}
                      icon={ICON_EVENT}
                    >
                      {/* Popup โหมด EVENTS: ชื่ออย่างเดียว */}
                      <Popup>
                        <div className="vmap-popupTitle">
                          <Link to={toEventDetailPath(ev)} className="vmap-popupTitleLink">
                            {ev.title || ev.name || 'Untitled Event'}
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  ))
              }
            </MapContainer>
          </div>
        </div>

        {/* ขวา: ลิสต์แบบการ์ด */}
        <aside className="vmap-listPane">
          <div className="vmap-listHeader">
            {mode === 'VENUES'
              ? <>แสดง {visibleVenues.length} / ทั้งหมด {totalVenuesWithCoords} สถานที่ที่มีพิกัด</>
              : <>แสดง {visibleEvents.length} อีเวนต์ (ภายใน {daysForward} วันข้างหน้า)</>
            }
          </div>

          {mode === 'VENUES' ? (
            visibleVenues.length === 0 ? (
              <div className="vmap-empty">เลื่อนแผนที่/ปรับรัศมีเพื่อหาสถานที่</div>
            ) : (
              <div className="vmap-grid">
                {visibleVenues.map(v => {
                  const img = v.bannerUrl
                    || v.coverImage
                    || v.performer.user.profilePhotoUrl
                    || (Array.isArray(v.photoUrls) && v.photoUrls[0])
                    || '/img/fallback.jpg';
                  const hasLoc = v.location.latitude != null && v.location.longitude != null;

                  // สตริงบรรทัดย่อย (เวลาเปิด–ปิด ถ้าไม่มีใช้ address)
                  const oc = getOpenCloseText(v);
                  const subline = oc || v.address || '';

                  // คำนวณระยะทาง (แสดงใน badge)
                  const distKm = myLoc
                    ? haversineKm(myLoc, { lat: v.location.latitude, lng: v.location.longitude })
                    : null;

                  return (
                    <div key={v.performerId || v.slug} className="vmap-card">
                      <div className="vmap-cardImg">
                        <img
                          src={img}
                          alt={v.performer.user.name}
                          loading="lazy"
                          onError={(e)=>{e.currentTarget.src='/img/fallback.jpg';}}
                        />
                      </div>

                      <div className="vmap-cardBody">
                        {/* ชื่อร้าน (ลิงก์หัวการ์ด) */}
                        <div className="vmap-cardTitle">
                          <Link
                            to={toVenueDetailPath(v)}
                            className="vmap-cardTitleLink"
                          >
                            {v.performer.user.name || 'Unnamed Venue'}
                          </Link>
                        </div>

                        {/* บรรทัดย่อยใต้ชื่อ */}
                        {subline && (
                          <div className="vmap-cardSub">
                            <span className="vmap-sub">{subline}</span>
                          </div>
                        )}

                        {/* meta ด้านขวา */}
                        <div className="vmap-cardMeta">
                          {typeof v.rating === 'number' && (
                            <span className="vmap-badge">★ {v.rating.toFixed(1)}</span>
                          )}
                          {Number.isFinite(distKm) && (
                            <span className="vmap-badge">{distKm.toFixed(1)} km</span>
                          )}
                        </div>

                        {/* ปุ่มแอ็กชัน */}
                        <div className="vmap-cardActions">
                          {v.website && (
                            <a className="vmap-btn" href={v.website} target="_blank" rel="noreferrer">
                              Visit Website ↗
                            </a>
                          )}
                          {hasLoc && (
                            <a
                              className="vmap-btn vmap-btnGhost"
                              href={`https://www.google.com/maps?q=${v.location.latitude},${v.location.longitude}`}
                              target="_blank" rel="noreferrer"
                            >
                              เปิดแผนที่
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* EVENTS */
            visibleEvents.length === 0 ? (
              <div className="vmap-empty">ยังไม่พบอีเวนต์ในกรอบแผนที่/ช่วงวันที่เลือก</div>
            ) : (
              <div className="vmap-grid">
                {visibleEvents.map(ev => {
                  const img = ev.bannerUrl
                    || ev.coverImage
                    || ev.image
                    || (Array.isArray(ev.images) && ev.images[0])
                    || ev.venue?.bannerUrl
                    || ev.venue?.coverImage
                    || ev.venue?.profilePhotoUrl
                    || (Array.isArray(ev.venue?.photoUrls) && ev.venue.photoUrls[0])
                    || '/img/fallback.jpg';
                  const hasLoc = ev.venue?.latitude != null && ev.venue?.longitude != null;
                  return (
                    <div key={ev.id || ev._id || ev.slug} className="vmap-card">
                      <div className="vmap-cardImg">
                        <img
                          src={img}
                          alt={ev.title || ev.name}
                          loading="lazy"
                          onError={(e)=>{e.currentTarget.src='/img/fallback.jpg';}}
                        />
                      </div>

                      <div className="vmap-cardBody">
                        <div className="vmap-cardTitle">
                          <Link to={toEventDetailPath(ev)} className="vmap-cardTitleLink">
                            {ev.title || ev.name || 'Untitled Event'}
                          </Link>
                        </div>

                        <div className="vmap-cardSub">
                          {ev.date && <span className="vmap-sub">{formatDT(ev.date)}</span>}
                          {ev.venue?.name && <span className="vmap-sub"> • {ev.venue.name}</span>}
                        </div>

                        {(ev.venue?.address || ev.address) && (
                          <a className="vmap-cardLink"
                             href={`https://maps.google.com/?q=${encodeURIComponent(ev.venue?.address || ev.address)}`}
                             target="_blank" rel="noreferrer">
                            {ev.venue?.address || ev.address}
                          </a>
                        )}

                        <div className="vmap-cardMeta">
                          {typeof ev.distanceKm === 'number' && (
                            <span className="vmap-badge">{ev.distanceKm.toFixed(1)} km</span>
                          )}
                          {ev.price && <span className="vmap-badge">{ev.price}</span>}
                        </div>

                        <div className="vmap-cardActions">
                          {ev.url && (
                            <a className="vmap-btn" href={ev.url} target="_blank" rel="noreferrer">Visit Website ↗</a>
                          )}
                          {hasLoc && (
                            <a
                              className="vmap-btn vmap-btnGhost"
                              href={`https://www.google.com/maps?q=${ev.venue.location.latitude},${ev.venue.location.longitude}`}
                              target="_blank" rel="noreferrer"
                            >
                              เปิดแผนที่
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </aside>
      </div>
    </div>
  );
}

function BoundsTracker({ onChange }) {
  useBounds(onChange);
  return null;
}
