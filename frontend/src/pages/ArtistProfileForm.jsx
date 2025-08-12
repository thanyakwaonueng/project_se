import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { extractErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function ArtistProfileForm() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState({
    name: '',
    genre: '',
    bookingType: '',
    description: '',
  });

  const isEdit = useMemo(() => !!user?.artistProfile?.id, [user]);

  // โหลด enums ครั้งเดียว
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/meta/enums');
        if (!alive) return;
        setMeta(data);
        // ถ้ายังไม่มี bookingType ตั้งค่าเริ่มต้น
        setForm(prev => ({
          ...prev,
          bookingType: prev.bookingType || data.bookingTypes?.[0] || '',
        }));
      } catch (e) {
        if (!alive) return;
        setErr(extractErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
      }
    })();
    return () => { alive = false; };
  }, []);

  // รอให้ auth โหลดเสร็จก่อน แล้วค่อยดึงโปรไฟล์ (ถ้ามี)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (loading) return; // ยังโหลด me อยู่ → รอ
      setErr('');

      // เช็คสิทธิ์เบื้องต้น
      if (!user) {
        setBusy(false);
        setErr('กรุณาเข้าสู่ระบบก่อน');
        return;
      }
      if (!['ARTIST', 'ADMIN'].includes(user.role)) {
        setBusy(false);
        setErr('ต้องเป็น ARTIST หรือ ADMIN เท่านั้น');
        return;
      }

      try {
        if (user.artistProfile?.id) {
          const { data } = await api.get(`/artists/${user.artistProfile.id}`);
          if (!alive) return;
          setForm({
            name: data?.name || '',
            genre: data?.genre || '',
            bookingType: data?.bookingType || meta?.bookingTypes?.[0] || '',
            description: data?.description || '',
          });
        }
      } catch (e) {
        if (!alive) return;
        setErr(extractErrorMessage(e, 'โหลดโปรไฟล์ไม่สำเร็จ'));
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.artistProfile?.id]); // เปลี่ยนเฉพาะเมื่อ me โหลดเสร็จ/มี id

  const canSubmit = form.name && form.genre && form.bookingType;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      if (!user) throw new Error('ยังไม่ได้เข้าสู่ระบบ');
      if (isEdit) {
        await api.put(`/artists/${user.artistProfile.id}`, {
          name: form.name,
          genre: form.genre,
          bookingType: form.bookingType,
          description: form.description || undefined,
        });
      } else {
        await api.post('/artists', {
          userId: user.id,
          name: form.name,
          genre: form.genre,
          bookingType: form.bookingType,
          description: form.description || undefined,
        });
      }
      navigate('/page_artists');
    } catch (e2) {
      setErr(extractErrorMessage(e2, 'บันทึกไม่สำเร็จ'));
    }
  };

  if (busy || loading) return <div style={{ padding: 16 }}>กำลังโหลด…</div>;

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>{isEdit ? 'Edit Artist Profile' : 'Create Artist Profile'}</h2>

      {err && (
        <div style={{ background: '#ffeef0', color: '#86181d', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {err}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Name</label>
          <input
            name="name"
            className="form-control"
            value={form.name}
            onChange={onChange}
            placeholder="My Band"
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Genre</label>
          <input
            name="genre"
            className="form-control"
            value={form.genre}
            onChange={onChange}
            placeholder="Indie / Alternative"
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Booking Type</label>
          <select
            name="bookingType"
            className="form-select"
            value={form.bookingType}
            onChange={onChange}
            required
          >
            {(meta?.bookingTypes || []).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Description</label>
          <textarea
            name="description"
            className="form-control"
            rows={4}
            value={form.description}
            onChange={onChange}
            placeholder="เล่าแนวดนตรี ผลงาน จุดเด่น ฯลฯ"
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
            {isEdit ? 'Save Changes' : 'Create Profile'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/page_artists')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
