// src/pages/Artist.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

export default function Artist() {
  const [artists, setArtists] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/artists'); // include: user, events (ฝั่ง backend ทำไว้แล้ว)
        if (!alive) return;
        setArtists(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.error || 'โหลดรายชื่อศิลปินไม่สำเร็จ');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return artists;
    return artists.filter((a) => {
      const name = (a?.name || '').toLowerCase();
      const genre = (a?.genre || '').toLowerCase();
      const userEmail = (a?.user?.email || '').toLowerCase();
      return name.includes(s) || genre.includes(s) || userEmail.includes(s);
    });
  }, [q, artists]);

  if (loading) return <div style={{ padding: 16 }}>กำลังโหลดรายชื่อศิลปิน…</div>;
  if (err) return <div style={{ padding: 16, color: 'red' }}>{err}</div>;

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 12 }}>Artists</h2>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อ/แนวเพลง/อีเมลผู้ใช้"
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div>ไม่พบศิลปิน</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map((a) => (
            <div key={a.id} style={{
              border: '1px solid #e5e5e5',
              borderRadius: 12,
              padding: 16,
              background: '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ margin: 0 }}>{a?.name || 'ไม่ระบุชื่อ'}</h3>
                <span style={{ fontSize: 12, color: '#777' }}>
                  User: {a?.user?.email || '-'}
                </span>
              </div>

              <div style={{ marginTop: 8, lineHeight: 1.6 }}>
                <div><b>Genre:</b> {a?.genre || '-'}</div>
                {'subGenre' in a && <div><b>Sub-genre:</b> {a.subGenre || '-'}</div>}
                {'bookingType' in a && <div><b>Booking type:</b> {a.bookingType || '-'}</div>}
                {'foundingYear' in a && <div><b>Founded:</b> {a.foundingYear || '-'}</div>}
                {'label' in a && <div><b>Label:</b> {a.label || '-'}</div>}
                {'numberMember' in a && <div><b>Members:</b> {a.numberMember || '-'}</div>}
              </div>

              {Array.isArray(a?.events) && a.events.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <b>Events:</b>{' '}
                  {a.events.map(ev => ev.title).filter(Boolean).join(', ') || `${a.events.length} events`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
