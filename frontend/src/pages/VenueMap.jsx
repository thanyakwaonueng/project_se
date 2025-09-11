// frontend/src/pages/VenueMap.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../lib/api';

// ใช้ Leaflet แบบไม่ต้อง import css ไฟล์—เติมลิงก์ให้เอง
function ensureLeafletCSS() {
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
}

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// ไอคอนปักหมุดปกติ + ตอนเลือก
const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const iconSelected = L.icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [center]);
  return null;
}

export default function VenueMap() {
  const [venues, setVenues] = useState([]);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('ALL');
  const [alcohol, setAlcohol] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const [mapCenter, setMapCenter] = useState([13.7563, 100.5018]); // BKK default

  const listRef = useRef(null);

  useEffect(() => {
    ensureLeafletCSS();
    (async () => {
      try {
        const { data } = await api.get('/venues');
        setVenues(
          (data || []).filter(v => v.latitude && v.longitude) // ต้องมีพิกัด
        );
        // ตั้งศูนย์กลางเริ่มต้นเป็นจุดแรก ๆ ถ้ามี
        if (data?.length) {
          const first = data.find(v => v.latitude && v.longitude);
          if (first) setMapCenter([first.latitude, first.longitude]);
        }
      } catch (e) {
        console.error('load venues failed', e);
      }
    })();
  }, []);

  // สร้างชุดตัวเลือกจากข้อมูลจริง
  const genres = useMemo(() => {
    const set = new Set(venues.map(v => v.genre).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [venues]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venues.filter(v => {
      const passQ =
        !q ||
        v.name?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q);
      const passG = genre === 'ALL' || v.genre === genre;
      const passA = alcohol === 'ALL' || v.alcoholPolicy === alcohol;
      return passQ && passG && passA;
    });
  }, [venues, query, genre, alcohol]);

  const selected = useMemo(
    () => filtered.find(v => v.id === selectedId) || null,
    [filtered, selectedId]
  );

  const listCard = v => {
    const img =
      v.profilePhotoUrl || (v.photoUrls && v.photoUrls[0]) ||
      'https://picsum.photos/seed/venue/400/240';
    return (
      <div
        key={v.id}
        onClick={() => {
          setSelectedId(v.id);
          setMapCenter([v.latitude, v.longitude]);
          // เลื่อนไปบนสุดของลิสต์เมื่อเลือก (ถ้าต้องการ)
          // listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        style={{
          background: '#fff',
          border: v.id === selectedId ? '2px solid #c56' : '1px solid #e8e8e8',
          borderRadius: 12,
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
          <img
            src={img}
            alt={v.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {v.genre && (
            <span
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 8,
              }}
            >
              {v.genre}
            </span>
          )}
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{v.name}</div>
          {v.description && (
            <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
              {v.description.slice(0, 80)}
              {v.description.length > 80 ? '…' : ''}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginTop: 10,
              flexWrap: 'wrap',
            }}
          >
            {v.priceRate && (
              <span style={chipStyle}>{v.priceRate}</span>
            )}
            {v.alcoholPolicy && (
              <span style={chipStyle}>{v.alcoholPolicy}</span>
            )}
            {v.capacity ? <span style={chipStyle}>Cap {v.capacity}</span> : null}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {v.websiteUrl ? (
              <a
                href={v.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-outline-dark"
              >
                Visit Website
              </a>
            ) : null}
            <a
              href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-primary"
            >
              Open in Maps
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={pageStyle}>
      {/* แถบควบคุมด้านบนของฝั่งซ้าย */}
      <div style={leftColumnStyle}>
        <div style={toolbarStyle}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search venues…"
            style={searchStyle}
          />
          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            style={selectStyle}
          >
            {genres.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={alcohol}
            onChange={e => setAlcohol(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">All Alcohol</option>
            <option value="SERVE">Serve</option>
            <option value="BYOB">BYOB</option>
            <option value="NONE">None</option>
          </select>
        </div>

        <div ref={listRef} style={listStyle}>
          {filtered.length === 0 ? (
            <div style={{ color: '#777' }}>No venues</div>
          ) : (
            <div style={gridStyle}>
              {filtered.map(v => listCard(v))}
            </div>
          )}
        </div>
      </div>

      {/* ฝั่งขวา: แผนที่ */}
      <div style={rightColumnStyle}>
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyTo center={selected ? [selected.latitude, selected.longitude] : null} />

          {filtered.map(v => (
            <Marker
              key={v.id}
              position={[v.latitude, v.longitude]}
              icon={v.id === selectedId ? iconSelected : iconDefault}
              eventHandlers={{
                click: () => {
                  setSelectedId(v.id);
                },
              }}
            >
              <Popup>
                <div style={{ fontWeight: 700 }}>{v.name}</div>
                {v.genre ? <div style={{ fontSize: 12 }}>{v.genre}</div> : null}
                <div style={{ marginTop: 6 }}>
                  <a
                    href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

/* ---------- inline styles (ไม่ต้อง import css) ---------- */
const pageStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(360px, 520px) 1fr',
  gap: '0',
  height: 'calc(100vh - 72px)', // ลบความสูง navbar โดยประมาณ
  width: '100%',
};

const leftColumnStyle = {
  borderRight: '1px solid #eaeaea',
  background: '#f8f7f6',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const rightColumnStyle = {
  minWidth: 0,
};

const toolbarStyle = {
  display: 'flex',
  gap: 8,
  padding: 12,
  alignItems: 'center',
  borderBottom: '1px solid #eee',
  background: '#fff',
  position: 'sticky',
  top: 0,
  zIndex: 2,
};

const searchStyle = {
  flex: 1,
  height: 38,
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid #ddd',
  outline: 'none',
};

const selectStyle = {
  height: 38,
  borderRadius: 10,
  border: '1px solid #ddd',
  padding: '0 10px',
  background: '#fff',
};

const listStyle = {
  padding: 12,
  overflow: 'auto',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 12,
};

const chipStyle = {
  background: '#f1f1f1',
  border: '1px solid #e4e4e4',
  borderRadius: 999,
  padding: '2px 10px',
  fontSize: 12,
  color: '#333',
};
