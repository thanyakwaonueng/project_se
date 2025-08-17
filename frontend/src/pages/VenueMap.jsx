import React, { useEffect, useMemo, useState } from 'react';
import api, { extractErrorMessage } from '../lib/api';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

// ----- ไอคอนอีเวนต์เป็นป้ายกลมสีดำ + หาง -----
function eventIcon(text = 'EVT', color = '#111') {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position:relative;
        display:inline-flex;align-items:center;justify-content:center;
        padding:3px 8px;border-radius:999px;
        background:${color};color:#fff;
        font-weight:700;font-size:12px;
        box-shadow:0 2px 8px rgba(0,0,0,.35);
        transform:translate(-50%,-100%);left:50%;
        white-space:nowrap;
      ">
        <span>${text}</span>
        <div style="
          position:absolute;left:50%;bottom:-5px;transform:translateX(-50%);
          width:0;height:0;
          border-left:6px solid transparent;border-right:6px solid transparent;
          border-top:6px solid ${color};
          filter:drop-shadow(0 1px 1px rgba(0,0,0,.25));
        "></div>
      </div>
    `,
    iconAnchor: [18, 24],   // ยึดใกล้ปลายหาง
    popupAnchor: [0, -26],  // ให้ป๊อปลอยเหนือป้าย
  });
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

export default function VenueMap() {
  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  // โหมดแสดงผล: VENUES หรือ EVENTS
  const [mode, setMode] = useState('VENUES');

  // ฟิลเตอร์
  const [q, setQ] = useState('');                 // ค้นหาชื่อ
  const [genre, setGenre] = useState('ALL');      // สำหรับ VENUES
  const [eventType, setEventType] = useState('ALL'); // สำหรับ EVENTS
  const [daysForward, setDaysForward] = useState('60'); // แสดงอีเวนต์ล่วงหน้า X วัน

  // viewport bounds
  const [bounds, setBounds] = useState(null);

  // โหลด venues + events
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr('');
        setLoading(true);
        const [vRes, eRes] = await Promise.all([
          api.get('/venues'),
          api.get('/events') // include: venue, artists
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

  // สร้างชุด genre ที่มีใน venues
  const genres = useMemo(() => {
    const s = new Set();
    venues.forEach(v => v.genre && s.add(v.genre));
    return Array.from(s).sort();
  }, [venues]);

  // ===== กรอง VENUES =====
  const visibleVenues = useMemo(() => {
    return venues.filter(v => {
      if (v.latitude == null || v.longitude == null) return false;
      if (bounds) {
        const inLat = v.latitude <= bounds.north && v.latitude >= bounds.south;
        const inLng = bounds.west <= bounds.east
          ? (v.longitude >= bounds.west && v.longitude <= bounds.east)
          : (v.longitude >= bounds.west || v.longitude <= bounds.east); // antimeridian
        if (!(inLat && inLng)) return false;
      }
      if (q.trim()) {
        const hit = (v.name || '').toLowerCase().includes(q.trim().toLowerCase());
        if (!hit) return false;
      }
      if (genre !== 'ALL' && v.genre !== genre) return false;
      return true;
    });
  }, [venues, bounds, q, genre]);

  // ===== กรอง EVENTS =====
  const visibleEvents = useMemo(() => {
    const now = new Date();
    const maxDays = Number(daysForward) || 60;
    const until = new Date(now.getFullYear(), now.getMonth(), now.getDate() + maxDays);

    return events.filter(ev => {
      const v = ev.venue;
      if (!v || v.latitude == null || v.longitude == null) return false;

      const dt = ev?.date ? new Date(ev.date) : null;
      if (!dt) return false;
      if (dt < now || dt > until) return false;

      if (bounds) {
        const inLat = v.latitude <= bounds.north && v.latitude >= bounds.south;
        const inLng = bounds.west <= bounds.east
          ? (v.longitude >= bounds.west && v.longitude <= bounds.east)
          : (v.longitude >= bounds.west || v.longitude <= bounds.east);
        if (!(inLat && inLng)) return false;
      }

      if (q.trim()) {
        const hit = (ev.name || '').toLowerCase().includes(q.trim().toLowerCase());
        if (!hit) return false;
      }

      if (eventType !== 'ALL' && ev.eventType !== eventType) return false;

      return true;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [events, bounds, q, eventType, daysForward]);

  const totalVenuesWithCoords = useMemo(
    () => venues.filter(v => v.latitude != null && v.longitude != null).length,
    [venues]
  );

  if (loading) return <div style={{ padding: 16 }}>กำลังโหลด…</div>;

  return (
    <div style={{ padding: 16 }}>
      {/* Header / Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <div className="btn-group" role="group" aria-label="mode">
          <button
            className={`btn ${mode === 'VENUES' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setMode('VENUES')}
          >
            Venues
          </button>
          <button
            className={`btn ${mode === 'EVENTS' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setMode('EVENTS')}
          >
            Events
          </button>
        </div>

        <input
          className="form-control"
          placeholder={mode === 'VENUES' ? 'ค้นหาชื่อสถานที่…' : 'ค้นหาชื่ออีเวนต์…'}
          style={{ minWidth: 220, flex: '1 1 220px' }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {mode === 'VENUES' ? (
          <select className="form-select" value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="ALL">ทุกแนว</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        ) : (
          <>
            <select className="form-select" value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="ALL">ทุกประเภท</option>
              <option value="OUTDOOR">OUTDOOR</option>
              <option value="INDOOR">INDOOR</option>
              <option value="HYBRID">HYBRID</option>
            </select>
            <select className="form-select" value={daysForward} onChange={(e) => setDaysForward(e.target.value)}>
              <option value="7">7 วันข้างหน้า</option>
              <option value="30">30 วันข้างหน้า</option>
              <option value="60">60 วันข้างหน้า</option>
              <option value="90">90 วันข้างหน้า</option>
            </select>
          </>
        )}

        {err && (
          <div style={{ background: '#ffeef0', color: '#86181d', padding: 8, borderRadius: 8 }}>
            {err}
          </div>
        )}
      </div>

      {/* Map + List */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        {/* Map */}
        <div style={{ height: '70vh', minHeight: 420, borderRadius: 12, overflow: 'hidden', border: '1px solid #eee' }}>
          <MapContainer center={CNX} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <BoundsTracker onChange={setBounds} />

            {mode === 'VENUES' && visibleVenues.map(v => (
              <Marker key={`v-${v.id}`} position={[v.latitude, v.longitude]}>
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    <div style={{ fontWeight: 700 }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: '#555' }}>
                      Genre: {v.genre || '—'}<br/>
                      Capacity: {typeof v.capacity === 'number' ? v.capacity : '—'}<br/>
                      Alcohol: {v.alcoholPolicy || '—'}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {v.locationUrl && (
                        <a className="btn btn-primary btn-sm" href={v.locationUrl} target="_blank" rel="noreferrer">
                          เปิดแผนที่
                        </a>
                      )}
                      <Link className="btn btn-light btn-sm" to="/page_venues">
                        รายการทั้งหมด
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {mode === 'EVENTS' && visibleEvents.map(ev => {
              const v = ev.venue;
              return (
                <Marker
                  key={`e-${ev.id}`}
                  position={[v.latitude, v.longitude]}
                  icon={eventIcon('EVT')}
                >
                  <Popup>
                    <div style={{ minWidth: 240 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{ev.name || `Event #${ev.id}`}</div>
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                        ที่: {v.name} ({v.genre || '—'})<br/>
                        เวลา: {formatDT(ev.date)}<br/>
                        ประเภท: {ev.eventType || '—'} | Alcohol: {ev.alcoholPolicy || '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Link className="btn btn-primary btn-sm" to={`/page_events/${ev.id}`}>
                          ดูรายละเอียด
                        </Link>
                        {v.locationUrl && (
                          <a className="btn btn-light btn-sm" href={v.locationUrl} target="_blank" rel="noreferrer">
                            เปิดแผนที่
                          </a>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Side list */}
        <div style={{ maxHeight: '70vh', overflow: 'auto', border: '1px solid #eee', borderRadius: 12 }}>
          {mode === 'VENUES' ? (
            <div style={{ padding: 10, borderBottom: '1px solid #f0f0f0', color: '#666', fontSize: 13 }}>
              แสดง {visibleVenues.length} / ทั้งหมด {totalVenuesWithCoords} สถานที่ที่มีพิกัด
            </div>
          ) : (
            <div style={{ padding: 10, borderBottom: '1px solid #f0f0f0', color: '#666', fontSize: 13 }}>
              แสดง {visibleEvents.length} อีเวนต์ (ภายใน {daysForward} วันข้างหน้า)
            </div>
          )}

          {mode === 'VENUES' ? (
            visibleVenues.length === 0 ? (
              <div style={{ padding: 12, color: '#777' }}>เลื่อนแผนที่หรือซูมเพื่อหาสถานที่</div>
            ) : (
              <div style={{ display: 'grid' }}>
                {visibleVenues.map(v => (
                  <div key={`vl-${v.id}`} style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 700 }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{v.genre || '—'}</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#444' }}>
                      Capacity: {typeof v.capacity === 'number' ? v.capacity : '—'} | Alcohol: {v.alcoholPolicy || '—'}
                    </div>
                    {v.locationUrl && (
                      <div style={{ marginTop: 6 }}>
                        <a className="btn btn-light btn-sm" href={v.locationUrl} target="_blank" rel="noreferrer">
                          เปิดแผนที่
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            visibleEvents.length === 0 ? (
              <div style={{ padding: 12, color: '#777' }}>ยังไม่พบอีเวนต์ในกรอบแผนที่/ช่วงวันที่เลือก</div>
            ) : (
              <div style={{ display: 'grid' }}>
                {visibleEvents.map(ev => (
                  <div key={`el-${ev.id}`} style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Link to={`/page_events/${ev.id}`} style={{ fontWeight: 700, textDecoration: 'none' }}>
                        {ev.name || `Event #${ev.id}`}
                      </Link>
                      <div style={{ fontSize: 12, color: '#666' }}>{ev.eventType || '—'}</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#444' }}>
                      {formatDT(ev.date)} @ {ev.venue?.name || '—'}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <div style={{ marginTop: 10, color: '#6b7280', fontSize: 12 }}>
        * ถ้า Event ไม่ขึ้น: ตรวจสอบว่า Venue ของ Event นั้นมี Latitude/Longitude แล้วหรือยัง (ไปที่ <Link to="/me/venue">My Venue</Link> เพื่อแก้ไข)
      </div>
    </div>
  );
}

function BoundsTracker({ onChange }) {
  useBounds(onChange);
  return null;
}

function formatDT(iso) {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(dt);
  } catch {
    return iso;
  }
}
