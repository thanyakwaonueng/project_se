import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

export default function NotificationBell({ mobileMode = false }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [hover, setHover] = useState(false);
  const [loading, setLoading] = useState(false);       // ✅ เพิ่ม
  const navigate = useNavigate();
  const { user } = useAuth();

  // โหลด notifications
  const load = async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications?unread=1', { withCredentials: true });
      setItems(data || []);
    } catch {}
  };

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user?.id]);

  // ปิดเมื่อคลิกนอกระฆัง (เฉพาะ desktop)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMode) return;
      if (!e.target.closest('.nbell')) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMode]);

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`, {}, { withCredentials: true });
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {}
  };

  // ✅ เพิ่ม: Mark all read
  const markAllRead = async () => {
    try {
      setLoading(true);
      await api.post('/notifications/read_all', {}, { withCredentials: true });
      setItems([]);
    } catch {} finally {
      setLoading(false);
    }
  };

  // ✅ เพิ่ม: ไปหน้ารีวิวคำขอบทบาท (ใช้ใน mobileMode)
  const goReview = async (notifId) => {
    try { await api.post(`/notifications/${notifId}/read`, {}, { withCredentials: true }); } catch {}
    setOpen(false);
    navigate('/admin/role_requests');
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

    const artistInvited   = typeIs(n, ['artist_event.invited', /artist[_\-\.]?event[_\-\.]?invited/i, /artist[_\-\.]?invited/i, /invite.*artist/i]);
    const artistAccepted  = typeIs(n, ['artist_event.accepted', /accepted/i]);
    const artistDeclined  = typeIs(n, ['artist_event.declined', /declined/i]);
    const roleReqNew      = typeIs(n, ['role_request.new']);
    const eventUpdated    = typeIs(n, ['event.updated']);
    const artistNewEvent  = typeIs(n, ['artist.new_event']);

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

    actions.push({
      label: 'Mark read',
      outline: true,
      onClick: () => markRead(n.id),
    });

    return actions;
  };

  const count = items.length;
  const badgeText = count > 99 ? '99+' : String(count);

  // ===== Mobile
  if (mobileMode) {
    return (
      <div className="mobile-notification-section">
        <a
          href="#"
          className="mobile-menu-link"
          onClick={(e) => {
            e.preventDefault();
            const next = !open;
            setOpen(next);
            if (next) load();
          }}
        >
          NOTIFICATIONS
          {count > 0 && <span className="nbell-badge-mobile">{badgeText}</span>}
          <span style={{ fontSize: '0.6em', marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
        </a>

        {open && (
          <div className="mobile-submenu" style={{ paddingLeft: '15px' }}>
            {!items.length ? (
              <div className="dropdown-item-text">{loading ? 'Loading…' : 'No notifications'}</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className="dropdown-item-text" style={{ whiteSpace: 'pre-wrap' }}>
                  <div style={{ fontWeight: 600 }}>{n.message}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{new Date(n.createdAt).toLocaleString()}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    {user?.role === 'ADMIN' && n.type === 'role_request.new' && (
                      <button className="btn btn-sm btn-primary" onClick={() => goReview(n.id)}>Review</button>
                    )}
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => markRead(n.id)}>Mark read</button>
                  </div>
                  <hr />
                </div>
              ))
            )}
            {!!items.length && (
              <button className="btn btn-sm btn-outline-secondary" onClick={markAllRead} disabled={loading}>
                Mark all read
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ===== Desktop
  return (
    <div className="dropdown nbell">
      <button
        className="nbell-btn"
        type="button"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          padding: 0,
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          backgroundColor: hover ? '#8b8b8b30' : 'transparent',
          borderRadius: '50%',
          transition: 'background-color 0.2s ease',
        }}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) load();
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={count ? `Notifications ${badgeText} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <svg className="nbell-icon" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"
          style={{ display: 'block', transition: 'opacity 0.2s ease', opacity: hover ? 0.85 : 1 }}
        >
          <path
            d="M15 17H9c-2 0-3.5-1.2-3.5-2.7 0-.3.1-.6.2-.9C6.5 12.2 7 10.8 7 9c0-2.8 2.2-5 5-5s5 2.2 5 5c0 1.8.5 3.2 1.3 4.4.2.3.2.6.2.9 0 1.5-1.5 2.7-3.5 2.7Z"
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          />
          <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        {count > 0 && (
          <span
            className="nbell-badge"
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              background: '#d32f2f',
              color: '#fff',
              borderRadius: 999,
              fontSize: 11,
              lineHeight: '18px',
              textAlign: 'center',
              fontWeight: 700,
              boxShadow: '0 0 0 2px #fff',
              pointerEvents: 'none', // ✅ กัน badge มาบังคลิกปุ่ม
            }}
          >
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`dropdown-menu dropdown-menu-end nbell-menu show`}  // ✅ ให้ Bootstrap โชว์
          style={{ display: 'block' }}                                    // ✅ บังคับกันธีมอื่น
        >
          <div className="nbell-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ margin: 0 }}>Notifications</h5>
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
                    <div className="nbell-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
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
