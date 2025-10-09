// frontend/src/pages/CreateEvent.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

// Event Editor styles
import "../css/CreateEvent.css";

/* ===== helper: normalize to 24h "HH:mm" ===== */
function to24h(s) {
  if (!s) return "";
  const str = String(s).trim();

  // 1) already HH:mm
  let m = str.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m) return `${m[1].padStart(2,"0")}:${m[2]}`;

  // 2) HMM or H:MM with various separators (1930, 19.30, 19-30, 7:05)
  m = str.match(/^(\d{1,2})[:.\-]?([0-5]\d)$/);
  if (m) {
    const hh = Math.max(0, Math.min(23, parseInt(m[1],10)));
    const mm = m[2];
    return `${String(hh).padStart(2,"0")}:${mm}`;
  }

  // 3) AM/PM forms: "1:00 PM", "01 PM"
  m = str.match(/^(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)$/i);
  if (m) {
    let hh = parseInt(m[1],10);
    const mm = m[2] ?? "00";
    const isPM = /PM/i.test(m[3]);
    if (hh === 12) hh = isPM ? 12 : 0;
    else if (isPM) hh += 12;
    return `${String(hh).padStart(2,"0")}:${mm}`;
  }

  // 4) compact am/pm: "7pm", "12am"
  m = str.match(/^(\d{1,2})(am|pm)$/i);
  if (m) {
    let hh = parseInt(m[1],10);
    const isPM = /pm/i.test(m[2]);
    if (hh === 12) hh = isPM ? 12 : 0;
    else if (isPM) hh += 12;
    return `${String(hh).padStart(2,"0")}:00`;
  }

  // 5) unknown -> empty (prevent invalid)
  return "";
}

/* ===== helpers: time/date utils (local) ===== */
const HHMM_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const toMin = (hhmm) => {
  const m = (hhmm||'').match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1],10)*60 + parseInt(m[2],10);
};
const nowHHMM = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${hh}:${mm}`;
};
// yyyy-mm-dd in user's local timezone
const localTodayStr = () => {
  const d = new Date();
  const z = d.getTimezoneOffset();
  const localISO = new Date(d.getTime() - z*60*1000).toISOString();
  return localISO.split('T')[0];
};

// 🆕 ตรวจช่วงเวลาอยู่ในช่วงเปิด–ปิดของร้าน (รองรับข้ามเที่ยงคืน)
function isWithinVenueHours(startHHMM, endHHMM, venueOpenHHMM, venueCloseHHMM) {
  const s = toMin(startHHMM), e = toMin(endHHMM);
  const o = toMin(venueOpenHHMM || ''), c = toMin(venueCloseHHMM || '');
  if (s==null || e==null || o==null || c==null) return true; // ถ้าไม่มีข้อมูลครบ ไม่บล็อก
  if (s >= e) return false; // ไม่อนุญาตอีเวนต์ข้ามวัน

  if (o <= c) {
    // ร้านไม่ข้ามเที่ยงคืน
    return s >= o && e <= c;
  } else {
    // ร้านข้ามเที่ยงคืน เช่น 17:00–01:00
    // อนุญาตถ้าอยู่ในช่วงค่ำ [o, 24:00) หรือช่วงเช้า [00:00, c]
    const inLate = s >= o && e <= 24*60;
    const inEarly = s >= 0 && e <= c;
    return inLate || inEarly;
  }
}

/* 🆕 ตรวจชื่อซ้ำจากเซิร์ฟเวอร์แบบชัวร์ (return true = ยูนีค, false = ซ้ำ) */
async function checkEventNameUnique(name, excludeId) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return true;

  // 1) endpoint เฉพาะ (ถ้ามี)
  try {
    const { data } = await axios.get('/api/events/check-unique-name', {
      params: { name: trimmed, excludeId: excludeId || undefined },
      withCredentials: true,
    });
    if (typeof data?.unique === 'boolean') return data.unique;
  } catch (_) {}

  // 2) exists endpoint (เผื่อโปรเจ็กต์ใช้ชื่อนี้)
  try {
    const { data } = await axios.get('/api/events/exists-by-name', {
      params: { name: trimmed, excludeId: excludeId || undefined },
      withCredentials: true,
    });
    if (typeof data?.exists === 'boolean') return !data.exists;
  } catch (_) {}

  // 3) Fallback: query รายการแล้วเทียบ exact (case-insensitive)
  try {
    const { data: list } = await axios.get('/api/events', {
      params: { q: trimmed, limit: 10, exact: 1 },
      withCredentials: true,
    });
    const lower = trimmed.toLowerCase();
    const dup = Array.isArray(list) && list.some(ev => {
      if (!ev?.name) return false;
      const sameName = String(ev.name).trim().toLowerCase() === lower;
      const sameId = excludeId ? Number(ev.id) === Number(excludeId) : false;
      return sameName && !sameId;
    });
    return !dup;
  } catch (err) {
    console.warn('checkEventNameUnique fallback failed:', err?.response?.data || err?.message);
    // ถ้าเช็คกับ backend ไม่ได้ ให้ถือว่ายูนีคเพื่อไม่บล็อกการสร้างงาน
    return true;
  }
}

export default function CreateEvent() {
  const { eventId } = useParams(); // /me/event/:eventId

  // ===== state =====
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [conditions, setConditions] = useState('');
  const [eventType, setEventType] = useState('INDOOR');
  const [ticketing, setTicketing] = useState('FREE');
  const [ticketLink, setTicketLink] = useState('');
  const [alcoholPolicy, setAlcoholPolicy] = useState('SERVE');
  const [ageRestriction, setAgeRestriction] = useState('ALL'); // ALL | E18 | E20
  const [date, setDate] = useState('');
  const [doorOpenTime, setDoorOpenTime] = useState(''); // HH:mm (text)
  const [endTime, setEndTime] = useState('');           // HH:mm (text)
  const [genre, setGenre] = useState('');

  // 🆕 เวลาทำการของสถานที่
  const [venueOpen, setVenueOpen] = useState(null);  // "HH:mm" หรือ null
  const [venueClose, setVenueClose] = useState(null); // "HH:mm" หรือ null

  // 🆕 ชื่ออีเวนต์ต้องยูนีค
  const [isNameUnique, setIsNameUnique] = useState(true);
  const [nameChecking, setNameChecking] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasEvent, setHasEvent] = useState(false);

  const navigate = useNavigate();

  // ===== error at bottom + auto scroll =====
  const errorRef = useRef(null);
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorRef.current.focus?.();
    }
  }, [error]);

  // ===== upload states =====
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState('');
  const [deleteQueue, setDeleteQueue] = useState([]);
  const posterInputRef = useRef(null);

  const handlePickPoster = () => posterInputRef.current?.click();
  const handlePosterChange = (e) => {
    const f = e.target.files?.[0] || null;
    setPosterFile(f);
    if (f) setPosterPreview(URL.createObjectURL(f));
    else setPosterPreview('');
  };
  const clearPoster = () => {
    if (posterUrl) {
      setDeleteQueue((prev) => (prev.includes(posterUrl) ? prev : [...prev, posterUrl]));
    }
    setPosterUrl('');
    setPosterFile(null);
    setPosterPreview('');
  };

  // ===== helper: upload =====
  async function uploadOne(file) {
    const form = new FormData();
    form.append("file", file);
    const { data } = await axios.post("/api/upload", form, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.url || null;
  }

  useEffect(() => {
    if (eventId) setHasEvent(true);
  }, [eventId]);

  // 🆕 preload ข้อมูล "ฉัน" แล้วโหลด venue ของเจ้าของ เพื่อรู้เวลาเปิด–ปิด
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meRes = await axios.get('/api/auth/me', { withCredentials: true });
        const me = meRes.data;
        if (!me?.id) return;
        // GET /venues/:id ใช้ performerId = userId
        const vRes = await axios.get(`/api/venues/${me.id}`);
        const v = vRes.data;
        const openHH = to24h(v?.timeOpen || v?.venue?.timeOpen || v?.venue?.timeopen || '');
        const closeHH = to24h(v?.timeClose || v?.venue?.timeClose || v?.venue?.timeclose || '');
        if (!alive) return;
        setVenueOpen(openHH || null);
        setVenueClose(closeHH || null);
      } catch (e) {
        // เงียบ ๆ ถ้าหาไม่ได้
      }
    })();
    return () => { alive = false; };
  }, []);

  // preload existing event (edit mode) + normalize time to HH:mm
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      try {
        const res = await axios.get(`/api/events/${eventId}`, { withCredentials: true });
        const ev = res.data;
        setName(ev.name || '');
        setDescription(ev.description || '');
        setPosterUrl(ev.posterUrl || '');
        setPosterPreview('');
        setConditions(ev.conditions || '');
        setEventType(ev.eventType || 'INDOOR');
        setTicketing(ev.ticketing || 'FREE');
        setTicketLink(ev.ticketLink || '');
        setAlcoholPolicy(ev.alcoholPolicy || 'SERVE');
        setAgeRestriction(ev.ageRestriction || 'ALL');
        setDate(ev.date ? ev.date.split('T')[0] : '');
        setDoorOpenTime(to24h(ev.doorOpenTime || ''));
        setEndTime(to24h(ev.endTime || ''));
        setGenre(ev.genre || '');
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setError(err.response?.data?.error || 'Could not load event details');
      }
    };
    fetchEvent();
  }, [eventId]);

  // 🆕 เช็คชื่อยูนีคแบบ on-change (debounce)
  useEffect(() => {
    let alive = true;
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      setIsNameUnique(true);
      setNameChecking(false);
      return;
    }
    setNameChecking(true);
    const t = setTimeout(async () => {
      const ok = await checkEventNameUnique(trimmed, eventId);
      if (!alive) return;
      setIsNameUnique(ok);
      setNameChecking(false);
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [name, eventId]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // validate time format
      const tDoor = to24h(doorOpenTime);
      const tEnd  = to24h(endTime);
      if ((doorOpenTime && !HHMM_REGEX.test(tDoor)) || (endTime && !HHMM_REGEX.test(tEnd))) {
        setLoading(false);
        return setError('Invalid time format. Please use HH:mm (e.g., 13:00, 19:30).');
      }

      // forbid past date/time
      const todayStr = localTodayStr();
      if (date && date < todayStr) {
        setLoading(false);
        return setError('Unable to create events in the past.');
      }
      if (date && date === todayStr) {
        const now = toMin(nowHHMM());
        if (tDoor && toMin(tDoor) < now) {
          setLoading(false);
          return setError('Door Open time must not be in the past (today).');
        }
        if (tEnd && toMin(tEnd) < now) {
          setLoading(false);
          return setError('End Time must not be in the past (today).');
        }
      }

      // at least 60 minutes if both times are provided
      if (tDoor && tEnd) {
        const s = toMin(tDoor);
        const eMin = toMin(tEnd);
        if (s != null && eMin != null) {
          if (eMin <= s) {
            setLoading(false);
            return setError('End Time must be later than Door Open.');
          }
          if (eMin - s < 60) {
            setLoading(false);
            return setError('Event duration must be at least 60 minutes.');
          }
        }
      }

      // 🆕 บังคับอยู่ในเวลาเปิด–ปิดของสถานที่
      if (tDoor && tEnd && (venueOpen || venueClose)) {
        const okHours = isWithinVenueHours(tDoor, tEnd, venueOpen, venueClose);
        if (!okHours) {
          setLoading(false);
          return setError(
            `The time selected is outside the venue's opening hours (${venueOpen || '—'}–${venueClose || '—'}).`
          );
        }
      }

      // 🆕 double-check ชื่อซ้ำก่อนส่ง (กันทุกเคส)
      const uniqueNow = await checkEventNameUnique(name, eventId);
      if (!uniqueNow) {
        setLoading(false);
        return setError('This event name is already in use. Please choose another.');
      }

      // 1) upload poster if any
      let uploadedPoster = null;
      if (posterFile) uploadedPoster = await uploadOne(posterFile);

      // 2) mark old poster for deletion if replaced
      const deleteQueueNext = [...deleteQueue];
      if (uploadedPoster && posterUrl && posterUrl !== uploadedPoster) {
        if (!deleteQueueNext.includes(posterUrl)) deleteQueueNext.push(posterUrl);
      }

      // 3) save
      const raw = {
        name: name.trim(),
        description: description.trim() || undefined,
        posterUrl: (uploadedPoster || posterUrl || '').trim() || undefined,
        conditions: conditions.trim() || undefined,
        eventType,
        ticketing,
        ticketLink: ticketLink.trim() || undefined,
        alcoholPolicy,
        ageRestriction,
        date: date ? new Date(date).toISOString() : undefined,
        doorOpenTime: tDoor || undefined,
        endTime: tEnd || undefined,
        genre: genre.trim() || undefined,
        id: eventId ? parseInt(eventId, 10) : undefined,
      };

      const payload = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined && v !== '')
      );

      const res = await axios.post('/api/events', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });

      // 4) best-effort delete old files
      if (deleteQueueNext.length) {
        try {
          await axios.post('/api/storage/delete', { urls: deleteQueueNext }, { withCredentials: true });
        } catch (errDel) {
          console.warn('delete storage failed (ignored):', errDel?.response?.data || errDel?.message);
        }
      }

      setLoading(false);
      await Swal.fire({
        icon: 'success',
        title: eventId ? 'Event updated' : 'Event created',
        text: eventId
          ? 'Your changes have been saved.'
          : 'The event is now ready. You can manage the line-up and publish it when ready.',
        confirmButtonColor: '#2563eb',
      });
      navigate(`/events/${res.data.id}`);
    } catch (err) {
      setLoading(false);
      // 🆕 ดัก duplicate name จาก server
      const status = err?.response?.status;
      const code = err?.response?.data?.code || err?.response?.data?.errorCode;
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message;

      if (status === 409 || status === 422 || code === 'EVENT_NAME_NOT_UNIQUE') {
        const duplicateMsg = 'This event name is already in use. Please choose another.';
        setError(duplicateMsg);
        await Swal.fire({
          icon: 'error',
          title: 'Duplicate event name',
          text: duplicateMsg,
          confirmButtonColor: '#d33',
        });
        return;
      }

      const fallbackMsg = msg || 'Failed to save event';
      setError(fallbackMsg);
      await Swal.fire({
        icon: 'error',
        title: 'Save failed',
        text: fallbackMsg,
        confirmButtonColor: '#d33',
      });
    }
  };

  // normalize to HH:mm on blur (optional UX)
  const onBlurTime = (val, setter) => {
    const t = to24h(val);
    setter(t);
  };

  const todayStr = localTodayStr();

  return (
    <div className="ee-page" aria-busy={loading ? "true" : "false"}>
      {/* ===== Header ===== */}
      <header className="ee-header">
        <h1 className="ee-title">{hasEvent ? 'EDIT EVENT' : 'Create Event'}</h1>
      </header>

      <div className="ve-line" />

      {/* ===== Form ===== */}
      <form className="ee-form" onSubmit={submit}>
        {/* Section: Event Details */}
        <section className="ee-section">
          <h2 className="ee-section-title">Details</h2>

          <div className="ee-grid-2">
            {/* Name */}
            <div className="ee-field ee-col-span-2">
              <label className="ee-label" htmlFor="name">Name *</label>
              <input
                id="name"
                className="ee-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setName(name.trim())}
                required
                placeholder="Event name"
                aria-invalid={!isNameUnique}
                aria-describedby="name-uniq-hint"
              />
              <div id="name-uniq-hint" className="ee-help" style={{ marginTop: 6 }}>
                {nameChecking ? 'Checking name…'
                  : (!isNameUnique ? 'This event name is already in use.' : '')}
              </div>
            </div>

            {/* Poster & Description Section - Layout ใหม่ */}
            <div className="ee-field ee-col-span-2">
              <div className="ee-poster-description-grid">
                {/* Poster Section - ด้านซ้าย */}
                <div className="ee-poster-section">
                  <label className="ee-label">
                    Event Poster
                  </label>
                  
                  <div className="ee-poster-upload-area">
                    <div 
                      className="ee-poster-clickable-area"
                      onClick={handlePickPoster}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handlePickPoster();
                        }
                      }}
                    >
                      {posterPreview || posterUrl ? (
                        <div className="ee-poster-preview">
                          <img src={posterPreview || posterUrl} alt="Event poster preview" />
                          <button 
                            type="button" 
                            className="ee-poster-remove-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearPoster();
                            }}
                            aria-label="Remove poster"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="ee-poster-placeholder">
                          <div className="ee-poster-placeholder-icon">📷</div>
                          <div className="ee-poster-placeholder-text">No poster uploaded</div>
                          <div className="ee-poster-placeholder-subtext">
                            Recommended: 1200×1800px, JPG or PNG
                          </div>
                          <div className="ee-poster-placeholder-hint">
                            Click to upload image
                          </div>
                        </div>
                      )}
                    </div>

                    {/* {(posterPreview || posterUrl) && (
                      <div className="ee-poster-controls">
                        <button 
                          type="button" 
                          className="ee-btn ee-btn-text"
                          onClick={clearPoster}
                        >
                          Remove Image
                        </button>
                      </div>
                    )} */}
                    
                    <input
                      ref={posterInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handlePosterChange}
                    />
                  </div>
                </div>

                {/* Description Section - ด้านขวา */}
                <div className="ee-description-section">
                  <label className="ee-label" htmlFor="description">
                    Description
                  </label>
                  <div className="ee-description-wrapper">
                    <textarea
                      id="description"
                      className="ee-textarea"
                      rows={8}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell people about your event - the atmosphere, special performances, or anything they should know..."
                      maxLength={500}
                    />
                    <div className="ee-char-count">
                      <span>{description.length}</span>/500
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="ee-field">
              <label className="ee-label" htmlFor="conditions">Conditions</label>
              <input
                id="conditions"
                className="ee-input"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="Additional conditions (if any)"
              />
            </div>

            {/* Event Type / Ticketing */}
            <div className="ee-field">
              <label className="ee-label" htmlFor="eventType">Event Type *</label>
              <select
                id="eventType"
                className="ee-select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="OUTDOOR">OUTDOOR</option>
                <option value="INDOOR">INDOOR</option>
                <option value="HYBRID">HYBRID</option>
              </select>
            </div>

            <div className="ee-field">
              <label className="ee-label" htmlFor="ticketing">Ticketing *</label>
              <select
                id="ticketing"
                className="ee-select"
                value={ticketing}
                onChange={(e) => setTicketing(e.target.value)}
              >
                <option value="FREE">FREE</option>
                <option value="DONATION">DONATION</option>
                <option value="TICKET_MELON">TICKET_MELON</option>
                <option value="DIRECT_CONTACT">DIRECT_CONTACT</option>
                <option value="ONSITE_SALES">ONSITE_SALES</option>
              </select>
            </div>

            {/* Ticket Link */}
            <div className="ee-field ee-col-span-2">
              <label className="ee-label" htmlFor="ticketLink">Ticket Link</label>
              <input
                id="ticketLink"
                className="ee-input"
                value={ticketLink}
                onChange={(e) => setTicketLink(e.target.value)}
                placeholder="https://…"
              />
            </div>

            {/* Alcohol / Age */}
            <div className="ee-field">
              <label className="ee-label" htmlFor="alcoholPolicy">Alcohol Policy *</label>
              <select
                id="alcoholPolicy"
                className="ee-select"
                value={alcoholPolicy}
                onChange={(e) => setAlcoholPolicy(e.target.value)}
              >
                <option value="SERVE">SERVE</option>
                <option value="NONE">NONE</option>
                <option value="BYOB">BYOB</option>
              </select>
            </div>

            <div className="ee-field">
              <label className="ee-label" htmlFor="ageRestriction">Age Restriction</label>
              <select
                id="ageRestriction"
                className="ee-select"
                value={ageRestriction}
                onChange={(e) => setAgeRestriction(e.target.value)}
              >
                <option value="ALL">All ages</option>
                <option value="E18">18+</option>
                <option value="E20">20+</option>
              </select>
            </div>

            {/* Date / Door open / End time */}
            <div className="ee-col-span-2">
              <div className="ee-grid-3">
                <div className="ee-field">
                  <label className="ee-label" htmlFor="date">Date *</label>
                  <input
                    id="date"
                    type="date"
                    className="ee-input ee-inputDate"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    min={todayStr} // prevent past by HTML (local)
                  />
                </div>

                {/* time (24h text) */}
                <div className="ee-field">
                  <label className="ee-label" htmlFor="doorOpenTime">Door Open *</label>
                  <input
                    id="doorOpenTime"
                    type="text"
                    className="ee-input"
                    inputMode="numeric"
                    placeholder="HH:mm"
                    title="e.g., 13:00 or 19:30"
                    pattern="^([01]?\d|2[0-3]):([0-5]\d)$"
                    value={doorOpenTime}
                    onChange={(e) => setDoorOpenTime(e.target.value)}
                    onBlur={(e) => onBlurTime(e.target.value, setDoorOpenTime)}
                    required
                  />
                </div>

                <div className="ee-field">
                  <label className="ee-label" htmlFor="endTime">End Time *</label>
                  <input
                    id="endTime"
                    type="text"
                    className="ee-input"
                    inputMode="numeric"
                    placeholder="HH:mm"
                    title="e.g., 22:00 or 23:30"
                    pattern="^([01]?\d|2[0-3]):([0-5]\d)$"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    onBlur={(e) => onBlurTime(e.target.value, setEndTime)}
                    required
                  />
                </div>

                <datalist id="time-suggestions">
                  <option value="17:00" />
                  <option value="18:00" />
                  <option value="19:00" />
                  <option value="19:30" />
                  <option value="20:00" />
                  <option value="21:00" />
                  <option value="22:00" />
                </datalist>
              </div>
            </div>

            {/* Genre */}
            <div className="ee-field ee-col-span-2">
              <label className="ee-label" htmlFor="genre">Genre</label>
              <input
                id="genre"
                className="ee-input"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Pop / Rock / Indie"
              />
            </div>
          </div>
        </section>

        {/* ==== Error moved here, above the action buttons ==== */}
        {error && (
          <div
            ref={errorRef}
            className="ee-alert"
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
            style={{ marginTop: 8 }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="ee-actions ee-actions-bottom">
          <button
            type="button"
            className="ee-btn ee-btn-secondary"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ee-btn ee-btn-primary"
            disabled={loading || nameChecking || !isNameUnique || !name.trim()}
          >
            {loading ? (hasEvent ? 'Updating…' : 'Creating…') : (hasEvent ? 'Update Event' : 'Create Event')}
          </button>
        </div>
      </form>
    </div>
  );
}
