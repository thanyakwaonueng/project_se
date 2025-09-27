// frontend/src/pages/VenueEditor.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import MapPicker from '../components/MapPicker';

export default function VenueEditor() {
  // basic info
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

  // media/socials
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [photoUrls, setPhotoUrls] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [lineUrl, setLineUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // map picker
  const [location, setLocation] = useState(null); // { lat, lng, address }
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false); // ← มี venue เดิม = โหมดแก้ไข
  const [userId, setUserId] = useState(null);

  const navigate = useNavigate();

  // โหลด /auth/me แล้วเติมฟอร์ม (ถ้ามี venue เดิม)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = (await axios.get('/api/auth/me', { withCredentials: true })).data;
        if (!alive) return;

        if (!me?.id) {
          setError('กรุณาเข้าสู่ระบบก่อน');
          return;
        }
        setUserId(me.id);

        // ถ้ามี performer/venue → โหมดแก้ไข
        const v = me?.performerInfo?.venueInfo;
        if (v) {
          setHasProfile(true);

          // user/performer/venue fields
          setName(me.name || '');
          setLocationUrl(v?.location?.locationUrl || '');
          setGenre(v?.genre || '');
          setDescription(v?.description || '');
          setCapacity(v?.capacity ? String(v.capacity) : '');
          setDateOpen(v?.dateOpen ? v.dateOpen.slice(0, 10) : '');
          setDateClose(v?.dateClose ? v.dateClose.slice(0, 10) : '');
          setPriceRate(v?.priceRate || 'BUDGET');
          setTimeOpen(v?.timeOpen || '');
          setTimeClose(v?.timeClose || '');
          setAlcoholPolicy(v?.alcoholPolicy || 'SERVE');
          setAgeRestriction(v?.ageRestriction || 'ALL');

          setProfilePhotoUrl(me?.profilePhotoUrl || '');
          setPhotoUrls((v?.photoUrls || []).join(', '));

          setContactEmail(me?.performerInfo?.contactEmail || '');
          setContactPhone(me?.performerInfo?.contactPhone || '');
          setFacebookUrl(me?.performerInfo?.facebookUrl || '');
          setInstagramUrl(me?.performerInfo?.instagramUrl || '');
          setLineUrl(me?.performerInfo?.lineUrl || '');
          setTiktokUrl(me?.performerInfo?.tiktokUrl || '');
          setWebsiteUrl(v?.websiteUrl || '');

          if (v?.location?.latitude != null && v?.location?.longitude != null) {
            setLocation({
              lat: v.location.latitude,
              lng: v.location.longitude,
              address: '',
            });
            setLatitude(String(v.location.latitude));
            setLongitude(String(v.location.longitude));
          }
        } else {
          // โหมดสร้างใหม่ → ไม่ตั้งค่าอะไรพิเศษ
          setHasProfile(false);
        }
      } catch (e) {
        console.error('fetch /auth/me failed:', e);
        setError('โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
      }
    })();
    return () => { alive = false; };
  }, []);

  // เมื่อเปลี่ยนพิกัดจาก Map → mirror ลง lat/lng และ locationUrl
  useEffect(() => {
    if (location?.lat != null && location?.lng != null) {
      setLatitude(String(location.lat));
      setLongitude(String(location.lng));
      setLocationUrl(`https://www.google.com/maps?q=${location.lat},${location.lng}`);
    }
  }, [location]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ใช้พิกัดจาก MapPicker (ถ้ามี) หรือจากช่อง lat/lng
      const lat =
        location?.lat != null ? Number(location.lat) :
        latitude ? parseFloat(latitude) : undefined;

      const lng =
        location?.lng != null ? Number(location.lng) :
        longitude ? parseFloat(longitude) : undefined;

      // เตรียม payload ให้ตรง backend
      const raw = {
        // name เก็บที่ user.name (ฝั่ง PUT จะอัปเดตให้)
        name: (name || '').trim(),

        // venue data
        locationUrl: (locationUrl || '').trim() || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : undefined),
        genre: (genre || '').trim(),
        description: (description || '').trim() || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        dateOpen: dateOpen ? new Date(dateOpen).toISOString() : undefined,
        dateClose: dateClose ? new Date(dateClose).toISOString() : undefined,
        priceRate: priceRate || undefined,
        timeOpen: timeOpen || undefined,
        timeClose: timeClose || undefined,
        alcoholPolicy,
        ageRestriction: ageRestriction || undefined,
        websiteUrl: websiteUrl || undefined,
        profilePhotoUrl: profilePhotoUrl || undefined, // (เก็บรูปโปรไฟล์ user; ฝั่ง backend PUT จะใช้งานได้ถ้ารองรับ)
        photoUrls: photoUrls ? photoUrls.split(',').map(s => s.trim()).filter(Boolean) : [],

        // performer social/contact
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        facebookUrl: facebookUrl || undefined,
        instagramUrl: instagramUrl || undefined,
        lineUrl: lineUrl || undefined,
        tiktokUrl: tiktokUrl || undefined,

        // location
        latitude: lat,
        longitude: lng,
      };

      // กรอง undefined/ค่าว่าง
      const payload = Object.fromEntries(
        Object.entries(raw).filter(
          ([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
        ),
      );

      if (hasProfile) {
        // แก้ไขของตัวเอง: PUT /api/venues/:id (id = userId/performerId)
        if (!userId) throw new Error('Invalid user');
        await axios.put(`/api/venues/${userId}`, payload, {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        // สร้างใหม่: POST /api/venues (backend ใช้ user จาก cookie)
        await axios.post('/api/venues', payload, {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      setLoading(false);
      // กลับไปหน้า venue ของตัวเอง
      navigate(`/venues/${userId || ''}`);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || 'บันทึกไม่สำเร็จ');
      console.error('VenueEditor save error:', err);
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

      <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Name *</label>
          <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Location URL (auto)</label>
          <input
            className="form-control"
            value={locationUrl}
            onChange={(e) => setLocationUrl(e.target.value)}
            placeholder="จะถูกสร้างอัตโนมัติเมื่อปักหมุด"
          />
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

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Age Restriction</label>
          <select className="form-select" value={ageRestriction} onChange={(e) => setAgeRestriction(e.target.value)}>
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

        {/* 🗺️ MapPicker */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>ตำแหน่งบนแผนที่</label>
          <MapPicker value={location} onChange={setLocation} />
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
          <button type="button" className="btn btn-secondary" onClick={() => navigate(userId ? `/venues/${userId}` : '/venues')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
