// frontend/src/pages/ArtistInviteRequestPage.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { extractErrorMessage } from '../lib/api';
import { Link } from 'react-router-dom';

/* ===== helpers ===== */
function to24h(s) {
  if (!s) return '';
  const str = String(s).trim();

  // HH:mm already
  let m = str.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m) return `${m[1].padStart(2,'0')}:${m[2]}`;

  // HMM / H:MM / H.MM / H-MM
  m = str.match(/^(\d{1,2})[:.\-]?([0-5]?\d)$/);
  if (m) {
    const hh = Math.max(0, Math.min(23, parseInt(m[1],10)));
    const mm = String(parseInt(m[2],10)).padStart(2,'0');
    return `${String(hh).padStart(2,'0')}:${mm}`;
  }

  // 1:00 PM / 01 PM
  m = str.match(/^(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)$/i);
  if (m) {
    let hh = parseInt(m[1],10);
    const mm = m[2] ?? '00';
    const isPM = /PM/i.test(m[3]);
    if (hh === 12) hh = isPM ? 12 : 0;
    else if (isPM) hh += 12;
    return `${String(hh).padStart(2,'0')}:${mm}`;
  }

  // 7pm, 12am
  m = str.match(/^(\d{1,2})(am|pm)$/i);
  if (m) {
    let hh = parseInt(m[1],10);
    const isPM = /pm/i.test(m[2]);
    if (hh === 12) hh = isPM ? 12 : 0;
    else if (isPM) hh += 12;
    return `${String(hh).padStart(2,'0')}:00`;
  }

  return '';
}
function formatDateEN(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }).format(new Date(iso));
  } catch { return '—'; }
}
function whenOfEvent(ev) {
  const datePart = ev?.date ? formatDateEN(ev.date) : '—';
  const start = to24h(ev?.doorOpenTime || '');
  const end   = to24h(ev?.endTime || '');
  const timePart = start && end ? `${start}–${end}` : (start || end || '');
  return timePart ? `${datePart} ${timePart}` : datePart;
}

export default function ArtistInvitesPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [artistId, setArtistId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState(null);
  const [filter, setFilter] = useState('PENDING');

  const getSortTime = (it) => {
    const evDate = it?.event?.date;
    const created = it?.createdAt;
    const updated = it?.updatedAt;
    const t = evDate || updated || created || null;
    return t ? new Date(t).getTime() : 0;
  };

  const keyFor = (aId, eId) => `${aId}-${eId}`;

  const load = async () => {
    try {
      setErr('');
      setLoading(true);

      const meRes = await axios.get('/api/auth/me', { withCredentials: true });
      const me = meRes?.data;
      if (!me) {
        setErr('ไม่พบข้อมูลผู้ใช้ (กรุณาเข้าสู่ระบบ)');
        setItems([]);
        setArtistId(null);
        return;
      }

      if (!me.performerInfo.artistInfo || !me.performerInfo.artistInfo.performerId) {
        setErr('ไม่พบโปรไฟล์ศิลปินสำหรับผู้ใช้ของคุณ');
        setItems([]);
        setArtistId(null);
        return;
      }

      const aid = me.performerInfo.artistInfo.performerId;
      setArtistId(aid);

      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        axios.get(`/api/artist-events/pending/${aid}`, { withCredentials: true }).catch(() => ({ data: [] })),
        axios.get(`/api/artist-events/accepted/${aid}`, { withCredentials: true }).catch(() => ({ data: [] })),
        axios.get(`/api/artist-events/declined/${aid}`, { withCredentials: true }).catch(() => ({ data: [] })),
      ]);

      const combined = [
        ...(pendingRes?.data || []),
        ...(approvedRes?.data || []),
        ...(rejectedRes?.data || []),
      ];

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

  const act = async (artistIdParam, eventId, action) => {
    try {
      setErr('');
      const confirmMessage =
        action === 'accept'
          ? 'Confirm acceptance of invitation for this event?'
          : 'Confirm rejection of invitation for this event?';
      if (!window.confirm(confirmMessage)) return;

      const decision = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
      const loadKey = keyFor(artistIdParam, eventId);
      setActionLoadingKey(loadKey);

      await axios.post('/api/artist-events/respond', {
        artistId: Number(artistIdParam),
        eventId: Number(eventId),
        decision,
      }, { withCredentials: true });

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

  const counts = {
    ALL: items.length,
    PENDING: items.filter(i => i.status === 'PENDING').length,
    ACCEPTED: items.filter(i => i.status === 'ACCEPTED').length,
    DECLINED: items.filter(i => i.status === 'DECLINED').length,
  };

  const filteredItems = filter === 'ALL' ? items : items.filter(it => it.status === filter);

  // Status badge styling
  const getStatusBadge = (status) => {
    const styles = {
      PENDING:  { background: '#f59e0b', color: '#856404', border: '1px solid #ffeaa7' },
      ACCEPTED: { background: '#22c55e', color: '#0c5460', border: '1px solid #bee5eb' },
      DECLINED: { background: '#ef4444', color: '#721c24', border: '1px solid #f5c6cb' }
    };
    return (
      <span
        className="badge"
        style={{
          ...styles[status],
          padding: '6px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600',
          display: 'inline-block',
          minWidth: '80px',
          textAlign: 'center'
        }}
      >
        {status}
      </span>
    );
  };

  // Mobile card view
  const MobileCardView = ({ item }) => {
    const ev = item.event || {};
    const evTitle = ev.name || ev.title || `Event #${ev.id ?? item.eventId}`;
    const when = whenOfEvent(ev);
    const loadKey = keyFor(item.artistId, item.eventId);
    const isActLoading = actionLoadingKey === loadKey;

    return (
      <div className="card mb-3" style={{ border: '1px solid #dee2e6', borderRadius: '12px' }}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h6 className="card-title mb-0" style={{ fontWeight: '500', color: '#2c3e50' }}>
              {ev.id ? (
                <Link to={`/events/${ev.id}`} className="alink">{evTitle}</Link>
              ) : evTitle}
            </h6>
            {getStatusBadge(item.status)}
          </div>

          <div className="mb-3">
            <small className="text-muted">When:</small>
            <div style={{ color: '#495057' }}>{when}</div>
          </div>

          {item.status === 'PENDING' ? (
            <div className="d-flex gap-2">
              <button
                className="btn btn-success flex-fill"
                onClick={() => act(item.artistId, item.eventId, 'accept')}
                disabled={isActLoading}
                style={{ borderRadius: '20px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', border: 'none' }}
              >
                {isActLoading ? <span className="spinner-border spinner-border-sm me-2" /> : 'Accept'}
              </button>

              <button
                className="btn btn-outline-danger flex-fill"
                onClick={() => act(item.artistId, item.eventId, 'decline')}
                disabled={isActLoading}
                style={{ borderRadius: '20px', padding: '8px 16px', fontSize: '14px', fontWeight: '500' }}
              >
                {isActLoading ? <span className="spinner-border spinner-border-sm me-2" /> : 'Decline'}
              </button>
            </div>
          ) : (
            <div className="text-center text-muted" style={{ fontSize: '14px', fontStyle: 'italic' }}>
              No actions available
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '85%', margin: '0 auto', padding: '24px 0' }}>
      <div className="container-fluid py-3 px-2 px-md-3">
        <div className="row">
          <div className="col-12">
            <h2 className="mb-4" style={{
              fontWeight: "bold",
              fontSize: 'clamp(1.5rem, 4vw, 3rem)',
              color: '#000000'
            }}>
              MY EVENT INVITATION
            </h2>

            {/* Filter Buttons */}
            <div className="d-flex flex-wrap gap-2 gap-md-3 align-items-center mb-4">
              {['ALL', 'PENDING', 'ACCEPTED', 'DECLINED'].map(s => (
                <button
                  key={s}
                  type="button"
                  className={`btn ${filter === s ? 'ee-btn-primary' : 'ee-btn-primary'}`}
                  onClick={() => setFilter(s)}
                  style={{
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    flex: '0 1 auto',
                    minWidth: 'fit-content',
                    marginRight: '5px'
                  }}
                >
                  {s} <span className="ms-1">({counts[s] ?? 0})</span>
                </button>
              ))}
            </div>

            {err && (
              <div className="alert alert-danger" style={{ borderRadius: '12px' }}>
                {err}
              </div>
            )}

            {loading ? (
              <div className="text-center py-5 text-muted">
                <div className="spinner-border" role="status" />
                <div className="mt-3">Loading invitations...</div>
              </div>
            ) : !filteredItems.length ? (
              <div className="text-center py-5 text-muted fs-6">
                — No {filter !== 'ALL' ? filter.toLowerCase() : ''} invitations —
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="d-none d-lg-block">
                  <div className="table-responsive" style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <table className="table table-hover mb-0">
                      <thead style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                          <th style={{ padding: '16px', fontWeight: '600', border: 'none', width: '220px'}}>Event</th>
                          <th style={{ padding: '16px', fontWeight: '600', border: 'none', width: '120px' }}>Status</th>
                          <th style={{ padding: '16px', fontWeight: '600', border: 'none', width: '220px' }}>When</th>
                          <th style={{ padding: '16px', fontWeight: '600', border: 'none', width: '180px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map(it => {
                          const ev = it.event || {};
                          const evTitle = ev.name || ev.title || `Event #${ev.id ?? it.eventId}`;
                          const when = whenOfEvent(ev);
                          const loadKey = keyFor(it.artistId, it.eventId);
                          const isActLoading = actionLoadingKey === loadKey;

                          return (
                            <tr key={`${it.artistId}-${it.eventId}`} style={{ borderBottom: '1px solid #dee2e6' }}>
                              <td style={{ verticalAlign: 'middle', padding: '16px', border: 'none' }}>
                                <div style={{ fontWeight: '500', color: '#2c3e50' }}>
                                  {ev.id ? (
                                    <Link to={`/events/${ev.id}`} className="alink">{evTitle}</Link>
                                  ) : evTitle}
                                </div>
                              </td>

                              <td style={{ verticalAlign: 'middle', padding: '16px', border: 'none' }}>
                                {getStatusBadge(it.status)}
                              </td>

                              <td style={{ verticalAlign: 'middle', padding: '16px', border: 'none', color: '#495057' }}>
                                {when}
                              </td>

                              <td style={{ verticalAlign: 'middle', padding: '16px', border: 'none' }}>
                                {it.status === 'PENDING' ? (
                                  <div className="d-flex gap-2 flex-wrap">
                                    <button
                                      className="btn"
                                      onClick={() => act(it.artistId, it.eventId, 'decline')}
                                      disabled={isActLoading}
                                      style={{ borderRadius: '20px', padding: '2px 15px', fontSize: '13px', fontWeight: '500', marginRight: '3px' }}
                                    >
                                      {isActLoading ? <span className="spinner-border spinner-border-sm me-1" /> : 'Decline'}
                                    </button>
                                    <button
                                      className="btn-viewdetail-ev"
                                      onClick={() => act(it.artistId, it.eventId, 'accept')}
                                      disabled={isActLoading}
                                      style={{ borderRadius: '20px', padding: '2px 16px', fontSize: '13px', fontWeight: '500', border: 'none' }}
                                    >
                                      {isActLoading ? <span className="spinner-border spinner-border-sm me-1" /> : 'Accept'}
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ color: '#6c757d', fontSize: '13px', fontStyle: 'italic' }}>
                                    No actions available
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="d-lg-none">
                  {filteredItems.map(item => (
                    <MobileCardView key={`${item.artistId}-${item.eventId}`} item={item} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
