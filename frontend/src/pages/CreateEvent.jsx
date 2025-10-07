// frontend/src/pages/CreateEvent.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// Event Editor styles
import "../css/CreateEvent.css";

// ===== helper: normalize to 24h "HH:mm" =====
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

// ===== helpers: time/date utils (local) =====
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

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasEvent, setHasEvent] = useState(false);

  const navigate = useNavigate();

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
      navigate(`/events/${res.data.id}`);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'Failed to save event');
    }
  };

  // normalize to HH:mm on blur
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

      {error && (
        <div className="ee-alert" role="alert">{error}</div>
      )}

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
                required
                placeholder="Event name"
              />
            </div>

            {/* Description */}
            <div className="ee-field ee-col-span-2">
              <label className="ee-label" htmlFor="description">Description</label>
              <textarea
                id="description"
                className="ee-textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of your event"
              />
            </div>

            {/* Poster */}
            <div className="ee-field ee-col-span-2">
              <label className="ee-label">Poster</label>
              <div className="ee-posterRow">
                <div className="ee-poster">
                  {posterPreview || posterUrl ? (
                    <img src={posterPreview || posterUrl} alt="poster" />
                  ) : (
                    <div className="ee-poster-placeholder">No poster</div>
                  )}
                </div>

                <div className="ee-fileRow">
                  <button type="button" className="ee-fileBtn" onClick={handlePickPoster}>
                    Choose image
                  </button>
                  {(posterPreview || posterUrl) && (
                    <button type="button" className="ee-fileBtn ee-fileBtn-danger" onClick={clearPoster}>
                      Remove
                    </button>
                  )}
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handlePosterChange}
                  />
                </div>

                <p className="ee-help">The poster will be uploaded when you press Save.</p>
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
                    min={todayStr} // prevent past by HTML
                  />
                </div>

                {/* time (24h text) */}
                <div className="ee-field">
                  <label className="ee-label" htmlFor="doorOpenTime">Door Open</label>
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
                  />
                </div>

                <div className="ee-field">
                  <label className="ee-label" htmlFor="endTime">End Time</label>
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
                  />
                </div>

                {/* optional: quick time suggestions */}
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
            disabled={loading}
          >
            {loading ? (hasEvent ? 'Updating…' : 'Creating…') : (hasEvent ? 'Update Event' : 'Create Event')}
          </button>
        </div>
      </form>
    </div>
  );
}
