// frontend/src/pages/CreateVenue.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import MapPicker from '../components/MapPicker';

export default function CreateVenue() {
  const [name, setName] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [dateOpen, setDateOpen] = useState('');
  const [dateClose, setDateClose] = useState('');
  const [priceRate, setPriceRate] = useState('BUDGET');
  const [timeOpen, setTimeOpen] = useState('');
  const [timeClose, setTimeClose] = useState('');
  const [alcoholPolicy, setAlcoholPolicy] = useState('SERVE');
  const [ageRestriction, setAgeRestriction] = useState('ALL');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [photoUrls, setPhotoUrls] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [lineUrl, setLineUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // พิกัด (มาจาก MapPicker) + mirror ลงช่อง lat/lng เพื่อแสดงอย่างเดียว
  const [location, setLocation] = useState(null); // {lat, lng, address}
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const navigate = useNavigate();

  // โหลดข้อมูลเดิม (ถ้ามี) และเติมพิกัดลง MapPicker
  useEffect(() => {
    axios
      .get('/api/auth/me', { withCredentials: true })
      .then((res) => {
        const u = res.data;
        if (u?.performerInfo?.venueInfo) {
          const p = u.performerInfo;
          const v = p.venueInfo;
          setHasProfile(true);
          setName(u.name || '');
          setLocationUrl(v.location.locationUrl || '');
          setGenre(v.genre || '');
          setDescription(v.description || '');
          setCapacity(v.capacity || '');
          setDateOpen(v.dateOpen ? v.dateOpen.slice(0, 10) : '');
          setDateClose(v.dateClose ? v.dateClose.slice(0, 10) : '');
          setPriceRate(v.priceRate || 'BUDGET');
          setTimeOpen(v.timeOpen || '');
          setTimeClose(v.timeClose || '');
          setAlcoholPolicy(v.alcoholPolicy || 'SERVE');
          setAgeRestriction(v.ageRestriction || 'ALL');
          setProfilePhotoUrl(u.profilePhotoUrl || '');
          setPhotoUrls((v.photoUrls || []).join(', '));
          setContactEmail(p.contactEmail || '');
          setContactPhone(p.contactPhone || '');
          setFacebookUrl(p.facebookUrl || '');
          setInstagramUrl(p.instagramUrl || '');
          setLineUrl(p.lineUrl || '');
          setTiktokUrl(p.tiktokUrl || '');
          setWebsiteUrl(v.websiteUrl || '');
          if (v.location.latitude && v.location.longitude) {
            setLocation({
              lat: v.location.latitude,
              lng: v.location.longitude,
              address: '', // ถ้ามี column address ค่อยเติมภายหลัง
            });
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch /auth/me:', err);
      });
  }, []);

  // เมื่อเปลี่ยนตำแหน่งบนแผนที่ → อัปเดต lat/lng และ locationUrl ให้อัตโนมัติ
  useEffect(() => {
    if (location?.lat && location?.lng) {
      setLatitude(String(location.lat));
      setLongitude(String(location.lng));
      setLocationUrl(`https://www.google.com/maps?q=${location.lat},${location.lng}`);
    }
  }, [location]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const lat =
        location?.lat != null ? Number(location.lat) : latitude ? parseFloat(latitude) : undefined;
      const lng =
        location?.lng != null ? Number(location.lng) : longitude ? parseFloat(longitude) : undefined;

      const raw = {
        name: name.trim(),
        locationUrl: locationUrl.trim() || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : undefined),
        genre: genre.trim(),
        description: description.trim() || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        dateOpen: dateOpen ? new Date(dateOpen).toISOString() : undefined,
        dateClose: dateClose ? new Date(dateClose).toISOString() : undefined,
        priceRate: priceRate || undefined,
        timeOpen: timeOpen || undefined,
        timeClose: timeClose || undefined,
        alcoholPolicy,
        ageRestriction: ageRestriction || undefined,
        profilePhotoUrl: profilePhotoUrl || undefined,
        photoUrls: photoUrls ? photoUrls.split(',').map((s) => s.trim()).filter(Boolean) : [],
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        facebookUrl: facebookUrl || undefined,
        instagramUrl: instagramUrl || undefined,
        lineUrl: lineUrl || undefined,
        tiktokUrl: tiktokUrl || undefined,
        websiteUrl: websiteUrl || undefined,

        // ✅ ส่งพิกัดจาก MapPicker
        latitude: lat,
        longitude: lng,
      };

      const payload = Object.fromEntries(
        Object.entries(raw).filter(
          ([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
        ),
      );

      // ต้องล็อกอิน (มี cookie) ถึงจะเซฟ venue ได้
      const res = await axios.post('/api/venues', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });

      setLoading(false);
      // ไปหน้า list ของสถานที่ (ไม่เข้า /api/venues/:id เพราะเป็น endpoint API)
      navigate('/venues');
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || 'Failed to save venue');
      console.error('CreateVenue error:', err);
    }
  };

  return (
    <div style={{ maxWidth: 820, margin: '24px auto', padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>
        {hasProfile ? 'Edit Venue Profile' : 'Create Venue Profile'}
      </h2>

      {error && (
        <div
          style={{
            background: '#ffeef0',
            color: '#86181d',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Name *</label>
          <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        {/* locationUrl ไม่บังคับกรอกแล้ว จะถูกเติมจาก MapPicker ให้อัตโนมัติ */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Location URL (auto)</label>
          <input className="form-control" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} placeholder="จะถูกสร้างอัตโนมัติเมื่อปักหมุด" />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Genre *</label>
          <input className="form-control" value={genre} onChange={(e) => setGenre(e.target.value)} required />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Description</label>
          <textarea className="form-control" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Capacity</label>
          <input
            className="form-control"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Date Open</label>
            <input type="date" className="form-control" value={dateOpen} onChange={(e) => setDateOpen(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Date Close</label>
            <input type="date" className="form-control" value={dateClose} onChange={(e) => setDateClose(e.target.value)} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Price Rate *</label>
          <select className="form-select" value={priceRate} onChange={(e) => setPriceRate(e.target.value)} required>
            <option value="BUDGET">BUDGET</option>
            <option value="STANDARD">STANDARD</option>
            <option value="PREMIUM">PREMIUM</option>
            <option value="VIP">VIP</option>
            <option value="LUXURY">LUXURY</option>
          </select>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Time Open</label>
            <input type="time" className="form-control" value={timeOpen} onChange={(e) => setTimeOpen(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Time Close</label>
            <input type="time" className="form-control" value={timeClose} onChange={(e) => setTimeClose(e.target.value)} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Alcohol Policy *</label>
          <select className="form-select" value={alcoholPolicy} onChange={(e) => setAlcoholPolicy(e.target.value)} required>
            <option value="SERVE">SERVE</option>
            <option value="NONE">NONE</option>
            <option value="BYOB">BYOB</option>
          </select>
        </div>

        {/* เปลี่ยนเป็น select ของ enum: ALL / E18 / E20 */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Age Restriction</label>
          <select
            className="form-select"
            value={ageRestriction}
            onChange={(e) => setAgeRestriction(e.target.value)}
          >
            <option value="ALL">ทุกวัย</option>
            <option value="E18">18+</option>
            <option value="E20">20+</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Profile Photo URL</label>
          <input className="form-control" value={profilePhotoUrl} onChange={(e) => setProfilePhotoUrl(e.target.value)} />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Photo URLs (comma separated)</label>
          <input className="form-control" value={photoUrls} onChange={(e) => setPhotoUrls(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Contact Email</label>
            <input className="form-control" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Contact Phone</label>
            <input className="form-control" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Facebook URL</label>
          <input className="form-control" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Instagram URL</label>
          <input className="form-control" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>LINE URL</label>
          <input className="form-control" value={lineUrl} onChange={(e) => setLineUrl(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>TikTok URL</label>
          <input className="form-control" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Website URL</label>
          <input className="form-control" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        </div>

        {/* 🗺️ เลือกตำแหน่งด้วยแผนที่ */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>ตำแหน่งบนแผนที่</label>
          <MapPicker value={location} onChange={setLocation} />
          {/* แสดงพิกัดอย่างเดียวเพื่อให้ผู้ใช้มั่นใจ */}
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 8 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Latitude</label>
              <input className="form-control" value={latitude} readOnly />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Longitude</label>
              <input className="form-control" value={longitude} readOnly />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (hasProfile ? 'Updating…' : 'Creating…') : (hasProfile ? 'Update Venue' : 'Create Venue')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/venues')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
