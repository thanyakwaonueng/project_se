// frontend/src/pages/CreateEvent.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

export default function CreateEvent() {
  const { eventId } = useParams(); // /me/event/:eventId
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
        setAgeRestriction(ev.ageRestriction || 'ALL'); // ✅ ใช้ ev.*
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
      const raw = {
        name: name.trim(),
        description: description.trim() || undefined,
        posterUrl: posterUrl.trim() || undefined,
        conditions: conditions.trim() || undefined,
        eventType,
        ticketing,
        ticketLink: ticketLink.trim() || undefined,
        alcoholPolicy,
        ageRestriction, // 'ALL' | 'E18' | 'E20'
        date: date ? new Date(date).toISOString() : undefined,
        doorOpenTime: doorOpenTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        genre: genre.trim() || undefined,
        id: eventId ? parseInt(eventId, 10) : undefined, // ส่ง id ถ้าแก้ไข
      };

      const payload = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined && v !== '')
      );

      const res = await axios.post('/api/events', payload, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });

      setLoading(false);
      // ✅ กลับไปหน้า UI ของงานนั้น
      navigate(`/events/${res.data.id}`);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'Failed to save event');
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>{hasEvent ? 'Edit Event' : 'Create Event'}</h2>

      {error && (
        <div style={{ background: '#ffeef0', color: '#86181d', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label>Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} required className="form-control" />
        </div>

        <div>
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="form-control" rows={4} />
        </div>

        <div>
          <label>Poster URL</label>
          <input value={posterUrl} onChange={e => setPosterUrl(e.target.value)} className="form-control" />
        </div>

        <div>
          <label>Conditions</label>
          <input value={conditions} onChange={e => setConditions(e.target.value)} className="form-control" />
        </div>

        <div>
          <label>Event Type *</label>
          <select value={eventType} onChange={e => setEventType(e.target.value)} className="form-select">
            <option value="OUTDOOR">OUTDOOR</option>
            <option value="INDOOR">INDOOR</option>
            <option value="HYBRID">HYBRID</option>
          </select>
        </div>

        <div>
          <label>Ticketing *</label>
          <select value={ticketing} onChange={e => setTicketing(e.target.value)} className="form-select">
            <option value="FREE">FREE</option>
            <option value="DONATION">DONATION</option>
            <option value="TICKET_MELON">TICKET_MELON</option>
            <option value="DIRECT_CONTACT">DIRECT_CONTACT</option>
            <option value="ONSITE_SALES">ONSITE_SALES</option>
          </select>
        </div>

        <div>
          <label>Ticket Link</label>
          <input value={ticketLink} onChange={e => setTicketLink(e.target.value)} className="form-control" />
        </div>

        <div>
          <label>Alcohol Policy *</label>
          <select value={alcoholPolicy} onChange={e => setAlcoholPolicy(e.target.value)} className="form-select">
            <option value="SERVE">SERVE</option>
            <option value="NONE">NONE</option>
            <option value="BYOB">BYOB</option>
          </select>
        </div>

        {/* Age Restriction enum */}
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
          <label>Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="form-control" />
        </div>

        <div>
          <label>Door Open Time</label>
          <input type="time" value={doorOpenTime} onChange={e => setDoorOpenTime(e.target.value)} className="form-control" />
        </div>

        <div>
          <label>End Time</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="form-control" />
        </div>

        <div>
          <label>Genre</label>
          <input value={genre} onChange={e => setGenre(e.target.value)} className="form-control" />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? (hasEvent ? 'Updating…' : 'Creating…') : (hasEvent ? 'Update Event' : 'Create Event')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
