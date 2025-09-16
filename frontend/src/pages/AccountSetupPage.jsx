// frontend/src/pages/AccountSetupPage.jsx
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

  // ----- โปรไฟล์ผู้ใช้ทั่วไป -----
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirst] = useState('');
  const [lastName, setLast] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteGenres, setFav] = useState([]); // string[]

  // ----- เลือกบทบาท: ให้เลือกได้แค่ AUDIENCE หรือ ARTIST -----
  const [selectedRole, setSelectedRole] = useState('AUDIENCE'); // 'AUDIENCE' | 'ARTIST'

  // ----- ฟอร์มยื่นสมัครศิลปิน (แบบสั้น) -----
  const [artist, setArtist] = useState({
    name: '',
    genre: '',
    bookingType: 'FULL_BAND', // FULL_BAND | TRIO | DUO | SOLO
    description: '',
    youtubeUrl: '',
    spotifyUrl: '',
    soundcloudUrl: '',
    contactEmail: '',
    contactPhone: '',
    priceMin: '',
    priceMax: '',
    profilePhotoUrl: '',
  });

  const handleArtistChange = (key, val) => {
    setArtist(prev => ({ ...prev, [key]: val }));
  };

  const toggleGenre = (g) => {
    setFav(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  // โหลดโปรไฟล์ถ้ามี (พยายาม GET /api/me/profile; ถ้าไม่มี endpoint ก็ไม่เป็นไร)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        // ถ้ามี GET /api/me/profile ให้ใช้; ถ้าไม่มีจะ throw แล้วเราจะ ignore
        const res = await axios.get('/api/auth/me', { withCredentials: true });
        if (!alive) return;
        const p = res?.data?.profile || null;
        if (p) {
          setDisplayName(p.displayName || '');
          setFirst(p.firstName || '');
          setLast(p.lastName || '');
          setBio(p.bio || '');
          setFav(Array.isArray(p.favoriteGenres) ? p.favoriteGenres : []);
        }
      } catch {
        // เงียบไว้ (บางโปรเจ็กต์ไม่มี GET /me/profile)
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ตรวจฟอร์ม “ยื่น ARTIST” ขั้นต่ำ
  const validateArtistApplication = () => {
    if (selectedRole !== 'ARTIST') return null;

    if (!artist.name.trim()) return 'กรุณาใส่ Stage name (ชื่อศิลปิน)';
    if (!artist.genre.trim()) return 'กรุณาใส่แนวดนตรีหลัก (Genre)';
    if (!artist.bookingType) return 'กรุณาเลือก Booking type';
    const hasSample = Boolean(artist.youtubeUrl.trim() || artist.spotifyUrl.trim() || artist.soundcloudUrl.trim());
    if (!hasSample) return 'กรุณาใส่อย่างน้อย 1 ลิงก์สาธิตผลงาน (YouTube/Spotify/SoundCloud)';
    const hasContact = Boolean(artist.contactEmail.trim() || artist.contactPhone.trim());
    if (!hasContact) return 'กรุณาใส่อย่างน้อย 1 ช่องทางติดต่อ (Email/Phone)';
    return null;
  };

const submit = async (e) => {
  e.preventDefault();
  setErr('');
  setOk('');

  const artistErr = validateArtistApplication();
  if (artistErr) {
    setErr(artistErr);
    return;
  }

  setSaving(true);
  try {
    // 1) เรียก /me/setup เพื่อบันทึกโปรไฟล์ + สร้าง role request + ยิง noti
    const payload = {
      displayName, firstName, lastName, bio, favoriteGenres,
      desiredRole: selectedRole === 'ARTIST' ? 'ARTIST' : undefined,
    };
    const { data: setupRes } = await axios.post('/api/me/setup', payload, { withCredentials: true });

    // 2) ถ้าเลือก ARTIST ส่งใบสมัครศิลปินแบบสั้นเข้าไปเก็บ (optional)
    if (selectedRole === 'ARTIST') {
      const payloadArtist = {
        name: artist.name.trim(),
        description: artist.description.trim() || null,
        genre: artist.genre.trim(),
        bookingType: artist.bookingType,
        profilePhotoUrl: artist.profilePhotoUrl.trim() || null,
        youtubeUrl: artist.youtubeUrl.trim() || null,
        spotifyUrl: artist.spotifyUrl.trim() || null,
        soundcloudUrl: artist.soundcloudUrl.trim() || null,
        contactEmail: artist.contactEmail.trim() || null,
        contactPhone: artist.contactPhone.trim() || null,
        priceMin: artist.priceMin ? Number(artist.priceMin) : null,
        priceMax: artist.priceMax ? Number(artist.priceMax) : null,
      };
      const clean = Object.fromEntries(Object.entries(payloadArtist).filter(([, v]) => v !== null && v !== ''));
      await axios.post('/api/artists', clean, { withCredentials: true });
    }

    setOk(
      selectedRole === 'ARTIST'
        ? 'บันทึกแล้ว และส่งคำขอศิลปินให้แอดมินเรียบร้อย (มีแจ้งเตือนที่ฝั่งแอดมิน)'
        : 'บันทึกโปรไฟล์เรียบร้อย!'
    );
  } catch (e2) {
    setErr(e2?.response?.data?.error || 'บันทึกไม่สำเร็จ');
  } finally {
    setSaving(false);
  }
};

  if (loading) return <div style={{ maxWidth: 800, margin: '24px auto' }}>Loading…</div>;

  const isArtist = selectedRole === 'ARTIST';

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: 16 }}>
      <h2>Account Setup</h2>
      <p style={{ color: '#666' }}>
        เลือกบทบาทการใช้งาน: <b>AUDIENCE</b> (ผู้ชม) หรือ <b>ARTIST</b> (ยื่นสมัครเป็นศิลปิน).<br />
        <b>Organizer</b> จะให้เฉพาะแอดมินกำหนดเท่านั้น — ผู้ใช้ทั่วไปไม่สามารถยื่นขอเองได้
      </p>

      {err && <div className="alert alert-danger">{err}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        {/* ----- User profile block ----- */}
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

        {/* ----- Role select (ไม่มี Organizer ให้เลือก) ----- */}
        <div>
          <label className="form-label fw-bold">Role</label>
          <div className="d-flex gap-3 flex-wrap">
            <label className="d-flex align-items-center gap-2">
              <input
                type="radio"
                name="role"
                value="AUDIENCE"
                checked={selectedRole === 'AUDIENCE'}
                onChange={(e) => setSelectedRole(e.target.value)}
              />
              <span>AUDIENCE</span>
            </label>
            <label className="d-flex align-items-center gap-2">
              <input
                type="radio"
                name="role"
                value="ARTIST"
                checked={selectedRole === 'ARTIST'}
                onChange={(e) => setSelectedRole(e.target.value)}
              />
              <span>ARTIST (ยื่นสมัคร)</span>
            </label>
          </div>
          <small className="text-muted">
            ผู้ใช้ทั่วไปไม่สามารถยื่นขอ Organizer ได้ — แอดมินเป็นผู้กำหนดเท่านั้น
          </small>
        </div>

        {/* ----- Artist short application (เฉพาะตอนเลือก ARTIST) ----- */}
        {isArtist && (
          <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
            <h4 className="mb-3">Artist Application (Short)</h4>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-bold">Stage name *</label>
                <input
                  className="form-control"
                  value={artist.name}
                  onChange={e => handleArtistChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label fw-bold">Genre *</label>
                <input
                  className="form-control"
                  value={artist.genre}
                  onChange={e => handleArtistChange('genre', e.target.value)}
                  placeholder="Pop / Indie / Rock"
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label fw-bold">Booking type *</label>
                <select
                  className="form-select"
                  value={artist.bookingType}
                  onChange={e => handleArtistChange('bookingType', e.target.value)}
                >
                  <option value="FULL_BAND">Full-band</option>
                  <option value="TRIO">Trio</option>
                  <option value="DUO">Duo</option>
                  <option value="SOLO">Solo</option>
                </select>
              </div>

              <div className="col-12">
                <label className="form-label fw-bold">Short pitch (1–2 บรรทัด)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  maxLength={240}
                  value={artist.description}
                  onChange={e => handleArtistChange('description', e.target.value)}
                  placeholder="ตัวอย่าง: อินดี้ป๊อปโทนอบอุ่น เหมาะกับงานคาเฟ่/อีเวนต์กลางแจ้ง"
                />
              </div>

              {/* Sample links — บังคับอย่างน้อย 1 ช่องให้ไม่ว่าง */}
              <div className="col-md-4">
                <label className="form-label fw-bold">YouTube (อย่างน้อย 1 ช่อง)</label>
                <input
                  className="form-control"
                  value={artist.youtubeUrl}
                  onChange={e => handleArtistChange('youtubeUrl', e.target.value)}
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold">Spotify</label>
                <input
                  className="form-control"
                  value={artist.spotifyUrl}
                  onChange={e => handleArtistChange('spotifyUrl', e.target.value)}
                  placeholder="https://open.spotify.com/..."
                />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold">SoundCloud</label>
                <input
                  className="form-control"
                  value={artist.soundcloudUrl}
                  onChange={e => handleArtistChange('soundcloudUrl', e.target.value)}
                  placeholder="https://soundcloud.com/..."
                />
              </div>

              {/* Contact (ต้องมีอย่างน้อย 1) */}
              <div className="col-md-6">
                <label className="form-label fw-bold">Contact email</label>
                <input
                  className="form-control"
                  value={artist.contactEmail}
                  onChange={e => handleArtistChange('contactEmail', e.target.value)}
                  placeholder="example@mail.com"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Phone</label>
                <input
                  className="form-control"
                  value={artist.contactPhone}
                  onChange={e => handleArtistChange('contactPhone', e.target.value)}
                  placeholder="080-xxx-xxxx"
                />
              </div>

              {/* Optional */}
              <div className="col-md-3">
                <label className="form-label fw-bold">Price min (optional)</label>
                <input
                  className="form-control"
                  value={artist.priceMin}
                  onChange={e => handleArtistChange('priceMin', e.target.value.replace(/[^0-9.]/g,''))}
                  placeholder="เช่น 8000"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-bold">Price max (optional)</label>
                <input
                  className="form-control"
                  value={artist.priceMax}
                  onChange={e => handleArtistChange('priceMax', e.target.value.replace(/[^0-9.]/g,''))}
                  placeholder="เช่น 20000"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Profile photo (URL, optional)</label>
                <input
                  className="form-control"
                  value={artist.profilePhotoUrl}
                  onChange={e => handleArtistChange('profilePhotoUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <small className="text-muted d-block mt-2">
              เมื่อส่งแล้ว แอดมินจะตรวจและเป็นผู้กำหนดสิทธิ์ <b>ARTIST</b> ให้
              (จากนั้นค่อยไปกรอกโปรไฟล์ศิลปินฉบับเต็ม)
            </small>
          </div>
        )}

        <div>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
