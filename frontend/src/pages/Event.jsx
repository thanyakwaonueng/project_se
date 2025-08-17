import { useEffect, useMemo, useState } from 'react';
import '../css/Event.css';
import api, { extractErrorMessage } from '../lib/api';

const daysInMonthMap = {
  January: 31, February: 28, March: 31, April: 30, May: 31, June: 30,
  July: 31, August: 31, September: 30, October: 31, November: 30, December: 31,
};
const monthNameToIndex = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
};
const indexToMonthName = Object.keys(monthNameToIndex).reduce((acc, k) => {
  acc[monthNameToIndex[k]] = k;
  return acc;
}, {});

function getStartDayIndex(monthName, year) {
  const monthIndex = monthNameToIndex[monthName];
  const d = new Date(year, monthIndex, 1);
  // JS: 0=Sun..6=Sat -> shift ให้ Mon=0..Sun=6
  return (d.getDay() + 6) % 7;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default function Event() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month, setMonth] = useState(indexToMonthName[now.getMonth()]); // 'July' ...
  const [events, setEvents] = useState([]);              // ดิบจาก backend
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [selectedEvent, setSelectedEvent] = useState(null); // array ของอีเวนต์ในวันนั้น
  const [showGenrePopup, setShowGenrePopup] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(null); // null = ทุกแนว

  // โหลดอีเวนต์ครั้งเดียว
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const res = await api.get('/events'); // backend แนะนำ include: { venue: true }
        if (!alive) return;
        setEvents(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!alive) return;
        setErr(extractErrorMessage(e, 'โหลดอีเวนต์ไม่สำเร็จ'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // map อีเวนต์ดิบ -> โครงที่หน้าปฏิทินต้องใช้ (ให้หน้าตาเหมือน death code แต่เป็นข้อมูลจริง)
  const normalized = useMemo(() => {
    return events
      .filter(ev => !!ev?.date) // ต้องมีวันที่
      .map(ev => {
        const d = new Date(ev.date);
        const mName = indexToMonthName[d.getMonth()];
        const day = pad2(d.getDate());
        const genre = ev.genre || ev.venue?.genre || '—';
        return {
          id: ev.id,
          day,
          month: mName,
          genre,
          title: ev.name || `Event #${ev.id}`,
          desc: ev.description || '',
          image: ev.posterUrl || ev.venue?.profilePhotoUrl || '/img/graphic-3.png',
          condition: ev.conditions || '',
          eventType: ev.eventType || 'N/A',
          ticketing: ev.ticketing || 'N/A',
          ticketLink: ev.ticketLink || '',
          alcohol: ev.alcoholPolicy || 'N/A',
          ageRestriction: ev.ageRestriction || 'N/A',
          date: ev.date || '',
          doorOpenTime: ev.doorOpenTime || '',
          endEventTime: ev.endTime || '',
          venueName: ev.venue?.name || '',
        };
      });
  }, [events]);

  // สร้างชุด genre จากข้อมูลจริง
  const genres = useMemo(() => {
    const s = new Set();
    normalized.forEach(e => e.genre && s.add(e.genre));
    return Array.from(s).sort();
  }, [normalized]);

  // กรองตามเดือน + แนว
  const filteredEvents = useMemo(() => {
    return normalized.filter(e =>
      e.month === month && (selectedGenre ? e.genre === selectedGenre : true)
    );
  }, [normalized, month, selectedGenre]);

  const days = daysInMonthMap[month];
  const startDayIndex = getStartDayIndex(month, year);

  // group ตามวัน (string '01'..)
  const eventsByDay = useMemo(() => {
    const m = new Map();
    filteredEvents.forEach(e => {
      if (!m.has(e.day)) m.set(e.day, []);
      m.get(e.day).push(e);
    });
    // เรียงเวลาในวันเดียวกัน
    for (const arr of m.values()) {
      arr.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    return m;
  }, [filteredEvents]);

  return (
    <div className="container">
      <h1 className="topic">EVENTS</h1>
      <div className="divider"></div>

      <div className="month-select">
        <label htmlFor="month">Select Month: </label>
        <select
          id="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
        >
          {Object.keys(daysInMonthMap).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <a
          className="btn select-genre"
          role="button"
          onClick={() => setShowGenrePopup(true)}
          style={{ marginLeft: '10px', cursor: 'pointer' }}
        >
          <img src="/img/panel.png" className="btn-full-image" />
        </a>

        <div style={{ marginLeft: 12, fontSize: 12, color: '#b00020' }}>
          {err && <>* {err}</>}
          {loading && <>กำลังโหลด…</>}
        </div>
      </div>

      <div className="calendar-header">
        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
      </div>

      <div className="calendar-grid">
        {Array.from({ length: startDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-cell empty"></div>
        ))}

        {Array.from({ length: days }, (_, i) => {
          const dayStr = pad2(i + 1);
          const dayEvents = eventsByDay.get(dayStr) || [];

          return (
            <div
              key={dayStr}
              className={`calendar-cell ${dayEvents.length ? 'has-event' : ''}`}
              onClick={() => dayEvents.length && setSelectedEvent(dayEvents)}
              style={{ cursor: dayEvents.length ? 'pointer' : 'default' }}
            >
              <div className="date">{dayStr}</div>
              {dayEvents.length > 0 && (
                <div className="event-summaries">
                  {dayEvents.map((ev) => (
                    <div key={ev.id} className="event-title-short">
                      {ev.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Popup event detail */}
      {selectedEvent && (
        <div className="popup-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedEvent(null)}>×</button>
            <h2>{selectedEvent[0].day} {selectedEvent[0].month}</h2>

            {selectedEvent.map((ev) => (
              <div key={ev.id} className="popup-event">
                <h3>{ev.title}</h3>
                <img src={ev.image} alt={ev.title} className="popup-image" />
                {ev.venueName && <p><strong>สถานที่:</strong> {ev.venueName}</p>}
                <p><strong>Description:</strong> {ev.desc || 'No description provided.'}</p>
                {ev.condition &&
                  <p><strong>Condition:</strong><br />
                    {ev.condition.split('\n').map((line, idx) => <span key={idx}>{line}<br /></span>)}
                  </p>}
                <p><strong>Genre:</strong> {ev.genre}</p>
                <p><strong>Event Type:</strong> {ev.eventType}</p>
                <p><strong>Ticketing:</strong> {ev.ticketing}</p>
                {ev.ticketLink && (
                  <p><strong>Ticket Link:</strong> <a href={ev.ticketLink} target="_blank" rel="noopener noreferrer">{ev.ticketLink}</a></p>
                )}
                <p><strong>Alcohol:</strong> {ev.alcohol}</p>
                <p><strong>Age Restriction:</strong> {ev.ageRestriction}</p>
                <p><strong>Date:</strong> {ev.date || 'N/A'}</p>
                <p><strong>Door Open:</strong> {ev.doorOpenTime || 'N/A'}</p>
                <p><strong>End Time:</strong> {ev.endEventTime || 'N/A'}</p>
                <hr />
              </div>
            ))}

          </div>
        </div>
      )}

      {/* Popup genre filter */}
      {showGenrePopup && (
        <div className="popup-overlay" onClick={() => setShowGenrePopup(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowGenrePopup(false)}>×</button>
            <h2>Select Genre</h2>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              <li
                key="all"
                onClick={() => { setSelectedGenre(null); setShowGenrePopup(false); }}
                style={{ cursor: 'pointer', padding: '8px', fontWeight: selectedGenre === null ? 'bold' : 'normal' }}
              >
                All genres
              </li>
              {genres.map(g => (
                <li
                  key={g}
                  onClick={() => { setSelectedGenre(g); setShowGenrePopup(false); }}
                  style={{ cursor: 'pointer', padding: '8px', fontWeight: selectedGenre === g ? 'bold' : 'normal' }}
                >
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
