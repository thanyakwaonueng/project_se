import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// โหลด CSS ของ Leaflet อัตโนมัติ (ไม่ต้อง import .css แยก)
function ensureLeafletCSS() {
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
}

// ไอคอนหมุด
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/**
 * props:
 *  - value: { lat, lng, address } | null
 *  - onChange: (next) => void
 *  - defaultCenter: [lat, lng]  (เช่น กทม. [13.7563,100.5018])
 *  - height: string (เช่น '380px')
 */
export default function MapPicker({
  value,
  onChange,
  defaultCenter = [13.7563, 100.5018],
  height = '380px',
}) {
  ensureLeafletCSS();

  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);

  const center = useMemo(() => {
    if (value?.lat && value?.lng) return [value.lat, value.lng];
    return defaultCenter;
  }, [value, defaultCenter]);

  // ค้นหาด้วย Nominatim
  async function searchPlace() {
    const q = keyword.trim();
    if (!q) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'th' } });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('nominatim search failed', e);
    }
  }

  // reverse geocoding เพื่อเอาข้อความที่อยู่กลับมา (ตอนคลิก/ลากหมุด)
  async function reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'th' } });
      const data = await res.json();
      return data?.display_name || '';
    } catch {
      return '';
    }
  }

  // ใช้ตำแหน่งฉัน (HTML5 Geolocation)
  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const address = await reverseGeocode(lat, lng);
      onChange?.({ lat, lng, address });
    });
  }

  return (
    <div>
      {/* แถบค้นหา */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="ค้นหาชื่อสถานที่ / ที่อยู่…"
          style={{
            flex: 1,
            height: 38,
            padding: '0 12px',
            borderRadius: 10,
            border: '1px solid #ddd',
            outline: 'none',
          }}
        />
        <button type="button" className="btn btn-outline-secondary" onClick={searchPlace}>
          ค้นหา
        </button>
        <button type="button" className="btn btn-outline-primary" onClick={useMyLocation}>
          ใช้ตำแหน่งฉัน
        </button>
      </div>

      {/* รายการผลลัพธ์ค้นหา (เลือกเพื่อปักหมุด) */}
      {results?.length ? (
        <div style={{ marginBottom: 8, background: '#fafafa', border: '1px solid #eee', borderRadius: 8 }}>
          {results.map((r) => (
            <div
              key={r.place_id}
              onClick={async () => {
                const lat = parseFloat(r.lat);
                const lng = parseFloat(r.lon);
                const address = r.display_name || (await reverseGeocode(lat, lng));
                onChange?.({ lat, lng, address });
                setResults([]); // พับผลลัพธ์
              }}
              style={{ padding: 10, cursor: 'pointer', borderTop: '1px solid #eee' }}
            >
              {r.display_name}
            </div>
          ))}
        </div>
      ) : null}

      {/* แผนที่ + หมุดลากได้ */}
      <MapContainer center={center} zoom={14} style={{ width: '100%', height }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler
          onPick={async ({ lat, lng }) => {
            const address = await reverseGeocode(lat, lng);
            onChange?.({ lat, lng, address });
          }}
        />
        {value?.lat && value?.lng ? (
          <Marker
            position={[value.lat, value.lng]}
            draggable
            icon={markerIcon}
            eventHandlers={{
              dragend: async (e) => {
                const p = e.target.getLatLng();
                const address = await reverseGeocode(p.lat, p.lng);
                onChange?.({ lat: p.lat, lng: p.lng, address });
              },
            }}
          >
            <Popup>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>ตำแหน่งสถานที่</div>
              <div style={{ fontSize: 12 }}>{value.address || ''}</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        ) : null}
      </MapContainer>

      {/* แสดงพิกัด/ที่อยู่ที่เลือก */}
      {value?.lat && value?.lng ? (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <div><b>ที่อยู่:</b> {value.address || '-'}</div>
          <div>
            <b>พิกัด:</b> {value.lat.toFixed(6)}, {value.lng.toFixed(6)}{' '}
            <a
              href={`https://www.google.com/maps?q=${value.lat},${value.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              เปิดใน Google Maps
            </a>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 13, color: '#777' }}>
          คลิกบนแผนที่เพื่อปักหมุด หรือค้นหาด้วยที่อยู่/ชื่อสถานที่
        </div>
      )}
    </div>
  );
}
