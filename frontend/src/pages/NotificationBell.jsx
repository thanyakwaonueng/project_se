import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

export default function NotificationBell({ mobileMode = false }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [hover, setHover] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load notifications
  const load = async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications?unread=1', { withCredentials: true });
      setItems(data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user?.id]);

  // Close when clicking outside (desktop only)
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
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      setLoading(true);
      await api.post('/notifications/read_all', {}, { withCredentials: true });
      setItems([]);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const goReview = async (notifId) => {
    try { 
      await api.post(`/notifications/${notifId}/read`, {}, { withCredentials: true }); 
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
    setOpen(false);
    navigate('/admin/role_requests');
  };

  // Helper functions for notification types
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

  // ===== Mobile Version =====
  if (mobileMode) {
    return (
      <div className="mobile-notification-section">
        <button
          className="mobile-notification-btn"
          onClick={(e) => {
            e.preventDefault();
            const next = !open;
            setOpen(next);
            if (next) load();
          }}
        >
          <div className="mobile-notification-content">
            <span className="mobile-notification-text">NOTIFICATIONS</span>
            {count > 0 && <span className="nbell-badge-mobile">{badgeText}</span>}
            <span className="mobile-notification-arrow">{open ? '▲' : '▼'}</span>
          </div>
        </button>

        {open && (
          <div className="mobile-notification-panel">
            <div className="mobile-notification-header">
              <h4>Notifications</h4>
              {count > 0 && (
                <button 
                  className="btn-mark-all-read" 
                  onClick={markAllRead} 
                  disabled={loading}
                >
                  {loading ? '...' : 'Mark all read'}
                </button>
              )}
            </div>
            
            <div className="mobile-notification-list">
              {!items.length ? (
                <div className="mobile-notification-empty">
                  {loading ? 'Loading…' : 'No notifications'}
                </div>
              ) : (
                items.map((n) => (
                  <div key={n.id} className="mobile-notification-item">
                    <div className="mobile-notification-message">{n.message}</div>
                    <div className="mobile-notification-time">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                    <div className="mobile-notification-actions">
                      {user?.role === 'ADMIN' && n.type === 'role_request.new' && (
                        <button 
                          className="btn-action-primary" 
                          onClick={() => goReview(n.id)}
                        >
                          Review
                        </button>
                      )}
                      <button 
                        className="btn-action-secondary" 
                        onClick={() => markRead(n.id)}
                      >
                        Mark read
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== Desktop Version =====
  return (
    <div className="nbell-container">
      <button
        className="nbell-btn"
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
        <svg className="nbell-icon" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path
            d="M15 17H9c-2 0-3.5-1.2-3.5-2.7 0-.3.1-.6.2-.9C6.5 12.2 7 10.8 7 9c0-2.8 2.2-5 5-5s5 2.2 5 5c0 1.8.5 3.2 1.3 4.4.2.3.2.6.2.9 0 1.5-1.5 2.7-3.5 2.7Z"
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          />
          <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        {count > 0 && (
          <span className="nbell-badge">
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div className="nbell-dropdown">
          <div className="nbell-header">
            <h3>Notifications</h3>
            {count > 0 && (
              <button 
                className="nbell-mark-all-btn" 
                onClick={markAllRead} 
                disabled={loading}
              >
                {loading ? '...' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className="nbell-content">
            {!items.length ? (
              <div className="nbell-empty">
                {loading ? 'Loading…' : 'No notifications'}
              </div>
            ) : (
              items.map((n) => {
                const actions = ctaFor(n);
                return (
                  <div key={n.id} className="nbell-item">
                    <div className="nbell-item-title">{n.title || n.message || 'Notification'}</div>
                    <div className="nbell-item-time">{new Date(n.createdAt).toLocaleString()}</div>
                    {actions.length > 0 && (
                      <div className="nbell-actions">
                        {actions.map((a, i) => (
                          <button
                            key={i}
                            className={`nbell-action-btn ${a.outline ? 'nbell-action-outline' : 'nbell-action-primary'}`}
                            onClick={a.onClick}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .nbell-container {
          position: relative;
          display: inline-block;
        }

        .nbell-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          padding: 0;
          border: none;
          outline: none;
          cursor: pointer;
          background-color: ${hover ? 'rgba(139, 139, 139, 0.2)' : 'transparent'};
          border-radius: 50%;
          transition: all 0.2s ease;
          color: inherit;
        }

        .nbell-btn:hover {
          background-color: rgba(139, 139, 139, 0.3);
          transform: scale(1.05);
        }

        .nbell-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background: #d32f2f;
          color: #fff;
          border-radius: 999px;
          font-size: 11px;
          line-height: 20px;
          text-align: center;
          font-weight: 700;
          box-shadow: 0 0 0 2px #fff;
          pointer-events: none;
        }

        .nbell-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 380px;
          max-width: 90vw;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          margin-top: 8px;
          overflow: hidden;
        }

        .nbell-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #f0f0f0;
          background: #fafafa;
        }

        .nbell-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }

        .nbell-mark-all-btn {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .nbell-mark-all-btn:hover:not(:disabled) {
          background: #e0e0e0;
          color: #333;
        }

        .nbell-mark-all-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .nbell-content {
          max-height: 400px;
          overflow-y: auto;
        }

        .nbell-empty {
          padding: 32px 20px;
          text-align: center;
          color: #666;
          font-style: italic;
        }

        .nbell-item {
          padding: 16px 20px;
          border-bottom: 1px solid #f5f5f5;
          transition: background-color 0.2s ease;
        }

        .nbell-item:hover {
          background-color: #f8f9fa;
        }

        .nbell-item:last-child {
          border-bottom: none;
        }

        .nbell-item-title {
          font-weight: 500;
          margin-bottom: 4px;
          color: #333;
          line-height: 1.4;
        }

        .nbell-item-time {
          font-size: 0.8rem;
          color: #666;
          margin-bottom: 8px;
        }

        .nbell-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .nbell-action-btn {
          padding: 6px 12px;
          border: 1px solid;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .nbell-action-primary {
          background: #007bff;
          border-color: #007bff;
          color: white;
        }

        .nbell-action-primary:hover {
          background: #0056b3;
          border-color: #0056b3;
        }

        .nbell-action-outline {
          background: transparent;
          border-color: #6c757d;
          color: #6c757d;
        }

        .nbell-action-outline:hover {
          background: #6c757d;
          color: white;
        }

        /* Mobile Styles */
        .mobile-notification-section {
          width: 100%;
        }

        .mobile-notification-btn {
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          color: inherit;
        }

        .mobile-notification-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #000000; 
          color: #1c1c1c;              
          text-decoration: none;       
          font-weight: 500;              
          font-size: 16px;         
          padding: 0.5rem 0;             
          transition: background 0.2s ease;
        }

        .mobile-notification-text {
          font-weight: 500;
        }

        .nbell-badge-mobile {
          background: #d32f2f;
          color: white;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 0.8rem;
          font-weight: 600;
          min-width: 20px;
          text-align: center;
        }

        .mobile-notification-arrow {
          font-size: 0.7rem;
          color: #666;
        }

        .mobile-notification-panel {
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
        }

        .mobile-notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: white;
          border-bottom: 1px solid #e9ecef;
        }

        .mobile-notification-header h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .btn-mark-all-read {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .btn-mark-all-read:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .mobile-notification-list {
          max-height: 60vh;
          overflow-y: auto;
        }

        .mobile-notification-empty {
          padding: 24px 16px;
          text-align: center;
          color: #666;
          font-style: italic;
          background: white;
        }

        .mobile-notification-item {
          padding: 16px;
          background: white;
          border-bottom: 1px solid #f0f0f0;
        }

        .mobile-notification-message {
          font-weight: 500;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .mobile-notification-time {
          font-size: 0.8rem;
          color: #666;
          margin-bottom: 12px;
        }

        .mobile-notification-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn-action-primary {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .btn-action-secondary {
          background: transparent;
          color: #666;
          border: 1px solid #666;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
        }

        @media (max-width: 480px) {

          .btn-mark-all-read {
            font-size: 9px;
          }
          .nbell-dropdown {
            width: 95vw;
            right: -10px;
          }
          
          .mobile-notification-actions {
            flex-direction: column;
          }
          
          .btn-action-primary,
          .btn-action-secondary {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}