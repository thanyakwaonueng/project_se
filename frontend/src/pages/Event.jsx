// frontend/src/pages/Event.jsx
import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import '../css/Event.css';

/* ---------- เดดโค้ดเดิม (คงไว้) ---------- */
const allEvents = [
  { day: '01', month: 'September', year: '2025', genre: 'Pop', title: 'ผลัดกันเล่น ผลัดการฟัง',
    desc: 'ผลัดกันเล่น ผลัดการฟังม่วน ๆ เน้อ', image: '/img/at cnxog.jpg',
    condition: `วันที่ : 18 กุมภาพันธ์ 2568 | ประตูเปิด 19:00 น.\nสถานที่ : Chiang Mai OriginaLive\nEarly Bird 450 THB | Regular 550 THB\nสามารถทัก inbox : Chiangmai originaLive เพื่อสำรองบัตรได้เลยแล้วมาเจอกันนะ !!\n** อีเว้นท์นี้ไม่จำกัดอายุผู้เข้าชม กรุณาพกบัตรประชาชนมาลงทะเบียนเพื่อรับริสแบนด์ ทางร้านขอสงวนสิทธิ์ไม่จำหน่ายเครื่องดื่มแอลกอฮอล์ให้ผู้ที่มีอายุต่ำกว่า 20 ปี**`,
    eventType: 'ในร่ม',
    ticketing: 'จำหน่ายผ่าน ticket melon',
    ticketLink: 'https://www.ticketmelon.com/sample',
    alcohol: 'มีแอลกอฮอล์จำหน่าย',
    ageRestriction: 'อนุญาติทุกช่วงอายุ',
    date: '2025-07-01',
    doorOpenTime: '19:00',
    endEventTime: '23:00', },
  { day: '01', month: 'September', year: '2025', genre: 'Hip hop', title: 'Tipsy & Tired', desc: 'Additional talk', image: '/img/tipyandtired.jpg' },
  { day: '05', month: 'September', year: '2025', genre: 'Country', title: 'SRWKS.', desc: 'Photography', image: '/img/srwkslive.jpg' },
];

/* ---------- ตัวช่วยสำหรับปฏิทิน (เหมือนเดิม) ---------- */
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
  // ให้จันทร์เป็น 0
  return (d.getDay() + 6) % 7;
}
function pad2(n) { return String(n).padStart(2, '0'); }

/* ---------- แปลงข้อมูลจากแบ็กเอนด์ -> รูปแบบเดิมของ UI ---------- */
function normalizeEvent(ev) {
  const dt = ev?.date ? new Date(ev.date) : null;
  const month = dt ? indexToMonthName[dt.getMonth()] : null;
  const day = dt ? pad2(dt.getDate()) : null;
  const year = dt ? dt.getFullYear() : null;  // <- เพิ่มปี

  return {
    day,
    month,
    year,   // <- เพิ่มปี
    genre: ev?.genre || ev?.venue?.genre || 'N/A',
    title: ev?.name ?? `Event #${ev?.id ?? ''}`,
    desc: ev?.description || '',
    image: ev?.posterUrl || '/img/graphic-2.png',
    condition: ev?.conditions || '',
    eventType: ev?.eventType || 'N/A',
    ticketing: ev?.ticketing || 'N/A',
    ticketLink: ev?.ticketLink || '',
    alcohol: ev?.alcoholPolicy || 'N/A',
    ageRestriction: ev?.ageRestriction || 'N/A',
    date: ev?.date || 'N/A',
    doorOpenTime: ev?.doorOpenTime || 'N/A',
    endEventTime: ev?.endTime || 'N/A', // map -> endEventTime
    venueName: ev?.venue?.name || '',
  };
}

/* ---------- อันนี้เป็นส่วนของ select month ---------- */
function MonthPicker({ year, month, setYear, setMonth }) {
  const [open, setOpen] = useState(false);

  const months = Object.keys(daysInMonthMap);

  return (
    <div className="month-picker-container">
      <div className="month-picker-input" onClick={() => setOpen(!open)}>
        {year}, {month}
        <img src="/img/calendar.png" className="calendar-icon"/>
      </div>

      {open && (
        <div className="month-picker-popup">
          <div className="month-picker-header">
            <button className="nav-btn" onClick={() => setYear(year - 1)}>←</button>
            <span>{year}</span>
            <button className="nav-btn" onClick={() => setYear(year + 1)}>→</button>
          </div>

          <div className="month-grid">
            {months.map((m) => (
              <button
                key={m}
                className={`month-btn ${month === m ? "selected" : ""}`}
                onClick={() => {
                  setMonth(m);
                  setOpen(false);
                }}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



export default function Event() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear()); // now editable (year)
  const [month, setMonth] = useState(indexToMonthName[now.getMonth()]);

  // เริ่มต้นด้วย "เดดโค้ด" ก่อน แล้วค่อยผสานข้อมูลจริงที่ดึงมา
  const [events, setEvents] = useState(allEvents);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showGenrePopup, setShowGenrePopup] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(null);

  /* ---------- ดึงข้อมูลจริงแล้ว "ผสาน" กับเดดโค้ด ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/events'); // แนะนำให้ฝั่ง backend include: { venue: true }
        const arr = Array.isArray(res.data) ? res.data : [];
        const mapped = arr.map(normalizeEvent).filter(e => e.month && e.day);

        // รวมเดดโค้ด + ของจริง แล้ว de-dup ด้วย key (เดือน|วัน|ชื่อ)
        const merged = [...allEvents, ...mapped];
        const seen = new Set();
        const deduped = merged.filter(e => {
          const key = `${e.month}|${e.day}|${e.title}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (!cancelled) setEvents(deduped);
      } catch (err) {
        // เงียบ ๆ ไว้เพื่อให้ UI เดิมไม่เปลี่ยน (ยังแสดงเดดโค้ดได้)
        console.warn('Load /events failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---------- genres สำหรับ popup filter (จากชุดรวม) ---------- */
  const genres = useMemo(() => {
    const s = new Set();
    events.forEach(e => e.genre && e.genre !== 'N/A' && s.add(e.genre));
    return Array.from(s).sort();
  }, [events]);

  /* ---------- กรองตามเดือน + แนว ---------- */
  const filteredEvents = useMemo(() => {
    return events.filter(e =>
      e.month === month && 
      String(e.year) === String(year) && // ตรวจสอบปีตรงนี้ใช้เป็น str ไปก่อนนะ ถ้าอยากเปลี่ยนก็เปลี่ยนได้เลย
      (selectedGenre ? e.genre === selectedGenre : true)
    );
  }, [events, month, year, selectedGenre]); // <- เพิ่มปี

  /* ---------- group เป็นรายวัน ---------- */
  const eventsByDay = useMemo(() => {
    const m = new Map();
    filteredEvents.forEach(e => {
      if (!m.has(e.day)) m.set(e.day, []);
      m.get(e.day).push(e);
    });
    return m;
  }, [filteredEvents]);

  const days = daysInMonthMap[month];
  const startDayIndex = getStartDayIndex(month, year);

  return (
    <div className="eventpage-content">
      <h1 className="sound-agenda">SOUND AGENDA</h1>

        <div className="event-picture-box">
          <img src="https://images.pexels.com/photos/3807093/pexels-photo-3807093.jpeg" className="event-picture"/>
        </div>

        <div className="text-section-right">
          <h1 className="subtitle-sound-agenda">Mark the dates</h1>
          <h1 className="subtitle-sound-agenda">feel the beats</h1>
          <h1 className="subtitle-sound-agenda">⟡</h1>
        </div>

      <div className="calendar-content">
        <div className="month-select">
          <MonthPicker year={year} month={month} setYear={setYear} setMonth={setMonth} />

        <button 
          className="select-genre" 
          onClick={() => setShowGenrePopup(true)} 
          style={{ marginLeft: '10px', cursor: 'pointer' }}>
          Select Genre
        </button>

        </div>

        <div className="calendar-header">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div>Sun</div>
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
                <div className="date">{dayStr} {dayEvents.length > 0 && <span className="event-dot"></span>}</div>
                {dayEvents.length > 0 && (
                  <div className="event-summaries">
                    {dayEvents.map((ev) => (
                      <div key={`${ev.title}-${ev.day}`} className="event-title-short">
                        {ev.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Popup event detail (เหมือนเดิม) */}
        {selectedEvent && (
          <div className="popup-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="popup-content" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setSelectedEvent(null)}>×</button>
              <h2>{selectedEvent[0].day} {selectedEvent[0].month}</h2>

              {selectedEvent.map((ev) => (
                <div key={`${ev.title}-${ev.day}-detail`} className="popup-event">
                  <h3>{ev.title}</h3>
                  <img
                    src={ev.image}
                    alt={ev.title}
                    className="popup-image"
                    onError={(e) => { e.currentTarget.src = '/img/graphic-3.png'; }}
                  />
                  {ev.venueName && <p><strong>สถานที่:</strong> {ev.venueName}</p>}
                  <p><strong>Description:</strong> {ev.desc || 'No description provided.'}</p>
                  {ev.condition && (
                    <p>
                      <strong>Condition:</strong><br />
                      {ev.condition.split('\n').map((line, idx) => <span key={idx}>{line}<br /></span>)}
                    </p>
                  )}
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

        {/* Popup genre filter (เหมือนเดิม) */}
        {showGenrePopup && (
          <div className="popup-overlay" onClick={() => setShowGenrePopup(false)}>
            <div className="popup-content" onClick={e => e.stopPropagation()}>
              {/* แก้ตรงนี้ */}
              <button className="close-btn" onClick={(e) => {
                  e.stopPropagation();   // ✅ กันไม่ให้ overlay จับก่อน
                  setShowGenrePopup(false);
                }} aria-label="Close"> × </button>


              <h2>Select Genre</h2>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li
                  key="all"
                  onClick={() => { setSelectedGenre(null); setShowGenrePopup(false); }}
                  style={{
                    cursor: 'pointer',
                    padding: '8px',
                    fontWeight: selectedGenre === null ? 'bold' : 'normal'
                  }}
                >
                  All genres
                </li>
                {genres.map(g => (
                  <li
                    key={g}
                    onClick={() => { setSelectedGenre(g); setShowGenrePopup(false); }}
                    style={{
                      cursor: 'pointer',
                      padding: '8px',
                      fontWeight: selectedGenre === g ? 'bold' : 'normal'
                    }}
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
