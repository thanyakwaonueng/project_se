import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  // ✅ inline styles (ไม่ต้อง import css)
  const styles = `
    .nbell { position: relative; }
    /* ปุ่มโปร่งใส: ไม่มีกรอบ/พื้นหลัง เหลือให้เห็นแค่ไอคอน */
    .nbell-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px; height: 36px;  /* hit-area ใหญ่ คลิกง่าย แต่มองเห็นแค่ไอคอน */
      padding: 0;
      background: transparent;
      border: none;
      color: #222;
      cursor: pointer;
      outline: none;
    }
    .nbell-btn:hover .nbell-icon { opacity: 0.85; }
    .nbell-icon { display: block; }
    .nbell-badge {
      position: absolute;
      top: -4px; right: -6px;
      min-width: 18px; height: 18px; padding: 0 5px;
      background: #d32f2f; color: #fff;
      border-radius: 999px; font-size: 11px; line-height: 18px;
      text-align: center; font-weight: 700;
      box-shadow: 0 0 0 2px #fff;
    }
  `;

  const load = async () => {
    try {
      const { data } = await api.get('/notifications?unread=1');
      setItems(data || []);
    } catch {}
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.nbell')) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


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

  return (
    <div className="dropdown ml-3 nbell">
      <style>{styles}</style>

      <button
        className="nbell-btn"
        type="button"
        style={{ border: 'none', background: 'transparent', outline: 'none' }}
        aria-label={count ? `Notifications ${badgeText} unread` : 'Notifications'}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {/* ไอคอนกระดิ่งเส้นบาง — ขยายเป็น 26px */}
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
