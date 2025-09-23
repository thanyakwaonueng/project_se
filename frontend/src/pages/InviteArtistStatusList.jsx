import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { extractErrorMessage } from '../lib/api';

export default function EventInvitesPage({ eventId: eventIdProp = null }) {
  const params = useParams();
  const eventId = eventIdProp ?? params.eventId;
  const [items, setItems] = useState([]); // master list
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | PENDING | ACCEPTED | DECLINED
  const [fetchingStatus, setFetchingStatus] = useState(false);

  const getSortTime = (it) => {
    const evDate = it?.event?.date;
    const created = it?.createdAt;
    const updated = it?.updatedAt;
    const t = evDate || updated || created || null;
    return t ? new Date(t).getTime() : 0;
  };

  const loadAll = async () => {
    try {
      setErr('');
      setLoading(true);
      if (!eventId) {
        setErr('ไม่พบ eventId (ต้องระบุ eventId ใน route หรือ prop)');
        setItems([]);
        return;
      }

      const res = await axios.get(`/api/artist-events/event/${eventId}`, { withCredentials: true });
      const data = res?.data || [];
      // sort newest-first
      data.sort((a, b) => getSortTime(b) - getSortTime(a));
      setItems(data);
    } catch (e) {
      setErr(extractErrorMessage(e, 'ไม่สามารถโหลดรายการได้'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch only one status (useful for click-to-filter; falls back to loadAll on errors)
  const loadStatus = async (status) => {
    try {
      setErr('');
      setFetchingStatus(true);
      if (status === 'ALL') {
        await loadAll();
        return;
      }
      const res = await axios.get(`/api/artist-events/event/${eventId}/status/${status}`, { withCredentials: true });
      const data = res?.data || [];
      data.sort((a, b) => getSortTime(b) - getSortTime(a));
      setItems(data);
    } catch (e) {
      setErr(extractErrorMessage(e, 'ไม่สามารถโหลดรายการตามสถานะได้'));
      setItems([]);
    } finally {
      setFetchingStatus(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const counts = {
    ALL: items.length,
    PENDING: items.filter(i => i.status === 'PENDING').length,
    ACCEPTED: items.filter(i => i.status === 'ACCEPTED').length,
    DECLINED: items.filter(i => i.status === 'DECLINED').length,
  };

  const filteredItems = filter === 'ALL' ? items : items.filter(it => it.status === filter);

  return (
    <div style={{ maxWidth: 1000, margin: '24px auto', padding: 16 }}>
      <h2>รายการเชิญศิลปินสำหรับงาน #{eventId}</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        {['ALL', 'PENDING', 'ACCEPTED', 'DECLINED'].map(s => (
          <button
            key={s}
            type="button"
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={async () => {
              setFilter(s);
              // for better UX fetch filtered set from server when switching
              await loadStatus(s);
            }}
            disabled={fetchingStatus}
          >
            {s} ({counts[s] ?? 0})
          </button>
        ))}

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={loadAll}
          style={{ marginLeft: 'auto' }}
        >
          รีเฟรช
        </button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {loading ? (
        <div>กำลังโหลด…</div>
      ) : !filteredItems.length ? (
        <div>— ไม่มีผลลัพธ์สำหรับสถานะ {filter} —</div>
      ) : (
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Artist</th>
              <th>Status</th>
              <th>Notes</th>
              <th>When</th>
              <th>Artist Profile</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(it => {
              const artist = it.artist || {};
              const ev = it.event || {};
              const when = ev.date ? new Date(ev.date).toLocaleString() : (it.createdAt ? new Date(it.createdAt).toLocaleString() : '—');

              return (
                <tr key={`${it.artistId}-${it.eventId}`}>
                  <td style={{ verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 600 }}>{artist.name || artist.displayName || `Artist #${it.artistId}`}</div>
                    <div style={{ color: '#666', fontSize: 13 }}>ID: {artist.id ?? it.artistId}</div>
                  </td>

                  <td style={{ verticalAlign: 'middle' }}>{it.status}</td>

                  <td style={{ whiteSpace: 'pre-wrap', verticalAlign: 'middle' }}>{it.notes || '—'}</td>

                  <td style={{ verticalAlign: 'middle' }}>{when}</td>

                  <td style={{ verticalAlign: 'middle' }}>
                    {artist.id ? (
                      <a href= {`/page_artists/${artist.name.toLowerCase().replace(/\s+/g, "-")}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                        ดูโปรไฟล์
                      </a>
                    ) : (
                      <small style={{ color: '#666' }}>— no profile —</small>
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