import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get('/notifications?unread=1');
      setItems(data || []);
    } catch (e) {
      // เงียบไว้
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems(prev => prev.filter(x => x.id !== id));
    } catch {}
  };

  const goReview = () => {
    setOpen(false);
    navigate('/admin/role_requests');
  };

  return (
    <div className="dropdown ml-3">
      <button className="btn btn-light" onClick={() => setOpen(!open)} aria-expanded={open}>
        🔔 {items.length ? <span className="badge bg-danger">{items.length}</span> : null}
      </button>
      {open && (
        <div className="dropdown-menu dropdown-menu-end" style={{ minWidth: 320, padding: 8, display: 'block' }}>
          {!items.length ? (
            <div className="dropdown-item-text">No notifications</div>
          ) : (
            items.map(n => (
              <div key={n.id} className="dropdown-item-text" style={{ whiteSpace: 'pre-wrap' }}>
                <div style={{ fontWeight: 600 }}>{n.message}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{new Date(n.createdAt).toLocaleString()}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                  {n.type === 'role_request.new' ? (
                    <button className="btn btn-sm btn-primary" onClick={goReview}>Review</button>
                  ) : null}
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => markRead(n.id)}>Mark read</button>
                </div>
                <hr/>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
