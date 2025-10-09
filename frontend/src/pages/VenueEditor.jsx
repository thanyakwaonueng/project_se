// src/pages/VenueEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import MapPicker from '../components/MapPicker';
import "../css/VenueEditor.css";

// ===== helper: แปลงเวลาเป็น 24 ชั่วโมง "HH:mm" =====
function to24h(s) {
  if (!s) return "";
  const str = String(s).trim();

  // 1) already HH:mm
  let m = str.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m) return `${m[1].padStart(2,"0")}:${m[2]}`;

  // 2) 1930, 19.30, 19-30, 7:5?
  m = str.match(/^(\d{1,2})[:.\-]?([0-5]?\d)$/);
  if (m) {
    let hh = Math.max(0, Math.min(23, parseInt(m[1],10)));
    let mm = Math.max(0, Math.min(59, parseInt(m[2],10)));
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
  }

  // 3) 1:00 PM / 01 PM / 7pm
  m = str.match(/^(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)$/i);
  if (m) {
    let hh = parseInt(m[1],10);
    const mm = m[2] ?? "00";
    const isPM = /PM/i.test(m[3]);
    if (hh === 12) hh = isPM ? 12 : 0;
    else if (isPM) hh += 12;
    return `${String(hh).padStart(2,"0")}:${mm}`;
  }

  // 4) 7pm, 12am
  m = str.match(/^(\d{1,2})(am|pm)$/i);
  if (m) {
    let hh = parseInt(m[1],10);
    const isPM = /pm/i.test(m[2]);
    if (hh === 12) hh = isPM ? 12 : 0;
    else if (isPM) hh += 12;
    return `${String(hh).padStart(2,"0")}:00`;
  }

  // parse ไม่ได้ -> คืนค่าว่าง
  return "";
}

const HHMM_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export default function VenueEditor() {
  // ===== basic info =====
  const [name, setName] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [dateOpen, setDateOpen] = useState('');
  const [dateClose, setDateClose] = useState('');
  const [priceRate, setPriceRate] = useState('BUDGET');
  const [timeOpen, setTimeOpen] = useState('');   // HH:mm (text)
  const [timeClose, setTimeClose] = useState(''); // HH:mm (text)
  const [alcoholPolicy, setAlcoholPolicy] = useState('SERVE');
  const [ageRestriction, setAgeRestriction] = useState('ALL');

  // ===== media/socials =====
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [lineUrl, setLineUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // ===== map picker =====
  const [location, setLocation] = useState(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // ===== status =====
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  // ===== media state =====
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const avatarInputRef = useRef(null);

  const [existingPhotos, setExistingPhotos] = useState([]);   // string[]
  const [existingVideos, setExistingVideos] = useState([]);   // string[]
  const [imageFiles, setImageFiles]     = useState([]);       // File[]
  const [videoFiles, setVideoFiles]     = useState([]);       // File[]
  const [deleteQueue, setDeleteQueue]   = useState([]);       // string[]

  const handlePickAvatar = () => avatarInputRef.current?.click();
  const handleAvatarChange = (e) => {
    const f = e.target.files?.[0] || null;
    setAvatarFile(f);
    if (f) setAvatarPreview(URL.createObjectURL(f));
  };
  const onPickImages = (e) => setImageFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
  const onPickVideos = (e) => setVideoFiles(prev => [...prev, ...Array.from(e.target.files || [])]);

  const removeSelectedImage = (idx) => setImageFiles(prev => prev.filter((_, i) => i !== idx));
  const removeSelectedVideo = (idx) => setVideoFiles(prev => prev.filter((_, i) => i !== idx));

  const removeExistingPhoto = (url) => {
    setExistingPhotos(prev => prev.filter(u => u !== url));
    setDeleteQueue(prev => prev.includes(url) ? prev : [...prev, url]);
  };

  const clearAvatar = () => {
    if (profilePhotoUrl) setDeleteQueue(prev => prev.includes(profilePhotoUrl) ? prev : [...prev, profilePhotoUrl]);
    setProfilePhotoUrl('');
    setAvatarFile(null);
    setAvatarPreview('');
  };

  // ===== helper: uploaders =====
  const api = axios;

  async function uploadOne(file) {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post("/api/upload", form, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.url || null;
  }

  async function uploadMany(files) {
    const out = [];
    for (const f of files) {
      const u = await uploadOne(f);
      if (u) out.push(u);
    }
    return out;
  }

  // ===== preload /auth/me =====
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

          setName(me.name || '');
          setLocationUrl(v?.location?.locationUrl || '');
          setGenre(v?.genre || '');
          setDescription(v?.description || '');
          setCapacity(v?.capacity ? String(v.capacity) : '');
          setDateOpen(v?.dateOpen ? v.dateOpen.slice(0, 10) : '');
          setDateClose(v?.dateClose ? v.dateClose.slice(0, 10) : '');
          setPriceRate(v?.priceRate || 'BUDGET');

          // 👇 normalize เวลาเป็น HH:mm
          setTimeOpen(to24h(v?.timeOpen || ''));
          setTimeClose(to24h(v?.timeClose || ''));

          setAlcoholPolicy(v?.alcoholPolicy || 'SERVE');
          setAgeRestriction(v?.ageRestriction || 'ALL');

          // avatar & media
          setProfilePhotoUrl(v?.profilePhotoUrl || '');
          if (v?.profilePhotoUrl) setAvatarPreview(v.profilePhotoUrl);
          setExistingPhotos(Array.isArray(v?.photoUrls) ? v.photoUrls : []);
          setExistingVideos([]);

          // contacts
          setContactEmail(me?.performerInfo?.contactEmail || '');
          setContactPhone(me?.performerInfo?.contactPhone || '');
          setFacebookUrl(me?.performerInfo?.facebookUrl || '');
          setInstagramUrl(me?.performerInfo?.instagramUrl || '');
          setLineUrl(me?.performerInfo?.lineUrl || '');
          setTiktokUrl(me?.performerInfo?.tiktokUrl || '');
          setWebsiteUrl(v?.websiteUrl || '');

          // map
          if (v?.location?.latitude != null && v?.location?.longitude != null) {
            setLocation({ lat: v.location.latitude, lng: v.location.longitude, address: '' });
            setLatitude(String(v.location.latitude));
            setLongitude(String(v.location.longitude));
          }
        } else {
          setHasProfile(false);
        }
      } catch (e) {
        console.error('fetch /auth/me failed:', e);
        setError('Failed to load user data.');
      }
    })();
    return () => { alive = false; };
  }, []);

  // mirror map -> inputs
  useEffect(() => {
    if (location?.lat != null && location?.lng != null) {
      setLatitude(String(location.lat));
      setLongitude(String(location.lng));
      setLocationUrl(`https://www.google.com/maps?q=${location.lat},${location.lng}`);
    }
  }, [location]);

  // ===== SAVE =====
  const save = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // validate เวลา
      const tOpen = to24h(timeOpen);
      const tClose = to24h(timeClose);
      if ((timeOpen && !HHMM_REGEX.test(tOpen)) || (timeClose && !HHMM_REGEX.test(tClose))) {
        setLoading(false);
        return setError('The opening/closing time is incorrect. Please use 24-hour format, e.g. 10:00, 23:30.');
      }

      // 1) upload new files
      const avatarUploaded = avatarFile ? await uploadOne(avatarFile) : null;
      const imageUploaded  = await uploadMany(imageFiles);
      const videoUploaded  = await uploadMany(videoFiles); // เผื่อใช้ในอนาคต

      // 2) build coords + location
      const lat = location?.lat != null ? Number(location.lat) : (latitude ? parseFloat(latitude) : undefined);
      const lng = location?.lng != null ? Number(location.lng) : (longitude ? parseFloat(longitude) : undefined);

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

      // 3) merge photo urls
      const mergedPhotoUrls = [...existingPhotos, ...imageUploaded];

      // 4) delete queue (avatar เดิมถ้าเปลี่ยนใหม่)
      const deleteQueueNext = [...deleteQueue];
      if (avatarUploaded && profilePhotoUrl && profilePhotoUrl !== avatarUploaded) {
        if (!deleteQueueNext.includes(profilePhotoUrl)) deleteQueueNext.push(profilePhotoUrl);
      }

      // 5) payload (เวลาส่งเป็น HH:mm)
      const payloadRaw = {
        name: (name || '').trim(),
        locationUrl: (locationUrl || '').trim(),
        genre: (genre || '').trim(),
        description: (description || '').trim() || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        dateOpen: dateOpen ? new Date(dateOpen).toISOString() : undefined,
        dateClose: dateClose ? new Date(dateClose).toISOString() : undefined,
        priceRate: priceRate || undefined,
        timeOpen: tOpen || undefined,
        timeClose: tClose || undefined,
        alcoholPolicy,
        ageRestriction: ageRestriction || undefined,
        websiteUrl: websiteUrl || undefined,

        profilePhotoUrl: avatarUploaded || profilePhotoUrl || undefined,

        photoUrls: mergedPhotoUrls,
        // videoUrls: [...existingVideos, ...videoUploaded],

        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        facebookUrl: facebookUrl || undefined,
        instagramUrl: instagramUrl || undefined,
        lineUrl: lineUrl || undefined,
        tiktokUrl: tiktokUrl || undefined,

        location: locationObj,
        latitude: lat,
        longitude: lng,
      };

      const payload = Object.fromEntries(
        Object.entries(payloadRaw).filter(
          ([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
        ),
      );

      // 6) save venue
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

      // 7) delete removed files (best-effort)
      if (deleteQueueNext.length) {
        try {
          await axios.post('/api/storage/delete', { urls: deleteQueueNext }, { withCredentials: true });
        } catch (e) {
          console.warn('delete storage failed (ignored):', e?.response?.data || e?.message);
        }
      }

      setLoading(false);
      await Swal.fire({
        icon: 'success',
        title: hasProfile ? 'Venue updated' : 'Venue created',
        text: hasProfile
          ? 'Your venue information has been saved.'
          : 'Your venue profile is ready to customize.',
        confirmButtonColor: '#2563eb',
      });
      navigate(`/venues/${userId || ''}`);
    } catch (err) {
      setLoading(false);
      const msg = err?.response?.data?.error || 'Failed to save';
      setError(msg);
      Swal.fire({
        icon: 'error',
        title: 'Save failed',
        text: msg,
        confirmButtonColor: '#d33',
      });
      console.error('VenueEditor save error:', err);
    }
  };

  const onBlurTime = (val, setter) => {
    const t = to24h(val);
    setter(t);
  };

  // ===== UI =====
  return (
    <div className="ve-page" aria-busy={loading ? "true" : "false"}>
      <header className="ve-header" style={{ width: "80%", marginInline: "auto" }}>
        <div>
          <h1 className="ve-title ve-title-hero">{hasProfile ? "VENUE SETUP" : "VENUE SETUP"}</h1>
        </div>
      </header>

      <div className="ve-line" />

      {error && <div className="ve-alert" role="alert">{error}</div>}

      {/* ===== Details ===== */}
      <section className="ve-section">
        <div className="ve-form">
          <h2 className="ve-section-title">Details</h2>
          <div className="ve-grid-2">
            <div className="ve-field ve-col-span-2">
              <label className="ve-label" htmlFor="name">Venue name</label>
              <input id="name" className="ve-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nimman Studio" />
            </div>

            <div className="ve-field ve-col-span-2">
              <div className="ve-grid-3">
                <div className="ve-field">
                  <label className="ve-label" htmlFor="timeOpen">Opening time</label>
                  {/* 👉 เปลี่ยนเป็นกรอก 24h */}
                  <input
                    id="timeOpen"
                    className="ve-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="HH:mm"
                    title="24-hour time such as 10:00, 19:30"
                    pattern="^([01]?\d|2[0-3]):([0-5]\d)$"
                    value={timeOpen}
                    onChange={(e) => setTimeOpen(e.target.value)}
                    onBlur={(e) => onBlurTime(e.target.value, setTimeOpen)}
                  />
                </div>

                <div className="ve-field">
                  <label className="ve-label" htmlFor="timeClose">Closing time</label>
                  {/* 👉 เปลี่ยนเป็นกรอก 24h */}
                  <input
                    id="timeClose"
                    className="ve-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="HH:mm"
                    title="24-hour time such as 10:00, 19:30"
                    pattern="^([01]?\d|2[0-3]):([0-5]\d)$"
                    value={timeClose}
                    onChange={(e) => setTimeClose(e.target.value)}
                    onBlur={(e) => onBlurTime(e.target.value, setTimeClose)}
                  />
                </div>

                <datalist id="venue-time-suggestions">
                  <option value="10:00" />
                  <option value="12:00" />
                  <option value="17:00" />
                  <option value="18:00" />
                  <option value="19:00" />
                  <option value="22:00" />
                  <option value="23:00" />
                </datalist>

                <div className="ve-field">
                  <label className="ve-label" htmlFor="capacity">Capacity</label>
                  <input id="capacity" className="ve-input" type="number" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g., 300" />
                </div>
              </div>
            </div>

            <div className="ve-field ve-col-span-2">
              <label className="ve-label">Genres</label>
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

            {/* Description Section */}
            <div className="venue-description-section">
              <div className="venue-description-header">
                <label className="ve-label" htmlFor="description">Description</label>
              </div>
              
              <textarea
                id="description"
                className="venue-description-textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of your venue"
                maxLength={500}
              />
              
              <div className="venue-char-counter">
                {description.length} / 500
              </div>
            </div>

            <div className="ve-col-span-2">
              <div className="ve-grid-2">
                <div className="ve-field">
                  <label className="ve-label" htmlFor="ageRestriction">Age restriction</label>
                  <select id="ageRestriction" className="ve-select" value={ageRestriction} onChange={(e) => setAgeRestriction(e.target.value)}>
                    <option value="ALL">All ages</option>
                    <option value="18+">18+</option>
                    <option value="20+">20+</option>
                  </select>
                </div>

                <div className="ve-field">
                  <label className="ve-label" htmlFor="alcoholPolicy">Alcohol policy</label>
                  <select id="alcoholPolicy" className="ve-select" value={alcoholPolicy} onChange={(e) => setAlcoholPolicy(e.target.value)}>
                    <option value="SERVE">SERVE</option>
                    <option value="BYOB">BYOB</option>
                    <option value="NONE">NONE</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== Avatar ===== */}
      {/* // ใน VenueEditor.jsx - ส่วนนี้ยังคงเหมือนเดิม */}
      <section className="ve-section">
        <div className="ve-form">
          <h2 className="ve-section-title">Venue Media</h2>
          
          <div className="venue-media-section">
            {/* Venue Avatar - ด้านซ้าย */}
            <div>
              <div className="ve-field">
                {/* <label className="ve-label">Venue Avatar</label> */}
                <div 
                  className="venue-avatar-compact" 
                  onClick={handlePickAvatar} 
                  role="button" 
                  aria-label="Upload venue avatar"
                >
                  {avatarPreview || profilePhotoUrl ? (
                    <>
                      <img src={avatarPreview || profilePhotoUrl} alt="venue avatar preview" />
                      <div className="venue-avatar-edit-compact">change image</div>
                    </>
                  ) : (
                    <div className="venue-avatar-hint"><br/>()</div>
                  )}
                </div>
                <input 
                  ref={avatarInputRef} 
                  type="file" 
                  accept="image/*" 
                  className="acc-fileInput" 
                  onChange={handleAvatarChange} 
                />
              </div>
              
              {/* <div className="venue-help-text" style={{ marginTop: '10px', textAlign: 'center' }}>
                Recommended: Square image, at least 400×400 pixels
              </div> */}
            </div>

            {/* Venue Images - ด้านขวา */}
            <div className="venue-images-compact">
              <div className="venue-images-header">
                <label className="ve-label">Gallery Photos</label>
                
                <label className="venue-add-btn-compact" role="button" aria-label="Add venue images">
                  + Add images
                  <input type="file" accept="image/*" multiple hidden onChange={onPickImages} />
                </label>
              </div>

              {/* กริดรูปภาพ */}
              <div className="venue-images-grid-compact">
                {/* รูปเดิมที่มีอยู่ */}
                {existingPhotos.map((u, i) => (
                  <div key={`old-${i}`} className="venue-image-thumb-compact">
                    <img src={u} alt={`existing venue image ${i + 1}`} />
                    <button
                      type="button"
                      className="venue-remove-btn-compact"
                      title="Remove"
                      aria-label={`Remove existing image ${i + 1}`}
                      onClick={() => removeExistingPhoto(u)}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* รูปที่เพิ่งเลือกใหม่ */}
                {imageFiles.map((f, i) => {
                  const src = URL.createObjectURL(f);
                  return (
                    <div key={`new-${i}`} className="venue-image-thumb-compact">
                      <img src={src} alt={`new venue image ${i + 1}`} onLoad={() => URL.revokeObjectURL(src)} />
                      <button
                        type="button"
                        className="venue-remove-btn-compact"
                        title="Remove"
                        aria-label={`Remove new image ${i + 1}`}
                        onClick={() => removeSelectedImage(i)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="venue-help-text" style={{ marginTop: 10 }}>
                Upload photos of your venue. Show the stage, seating area, and atmosphere.
              </p>
            </div>
          </div>
        </div>
      </section>

      

      {/* ===== Social & Contact ===== */}
      <section className="ve-section">
        <div className="ve-form">
          <h2 className="ve-section-title">Social & Contact</h2>
          <div className="ve-grid ve-grid-2">
            <div className="ve-field">
              <label className="ve-label" htmlFor="websiteUrl">Website</label>
              <input id="websiteUrl" className="ve-input" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="contactEmail">Email</label>
              <input id="contactEmail" className="ve-input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@venue.com" />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="contactPhone">Phone</label>
              <input id="contactPhone" className="ve-input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+66…" />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="facebookUrl">Facebook</label>
              <input id="facebookUrl" className="ve-input" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/…" />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="instagramUrl">Instagram</label>
              <input id="instagramUrl" className="ve-input" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/…" />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="lineUrl">Line</label>
              <input id="lineUrl" className="ve-input" value={lineUrl} onChange={(e) => setLineUrl(e.target.value)} placeholder="https://line.me/ti/p/…" />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="tiktokUrl">TikTok</label>
              <input id="tiktokUrl" className="ve-input" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://www.tiktok.com/@…" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Location ===== */}
      <section className="ve-section">
        <div className="ve-form">
          <h2 className="ve-section-title">Location</h2>
          <div className="ve-grid">
            <div className="ve-field">
              <label className="ve-label" htmlFor="latitude">Latitude</label>
              <input id="latitude" className="ve-input" type="number" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="18.79" />
            </div>
            <div className="ve-field">
              <label className="ve-label" htmlFor="longitude">Longitude</label>
              <input id="longitude" className="ve-input" type="number" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="98.97" />
            </div>
            <div className="ve-field ve-col-span-2">
              <label className="ve-label" htmlFor="locationUrl">Location URL</label>
              <input id="locationUrl" className="ve-input" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} placeholder="https://maps…" />
            </div>
          </div>

          <div className="ve-map">
            <MapPicker
              lat={latitude ? Number(latitude) : undefined}
              lng={longitude ? Number(longitude) : undefined}
              onPick={({ lat: la, lng: ln }) => {
                setLocation({ lat: la, lng: ln, address: '' });
                setLatitude(String(la));
                setLongitude(String(ln));
              }}
            />
          </div>
        </div>
      </section>

      {/* ===== Actions ===== */}
      <form className="ve-section" onSubmit={(e) => { e.preventDefault(); save(e); }}>
        <div className="ve-actions ve-actions-bottom">
          <button className="ve-btn ve-btn-secondary" type="button" onClick={() => navigate(-1)} disabled={loading}>
            Cancel
          </button>
          <button className="ve-btn ve-btn-primary" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
