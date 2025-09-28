import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems(prev => prev.filter(x => x.id !== id));
    } catch {}
  };

  const goReview = async (id) => {
    try { await api.post(`/notifications/${id}/read`); } catch {}
    navigate('/admin/role_requests');
  };

  return (
    <div className="notifications-page">
      <h2>Notifications</h2>
      {items.length === 0 && <div>No notifications</div>}
      {items.map(n => (
        <div key={n.id} className="dropdown-item-text" style={{ whiteSpace: 'pre-wrap', marginBottom: 10 }}>
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
      ))}
    </div>
  );
}
