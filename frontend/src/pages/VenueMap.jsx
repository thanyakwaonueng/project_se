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

// ===== ใช้รูปภาพ pin.png เป็นไอคอนแทน =====
const PIN_URL = '/img/pin.png';
const PIN_SIZE = 25;

const ICON_VENUE = L.icon({
  iconUrl: PIN_URL,
  iconRetinaUrl: PIN_URL,
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
    const dateStr = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(dt);
    const timeStr = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(dt);
    return `${dateStr} ${timeStr}`;
  } catch {
    return iso;
  }
}


// ===== path helpers =====
const toEventDetailPath = (ev) => {
  const key = ev?.id ?? ev?._id ?? ev?.slug;
  return key ? `/events/${encodeURIComponent(key)}` : (ev?.url || "#");
};
const toVenueDetailPath = (v) => {
  const id = v?.performerId ?? v?.id ?? v?._id;
  return id ? `/venues/${encodeURIComponent(id)}` : "#";
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
      const lat = v?.location?.latitude;
      const lng = v?.location?.longitude;
      if (lat == null || lng == null) return false;

      if (bounds) {
        const inLat = lat <= bounds.north && lat >= bounds.south;
        const inLng = bounds.west <= bounds.east
          ? (lng >= bounds.west && lng <= bounds.east)
          : (lng >= bounds.west || lng <= bounds.east);
        if (!(inLat && inLng)) return false;
      }
      if (q.trim()) {
        const name = (v?.performer?.user?.name || v?.name || '').toLowerCase();
        if (!name.includes(q.trim().toLowerCase())) return false;
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
      const v = ev?.venue;
      const lat = v?.location?.latitude;
      const lng = v?.location?.longitude;
      if (!v || lat == null || lng == null) return false;

      const dt = ev?.date ? new Date(ev.date) : null;
      if (!dt) return false;
      if (dt < now || dt > until) return false;

      if (bounds) {
        const inLat = lat <= bounds.north && lat >= bounds.south;
        const inLng = bounds.west <= bounds.east
          ? (lng >= bounds.west && lng <= bounds.east)
          : (lng >= bounds.west || lng <= bounds.east);
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




  // [ADD] Pagination (ต้องอยู่ "ภายใน" ฟังก์ชัน VenueMap เท่านั้น)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8; // 2 แถว x 4 ใบ/หน้า

  // เลือกลิสต์เต็มตามโหมด แล้วค่อยตัดตามหน้า
  const sourceList = mode === 'VENUES' ? visibleVenues : visibleEvents;
  const totalPages = Math.max(1, Math.ceil(sourceList.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = useMemo(
    () => sourceList.slice(start, start + ITEMS_PER_PAGE),
    [sourceList, start]
  );

  const goToPage = (p) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  // แสดงเลขรอบ current (±2)
  const pageNumbers = useMemo(() => {
    const delta = 2;
    const from = Math.max(1, currentPage - delta);
    const to = Math.min(totalPages, currentPage + delta);
    const arr = [];
    for (let i = from; i <= to; i++) arr.push(i);
    return arr;
  }, [currentPage, totalPages]);

  // reset หน้าเมื่อเงื่อนไขเปลี่ยน (กันเคสจำนวนลดลงแล้วค้างหน้าสูง)
  useEffect(() => {
    setCurrentPage(1);
  }, [mode, q, genre, eventType, daysForward, radiusKm, myLoc, bounds, visibleVenues.length, visibleEvents.length]);





  const totalVenuesWithCoords = useMemo(
    () =>
      venues.filter(v => v?.location?.latitude != null && v?.location?.longitude != null).length,
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
      <div className="vmap-section">
        {/* MAP CONTENT */}
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
                      key={`v-${v.performerId}`}
                      position={[v.location.latitude, v.location.longitude]}
                      icon={ICON_VENUE}
                    >
                      {/* Popup โหมด VENUES: ชื่อ + เวลาเปิด–ปิด */}
                      <Popup>
                        <div className="vmap-popupTitle">
                          <Link to={toVenueDetailPath(v)} className="vmap-popupTitleLink">
                            {v?.performer?.user?.name || v?.name || 'Unnamed Venue'}
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

        {/* CONTROLS BOX */}
        <div className="vmap-controls-box">
          <div className="vmap-controls">
            {/* Mode Title text */}
            <div className="vmap-modeTitle">
              {mode === 'VENUES' ? 'VENUES' : 'EVENTS'}
            </div>

            {/* Search */}
            <div className="vmap-searchBox">
              <input
                className="vmap-searchInput"
                placeholder={mode === 'VENUES' ? 'Search for a venue' : 'Search for an event'}
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

            {/* Filters */}
            {mode === 'VENUES' ? (
              <div className="vmap-selectWrap vmap-genreBox" title="แนวเพลง">
                <select className="vmap-select" value={genre} onChange={(e) => setGenre(e.target.value)}>
                  <option value="ALL">All genres</option>
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
                    <option value="ALL">All type</option>
                    <option value="OUTDOOR">Outdoor</option>
                    <option value="INDOOR">Indoor</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                  <span className="vmap-selectCaret" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>
                <div className="vmap-selectWrap" title="ช่วงเวลา">
                  <select className="vmap-select" value={daysForward} onChange={(e) => setDaysForward(e.target.value)}>
                    <option value="7">Next 7 days</option>
                    <option value="30">Next 30 days</option>
                    <option value="60">Next 60 days</option>
                  </select>
                  <span className="vmap-selectCaret" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>
              </>
            )}

            {/* Near me */}
            {/* <span
              className="vmap-ghostLink"
              onClick={flyToNearestVenue}
              title={nearestVenue ? `ใกล้สุด ≈ ${nearestVenue.distanceKm.toFixed(2)} km` : 'ยังไม่มีตำแหน่งฉัน'}
              style={{ cursor: nearestVenue ? 'pointer' : 'not-allowed', textDecoration: 'underline', color: '#111', display: 'inline-flex', alignItems: 'center', gap: '4px', opacity: nearestVenue ? 1 : 0.5 }}
            >
              Near me
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </span> */}

            {/* Switch (VENUES / EVENTS) */}
            <div className="vmap-modeBox">
              <button
                type="button"
                className={`vmap-arrowBtn ${mode === 'VENUES' ? 'is-active' : ''}`}
                onClick={() => setMode('VENUES')}
                aria-label="Show venues"
              >
                <svg viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" fill="none" strokeWidth="1.5">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 5 5 12 12 19" />
                </svg>
              </button>
              <button
                type="button"
                className={`vmap-arrowBtn ${mode === 'EVENTS' ? 'is-active' : ''}`}
                onClick={() => setMode('EVENTS')}
                aria-label="Show events"
              >
                <svg viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" fill="none" strokeWidth="1.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>

            {(err || geoErr) && (
              <div className="vmap-alert">
                {err || geoErr}
              </div>
            )}
          </div>
        </div>

        {/* LIST CARD CONTENT */}
        <div className="vmap-listBox">
          <div className="vmap-listHeader">
            {mode === 'VENUES'
              ? <>Showing {visibleVenues.length} of {totalVenuesWithCoords} venues with coordinates</>
              : <>Showing {visibleEvents.length} events (within the next {daysForward} days)</>
            }
          </div>

          {mode === 'VENUES' ? (
            visibleVenues.length === 0 ? (
              <div className="vmap-empty">เลื่อนแผนที่/ปรับรัศมีเพื่อหาสถานที่</div>
            ) : (
              <div className="vmap-grid">
                {pageItems.map(v => {
                  const img =
                    v?.performer?.user?.profilePhotoUrl ||
                    v.bannerUrl ||
                    v.coverImage ||
                    (Array.isArray(v.photoUrls) && v.photoUrls[0]) ||
                    '/img/fallback.jpg';

                  const lat = v?.location?.latitude;
                  const lng = v?.location?.longitude;

                  const oc = getOpenCloseText(v);
                  const subline = oc || v.address || '';

                  const distKm = (myLoc && lat != null && lng != null)
                    ? haversineKm(myLoc, { lat, lng })
                    : null;

                  return (
                    <div
                      key={v.performerId}
                      className="vmap-card"
                      onClick={() => window.location.href = toVenueDetailPath(v)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="vmap-cardImg">
                        <img
                          src={img}
                          alt={v?.performer?.user?.name || 'Venue'}
                          loading="lazy"
                          onError={(e)=>{e.currentTarget.src='/img/fallback.jpg';}}
                        />
                      </div>

                      <div className="vmap-cardBody">
                        <div className="vmap-cardTitle">
                          <Link to={toVenueDetailPath(v)} className="vmap-cardTitleLink">
                            {v?.performer?.user?.name || 'Unnamed Venue'}
                          </Link>
                        </div>

                        {/* {subline && (
                          <div className="vmap-cardSub">
                            <span className="vmap-sub">{subline}</span>
                          </div>
                        )} */}

                        <div className="vmap-cardMeta">
                          {typeof v.rating === 'number' && (
                            <span className="vmap-badge">★ {v.rating.toFixed(1)}</span>
                          )}
                          {Number.isFinite(distKm) && (
                            <span className="vmap-badge">{distKm.toFixed(1)} km</span>
                          )}
                        </div>

                        <div className="vmap-cardActions">
                          {v.genre && (
                            <span className="vmap-genreTag">{v.genre}</span>
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
                {pageItems.map(ev => {
                  const img = ev.bannerUrl
                    || ev.coverImage
                    || ev.image
                    || (Array.isArray(ev.images) && ev.images[0])
                    || ev.venue?.bannerUrl
                    || ev.venue?.coverImage
                    || ev.venue?.profilePhotoUrl
                    || (Array.isArray(ev.venue?.photoUrls) && ev.venue.photoUrls[0])
                    || '/img/fallback.jpg';

                  return (
                    <div
                      key={ev.id || ev._id || ev.slug}
                      className="vmap-card"
                      onClick={() => window.location.href = toEventDetailPath(ev)}
                      style={{ cursor: 'pointer' }}
                    >
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
                          {/* {ev.title || ev.name || 'Untitled Event'} */}
                        </div>

                        <div className="vmap-cardSub">
                          {ev.date && <span className="vmap-sub">{formatDT(ev.date)}</span>}
                          {ev.venue?.name && <span className="vmap-sub"> • {ev.venue.name}</span>}
                        </div>

                        {(ev.venue?.address || ev.address) && (
                          <a className="vmap-cardLink"
                            href={`https://maps.google.com/?q=${encodeURIComponent(ev.venue?.address || ev.address)}`}
                            target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
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
                            <a className="vmap-btn" href={ev.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>Visit Website ↗</a>
                          )}
                          {ev.eventType && <span className="vmap-eventTypeTag">{ev.eventType}</span>}
                          {ev.genre && <span className="vmap-genreTag">{ev.genre}</span>}
                        </div>
                      </div>
                    </div>

                  );
                })}
              </div>
            )
          )}

          {/* เส้นคั่นก่อน pagination */}
          <div className="linevenuemap" />
          
          {/* VENUES / EVENTS grid (เทิร์นารีทั้งก้อนที่คุณมีอยู่) */}
          {sourceList.length > 0 && (
            <nav className="vmap-pagination" aria-label="venue map pagination">
              <div className="p-nav-left">
                <button className="p-link" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  ← Previous
                </button>
              </div>

              <div className="p-nav-center">
                {pageNumbers[0] > 1 && (
                  <>
                    <button
                      className={`p-num ${currentPage === 1 ? "is-active" : ""}`}
                      onClick={() => goToPage(1)}
                      aria-current={currentPage === 1 ? "page" : undefined}
                    >
                      1
                    </button>
                    {pageNumbers[0] > 2 && <span className="p-ellipsis">…</span>}
                  </>
                )}

                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    className={`p-num ${p === currentPage ? "is-active" : ""}`}
                    onClick={() => goToPage(p)}
                    aria-current={p === currentPage ? "page" : undefined}
                  >
                    {p}
                  </button>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="p-ellipsis">…</span>}
                    <button
                      className={`p-num ${currentPage === totalPages ? "is-active" : ""}`}
                      onClick={() => goToPage(totalPages)}
                      aria-current={currentPage === totalPages ? "page" : undefined}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <div className="p-nav-right">
                <button className="p-link" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  Next →
                </button>
              </div>
            </nav>
          )}

        </div>
      </div>
    </div>
  );
}

function BoundsTracker({ onChange }) {
  useBounds(onChange);
  return null;
}
