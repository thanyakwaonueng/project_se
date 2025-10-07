// frontend/src/pages/CreateEvent.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// ✅ แยกไฟล์ CSS สำหรับหน้านี้โดยเฉพาะ (prefix: ee- = Event Editor)
import "../css/CreateEvent.css";

export default function CreateEvent() {
  const { eventId } = useParams(); // /me/event/:eventId

  // ===== state เดิม =====
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState(''); // เก็บ URL โปสเตอร์ (เก่าหรือที่ได้จากอัปโหลดใหม่)
  const [conditions, setConditions] = useState('');
  const [eventType, setEventType] = useState('INDOOR');
  const [ticketing, setTicketing] = useState('FREE');
  const [ticketLink, setTicketLink] = useState('');
  const [alcoholPolicy, setAlcoholPolicy] = useState('SERVE');
  const [ageRestriction, setAgeRestriction] = useState('ALL'); // ALL | E18 | E20
  const [date, setDate] = useState('');
  const [doorOpenTime, setDoorOpenTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [genre, setGenre] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasEvent, setHasEvent] = useState(false);

  const navigate = useNavigate();

  // ===== สถานะไฟล์/อัปโหลด (เหมือนหน้า VenueEditor) =====
  const [posterFile, setPosterFile] = useState(null);      // File (โปสเตอร์ใหม่)
  const [posterPreview, setPosterPreview] = useState('');  // objectURL เพื่อพรีวิว
  const [deleteQueue, setDeleteQueue] = useState([]);      // url[] ของไฟล์เดิมที่จะลบหลังเซฟสำเร็จ
  const posterInputRef = useRef(null);

  const handlePickPoster = () => posterInputRef.current?.click();
  const handlePosterChange = (e) => {
    const f = e.target.files?.[0] || null;
    setPosterFile(f);
    if (f) {
      setPosterPreview(URL.createObjectURL(f));
    } else {
      setPosterPreview('');
    }
  };
  const clearPoster = () => {
    if (posterUrl) {
      // ถ้ากดลบ จะใส่ url เดิมเข้าคิวลบ
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

  // โหลดข้อมูลเดิม (โหมดแก้ไข)
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      try {
        const res = await axios.get(`/api/events/${eventId}`, { withCredentials: true });
        const ev = res.data;
        setName(ev.name || '');
        setDescription(ev.description || '');
        setPosterUrl(ev.posterUrl || ''); // เก็บ URL โปสเตอร์เดิมไว้
        setPosterPreview(''); // ให้เริ่มด้วยไม่มีพรีวิว (ถ้าต้องการโชว์รูปเดิมก็ใช้ posterUrl ใน <img> ได้เลย)
        setConditions(ev.conditions || '');
        setEventType(ev.eventType || 'INDOOR');
        setTicketing(ev.ticketing || 'FREE');
        setTicketLink(ev.ticketLink || '');
        setAlcoholPolicy(ev.alcoholPolicy || 'SERVE');
        setAgeRestriction(ev.ageRestriction || 'ALL');
        setDate(ev.date ? ev.date.split('T')[0] : '');
        setDoorOpenTime(ev.doorOpenTime || '');
        setEndTime(ev.endTime || '');
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
      // 1) ถ้ามีเลือกโปสเตอร์ใหม่ → อัปโหลดก่อน
      let uploadedPoster = null;
      if (posterFile) {
        uploadedPoster = await uploadOne(posterFile);
      }

      // 2) ถ้าอัปโหลดใหม่สำเร็จ และมีโปสเตอร์เดิม → ใส่เดิมเข้าคิวลบ
      const deleteQueueNext = [...deleteQueue];
      if (uploadedPoster && posterUrl && posterUrl !== uploadedPoster) {
        if (!deleteQueueNext.includes(posterUrl)) deleteQueueNext.push(posterUrl);
      }

      // 3) เซฟข้อมูลอีเวนต์
      const raw = {
        name: name.trim(),
        description: description.trim() || undefined,
        posterUrl: (uploadedPoster || posterUrl || '').trim() || undefined, // ใช้รูปใหม่ถ้ามี ไม่งั้นใช้รูปเดิม
        conditions: conditions.trim() || undefined,
        eventType,
        ticketing,
        ticketLink: ticketLink.trim() || undefined,
        alcoholPolicy,
        ageRestriction,
        date: date ? new Date(date).toISOString() : undefined,
        doorOpenTime: doorOpenTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        genre: genre.trim() || undefined,
        id: eventId ? parseInt(eventId, 10) : undefined, // แก้ไข = ส่ง id ด้วย
      };

      const payload = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined && v !== '')
      );

      const res = await axios.post('/api/events', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });

      // 4) ลบไฟล์เก่าจริง ๆ (best-effort) หลังบันทึกสำเร็จ
      if (deleteQueueNext.length) {
        try {
          await axios.post(
            '/api/storage/delete',
            { urls: deleteQueueNext },
            { withCredentials: true }
          );
        } catch (errDel) {
          console.warn('delete storage failed (ignored):', errDel?.response?.data || errDel?.message);
        }
      }

      setLoading(false);
      navigate(`/events/${res.data.id}`); // ไปหน้ารายละเอียดงาน
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'Failed to save event');
    }
  };

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
            {/* แถว 1: Name (เต็มแถว) */}
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

            {/* แถว 2: Description (เต็มแถว, textarea) */}
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

            {/* ✅ โปสเตอร์: เปลี่ยนจาก input URL -> เป็นอัปโหลดไฟล์ + พรีวิว + ปุ่มลบ */}
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
                  <button
                    type="button"
                    className="ee-fileBtn"
                    onClick={handlePickPoster}
                  >
                    Choose image
                  </button>
                  {(posterPreview || posterUrl) && (
                    <button
                      type="button"
                      className="ee-fileBtn ee-fileBtn-danger"
                      onClick={clearPoster}
                    >
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

                <p className="ee-help">โปสเตอร์จะถูกอัปโหลดเมื่อกด Save</p>
              </div>
            </div>

            {/* แถว: Conditions */}
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

            {/* แถว: Event Type / Ticketing */}
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

            {/* แถว: Ticket Link (เต็มแถว) */}
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

            {/* แถว: Alcohol / Age */}
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

            {/* แถว: Date / Door open / End time */}
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
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="ee-field">
                  <label className="ee-label" htmlFor="doorOpenTime">Door Open *</label>
                  <input
                    id="doorOpenTime"
                    type="time"
                    className="ee-input"
                    value={doorOpenTime}
                    onChange={(e) => setDoorOpenTime(e.target.value)}
                    required
                  />
                </div>

                <div className="ee-field">
                  <label className="ee-label" htmlFor="endTime">End Time *</label>
                  <input
                    id="endTime"
                    type="time"
                    className="ee-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* แถว: Genre */}
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

        {/* Actions (bottom) */}
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
