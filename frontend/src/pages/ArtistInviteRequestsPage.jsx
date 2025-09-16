import React, { useEffect, useState } from 'react';
import api, { extractErrorMessage } from '../lib/api';

export default function ArtistInvitesPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [artistId, setArtistId] = useState(null);

  const load = async () => {
    try {
      setErr('');

      // 1) get current user (and their artistProfile if any)
      const { data: me } = await api.get('/auth/me');
      if (!me) {
        setErr('ไม่พบข้อมูลผู้ใช้ (กรุณาเข้าสู่ระบบ)');
        setItems([]);
        return;
      }

      if (!me.artistProfile || !me.artistProfile.id) {
        setErr('ไม่พบโปรไฟล์ศิลปินสำหรับผู้ใช้ของคุณ');
        setItems([]);
        return;
      }

      const aid = me.artistProfile.id;
      setArtistId(aid);

      // 2) load pending invites for this artist
      const { data } = await api.get(`/artist-events/pending/${aid}`);
      setItems(data || []);
    } catch (e) {
      setErr(extractErrorMessage(e, 'โหลดคำเชิญไม่สำเร็จ'));
      setItems([]);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (artistIdParam, eventId, action) => {
    try {
      // remove prompt that asks for a reason — we no longer collect a note from the user
      // optionally keep a simple confirmation dialog to avoid accidental clicks
      const confirmMessage =
        action === 'accept'
          ? 'ยืนยันการยอมรับคำเชิญสำหรับงานนี้?'
          : 'ยืนยันการปฏิเสธคำเชิญสำหรับงานนี้?';

      const ok = window.confirm(confirmMessage);
      if (!ok) return;

      // map action -> decision expected by backend
      const decision = action === 'accept' ? 'ACCEPTED' : 'DECLINED';

      await api.post('/artist-events/respond', {
        artistId: Number(artistIdParam),
        eventId: Number(eventId),
        decision,
        // no note is sent since we removed the prompt
      });

      await load();
    } catch (e) {
      alert(extractErrorMessage(e, 'ทำรายการไม่สำเร็จ'));
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: 16 }}>
      <h2>คำเชิญงานของฉัน (รอการตอบ)</h2>

      {err && <div className="alert alert-danger">{err}</div>}

      {!items.length ? (
        <div>— ไม่มีคำเชิญ —</div>
      ) : (
        <table className="table">
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
            {items.map(it => {
              const ev = it.event || {};
              const evTitle = ev.name || ev.title || `Event #${ev.id ?? it.eventId}`;
              const when = ev.date ? new Date(ev.date).toLocaleString() : (it.createdAt ? new Date(it.createdAt).toLocaleString() : '—');

              return (
                <tr key={`${it.artistId}-${it.eventId}`}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{evTitle}</div>
                    <div style={{ color: '#666', fontSize: 13 }}>ID: {ev.id ?? it.eventId}</div>
                  </td>

                  <td>{it.status}</td>

                  <td style={{ whiteSpace: 'pre-wrap' }}>{it.notes || '—'}</td>

                  <td>{when}</td>

                  <td style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => act(it.artistId, it.eventId, 'accept')}
                    >
                      ยอมรับ
                    </button>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => act(it.artistId, it.eventId, 'decline')}
                    >
                      ปฏิเสธ
                    </button>
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

