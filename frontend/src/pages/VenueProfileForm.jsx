import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { extractErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function VenueProfileForm() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState({
    name: '',
    locationUrl: '',
    genre: '',
    alcoholPolicy: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    capacity: '',
    latitude: '',
    longitude: '',
  });

  const isEdit = useMemo(() => !!user?.venueProfile?.id, [user]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/meta/enums');
        if (!alive) return;
        setMeta(data);
        setForm(prev => ({
          ...prev,
          alcoholPolicy: prev.alcoholPolicy || data.alcoholPolicies?.[0] || '',
        }));
      } catch (e) {
        if (!alive) return;
        setErr(extractErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (loading) return;
      setErr('');

      if (!user) {
        setBusy(false);
        setErr('กรุณาเข้าสู่ระบบก่อน');
        return;
      }
      if (!['VENUE', 'ORGANIZER', 'ADMIN'].includes(user.role)) {
        setBusy(false);
        setErr('ต้องเป็น VENUE/ORGANIZER หรือ ADMIN เท่านั้น');
        return;
      }

      try {
        if (user.venueProfile?.id) {
          const { data } = await api.get(`/venues/${user.venueProfile.id}`);
          if (!alive) return;
          setForm({
            name: data?.name || '',
            locationUrl: data?.locationUrl || '',
            genre: data?.genre || '',
            alcoholPolicy: data?.alcoholPolicy || meta?.alcoholPolicies?.[0] || '',
            description: data?.description || '',
            contactEmail: data?.contactEmail || '',
            contactPhone: data?.contactPhone || '',
            capacity: typeof data?.capacity === 'number' ? String(data.capacity) : '',
            latitude: typeof data?.latitude === 'number' ? String(data.latitude) : '',
            longitude: typeof data?.longitude === 'number' ? String(data.longitude) : '',
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
  }, [loading, user?.venueProfile?.id]);

  const canSubmit =
    form.name && form.locationUrl && form.genre && form.alcoholPolicy;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const parseIntOrUndef = (val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? Math.trunc(n) : undefined;
  };
  const parseFloatOrUndef = (val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      if (!user) throw new Error('ยังไม่ได้เข้าสู่ระบบ');

      const payload = {
        name: form.name,
        locationUrl: form.locationUrl,
        genre: form.genre,
        alcoholPolicy: form.alcoholPolicy,
        description: form.description || undefined,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
      };

      const cap = parseIntOrUndef(form.capacity);
      if (cap !== undefined) payload.capacity = cap;

      const lat = parseFloatOrUndef(form.latitude);
      if (lat !== undefined) payload.latitude = lat;

      const lng = parseFloatOrUndef(form.longitude);
      if (lng !== undefined) payload.longitude = lng;

      if (isEdit) {
        await api.put(`/venues/${user.venueProfile.id}`, payload);
      } else {
        await api.post('/venues', { userId: user.id, ...payload });
      }
      navigate('/page_venues');
    } catch (e2) {
      setErr(extractErrorMessage(e2, 'บันทึกไม่สำเร็จ'));
    }
  };

  if (busy || loading) return <div style={{ padding: 16 }}>กำลังโหลด…</div>;

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>{isEdit ? 'Edit Venue Profile' : 'Create Venue Profile'}</h2>

      {err && (
        <div style={{ background: '#ffeef0', color: '#86181d', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {err}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Name</label>
          <input name="name" className="form-control" value={form.name} onChange={onChange} placeholder="Cool Bar" required />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Location URL</label>
          <input name="locationUrl" className="form-control" value={form.locationUrl} onChange={onChange} placeholder="https://maps.app.goo.gl/xxxxx" required />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Genre</label>
          <input name="genre" className="form-control" value={form.genre} onChange={onChange} placeholder="Indie / Alternative" required />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Alcohol Policy</label>
          <select name="alcoholPolicy" className="form-select" value={form.alcoholPolicy} onChange={onChange} required>
            {(meta?.alcoholPolicies || []).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Capacity</label>
            <input name="capacity" type="number" min="0" className="form-control" value={form.capacity} onChange={onChange} placeholder="เช่น 150" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Latitude</label>
            <input name="latitude" type="number" step="0.000001" className="form-control" value={form.latitude} onChange={onChange} placeholder="18.79" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Longitude</label>
            <input name="longitude" type="number" step="0.000001" className="form-control" value={form.longitude} onChange={onChange} placeholder="98.98" />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Description</label>
          <textarea name="description" className="form-control" rows={4} value={form.description} onChange={onChange} placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับสถานที่…" />
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Contact Email</label>
            <input name="contactEmail" className="form-control" value={form.contactEmail} onChange={onChange} placeholder="contact@coolbar.com" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Contact Phone</label>
            <input name="contactPhone" className="form-control" value={form.contactPhone} onChange={onChange} placeholder="080-000-0000" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
            {isEdit ? 'Save Changes' : 'Create Profile'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/page_venues')}>
            Cancel
          </button>
        </div>
      </form>

      <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
        * ถ้ามีพิกัด Latitude/Longitude จะใช้แสดงตำแหน่งบนแผนที่ในหน้า MAP
      </div>
    </div>
  );
}
