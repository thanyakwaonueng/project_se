import React, { useEffect, useState } from 'react';
import api, { extractErrorMessage } from '../lib/api';

export default function AdminRoleRequestsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');

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
    } catch (e) {
      alert(extractErrorMessage(e, 'ทำรายการไม่สำเร็จ'));
    }
  };

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
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-success" onClick={() => act(it.id, 'approve')}>Approve</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => act(it.id, 'reject')}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
