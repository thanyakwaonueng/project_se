import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PRESET_GENRES = [
  'Pop','Rock','Indie','Hip-hop','R&B','EDM','Jazz','Blues','Metal','Folk','Country'
];

export default function AccountSetupPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  // form state
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirst] = useState('');
  const [lastName, setLast] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteGenres, setFav] = useState([]); // array of string
  const [desiredRole, setDesiredRole] = useState('FAN'); // FAN (default)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get('/api/me/profile', { withCredentials: true });
        if (data?.profile) {
          const p = data.profile;
          setDisplayName(p.displayName || '');
          setFirst(p.firstName || '');
          setLast(p.lastName || '');
          setBio(p.bio || '');
          setFav(Array.isArray(p.favoriteGenres) ? p.favoriteGenres : []);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleGenre = (g) => {
    setFav(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setOk('');
    setSaving(true);
    try {
      const payload = { displayName, firstName, lastName, bio, favoriteGenres, desiredRole };
      const { data } = await axios.post('/api/me/setup', payload, { withCredentials: true });

      if (data?.createdRoleRequest) {
        setOk('บันทึกแล้ว และส่งคำขออัปเกรดสิทธิ์ให้แอดมินเรียบร้อย! เมื่ออนุมัติจะมีแจ้งเตือนขึ้นที่กระดิ่ง');
      } else {
        setOk('บันทึกโปรไฟล์เรียบร้อย!');
      }
    } catch (e) {
      setErr(e?.response?.data?.error || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ maxWidth: 800, margin: '24px auto' }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 800, margin: '24px auto', padding: 16 }}>
      <h2>Account Setup</h2>
      <p style={{ color: '#666' }}>
        กรอกข้อมูลโปรไฟล์เบื้องต้น เลือกบทบาทที่ต้องการใช้งาน (FAN/ARTIST/VENUE/ORGANIZER) — ถ้าไม่เลือกจะเป็น FAN
      </p>

      {err && <div className="alert alert-danger">{err}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <div className="row">
          <div className="col-md-6">
            <label className="form-label fw-bold">Display name</label>
            <input className="form-control" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold">First name</label>
            <input className="form-control" value={firstName} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold">Last name</label>
            <input className="form-control" value={lastName} onChange={(e) => setLast(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="form-label fw-bold">About you</label>
          <textarea className="form-control" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>

        <div>
          <label className="form-label fw-bold">Favorite genres</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRESET_GENRES.map(g => (
              <button
                key={g}
                type="button"
                className={`btn btn-sm ${favoriteGenres.includes(g) ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => toggleGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <small className="text-muted">คลิกเลือก/ยกเลิกได้หลายอัน</small>
        </div>

        <div>
          <label className="form-label fw-bold">Role</label>
          <select className="form-select" value={desiredRole} onChange={(e) => setDesiredRole(e.target.value)}>
            <option value="FAN">FAN</option>
            <option value="ARTIST">ARTIST (ขออนุมัติ)</option>
            <option value="VENUE">VENUE (ขออนุมัติ)</option>
            <option value="ORGANIZER">ORGANIZER (ขออนุมัติ)</option>
          </select>
          <small className="text-muted">ถ้าเลือก ARTIST/VENUE/ORGANIZER ระบบจะส่งคำขอไปให้แอดมินอนุมัติ</small>
        </div>

        <div>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
