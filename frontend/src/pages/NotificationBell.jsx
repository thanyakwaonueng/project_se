import React, { useEffect, useState } from 'react'; 
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

export default function NotificationBell({ mobileMode = false }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [hover, setHover] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // โหลด notifications
  const load = async () => {
    try {
      const { data } = await api.get('/notifications?unread=1');
      setItems(data || []);
    } catch {}
  };

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user?.id]);

  useEffect(() => {
  const handleClickOutside = (e) => {
    // ถ้า mobileMode → ไม่ต้องทำอะไร
    if (mobileMode) return;
    // ถ้า click ไม่ใช่ใน nbell → ปิด dropdown
    if (!e.target.closest('.nbell')) {
      setOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [mobileMode]);
 
  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {}
  };

  const goReview = async (id) => {
    try { await api.post(`/notifications/${id}/read`); } catch {}
    setOpen(false);
    navigate('/admin/role_requests');
  };

  const count = items.length;
  const badgeText = count > 99 ? '99+' : String(count);

  // Mobile → Dropdown รายการ
  if (mobileMode) {
    return (
      <div className="mobile-notification-section">
        <a
          href="#"
          className="mobile-menu-link"
          onClick={(e) => {
            e.preventDefault();
            setOpen(!open);
            if (!open) load();
          }}
        >
          NOTIFICATIONS
          {count > 0 && <span className="nbell-badge-mobile">{badgeText}</span>}
          <span style={{ fontSize: '0.6em', marginLeft: 4 }}>
            {open ? '▲' : '▼'}
          </span>
        </a>

        {open && (
          <div className="mobile-submenu" style={{ paddingLeft: '15px' }}>
            {!items.length ? (
              <div className="dropdown-item-text">No notifications</div>
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
          </div>
        )}
      </div>
    );
  }


  // Desktop → Dropdown
  return (
    <div className="dropdown nbell">
      <button
        className="nbell-btn"
        type="button"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          padding: 0,
          border: "none",
          outline: "none",
          cursor: "pointer",
          backgroundColor: hover ? "#8b8b8b30" : "transparent",
          borderRadius: "50%",
          transition: "background-color 0.2s ease",
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
          style={{ display: "block", transition: "opacity 0.2s ease", opacity: hover ? 0.85 : 1 }}
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
              position: "absolute",
              top: "-4px",
              right: "-6px",
              minWidth: "18px",
              height: "18px",
              padding: "0 5px",
              background: "#d32f2f",
              color: "#fff",
              borderRadius: "999px",
              fontSize: "11px",
              lineHeight: "18px",
              textAlign: "center",
              fontWeight: 700,
              boxShadow: "0 0 0 2px #fff",
            }}
          >
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown-menu dropdown-menu-end" style={{ minWidth: 250, padding: 8, display: 'block' }}>
          {!items.length ? (
            <div className="dropdown-item-text">No notifications</div>
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
        </div>
      )}
    </div>
  );
}
