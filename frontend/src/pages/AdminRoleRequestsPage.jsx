import React, { useEffect, useState } from 'react';
import api, { extractErrorMessage } from '../lib/api';

export default function AdminRoleRequestsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');

  // modal state
  const [show, setShow] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState('');

  const load = async () => {
    try {
      setErr('');
      const { data } = await api.get('/role-requests');
      setItems(data || []);
    } catch (e) {
      setErr(extractErrorMessage(e, 'โหลดคำขอไม่สำเร็จ'));
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    try {
      const note = prompt(action === 'approve' ? 'หมายเหตุ (ถ้ามี)' : 'เหตุผลที่ปฏิเสธ?');
      await api.post(`/role-requests/${id}/${action}`, { note });
      await load();
      setShow(false);
      setDetail(null);
    } catch (e) {
      alert(extractErrorMessage(e, 'ทำรายการไม่สำเร็จ'));
    }
  };

  const view = async (id) => {
    try {
      setDetailLoading(true);
      setDetailErr('');
      // ✅ ใช้เส้นรายละเอียดใหม่ที่ backend เพิ่งเพิ่ม
      const { data } = await api.get(`/role-requests/${id}/detail`);
      setDetail(data);
      setShow(true);
    } catch (e) {
      setDetailErr(extractErrorMessage(e, 'โหลดรายละเอียดไม่สำเร็จ'));
      setShow(true);
    } finally {
      setDetailLoading(false);
    }
  };

  const close = () => { setShow(false); setDetail(null); setDetailErr(''); };

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: 16 }}>
      <h2>คำขออัปเกรดสิทธิ์ (รออนุมัติ)</h2>
      {err && <div className="alert alert-danger">{err}</div>}
      {!items.length ? (
        <div>— ไม่มีคำขอ —</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>User</th><th>Current</th><th>Requested</th><th>Reason</th><th>When</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td>{it.user?.email}</td>
                <td>{it.user?.role}</td>
                <td>{it.requestedRole}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{it.reason || '—'}</td>
                <td>{new Date(it.createdAt).toLocaleString()}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => view(it.id)}>View</button>
                  <button className="btn btn-sm btn-success" onClick={() => act(it.id, 'approve')}>Approve</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => act(it.id, 'reject')}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ---------- Modal รายละเอียดคำขอ ---------- */}
      {show && (
        <div style={overlay}>
          <div style={modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0 }}>รายละเอียดคำขอ</h4>
              <button className="btn btn-sm btn-outline-dark" onClick={close}>×</button>
            </div>

            {detailLoading && <div>Loading…</div>}
            {detailErr && <div className="alert alert-danger">{detailErr}</div>}

            {!!detail && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={kvGrid}>
                  <div>ผู้ใช้</div><div><b>{detail.request.user?.email}</b></div>
                  <div>บทบาทปัจจุบัน</div><div>{detail.request.user?.role}</div>
                  <div>ขอเป็น</div><div><b>{detail.request.requestedRole}</b></div>
                  <div>เหตุผล</div><div>{detail.request.reason || '—'}</div>
                  <div>สร้างเมื่อ</div><div>{new Date(detail.request.createdAt).toLocaleString()}</div>
                </div>

                {detail.request.requestedRole === 'ARTIST' && (
                  <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
                    <h5>ข้อมูลใบสมัครศิลปิน</h5>
                    {detail.application?.artist ? (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {detail.application.artist.profilePhotoUrl && (
                          <img
                            src={detail.application.artist.profilePhotoUrl}
                            alt="profile"
                            style={{ maxWidth: 220, borderRadius: 12, border: '1px solid #eee' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}

                        <div style={kvGrid}>
                          <div>Stage name</div><div><b>{detail.application.artist.name || '—'}</b></div>
                          <div>Genre</div><div>{detail.application.artist.genre || '—'}</div>
                          <div>Booking type</div><div>{detail.application.artist.bookingType || '—'}</div>
                          <div>Pitch</div><div>{detail.application.artist.description || '—'}</div>
                          <div>Contact</div>
                          <div>
                            {detail.application.artist.contactEmail || detail.application.artist.contactPhone ? (
                              <>
                                {detail.application.artist.contactEmail && <div>{detail.application.artist.contactEmail}</div>}
                                {detail.application.artist.contactPhone && <div>{detail.application.artist.contactPhone}</div>}
                              </>
                            ) : '—'}
                          </div>
                          <div>Price range</div>
                          <div>
                            {(detail.application.artist.priceMin || detail.application.artist.priceMax)
                              ? `${detail.application.artist.priceMin || '-'} – ${detail.application.artist.priceMax || '-'}`
                              : '—'}
                          </div>
                          <div>Links</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {detail.application.artist.youtubeUrl && <a href={detail.application.artist.youtubeUrl} target="_blank" rel="noreferrer">YouTube</a>}
                            {detail.application.artist.spotifyUrl && <a href={detail.application.artist.spotifyUrl} target="_blank" rel="noreferrer">Spotify</a>}
                            {detail.application.artist.soundcloudUrl && <a href={detail.application.artist.soundcloudUrl} target="_blank" rel="noreferrer">SoundCloud</a>}
                            {!detail.application.artist.youtubeUrl && !detail.application.artist.spotifyUrl && !detail.application.artist.soundcloudUrl && '—'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#777' }}>— ไม่มีใบสมัครที่แนบมา —</div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-success" onClick={() => act(detail.request.id, 'approve')}>Approve</button>
                  <button className="btn btn-outline-danger" onClick={() => act(detail.request.id, 'reject')}>Reject</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- styles ---------- */
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
const modal = {
  width: 'min(900px, 96vw)', maxHeight: '90vh', overflow: 'auto',
  background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,.2)',
};
const kvGrid = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr',
  gap: '6px 12px',
  alignItems: 'baseline',
  fontSize: 14,
};
