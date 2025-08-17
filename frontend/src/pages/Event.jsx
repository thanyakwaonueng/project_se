import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { extractErrorMessage } from '../lib/api';

/** ===== Utilities for calendar ===== */
const DAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const TH_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

function dateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function startOfCalendar(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const offset = first.getDay(); // 0=Sun
  return new Date(year, monthIndex, 1 - offset);
}
function endOfCalendar(year, monthIndex) {
  const start = startOfCalendar(year, monthIndex);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 41); // 6 weeks grid
}
function formatMonthYear(d) {
  return `${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`; // พ.ศ.
}
function formatDT(iso) {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(dt);
  } catch {
    return iso;
  }
}

/** Small event chip inside a calendar cell */
function EventChip({ ev, onClick }) {
  return (
    <div
      onClick={onClick}
      title={ev.name}
      style={{
        fontSize: 12,
        padding: '3px 6px',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        background: '#fff',
      }}
    >
      {ev.name}
    </div>
  );
}

/** ===== Main Page: Calendar + Filters + List toggle ===== */
export default function EventPage() {
  const navigate = useNavigate();

  // data
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [meta, setMeta] = useState(null);

  // ui & filters
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [q, setQ] = useState(''); // search by name
  const [eventType, setEventType] = useState('ALL');
  const [venueId, setVenueId] = useState('ALL');

  // Load enums (for event types) + venues + events
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr('');
        setLoading(true);

        const [metaRes, venuesRes, eventsRes] = await Promise.all([
          api.get('/meta/enums'),
          api.get('/venues'),
          api.get('/events'),
        ]);

        if (!alive) return;
        setMeta(metaRes.data || null);
        setVenues(Array.isArray(venuesRes.data) ? venuesRes.data : []);
        setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      } catch (e) {
        if (!alive) return;
        setErr(extractErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Derived maps
  const eventsByDay = useMemo(() => {
    const map = {};
    for (const ev of events) {
      if (!ev?.date) continue;
      const d = new Date(ev.date);
      const key = dateKeyLocal(d);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    return map;
  }, [events]);

  const gridDates = useMemo(() => {
    const start = startOfCalendar(viewDate.getFullYear(), viewDate.getMonth());
    return Array.from({ length: 42 }, (_, i) => new Date(
      start.getFullYear(), start.getMonth(), start.getDate() + i
    ));
  }, [viewDate]);

  const todayKey = dateKeyLocal(new Date());
  const currMonth = viewDate.getMonth();
  const currYear = viewDate.getFullYear();

  const gotoPrevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const gotoNextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const gotoToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Filter logic shared by calendar+list (also constrain by current month range to keep list focused)
  const monthStart = startOfCalendar(currYear, currMonth);
  const monthEnd = endOfCalendar(currYear, currMonth);

  const filteredEvents = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return events.filter(ev => {
      // constrain to view month (list mode uses this to avoid huge lists)
      const dt = ev?.date ? new Date(ev.date) : null;
      if (!dt) return false;
      if (dt < monthStart || dt > monthEnd) return false;

      if (qLower) {
        const nameHit = (ev.name || '').toLowerCase().includes(qLower);
        if (!nameHit) return false;
      }
      if (eventType !== 'ALL' && ev.eventType !== eventType) return false;
      if (venueId !== 'ALL' && String(ev.venueId) !== String(venueId)) return false;
      return true;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events, q, eventType, venueId, monthStart, monthEnd]);

  if (loading) return <div style={{ padding: 16 }}>กำลังโหลด…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header + view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </button>
          <button
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>

        {err && (
          <div style={{ background: '#ffeef0', color: '#86181d', padding: 8, borderRadius: 8 }}>
            {err}
          </div>
        )}
      </div>

      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-secondary" onClick={gotoPrevMonth}>&lt;</button>
          <div style={{ fontSize: 20, fontWeight: 700, minWidth: 180, textAlign: 'center' }}>
            {formatMonthYear(viewDate)}
          </div>
          <button className="btn btn-secondary" onClick={gotoNextMonth}>&gt;</button>
          <button className="btn btn-light" onClick={gotoToday} style={{ marginLeft: 8 }}>วันนี้</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="ค้นหาชื่ออีเวนต์…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 200 }}
          />

          <select
            className="form-select"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            <option value="ALL">ทุกประเภท</option>
            {(meta?.eventTypes || []).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
          >
            <option value="ALL">ทุกสถานที่</option>
            {venues.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <>
          {/* Day-of-week header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 8,
              marginTop: 12,
              marginBottom: 8,
              color: '#6b7280',
              fontWeight: 600
            }}
          >
            {DAY_NAMES.map((n) => (
              <div key={n} style={{ textAlign: 'center' }}>{n}</div>
            ))}
          </div>

          {/* Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 8,
            }}
          >
            {gridDates.map((d) => {
              const key = dateKeyLocal(d);
              const isCurrMonth = d.getMonth() === currMonth && d.getFullYear() === currYear;
              const isToday = key === todayKey;

              // events of the day filtered by current filters (except date range which is handled by day key)
              const dayEventsAll = eventsByDay[key] || [];
              const dayEvents = dayEventsAll.filter(ev => {
                const nameOK = q.trim() ? (ev.name || '').toLowerCase().includes(q.trim().toLowerCase()) : true;
                const typeOK = eventType === 'ALL' ? true : ev.eventType === eventType;
                const venueOK = venueId === 'ALL' ? true : String(ev.venueId) === String(venueId);
                return nameOK && typeOK && venueOK;
              });

              const maxShow = 3;

              return (
                <div
                  key={key}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    minHeight: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 8,
                    background: isCurrMonth ? '#fff' : '#fafafa',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: isCurrMonth ? '#111827' : '#9ca3af',
                      }}
                    >
                      {d.getDate()}
                    </div>
                    {isToday && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 999,
                          background: '#111827',
                          color: '#fff'
                        }}
                      >
                        วันนี้
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
                    {dayEvents.slice(0, maxShow).map((ev) => (
                      <EventChip
                        key={ev.id}
                        ev={ev}
                        onClick={() => navigate(`/page_events/${ev.id}`)}
                      />
                    ))}

                    {dayEvents.length > maxShow && (
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        +{dayEvents.length - maxShow} รายการ
                      </div>
                    )}

                    {dayEvents.length === 0 && (
                      <div style={{ fontSize: 12, color: '#bdbdbd' }}>—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
            * คลิกชื่ออีเวนต์เพื่อเปิดรายละเอียด
          </div>
        </>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div style={{ marginTop: 12 }}>
          {filteredEvents.length === 0 ? (
            <div style={{ color: '#777' }}>ไม่พบอีเวนต์ในช่วงเดือนนี้ตามเงื่อนไข</div>
          ) : (
            <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: '#fafafa', padding: '10px 12px', fontWeight: 600 }}>
                <div>อีเวนต์</div>
                <div>วันเวลา</div>
                <div>สถานที่</div>
                <div>ประเภท</div>
              </div>
              {filteredEvents.map(ev => (
                <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderTop: '1px solid #eee', padding: '10px 12px', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/page_events/${ev.id}`} style={{ textDecoration: 'none' }}>{ev.name || `Event #${ev.id}`}</Link>
                    {Array.isArray(ev.artists) && ev.artists.length > 0 && (
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {ev.artists.map(a => a.name).join(', ')}
                      </div>
                    )}
                  </div>
                  <div>{formatDT(ev.date)}</div>
                  <div>{ev.venue?.name || '—'}</div>
                  <div>{ev.eventType || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
