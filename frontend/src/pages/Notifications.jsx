import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

/** time ago แบบสั้น */
function timeAgo(iso) {
  const t = new Date(iso).getTime();
  const d = Math.max(0, Date.now() - t);
  const sec = Math.floor(d / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const dt = new Date(iso);
  return dt.toLocaleString();
}

/** ไอคอนเล็กตาม type คร่าวๆ */
function TypeIcon({ type }) {
  const t = (type || '').toLowerCase();

  if (t.includes('role_request')) {
    return (
      <span className="npi" title="Role">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 3l7 4v6c0 3.9-2.7 7.4-7 8-4.3-.6-7-4.1-7-8V7l7-4z" fill="#1f6feb"/>
        </svg>
      </span>
    );
  }

  if (t.includes('artist.new_event')) {
    return (
      <span className="npi" title="New event from liked artist">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 3a9 9 0 1 1-9 9A9 9 0 0 1 12 3Zm-1 5h2v4l3 2-1 1-4-2.5Z" fill="#16a34a"/>
        </svg>
      </span>
    );
  }

  if (t.includes('event.updated')) {
    return (
      <span className="npi" title="Event updated">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M6 2v2H5a2 2 0 0 0-2 2v3h18V6a2 2 0 0 0-2-2h-1V2h-2v2H8V2H6Zm15 8H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10Zm-9 3h6v2h-6v-2Z" fill="#0ea5e9"/>
        </svg>
      </span>
    );
  }

  if (t.includes('invite') || t.includes('artist_event')) {
    return (
      <span className="npi" title="Invite">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm-9 9a9 9 0 0 1 18 0Z" fill="#1f6feb"/>
        </svg>
      </span>
    );
  }

  return (
    <span className="npi" title="Notification">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm6-6v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1Z" fill="#64748b"/>
      </svg>
    </span>
  );
}

/** รวมแท็กจาก type + data.change */
function extractTags(n) {
  const tags = Array.isArray(n?.tags) ? [...n.tags] : [];
  const t = (n?.type || '').toLowerCase();

  if (t.includes('event.updated')) {
    const change = n?.data?.change;
    if (change?.type) tags.push(String(change.type));
    if (Array.isArray(change?.fields) && change.fields.length) {
      tags.push(...change.fields.map(f => `changed:${f}`));
    }
    if (n?.data?.status) tags.push(String(n.data.status));
  }

  if (t.includes('artist.new_event')) {
    tags.push('new-event');
  }

  return tags.slice(0, 6); // กันยาวเกินไป
}

/** helper: ตรง type หรือเปล่า */
const typeIs = (n, patterns) =>
  patterns.some((p) => (typeof p === 'string' ? n?.type === p : p.test(n?.type || '')));

/** map type -> CTA */
function buildActions(navigate, user, n, markRead) {
  const isArtist = user?.role === 'ARTIST';
  const isOrganizer = user?.role === 'ORGANIZE' || user?.role === 'ADMIN';

  const eventId = n?.data?.eventId ?? n?.eventId ?? n?.entityId;
  const artistId = n?.data?.artistId ?? n?.artistId;

  const actions = [];

  // ศิลปินถูกเชิญ
  if (
    isArtist &&
    typeIs(n, [/artist[_\-\.]?invited/i, /invite.*artist/i, /artist[_\-\.]?event[_\-\.]?invited/i]) &&
    eventId
  ) {
    actions.push({
      label: 'ไปหน้าอีเวนต์',
      primary: true,
      onClick: async () => {
        try { await markRead(n.id); } catch {}
        navigate(`/events/${eventId}`);
      },
    });
  }

  // ศิลปินตอบรับ/ปฏิเสธ (สำหรับ organizer/admin)
  if (isOrganizer && typeIs(n, [/accepted/i, 'artist_event.accepted', /declined/i, 'artist_event.declined']) && eventId) {
    actions.push({
      label: 'เปิดอีเวนต์',
      primary: true,
      onClick: async () => {
        try { await markRead(n.id); } catch {}
        navigate(`/events/${eventId}`);
      },
    });
    if (artistId) {
      actions.push({
        label: 'ดูไลน์อัป',
        onClick: async () => {
          try { await markRead(n.id); } catch {}
          navigate(`/events/${eventId}?focus=artist-${artistId}`);
        },
      });
    }
  }

  // งานอัปเดต (วัน/เวลา/สถานที่/ไลน์อัป) — ทุกบทบาทที่ติดตามงานเห็น
  if (typeIs(n, ['event.updated']) && eventId) {
    actions.push({
      label: 'ดูรายละเอียดงาน',
      primary: true,
      onClick: async () => {
        try { await markRead(n.id); } catch {}
        navigate(`/events/${eventId}`);
      },
    });
    const isLineup = (n?.data?.change?.type || '').toLowerCase() === 'lineup';
    if (isLineup && (n?.data?.artistId || artistId)) {
      const aId = n?.data?.artistId ?? artistId;
      actions.push({
        label: 'ดูไลน์อัป',
        onClick: async () => {
          try { await markRead(n.id); } catch {}
          navigate(`/events/${eventId}?focus=artist-${aId}`);
        },
      });
    }
  }

  // ศิลปินที่คุณกดไลค์มีงานใหม่
  if (typeIs(n, ['artist.new_event']) && eventId) {
    actions.push({
      label: 'ไปดูงานใหม่',
      primary: true,
      onClick: async () => {
        try { await markRead(n.id); } catch {}
        navigate(`/events/${eventId}`);
      },
    });
  }

  // คำขอบทบาท
  if (typeIs(n, [/role[_\-\.]?request[_\-\.]?(approved|rejected|new)/i])) {
    actions.push({
      label: 'รายละเอียด',
      onClick: async () => {
        try { await markRead(n.id); } catch {}
        navigate('/admin/role_requests');
      },
    });
  }

  // ถ้ามีลิงก์เฉพาะใน data.url
  if (!actions.length && n?.data?.url) {
    actions.push({
      label: 'Open',
      primary: true,
      onClick: async () => {
        try { await markRead(n.id); } catch {}
        navigate(n.data.url);
      },
    });
  }

  // ปุ่มพื้นฐาน
  actions.push({
    label: 'ทำเป็นอ่านแล้ว',
    outline: true,
    onClick: () => markRead(n.id),
  });

  return actions;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | unread | read
  const [error, setError] = useState('');

  // inline styles
  const styles = `
  .np-wrap{max-width:820px;margin:0 auto;padding:20px}
  .np-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
  .np-title{font-size:22px;font-weight:800;margin:0}
  .np-tabs{display:flex;gap:8px}
  .np-tab{padding:8px 12px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-weight:600}
  .np-tab.on{background:#1f6feb;color:#fff;border-color:#1f6feb}
  .np-actions{display:flex;gap:8px}
  .np-btn{padding:8px 12px;border-radius:10px;border:1px solid #d0d7de;background:#fff;cursor:pointer}
  .np-btn.primary{background:#1f6feb;color:#fff;border-color:#1f6feb}
  .np-list{display:grid;gap:8px;margin-top:12px}
  .np-item{display:flex;gap:12px;border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff;align-items:flex-start}
  .np-item.read{background:#f8fafc;color:#334155}
  .npi{width:22px;height:22px;display:grid;place-items:center;flex:0 0 auto;margin-top:2px}
  .np-main{flex:1;min-width:0}
  .np-title2{margin:0 0 2px 0;font-weight:700}
  .np-meta{font-size:12px;color:#64748b}
  .np-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .np-chip{font-size:11px;padding:2px 8px;border-radius:999px;background:#eef2ff;border:1px solid #c7d2fe;color:#1e3a8a}
  .np-cta{padding:6px 10px;border-radius:8px;border:1px solid #d0d7de;background:#fff;cursor:pointer}
  .np-cta.primary{background:#1f6feb;border-color:#1f6feb;color:#fff}
  .np-cta.outline{background:#fff}
  .np-dot{width:8px;height:8px;border-radius:999px;background:#1f6feb;margin-left:auto;margin-top:4px}
  .np-empty{padding:16px;border:1px dashed #e5e7eb;border-radius:12px;color:#6b7280;text-align:center}
  .np-err{background:#fde8ea;color:#842029;border:1px solid #f5b5bd;padding:10px;border-radius:10px;margin-bottom:10px}
  `;

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/notifications');
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('โหลดรายการแจ้งเตือนล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  const unreadCount = useMemo(() => items.filter(i => !i.isRead).length, [items]);

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems(prev => prev.map(x => x.id === id ? { ...x, isRead: true } : x));
    } catch {/* ignore */}
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read_all');
      setItems(prev => prev.map(x => ({ ...x, isRead: true })));
    } catch {
      const current = [...items];
      for (const it of current) {
        if (!it.isRead) {
          try { await api.post(`/notifications/${it.id}/read`); } catch {}
        }
      }
      setItems(prev => prev.map(x => ({ ...x, isRead: true })));
    }
  };

  // กรองตามแท็บ
  const shown = useMemo(() => {
    if (tab === 'unread') return items.filter(x => !x.isRead);
    if (tab === 'read') return items.filter(x => x.isRead);
    return items;
  }, [items, tab]);

  return (
    <div className="np-wrap">
      <style>{styles}</style>

      <div className="np-head">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <h1 className="np-title">Notifications</h1>
          <span className="np-chip">{unreadCount} unread</span>
        </div>
        <div className="np-actions">
          <button className="np-btn" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
          <button className="np-btn primary" onClick={markAllRead} disabled={loading || unreadCount===0}>Mark all read</button>
        </div>
      </div>

      <div className="np-tabs" role="tablist" aria-label="Filter notifications">
        <button className={`np-tab ${tab==='all'?'on':''}`} onClick={()=>setTab('all')} role="tab" aria-selected={tab==='all'}>ทั้งหมด</button>
        <button className={`np-tab ${tab==='unread'?'on':''}`} onClick={()=>setTab('unread')} role="tab" aria-selected={tab==='unread'}>ยังไม่อ่าน</button>
        <button className={`np-tab ${tab==='read'?'on':''}`} onClick={()=>setTab('read')} role="tab" aria-selected={tab==='read'}>อ่านแล้ว</button>
      </div>

      {error && <div className="np-err">{error}</div>}

      {loading ? (
        <div className="np-empty">กำลังโหลด…</div>
      ) : !shown.length ? (
        <div className="np-empty">ไม่มีแจ้งเตือนในหมวดนี้</div>
      ) : (
        <div className="np-list">
          {shown.map(n => {
            const actions = buildActions(useNavigate(), useAuth()?.user, n, markRead); // not used; we’ll reconstruct below to keep hooks correct
            return n; // (lint happy)
          })}
          {shown.map(n => {
            const actions = buildActions(navigate, user, n, markRead);
            const read = !!n.isRead;
            const tags = extractTags(n);
            return (
              <div key={n.id} className={`np-item ${read ? 'read' : ''}`}>
                <TypeIcon type={n.type} />
                <div className="np-main">
                  <h3 className="np-title2">{n.title || n.message || 'Notification'}</h3>
                  <div className="np-meta">
                    <span>{n.type}</span> · <span>{timeAgo(n.createdAt)}</span>
                  </div>
                  <div className="np-row">
                    {tags.map((t,i)=><span key={i} className="np-chip">{t}</span>)}
                    {!tags.length && n.data?.status && <span className="np-chip">{n.data.status}</span>}
                  </div>

                  {!!actions.length && (
                    <div className="np-row" style={{marginTop:10}}>
                      {actions.map((a, i) => (
                        <button
                          key={i}
                          className={`np-cta ${a.primary ? 'primary' : ''} ${a.outline ? 'outline' : ''}`}
                          onClick={a.onClick}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!read && <span className="np-dot" aria-label="unread" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
