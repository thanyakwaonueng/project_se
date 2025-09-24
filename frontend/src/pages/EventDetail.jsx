// frontend/src/pages/eventdetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { extractErrorMessage } from '../lib/api';

function formatDT(iso) {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(dt);
  } catch {
    return iso;
  }
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ev, setEv] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr('');
        const { data } = await api.get(`/events/${id}`, { withCredentials: true });
        if (!alive) return;
        setEv(data);
      } catch (e) {
        if (!alive) return;
        setErr(extractErrorMessage(e, 'โหลดข้อมูลอีเวนต์ไม่สำเร็จ'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const toggleFollow = async () => {
    if (!ev?.id || busy) return;
    setBusy(true);
    try {
      if (ev.likedByMe) {
        const { data } = await api.delete(`/events/${ev.id}/like`, { withCredentials: true });
        setEv(prev => ({ ...prev, likedByMe: false, followersCount: data?.count ?? Math.max(0, (prev.followersCount || 0) - 1) }));
      } else {
        const { data } = await api.post(`/events/${ev.id}/like`, {}, { withCredentials: true });
        setEv(prev => ({ ...prev, likedByMe: true, followersCount: data?.count ?? (prev.followersCount || 0) + 1 }));
      }
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        navigate('/login');
      } else {
        console.error('toggleFollow error:', e);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>กำลังโหลด…</div>;

  if (err) {
    return (
      <div style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
        <div style={{ background: '#ffeef0', color: '#86181d', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {err}
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>ย้อนกลับ</button>
      </div>
    );
  }

  if (!ev) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: '#666' }}>ไม่พบอีเวนต์</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>ย้อนกลับ</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          {/* ปุ่มหัวใจซ้อนบนโปสเตอร์ */}
          {ev.id && (
            <button
              className={`like-button ${ev.likedByMe ? 'liked' : ''}`}
              title={ev.likedByMe ? 'Unfollow' : 'Follow'}
              aria-label={ev.likedByMe ? 'Unfollow' : 'Follow'}
              disabled={busy}
              onClick={toggleFollow}
              style={{ position: 'absolute', right: 8, top: 8, zIndex: 2 }}
            />
          )}

          {ev.posterUrl ? (
            <img
              src={ev.posterUrl}
              alt={ev.name || `Event #${ev.id}`}
              style={{ width: 280, maxWidth: '100%', borderRadius: 10, border: '1px solid #eee' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div style={{
              width: 280, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 10, border: '1px dashed #ccc', color: '#888'
            }}>
              ไม่มีโปสเตอร์
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <h2 style={{ margin: 0 }}>{ev.name || `Event #${ev.id}`}</h2>

          {/* แสดงจำนวนผู้ติดตาม */}
          <div style={{ margin: '6px 0 12px', fontSize: 14, opacity: .9 }}>
            👥 {typeof ev.followersCount === 'number' ? ev.followersCount : 0} followers
          </div>

          <div style={{ marginTop: 8, display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div><strong>วันเวลา:</strong> {formatDT(ev.date)}</div>
            <div><strong>ประเภทงาน:</strong> {ev.eventType || '—'}</div>
            <div><strong>การขายบัตร:</strong> {ev.ticketing || '—'}</div>
            <div><strong>นโยบายแอลกอฮอล์:</strong> {ev.alcoholPolicy || '—'}</div>
            {ev.genre ? <div><strong>แนวเพลง:</strong> {ev.genre}</div> : null}
          </div>

          {ev.ticketLink && (
            <div style={{ marginTop: 8 }}>
              <a href={ev.ticketLink} target="_blank" rel="noreferrer" className="btn btn-primary">
                ซื้อบัตร / เปิดลิงก์บัตร
              </a>
            </div>
          )}

          <div style={{ marginTop: 12, color: '#333', whiteSpace: 'pre-wrap' }}>
            {ev.description || '—'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #eee' }}>
        <h4 style={{ marginTop: 0 }}>สถานที่จัด</h4>
        {ev.venue ? (
          <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div><strong>ชื่อสถานที่:</strong> {ev.venue.name}</div>
            <div><strong>แนวถนัด:</strong> {ev.venue.genre || '—'}</div>
            <div><strong>ความจุ:</strong> {typeof ev.venue.capacity === 'number' ? ev.venue.capacity : '—'}</div>
            <div>
              <strong>แผนที่:</strong>{' '}
              {ev.venue.locationUrl ? <a href={ev.venue.locationUrl} target="_blank" rel="noreferrer">เปิดแผนที่</a> : '—'}
            </div>
          </div>
        ) : (
          <div style={{ color: '#777' }}>—</div>
        )}
      </div>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #eee' }}>
        <h4 style={{ marginTop: 0 }}>ศิลปิน</h4>
        {Array.isArray(ev.artists) && ev.artists.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {ev.artists.map(a => (
              <li key={a.id}>
                {a.name} {a.genre ? <span style={{ color: '#666' }}>({a.genre})</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ color: '#777' }}>—</div>
        )}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
        {location.pathname.startsWith("/my_events") ? (
          <Link to="/my_events" className="btn btn-secondary">ไปหน้าเมื่อกี้</Link>
        ) : (
          <Link to="/events" className="btn btn-secondary">กลับไปหน้า Events</Link>
        )}
      </div>
    </div>
  );
}
