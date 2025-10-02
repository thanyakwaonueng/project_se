import React, { useEffect, useMemo, useRef, useState } from 'react';
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

function ClickHandler({ onPickImmediate }) {
  useMapEvents({
    click(e) {
      onPickImmediate({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/**
 * ✅ รองรับทั้งสองสไตล์พร็อพ:
 *    (A) ใหม่:  value={{lat, lng, address}}  + onChange(next)
 *    (B) เก่า:  lat={..} lng={..}  + onPick(({lat,lng,address}))
 *
 *    ถ้ามีค่าเข้ามาทั้งคู่ จะให้ priority กับ (A)
 *
 * อื่น ๆ:
 *  - defaultCenter: [lat, lng]  (ดีฟอลต์ = เชียงใหม่ 18.7883, 98.9853)
 *  - height: string (เช่น '380px')
 */
export default function MapPicker(props) {
  ensureLeafletCSS();

  // ====== PRop mapping & compatibility layer ======
  const {
    value,              // ใหม่: {lat, lng, address}
    onChange,           // ใหม่: (next) => void
    lat: latProp,       // เก่า: number|undefined
    lng: lngProp,       // เก่า: number|undefined
    onPick,             // เก่า: ({lat,lng,address}) => void

    // ดีฟอลต์ center เป็น "เชียงใหม่"
    defaultCenter = [18.7883, 98.9853],
    height = '380px',
  } = props;

  // สร้าง object ตำแหน่งจากรูปแบบเก่าถ้าไม่มี value ใหม่
  const derivedValue = useMemo(() => {
    if (value && value.lat != null && value.lng != null) return value;
    if (latProp != null && lngProp != null) return { lat: latProp, lng: lngProp, address: '' };
    return null;
  }, [value, latProp, lngProp]);

  // center ของแผนที่
  const center = useMemo(() => {
    if (derivedValue?.lat != null && derivedValue?.lng != null) {
      return [derivedValue.lat, derivedValue.lng];
    }
    return defaultCenter;
  }, [derivedValue, defaultCenter]);

  // state ภายในเพื่อโชว์ address (ไม่บังคับให้พาเรนต์ต้องเก็บ)
  const [addressLocal, setAddressLocal] = useState(derivedValue?.address || '');
  useEffect(() => {
    setAddressLocal(derivedValue?.address || '');
  }, [derivedValue?.address]);

  // ====== ค้นหาด้วย Nominatim (มี debounce ส่วน reverse geocode) ======
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);

  async function searchPlace() {
    const q = keyword.trim();
    if (!q) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'th' } });
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('nominatim search failed', e);
      setResults([]);
    }
  }

  // ====== Reverse geocode: ไม่ throw, ไม่บล็อกหมุด, มี debounce ======
  const revTimer = useRef(null);
  async function reverseGeocode(lat, lng) {
    try {
      // ใส่ format=jsonv2 และไม่ตั้ง no-cors (จะอ่านผลไม่ได้)
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'th' } });
      if (!res.ok) return '';
      const data = await res.json();
      return data?.display_name || '';
    } catch {
      return '';
    }
  }

  // helper: ส่งค่าออกไปยังพาเรนต์ในรูปแบบที่เขาใช้ (รองรับทั้งใหม่/เก่า)
  function emitToParent(next) {
    if (onChange) onChange(next);
    if (onPick) onPick(next);
  }

  // ✅ ปักหมุดทันที (ไม่รอ reverse geocode) จาก: คลิก/ลาก/เลือกผลค้นหา
  function pickImmediate(lat, lng, addrMaybe = '') {
    // 1) แจ้งพาเรนต์ก่อนเลย เพื่อให้หมุดขึ้นทันที
    emitToParent({ lat, lng, address: addrMaybe });

    // 2) ยิง reverse geocode แบบ debounce เบื้องหลัง (ไม่บล็อกหมุด)
    if (revTimer.current) clearTimeout(revTimer.current);
    revTimer.current = setTimeout(async () => {
      const addr = await reverseGeocode(lat, lng);
      setAddressLocal(addr || '');
      // อัปเดตกลับให้พาเรนต์ แต่ถ้าเขาไม่สน address ก็ไม่เป็นไร
      emitToParent({ lat, lng, address: addr || '' });
    }, 800);
  }

  // ใช้ตำแหน่งฉัน (HTML5 Geolocation) — ปักหมุดก่อน, address ตามมาทีหลัง
  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        pickImmediate(lat, lng);
      },
      () => {
        // เงียบ ๆ ไม่ต้องทำอะไร
      }
    );
  }

  // แฮนเดิลตอนคลิกบนแผนที่
  const onPickImmediate = ({ lat, lng }) => {
    pickImmediate(lat, lng);
  };

  const hasMarker = derivedValue?.lat != null && derivedValue?.lng != null;

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
              onClick={() => {
                const lat = parseFloat(r.lat);
                const lng = parseFloat(r.lon);
                // ปักหมุดก่อนเลยด้วย display_name ถ้ามี
                pickImmediate(lat, lng, r.display_name || '');
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

        {/* คลิกปักหมุดทันที */}
        <ClickHandler onPickImmediate={onPickImmediate} />

        {hasMarker ? (
          <Marker
            position={[derivedValue.lat, derivedValue.lng]}
            draggable
            icon={markerIcon}
            eventHandlers={{
              dragend: (e) => {
                const p = e.target.getLatLng();
                // ปักหมุดก่อน → address ตามมาทีหลัง (debounce)
                pickImmediate(p.lat, p.lng);
              },
            }}
          >
            <Popup>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>ตำแหน่งสถานที่</div>
              <div style={{ fontSize: 12 }}>{addressLocal || derivedValue.address || ''}</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                {derivedValue.lat.toFixed(6)}, {derivedValue.lng.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        ) : null}
      </MapContainer>

      {/* แสดงพิกัด/ที่อยู่ที่เลือก */}
      {hasMarker ? (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <div><b>ที่อยู่:</b> {addressLocal || derivedValue.address || '-'}</div>
          <div>
            <b>พิกัด:</b> {derivedValue.lat.toFixed(6)}, {derivedValue.lng.toFixed(6)}{' '}
            <a
              href={`https://www.google.com/maps?q=${derivedValue.lat},${derivedValue.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              เปิดใน Google Maps
            </a>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 13, color: '#777' }}>
          คลิกบนแผนที่เพื่อปักหมุด หรือค้นหาด้วยที่อยู่/ชื่อสถานที่ (ดีฟอลต์: เชียงใหม่)
        </div>
      )}
    </div>
  );
}
