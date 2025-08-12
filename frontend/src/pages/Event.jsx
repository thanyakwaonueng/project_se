// src/pages/Event.jsx
import React, { useEffect, useState } from 'react';
import api from '../lib/api';

function formatDate(dt) {
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return '-';
    const dd = d.getDate().toString().padStart(2, '0');
    const mth = d.toLocaleString('en-US', { month: 'short' });
    const yyyy = d.getFullYear();
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${dd} ${mth} ${yyyy}, ${hh}:${mm}`;
  } catch {
    return '-';
  }
}

export default function Event() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/events'); // include: venue, artists
        if (!alive) return;
        setEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.error || 'โหลดอีเวนต์ไม่สำเร็จ');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>กำลังโหลดอีเวนต์…</div>;
  if (err) return <div style={{ padding: 16, color: 'red' }}>{err}</div>;

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 12 }}>Events</h2>

      {events.length === 0 ? (
        <div>ยังไม่มีอีเวนต์</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {events.map((ev) => (
            <div key={ev.id} style={{
              border: '1px solid #e5e5e5',
              borderRadius: 12,
              padding: 16,
              background: '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ margin: 0 }}>{ev?.name || 'Untitled Event'}</h3>
                <span style={{ fontSize: 12, color: '#777' }}>
                  {formatDate(ev?.date)}
                </span>
              </div>

              <div style={{ marginTop: 8, lineHeight: 1.6 }}>
                {'description' in ev && <div style={{ whiteSpace: 'pre-wrap' }}>{ev.description}</div>}
                <div><b>Venue:</b> {ev?.venue?.name || '-'}</div>
                <div><b>Type:</b> {ev?.eventType || '-'}</div>
                <div><b>Ticketing:</b> {ev?.ticketing || '-'}</div>
                <div><b>Alcohol:</b> {ev?.alcoholPolicy || '-'}</div>
                <div>
                  <b>Artists:</b>{' '}
                  {Array.isArray(ev?.artists) && ev.artists.length > 0
                    ? ev.artists.map(a => a.name || `#${a.id}`).join(', ')
                    : '-'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
