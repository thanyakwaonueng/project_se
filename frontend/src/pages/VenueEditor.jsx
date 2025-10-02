// frontend/src/pages/VenueEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import MapPicker from '../components/MapPicker';
import "../css/VenueEditor.css"; // ใช้ CSS แยกไฟล์

export default function VenueEditor() {
  // ===== basic info =====
  const [name, setName] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [genre, setGenre] = useState('');                 // single-select (ผ่าน chips)
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [dateOpen, setDateOpen] = useState('');
  const [dateClose, setDateClose] = useState('');
  const [priceRate, setPriceRate] = useState('BUDGET');
  const [timeOpen, setTimeOpen] = useState('');
  const [timeClose, setTimeClose] = useState('');
  const [alcoholPolicy, setAlcoholPolicy] = useState('SERVE');
  const [ageRestriction, setAgeRestriction] = useState('ALL');

  // ===== media/socials =====
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(''); // avatar URL (ใช้เป็น fallback ถ้าไม่อัปโหลดใหม่)
  const [photoUrls, setPhotoUrls] = useState('');             // เก็บ URL เดิม (comma-separated) — ยังรองรับไว้
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [lineUrl, setLineUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // ===== map picker =====
  const [location, setLocation] = useState(null); // { lat, lng, address }
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // ===== status =====
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false); // โหมดแก้ไข
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  // ===== NEW: file states & refs (อัปโหลด) =====
  const [avatarFile, setAvatarFile]   = useState(null); // รูปโปรไฟล์ (1 ไฟล์)
  const [imageFiles, setImageFiles]   = useState([]);   // รูปบรรยากาศร้าน (หลายไฟล์)
  const [videoFiles, setVideoFiles]   = useState([]);   // วิดีโอในร้าน (หลายไฟล์)
  const [avatarPreview, setAvatarPreview] = useState(''); // แสดงตัวอย่าง avatar
  const avatarInputRef = useRef(null);

  // ===== helper: pickers =====
  const handlePickAvatar = () => avatarInputRef.current?.click();
  const handleAvatarChange = (e) => {
    const f = e.target.files?.[0] || null;
    setAvatarFile(f);
    if (f) setAvatarPreview(URL.createObjectURL(f)); // preview ทันที
  };
  const onPickImages = (e) => setImageFiles(Array.from(e.target.files || []));
  const onPickVideos = (e) => setVideoFiles(Array.from(e.target.files || []));

  // ===== helper: uploaders (ตามรูปแบบที่ให้มา) =====
  const api = axios;

  async function uploadAvatarIfNeeded() {
    if (!avatarFile) return null;
    const form = new FormData();
    form.append("file", avatarFile);
    const { data } = await api.post("/api/upload", form, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.url || null;
  }

  async function uploadMany(files) {
    const urls = [];
    for (const f of files) {
      const form = new FormData();
      form.append("file", f);
      const { data } = await api.post("/api/upload", form, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.url) urls.push(data.url);
    }
    return urls;
  }

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

        const v = me?.performerInfo?.venueInfo;
        if (v) {
          setHasProfile(true);

          // user/performer/venue fields
          setName(me.name || '');
          setLocationUrl(v?.location?.locationUrl || '');
          setGenre(v?.genre || ''); // เดิมรองรับ string ตัวเดียว
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
          setPhotoUrls((v?.photoUrls || []).join(', ')); // เดิมยังรองรับไว้ (จะรวมกับอัปโหลดใหม่ตอน save)

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

          // preload avatar preview ถ้ามีรูปเดิม
          if (me?.profilePhotoUrl) setAvatarPreview(me.profilePhotoUrl);
        } else {
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

  // SAVE: อัปโหลดไฟล์ก่อน แล้วค่อยยิง PUT/POST
  const save = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ===== upload avatar/images/videos ก่อน =====
      const avatarUploadedUrl = await uploadAvatarIfNeeded(); // string|null
      const imageUploadedUrls  = await uploadMany(imageFiles); // string[]
      const videoUploadedUrls  = await uploadMany(videoFiles); // string[]

      // ===== coords =====
      const lat =
        location?.lat != null ? Number(location.lat) :
        latitude ? parseFloat(latitude) : undefined;

      const lng =
        location?.lng != null ? Number(location.lng) :
        longitude ? parseFloat(longitude) : undefined;

      // รวม URL เดิมกับที่อัปโหลดใหม่ (เฉพาะรูปภาพ)
      const existingPhotoUrls = (photoUrls || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const mergedPhotoUrls = [
        ...existingPhotoUrls,
        ...imageUploadedUrls,
      ];

      // ===== build location object ให้ตรงกับฝั่งอ่าน =====
      const locationObj =
        lat != null && lng != null
          ? {
              latitude: lat,
              longitude: lng,
              locationUrl:
                (locationUrl || '').trim() ||
                `https://www.google.com/maps?q=${lat},${lng}`,
            }
          : undefined;

      // ===== payload =====
      const raw = {
        name: (name || '').trim(),

        locationUrl:
          (locationUrl || '').trim() ||
          (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : undefined),
        genre: (genre || '').trim(),               // single-select (ผ่าน chips)
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

        // avatar: ใช้ที่อัปโหลดได้ก่อน, ถ้าไม่มีก็ fallback เป็นที่มีอยู่
        profilePhotoUrl: avatarUploadedUrl || profilePhotoUrl || undefined,

        // media
        photoUrls: mergedPhotoUrls,
        videoUrls: videoUploadedUrls, // ถ้า backend ยังไม่รองรับ ให้ลบบรรทัดนี้

        // social/contact
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        facebookUrl: facebookUrl || undefined,
        instagramUrl: instagramUrl || undefined,
        lineUrl: lineUrl || undefined,
        tiktokUrl: tiktokUrl || undefined,

        // location (เพิ่มแบบ nested ให้ตรงกับของเดิมที่อ่านมา)
        location: locationObj,

        // เก็บแบบเดิมไว้ด้วย (ไม่ลบของเพื่อน)
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
        if (!userId) throw new Error('Invalid user');
        await axios.put(`/api/venues/${userId}`, payload, {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        await axios.post('/api/venues', payload, {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      setLoading(false);
      navigate(`/venues/${userId || ''}`);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || 'บันทึกไม่สำเร็จ');
      console.error('VenueEditor save error:', err);
    }
  };

  // =========================
  //      R E T U R N
  // =========================
  return (
    <div className="ve-page" aria-busy={loading ? "true" : "false"}>
      {/* ===== Header (เอาปุ่มด้านบนออก ตามที่ขอ) ===== */}
      <header className="ve-header" style={{ width: "80%", marginInline: "auto" }}>
        <div>
          <h1 className="ve-title ve-title-hero">{hasProfile ? "VENUE SETUP" : "VENUE SETUP"}</h1>
          {/* <p className="ve-subtitle">Fill out venue information and contact details.</p> */}
        </div>
      </header>

      <div className="ve-line" />

      {error && (
        <div className="ve-alert" role="alert">
          {error}
        </div>
      )}

      {/* ===== SECTION: Details (รวม Name + Dates + Genre + Description) ===== */}
      <section className="ve-section">
        <div className="ve-form">
          <h2 className="ve-section-title">Details</h2>
          <div className="ve-grid-2">
            <div className="ve-field ve-col-span-2">
              <label className="ve-label" htmlFor="name">Venue name</label>
              <input
                id="name"
                className="ve-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nimman Studio"
              />
            </div>

            <div className="ve-field ve-col-span-2">
              <div className="ve-grid-3">
                <div className="ve-field">
                  <label className="ve-label" htmlFor="timeOpen">Opening time</label>
                  <input
                    id="timeOpen"
                    className="ve-input"
                    type="time"
                    value={timeOpen}
                    onChange={(e) => setTimeOpen(e.target.value)}
                  />
                </div>

                <div className="ve-field">
                  <label className="ve-label" htmlFor="timeClose">Closing time</label>
                  <input
                    id="timeClose"
                    className="ve-input"
                    type="time"
                    value={timeClose}
                    onChange={(e) => setTimeClose(e.target.value)}
                  />
                </div>

                <div className="ve-field">
                  <label className="ve-label" htmlFor="capacity">Capacity</label>
                  <input
                    id="capacity"
                    className="ve-input"
                    type="number"
                    inputMode="numeric"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="e.g., 300"
                  />
                </div>
              </div>
            </div>

            <div className="ve-field ve-col-span-2">
              <label className="ve-label">Favorite genres</label>
              <div className="ve-chips">
                {["Pop","Rock","Indie","Jazz","Blues","Hip-Hop","EDM","Folk","Metal","R&B"].map(g => {
                  const selected = genre?.toLowerCase() === g.toLowerCase();
                  return (
                    <button
                      key={g}
                      type="button"
                      className={`ve-chip ${selected ? "is-selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => setGenre(g)}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ve-field ve-col-span-2">
              <label className="ve-label" htmlFor="description">Description</label>
              <textarea
                id="description"
                className="ve-textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of your venue"
              />
            </div>

            <div className="ve-col-span-2">
              <div className="ve-grid-2">
                <div className="ve-field">
                  <label className="ve-label" htmlFor="ageRestriction">Age restriction</label>
                  <select
                    id="ageRestriction"
                    className="ve-select"
                    value={ageRestriction}
                    onChange={(e) => setAgeRestriction(e.target.value)}
                  >
                    <option value="ALL">All ages</option>
                    <option value="18+">18+</option>
                    <option value="20+">20+</option>
                  </select>
                </div>

                <div className="ve-field">
                  <label className="ve-label" htmlFor="alcoholPolicy">Alcohol policy</label>
                  <input
                    id="alcoholPolicy"
                    className="ve-input"
                    value={alcoholPolicy}
                    onChange={(e) => setAlcoholPolicy(e.target.value)}
                    placeholder="Serve beer/wine, no spirits, etc."
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== SECTION: Images & Videos ===== */}
      <section className="ve-section">
        <div className="ve-form">
          <h2 className="ve-section-title">Images & Videos</h2>

          <div className="ve-grid">
            {/* Images */}
            <div className="ve-field-1">
              <label className="ve-label">Images</label>
              <div className="ve-fileRow">
                <label className="ve-fileBtn ve-fileBtn-secondary">
                  Choose images
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={onPickImages}
                  />
                </label>
              </div>

              {!!imageFiles.length && (
                <div className="ve-mediaGrid">
                  {imageFiles.map((f, i) => (
                    <div key={`img-${i}`} className="ve-mediaThumb">
                      <img src={URL.createObjectURL(f)} alt={`image-${i + 1}`} />
                    </div>
                  ))}
                </div>
              )}
              <p className="ve-help">Images will be uploaded when you click Save.</p>
            </div>

            {/* Videos */}
            <div className="ve-field-1">
              <label className="ve-label">Videos</label>
              <div className="ve-fileRow">
                <label className="ve-fileBtn">
                  Choose videos
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    hidden
                    onChange={onPickVideos}
                  />
                </label>
              </div>

              {!!videoFiles.length && (
                <div className="ve-mediaGrid">
                  {videoFiles.map((f, i) => (
                    <div key={`vid-${i}`} className="ve-mediaThumb">
                      <video
                        className="ve-videoThumb"
                        src={URL.createObjectURL(f)}
                        controls
                        preload="metadata"
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="ve-help">Supports common video formats (MP4, MOV, etc.).</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION: Social & Contact ===== */}
      <section className="ve-section">
        <div className="ve-form">
          <h2 className="ve-section-title">Social & Contact</h2>
          <div className="ve-grid ve-grid-2">
            <div className="ve-field">
              <label className="ve-label" htmlFor="websiteUrl">Website</label>
              <input
                id="websiteUrl"
                className="ve-input"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="contactEmail">Email</label>
              <input
                id="contactEmail"
                className="ve-input"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@venue.com"
              />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="contactPhone">Phone</label>
              <input
                id="contactPhone"
                className="ve-input"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+66…"
              />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="facebookUrl">Facebook</label>
              <input
                id="facebookUrl"
                className="ve-input"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/…"
              />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="instagramUrl">Instagram</label>
              <input
                id="instagramUrl"
                className="ve-input"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/…"
              />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="lineUrl">Line</label>
              <input
                id="lineUrl"
                className="ve-input"
                value={lineUrl}
                onChange={(e) => setLineUrl(e.target.value)}
                placeholder="https://line.me/ti/p/…"
              />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="tiktokUrl">TikTok</label>
              <input
                id="tiktokUrl"
                className="ve-input"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@…"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION: Location ===== */}
      <section className="ve-section">
        <div className="ve-form">
          <h2 className="ve-section-title">Location</h2>
          <div className="ve-grid">
            <div className="ve-field">
              <label className="ve-label" htmlFor="latitude">Latitude</label>
              <input
                id="latitude"
                className="ve-input"
                type="number"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="18.79"
              />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="longitude">Longitude</label>
              <input
                id="longitude"
                className="ve-input"
                type="number"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="98.97"
              />
            </div>
            <div className="ve-field ve-col-span-2">
              <label className="ve-label" htmlFor="locationUrl">Location URL</label>
              <input
                id="locationUrl"
                className="ve-input"
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                placeholder="https://maps…"
              />
            </div>
          </div>

          <div className="ve-map">
            <MapPicker
              lat={latitude ? Number(latitude) : undefined}
              lng={longitude ? Number(longitude) : undefined}
              onPick={({ lat: la, lng: ln }) => {
                // ✅ อัปเดต location ด้วย เพื่อให้ effect สร้าง locationUrl ให้อัตโนมัติ
                setLocation({ lat: la, lng: ln, address: '' });
                setLatitude(String(la));
                setLongitude(String(ln));
              }}
            />
          </div>
        </div>
      </section>

      {/* ===== Actions (เฉพาะปุ่มล่าง) ===== */}
      <form
        className="ve-section"
        onSubmit={(e) => {
          e.preventDefault();
          save(e);
        }}
      >
        <div className="ve-actions ve-actions-bottom">
          <button
            className="ve-btn ve-btn-secondary"
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="ve-btn ve-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
