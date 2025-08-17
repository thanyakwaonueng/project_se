import React, { useEffect, useState } from 'react';
import api, { extractErrorMessage } from '../lib/api';

export default function Venue() {
  const [venues, setVenues] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr('');
        const { data } = await api.get('/venues'); // include: user, events (มาจาก backend)
        if (!alive) return;
        setVenues(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setErr(extractErrorMessage(e, 'โหลดรายการสถานที่ไม่สำเร็จ'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>กำลังโหลด…</div>;

  if (err) {
    return (
      <div style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
        <div style={{ background: '#ffeef0', color: '#86181d', padding: 12, borderRadius: 8 }}>
          {err}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 12 }}>Venues</h2>

      {venues.length === 0 && <div style={{ color: '#777' }}>ยังไม่มีสถานที่ในระบบ</div>}

      <div style={{ display: 'grid', gap: 12 }}>
        {venues.map(v => (
          <div key={v.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <h3 style={{ margin: 0 }}>{v.name || `Venue #${v.id}`}</h3>
              <span style={{ fontSize: 12, color: '#666' }}>
                Owner: {v.user?.email || '—'}
              </span>
            </div>

            <div style={{ marginTop: 8, display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div><strong>Genre:</strong> {v.genre || '—'}</div>
              <div><strong>Capacity:</strong> {typeof v.capacity === 'number' ? v.capacity : '—'}</div>
              <div><strong>Alcohol policy:</strong> {v.alcoholPolicy || '—'}</div>
              <div>
                <strong>Location:</strong>{' '}
                {v.locationUrl ? (
                  <a href={v.locationUrl} target="_blank" rel="noreferrer">Open map</a>
                ) : '—'}
              </div>
            </div>

            {v.description && (
              <div style={{ marginTop: 8, color: '#333' }}>
                {v.description}
              </div>
            )}

            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              Events: {Array.isArray(v.events) ? v.events.length : 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
