import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { extractErrorMessage } from '../lib/api';

// แปลงค่าจาก <input type="datetime-local"> เป็น ISO string
function toISO(dtLocal) {
  if (!dtLocal) return null;
  // new Date('YYYY-MM-DDTHH:mm') จะตีความเป็นเวลาท้องถิ่น แล้ว toISOString เป็น UTC
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function EventCreate() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [meta, setMeta] = useState(null);
  const [artists, setArtists] = useState([]);
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    dateLocal: '', // ใช้เก็บค่าจาก datetime-local
    venueId: null, // จะตั้งอัตโนมัติจาก me.venueProfile.id
    artistIds: [],
    eventType: '',
    ticketing: '',
    alcoholPolicy: '',
  });

  // โหลดข้อมูลจำเป็น: me, enums, artists
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr('');
        const [meRes, enumsRes, artistsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/meta/enums'),
          api.get('/artists'),
        ]);
        if (!alive) return;

        setMe(meRes.data || null);
        setMeta(enumsRes.data || null);
        setArtists(Array.isArray(artistsRes.data) ? artistsRes.data : []);

        // ต้องเป็น VENUE หรือ ORGANIZER หรือ ADMIN ถึงจะสร้างอีเวนต์ได้
        const role = meRes?.data?.role;
        if (!['VENUE', 'ORGANIZER', 'ADMIN'].includes(role)) {
          setErr('คุณไม่มีสิทธิ์สร้างอีเวนต์ (ต้องเป็น VENUE/ORGANIZER/ADMIN)');
        }

        const vId = meRes?.data?.venueProfile?.id || null;
        setForm(prev => ({
          ...prev,
          venueId: vId,
          // ตั้งค่าดีฟอลต์ของ enum จาก meta (ถ้ามี)
          eventType: enumsRes?.data?.eventTypes?.[0] || '',
          ticketing: enumsRes?.data?.ticketingTypes?.[0] || '',
          alcoholPolicy: enumsRes?.data?.alcoholPolicies?.[0] || '',
        }));
      } catch (e) {
        if (!alive) return;
        setErr(extractErrorMessage(e, 'โหลดข้อมูลเริ่มต้นไม่สำเร็จ'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const canSubmit = useMemo(() => {
    if (!form.name) return false;
    if (!form.venueId) return false;
    if (!form.eventType || !form.ticketing || !form.alcoholPolicy) return false;
    if (!form.dateLocal) return false;
    return true;
  }, [form]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleArtist = (id) => {
    setForm(prev => {
      const set = new Set(prev.artistIds);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...prev, artistIds: Array.from(set) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      if (!me) throw new Error('ยังไม่ได้ล็อกอิน');

      const payload = {
        name: form.name,
        description: form.description || undefined,
        date: toISO(form.dateLocal),
        venueId: form.venueId,
        artistIds: form.artistIds,
        eventType: form.eventType,
        ticketing: form.ticketing,
        alcoholPolicy: form.alcoholPolicy,
      };

      const { data } = await api.post('/events', payload);
      // ไปหน้ารายการอีเวนต์ หรือหน้าอีเวนต์ที่เพิ่งสร้าง
      navigate('/page_events');
    } catch (e) {
      setErr(extractErrorMessage(e, 'สร้างอีเวนต์ไม่สำเร็จ'));
    }
  };

  if (loading) return <div style={{ padding: 16 }}>กำลังโหลด…</div>;

  return (
    <div style={{ padding: '24px 16px', maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 12 }}>Create Event</h2>

      {err && (
        <div style={{ background: '#ffeef0', color: '#86181d', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {err}
        </div>
      )}

      {!me?.venueProfile && me?.role !== 'ADMIN' ? (
        <div style={{ background: '#fff8e1', padding: 12, borderRadius: 8 }}>
          คุณยังไม่มี VenueProfile ของตัวเอง โปรดสร้างหน้า Venue ก่อนจึงจะสร้างอีเวนต์ได้
          <div style={{ marginTop: 8 }}>
            <Link to="/page_venues">ไปหน้าสถานที่จัดงาน</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          {/* Event name */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Event name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="form-control"
              placeholder="Live Night"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="form-control"
              placeholder="รายละเอียดเพิ่มเติมของงาน…"
              rows={4}
            />
          </div>

          {/* Datetime */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Date & time</label>
            <input
              type="datetime-local"
              name="dateLocal"
              value={form.dateLocal}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          {/* Venue (readonly for VENUE/ORGANIZER) */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Venue</label>
            <input
              readOnly
              value={
                me?.role === 'ADMIN'
                  ? String(form.venueId ?? '')
                  : (me?.venueProfile ? `${me.venueProfile.name} (#${me.venueProfile.id})` : '')
              }
              className="form-control"
              placeholder="venueId"
            />
            {me?.role === 'ADMIN' && (
              <small>Admin เท่านั้นที่แก้ venueId ได้ (หน้า UI นี้ไม่ได้รองรับการแก้)</small>
            )}
          </div>

          {/* Enums */}
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Event type</label>
              <select
                name="eventType"
                value={form.eventType}
                onChange={handleChange}
                className="form-select"
              >
                {(meta?.eventTypes || []).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Ticketing</label>
              <select
                name="ticketing"
                value={form.ticketing}
                onChange={handleChange}
                className="form-select"
              >
                {(meta?.ticketingTypes || []).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Alcohol policy</label>
              <select
                name="alcoholPolicy"
                value={form.alcoholPolicy}
                onChange={handleChange}
                className="form-select"
              >
                {(meta?.alcoholPolicies || []).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Artists multi-select */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Artists</label>
            <div style={{ display: 'grid', gap: 6 }}>
              {artists.map(a => {
                const checked = form.artistIds.includes(a.id);
                return (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArtist(a.id)}
                    />
                    <span>{a.name || `Artist #${a.id}`}</span>
                  </label>
                );
              })}
              {artists.length === 0 && <div style={{ color: '#777' }}>ยังไม่มีศิลปินในระบบ</div>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              Create Event
            </button>
            <Link to="/page_events" className="btn btn-secondary">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  );
}
