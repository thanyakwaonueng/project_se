// src/components/NotificationBell.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // ✅ inline styles
  const styles = `
    .nbell { position: relative; }
    .nbell-btn {
      position: relative; display:inline-flex; align-items:center; justify-content:center;
      width:36px; height:36px; padding:0; background:transparent; border:none; color:#222; cursor:pointer; outline:none;
    }
    .nbell-btn:hover .nbell-icon { opacity:0.85; }
    .nbell-icon { display:block; }
    .nbell-badge {
      position:absolute; top:-4px; right:-6px;
      min-width:18px; height:18px; padding:0 5px; background:#d32f2f; color:#fff;
      border-radius:999px; font-size:11px; line-height:18px; text-align:center; font-weight:700;
      box-shadow:0 0 0 2px #fff;
    }
    .nbell-menu { min-width: 280px; padding: 8px; display: block; }
    .nbell-item { white-space:pre-wrap; }
    .nbell-item h6 { margin:0 0 2px 0; font-weight:600; font-size:14px }
    .nbell-item .meta { font-size:12px; color:#666 }
    .nbell-row { display:flex; gap:8px; margin-top:6px; flex-wrap:wrap }
    .nbell-empty { padding:6px 2px; color:#666 }
    .nbell-topbar { display:flex; align-items:center; justify-content:space-between; padding:4px 8px 8px; border-bottom:1px solid #eee; margin:-8px -8px 8px }
    .nbell-topbar h5 { margin:0; font-size:14px; font-weight:700 }
  `;

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data } = await api.get('/notifications?unread=1', { withCredentials: true });
      setItems(Array.isArray(data) ? data : []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  // ปิด dropdown เมื่อคลิกนอกบริเวณ
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.nbell')) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // โหลดครั้งแรก + โพลทุก 15s (เฉพาะเมื่อมี user)
  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user?.id]);

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`, {}, { withCredentials: true });
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {/* ignore */}
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read_all', {}, { withCredentials: true });
      setItems([]);
    } catch {
      const current = [...items];
      for (const it of current) {
        try { await api.post(`/notifications/${it.id}/read`, {}, { withCredentials: true }); } catch {}
      }
      setItems([]);
    }
  };

  // ===== helper: ตรวจชนิดโนติและ CTA ที่เหมาะสม =====
  const isArtist = user?.role === 'ARTIST';
  const isOrganizer = user?.role === 'ORGANIZE' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  const typeIs = (n, patterns) =>
    patterns.some((p) => (typeof p === 'string' ? n.type === p : p.test(n.type || '')));

  const ctaFor = (n) => {
    const meta = n?.data || {};
    const eventId = meta.eventId ?? n.eventId ?? meta.entityId;
    const artistId = meta.artistId;

    // 1) ศิลปินถูกเชิญ (สำหรับ ARTIST) → type: artist_event.invited
    const artistInvited = typeIs(n, [
      'artist_event.invited',
      /artist[_\-\.]?event[_\-\.]?invited/i,
      /artist[_\-\.]?invited/i,
      /invite.*artist/i,
    ]);

    // 2) ศิลปินยืนยัน/ปฏิเสธ (สำหรับ ORGANIZER/ADMIN)
    const artistAccepted = typeIs(n, ['artist_event.accepted', /accepted/i]);
    const artistDeclined = typeIs(n, ['artist_event.declined', /declined/i]);

    // 3) คำขอบทบาทใหม่ (ADMIN)
    const roleReqNew = typeIs(n, ['role_request.new']);

    // 4) งานอัปเดต/งานใหม่จากศิลปินที่คุณไลค์
    const eventUpdated = typeIs(n, ['event.updated']);
    const artistNewEvent = typeIs(n, ['artist.new_event']);

    const actions = [];

    if (artistInvited && isArtist && eventId) {
      actions.push({
        label: 'View event',
        onClick: async () => {
          try { await api.post(`/notifications/${n.id}/read`, {}, { withCredentials: true }); } catch {}
          setOpen(false);
          navigate(`/events/${eventId}`);
        },
      });
    }

    if ((artistAccepted || artistDeclined) && isOrganizer && eventId) {
      actions.push({
        label: 'Open event',
        onClick: async () => {
          try { await api.post(`/notifications/${n.id}/read`, {}, { withCredentials: true }); } catch {}
          setOpen(false);
          navigate(`/events/${eventId}`);
        },
      });
      if (artistId) {
        actions.push({
          label: 'View lineup',
          onClick: async () => {
            try { await api.post(`/notifications/${n.id}/read`, {}, { withCredentials: true }); } catch {}
            setOpen(false);
            navigate(`/events/${eventId}?focus=artist-${artistId}`);
          },
        });
      }
    }

    if ((eventUpdated || artistNewEvent) && eventId) {
      actions.push({
        label: eventUpdated ? 'View update' : 'See new event',
        onClick: async () => {
          try { await api.post(`/notifications/${n.id}/read`, {}, { withCredentials: true }); } catch {}
          setOpen(false);
          navigate(`/events/${eventId}`);
        },
      });

      const isLineup = (meta?.change?.type || '').toLowerCase() === 'lineup';
      if (isLineup && (meta?.artistId || artistId)) {
        const aId = meta?.artistId ?? artistId;
        actions.push({
          label: 'View lineup',
          onClick: async () => {
            try { await api.post(`/notifications/${n.id}/read`, {}, { withCredentials: true }); } catch {}
            setOpen(false);
            navigate(`/events/${eventId}?focus=artist-${aId}`);
          },
        });
      }
    }

    if (roleReqNew && isAdmin) {
      actions.push({
        label: 'Review',
        onClick: async () => {
          try { await api.post(`/notifications/${n.id}/read`, {}, { withCredentials: true }); } catch {}
          setOpen(false);
          navigate('/admin/role_requests');
        },
      });
    }

    // สำรอง: ถ้ามี url มากับ data
    if (!actions.length && meta.url) {
      actions.push({
        label: 'Open',
        onClick: async () => {
          try { await api.post(`/notifications/${n.id}/read`, {}, { withCredentials: true }); } catch {}
          setOpen(false);
          navigate(meta.url);
        },
      });
    }

    // ปุ่มพื้นฐาน
    actions.push({
      label: 'Mark read',
      outline: true,
      onClick: () => markRead(n.id),
    });

    return actions;
  };

  const count = items.length;
  const badgeText = count > 99 ? '99+' : String(count);

  return (
    <div className="dropdown ml-3 nbell">
      <style>{styles}</style>

      <button
        className="nbell-btn"
        type="button"
        aria-label={count ? `Notifications ${badgeText} unread` : 'Notifications'}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) load();
        }}
        aria-expanded={open}
      >
        {/* bell icon */}
        <svg className="nbell-icon" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path
            d="M15 17H9c-2 0-3.5-1.2-3.5-2.7 0-.3.1-.6.2-.9C6.5 12.2 7 10.8 7 9c0-2.8 2.2-5 5-5s5 2.2 5 5c0 1.8.5 3.2 1.3 4.4.2.3.2.6.2.9 0 1.5-1.5 2.7-3.5 2.7Z"
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          />
          <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {count > 0 && <span className="nbell-badge">{badgeText}</span>}
      </button>

      {open && (
        <div className="dropdown-menu dropdown-menu-end nbell-menu">
          <div className="nbell-topbar">
            <h5>Notifications</h5>
            {count > 0 && (
              <button className="btn btn-sm btn-outline-secondary" onClick={markAllRead} disabled={loading}>
                Mark all read
              </button>
            )}
          </div>

          {!items.length ? (
            <div className="nbell-empty">{loading ? 'Loading…' : 'No notifications'}</div>
          ) : (
            items.map((n) => {
              const actions = ctaFor(n);
              return (
                <div key={n.id} className="nbell-item">
                  <h6>{n.title || n.message || 'Notification'}</h6>
                  <div className="meta">{new Date(n.createdAt).toLocaleString()}</div>
                  {!!actions.length && (
                    <div className="nbell-row">
                      {actions.map((a, i) => (
                        <button
                          key={i}
                          className={`btn btn-sm ${a.outline ? 'btn-outline-secondary' : 'btn-primary'}`}
                          onClick={a.onClick}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <hr />
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
