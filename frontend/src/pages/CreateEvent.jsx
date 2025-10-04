// frontend/src/pages/CreateEvent.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// ✅ ใหม่: แยกไฟล์ CSS สำหรับหน้านี้โดยเฉพาะ (prefix: ee- = Event Editor)
import "../css/CreateEvent.css";

export default function CreateEvent() {
  const { eventId } = useParams(); // /me/event/:eventId

  // ===== state จากไฟล์เดิม (ไม่ตัด/ไม่เพิ่มฟิลด์) =====
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
  const [doorOpenTime, setDoorOpenTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [genre, setGenre] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasEvent, setHasEvent] = useState(false);

  const navigate = useNavigate();

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
        setPosterUrl(ev.posterUrl || '');
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
      // เซฟปกติ (โหมดสร้าง/แก้ไขเหมือนเดิม: แก้ไขให้ส่ง id ไป)
      const raw = {
        name: name.trim(),
        description: description.trim() || undefined,
        posterUrl: posterUrl.trim() || undefined,
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

      setLoading(false);
      navigate(`/events/${res.data.id}`); // กลับไปหน้ารายละเอียดงาน
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
        {/* <p className="ee-subtitle">
          Fill out event details and ticketing information.
        </p> */}
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

            {/* แถว 3: Poster URL / Conditions */}
            <div className="ee-field">
              <label className="ee-label" htmlFor="posterUrl">Poster URL</label>
              <input
                id="posterUrl"
                className="ee-input"
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>

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

            {/* แถว 4: Event Type / Ticketing */}
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

            {/* แถว 5: Ticket Link (เต็มแถว) */}
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

            {/* แถว 6: Alcohol / Age (2 ช่อง) */}
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

            {/* แถว 7: Date / Door open / End time (3 คอลัมน์) */}
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
                  />
                </div>

                <div className="ee-field">
                  <label className="ee-label" htmlFor="doorOpenTime">Door Open</label>
                  <input
                    id="doorOpenTime"
                    type="time"
                    className="ee-input"
                    value={doorOpenTime}
                    onChange={(e) => setDoorOpenTime(e.target.value)}
                  />
                </div>

                <div className="ee-field">
                  <label className="ee-label" htmlFor="endTime">End Time</label>
                  <input
                    id="endTime"
                    type="time"
                    className="ee-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* แถว 8: Genre (เต็มแถว) */}
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
          <button type="button" className="ee-btn ee-btn-secondary" onClick={() => navigate(-1)} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="ee-btn ee-btn-primary" disabled={loading}>
            {loading ? (hasEvent ? 'Updating…' : 'Creating…') : (hasEvent ? 'Update Event' : 'Create Event')}
          </button>
        </div>
      </form>
    </div>
  );
}
