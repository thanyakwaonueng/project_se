import React, { useState } from 'react';
import api, { extractErrorMessage } from '../lib/api';

export default function RoleUpgradePage() {
  const [role, setRole] = useState('ARTIST');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await api.post('/role-requests', { role, reason });
      setMsg('ส่งคำขอแล้ว! กรุณารอแอดมินอนุมัติ');
      setReason('');
    } catch (e2) {
      setErr(extractErrorMessage(e2, 'ส่งคำขอไม่สำเร็จ'));
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: '24px auto', padding: 16 }}>
      <h2>ขออัปเกรดสิทธิ์</h2>
      {msg && <div className="alert alert-info" style={{ marginTop: 8 }}>{msg}</div>}
      {err && <div className="alert alert-danger" style={{ marginTop: 8 }}>{err}</div>}
      <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <div>
          <label>บทบาทที่ต้องการ</label>
          <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
            <option value="ARTIST">ARTIST</option>
            <option value="VENUE">VENUE</option>
            <option value="ORGANIZER">ORGANIZER</option>
          </select>
        </div>
        <div>
          <label>เหตุผล/หลักฐาน</label>
          <textarea
            className="form-control"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            placeholder="โปรดบอกเหตุผล หรือแนบลิงก์ผลงาน/เพจ ฯลฯ"
          />
        </div>
        <button className="btn btn-primary">ส่งคำขอ</button>
      </form>
    </div>
  );
}
