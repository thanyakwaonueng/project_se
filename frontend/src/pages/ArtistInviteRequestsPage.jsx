import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { extractErrorMessage } from '../lib/api';

export default function ArtistInvitesPage() {
  const [items, setItems] = useState([]); // master list (all statuses)
  const [err, setErr] = useState('');
  const [artistId, setArtistId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState(null); // `${artistId}-${eventId}`
  const [filter, setFilter] = useState('PENDING'); // ALL | PENDING | ACCEPTED | DECLINED

  // helper to get timestamp used for sorting: prefer event.date, fallback to createdAt/updatedAt
  const getSortTime = (it) => {
    const evDate = it?.event?.date;
    const created = it?.createdAt;
    const updated = it?.updatedAt;
    const t = evDate || updated || created || null;
    return t ? new Date(t).getTime() : 0;
  };

  // build key
  const keyFor = (aId, eId) => `${aId}-${eId}`;

  // Load current user and fetch invites by status using the new endpoints
  const load = async () => {
    try {
      setErr('');
      setLoading(true);

      // 1) get current user (and their artistProfile if any)
      const meRes = await axios.get('/api/auth/me', { withCredentials: true });
      const me = meRes?.data;
      if (!me) {
        setErr('ไม่พบข้อมูลผู้ใช้ (กรุณาเข้าสู่ระบบ)');
        setItems([]);
        setArtistId(null);
        return;
      }

      if (!me.artistProfile || !me.artistProfile.id) {
        setErr('ไม่พบโปรไฟล์ศิลปินสำหรับผู้ใช้ของคุณ');
        setItems([]);
        setArtistId(null);
        return;
      }

      const aid = me.artistProfile.id;
      setArtistId(aid);

      // 2) fetch each status via its endpoint (use the new endpoints)
      // parallel requests
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        axios.get(`/api/artist-events/pending/${aid}`, { withCredentials: true }).catch(err => ({ data: [] })),
        axios.get(`/api/artist-events/accepted/${aid}`, { withCredentials: true }).catch(err => ({ data: [] })),
        axios.get(`/api/artist-events/declined/${aid}`, { withCredentials: true }).catch(err => ({ data: [] })),
      ]);

      // combine results (they are disjoint by status)
      const combined = [
        ...(pendingRes?.data || []),
        ...(approvedRes?.data || []),
        ...(rejectedRes?.data || []),
      ];

      // dedupe by composite key just in case, then sort newest-first
      const map = new Map();
      for (const it of combined) {
        map.set(`${it.artistId}-${it.eventId}`, it);
      }
      const deduped = Array.from(map.values()).slice().sort((a, b) => getSortTime(b) - getSortTime(a));
      setItems(deduped);
    } catch (e) {
      setErr(extractErrorMessage(e, 'โหลดคำเชิญไม่สำเร็จ'));
      setItems([]);
      setArtistId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // accept/decline action: send to /api/artist-events/respond and update local master list (do not remove)
  const act = async (artistIdParam, eventId, action) => {
    try {
      setErr('');
      const confirmMessage =
        action === 'accept'
          ? 'ยืนยันการยอมรับคำเชิญสำหรับงานนี้?'
          : 'ยืนยันการปฏิเสธคำเชิญสำหรับงานนี้?';
      if (!window.confirm(confirmMessage)) return;

      const decision = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
      const loadKey = keyFor(artistIdParam, eventId);
      setActionLoadingKey(loadKey);

      await axios.post('/api/artist-events/respond', {
        artistId: Number(artistIdParam),
        eventId: Number(eventId),
        decision,
      }, { withCredentials: true });

      // Update master list: set status (keep item in list so it doesn't disappear)
      setItems(prev =>
        prev.map(it => {
          if (String(it.artistId) === String(artistIdParam) && String(it.eventId) === String(eventId)) {
            return {
              ...it,
              status: decision,
              updatedAt: new Date().toISOString(),
            };
          }
          return it;
        }).slice().sort((a, b) => getSortTime(b) - getSortTime(a))
      );
    } catch (e) {
      alert(extractErrorMessage(e, 'ทำรายการไม่สำเร็จ'));
    } finally {
      setActionLoadingKey(null);
    }
  };

  // counts
  const counts = {
    ALL: items.length,
    PENDING: items.filter(i => i.status === 'PENDING').length,
    ACCEPTED: items.filter(i => i.status === 'ACCEPTED').length,
    DECLINED: items.filter(i => i.status === 'DECLINED').length,
  };

  const filteredItems = filter === 'ALL' ? items : items.filter(it => it.status === filter);

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: 16 }}>
      <h2>คำเชิญงานของฉัน</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        {['ALL', 'PENDING', 'ACCEPTED', 'DECLINED'].map(s => (
          <button
            key={s}
            type="button"
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFilter(s)}
          >
            {s} ({counts[s] ?? 0})
          </button>
        ))}
        
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => load()}
          style={{ marginLeft: 'auto' }}
        >
          รีเฟรช
        </button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {loading ? (
        <div>กำลังโหลด…</div>
      ) : !filteredItems.length ? (
        <div>— ไม่มีคำเชิญในสถานะ {filter} —</div>
      ) : (
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Event</th>
              <th>Status</th>
              <th>Notes</th>
              <th>When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(it => {
              const ev = it.event || {};
              const evTitle = ev.name || ev.title || `Event #${ev.id ?? it.eventId}`;
              const when = ev.date ? new Date(ev.date).toLocaleString() : (it.createdAt ? new Date(it.createdAt).toLocaleString() : '—');
              const loadKey = keyFor(it.artistId, it.eventId);
              const isActLoading = actionLoadingKey === loadKey;

              return (
                <tr key={`${it.artistId}-${it.eventId}`}>
                  <td style={{ verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 600 }}>{evTitle}</div>
                    <div style={{ color: '#666', fontSize: 13 }}>ID: {ev.id ?? it.eventId}</div>
                  </td>

                  <td style={{ verticalAlign: 'middle' }}>{it.status}</td>

                  <td style={{ whiteSpace: 'pre-wrap', verticalAlign: 'middle' }}>{it.notes || '—'}</td>

                  <td style={{ verticalAlign: 'middle' }}>{when}</td>

                  <td style={{ display: 'flex', gap: 8 }}>
                    {it.status === 'PENDING' ? (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => act(it.artistId, it.eventId, 'accept')}
                          disabled={isActLoading}
                        >
                          {isActLoading ? 'กำลัง...' : 'ยอมรับ'}
                        </button>

                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => act(it.artistId, it.eventId, 'decline')}
                          disabled={isActLoading}
                        >
                          {isActLoading ? 'กำลัง...' : 'ปฏิเสธ'}
                        </button>
                      </>
                    ) : (
                      <small style={{ color: '#666', alignSelf: 'center' }}>— no actions —</small>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

