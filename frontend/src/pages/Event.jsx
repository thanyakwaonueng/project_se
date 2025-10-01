// frontend/src/pages/Event.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import api from '../lib/api';
import '../css/Event.css';

/* ---------- เดดโค้ดเดิม (คงไว้) ---------- */
const allEvents = [
  {
    day: '01',
    month: 'September',
    year: '2025',
    genre: 'Pop',
    title: 'ผลัดกันเล่น ผลัดการฟัง',
    desc: 'ผลัดกันเล่น ผลัดการฟังม่วน ๆ เน้อ',
    image: '/img/at cnxog.jpg',
    condition: `วันที่ : 18 กุมภาพันธ์ 2568 | ประตูเปิด 19:00 น.\nสถานที่ : Chiang Mai OriginaLive\nEarly Bird 450 THB | Regular 550 THB\nสามารถทัก inbox : Chiangmai originaLive เพื่อสำรองบัตรได้เลยแล้วมาเจอกันนะ !!\n** อีเว้นท์นี้ไม่จำกัดอายุผู้เข้าชม กรุณาพกบัตรประชาชนมาลงทะเบียนเพื่อรับริสแบนด์ ทางร้านขอสงวนสิทธิ์ไม่จำหน่ายเครื่องดื่มแอลกอฮอล์ให้ผู้ที่มีอายุต่ำกว่า 20 ปี**`,
    eventType: 'ในร่ม',
    ticketing: 'จำหน่ายผ่าน ticket melon',
    ticketLink: 'https://www.ticketmelon.com/sample',
    alcohol: 'มีแอลกอฮอล์จำหน่าย',
    ageRestriction: 'อนุญาติทุกช่วงอายุ',
    date: '2025-07-01',
    doorOpenTime: '19:00',
    endEventTime: '23:00',
    // สำหรับ UI หัวใจ (เดดโค้ด)
    id: 10001,
    likedByMe: false,
    followersCount: 0,
  },
  { day: '01', month: 'September', year: '2025', genre: 'Hip hop', title: 'Tipsy & Tired', desc: 'Additional talk', image: '/img/tipyandtired.jpg', id: 10002, likedByMe: false, followersCount: 0 },
  { day: '05', month: 'September', year: '2025', genre: 'Country', title: 'SRWKS.', desc: 'Photography', image: '/img/srwkslive.jpg', id: 10003, likedByMe: false, followersCount: 0 },
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
  return (d.getDay() + 6) % 7; // ให้จันทร์เป็น 0
}
function pad2(n) { return String(n).padStart(2, '0'); }

/* ---------- แปลงข้อมูลจากแบ็กเอนด์ -> รูปแบบเดิมของ UI ---------- */
function normalizeEvent(ev) {
  const dt = ev?.date ? new Date(ev.date) : null;
  const month = dt ? indexToMonthName[dt.getMonth()] : null;
  const day = dt ? pad2(dt.getDate()) : null;
  const year = dt ? dt.getFullYear() : null;

  return {
    id: ev?.id ?? ev?._id ?? null,
    day,
    month,
    year,
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
    endEventTime: ev?.endTime || 'N/A',
    venueName: ev?.venue?.name || '',
    // สำหรับติดตามอีเวนต์
    likedByMe: !!ev?.likedByMe,
    followersCount: ev?.followersCount ?? ev?.likesCount ?? 0,
    // readiness จาก backend (ถ้ามี)
    _ready: ev?._ready || null,
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
        <img src="/img/calendar.png" className="calendar-icon" />
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
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(indexToMonthName[now.getMonth()]);

  // เริ่มด้วยเดดโค้ด แล้วค่อยผสานข้อมูลจริง
  const [events, setEvents] = useState(allEvents);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showGenrePopup, setShowGenrePopup] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState([]);
  const [busyIds, setBusyIds] = useState(new Set()); // กำลังสลับ follow

  /* ---------- ดึงข้อมูลจริงแล้ว "ผสาน" ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/events', { withCredentials: true });
        const arr = Array.isArray(res.data) ? res.data : [];
        const mapped = arr.map(normalizeEvent).filter(e => e.month && e.day);

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
        console.warn('Load /events failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---------- follow/unfollow event ---------- */
  const patchEventLocal = (id, patch) =>
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));

  const toggleFollowEvent = async (ev) => {
    if (!ev?.id) return;
    if (busyIds.has(ev.id)) return;

    setBusyIds(s => new Set(s).add(ev.id));
    try {
      if (ev.likedByMe) {
        const { data } = await api.delete(`/events/${ev.id}/like`, { withCredentials: true });
        const nextCount = data?.count ?? Math.max(0, (ev.followersCount || 0) - 1);
        patchEventLocal(ev.id, { likedByMe: false, followersCount: nextCount });
        setSelectedEvent(list => list?.map(x => x.id === ev.id ? { ...x, likedByMe: false, followersCount: nextCount } : x));
      } else {
        const { data } = await api.post(`/events/${ev.id}/like`, {}, { withCredentials: true });
        const nextCount = data?.count ?? (ev.followersCount || 0) + 1;
        patchEventLocal(ev.id, { likedByMe: true, followersCount: nextCount });
        setSelectedEvent(list => list?.map(x => x.id === ev.id ? { ...x, likedByMe: true, followersCount: nextCount } : x));
      }
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate('/login');
      } else {
        console.error('toggleFollowEvent error:', err);
      }
    } finally {
      setBusyIds(s => { const n = new Set(s); n.delete(ev.id); return n; });
    }
  };

  /* ---------- genres สำหรับ popup filter ---------- */
  const genres = useMemo(() => {
    const s = new Set();
    events.forEach(e => e.genre && e.genre !== 'N/A' && s.add(e.genre));
    return Array.from(s).sort();
  }, [events]);

  /* ---------- กรองตามเดือน + แนว ---------- */
  const filteredEvents = useMemo(() => {
    return events.filter(e =>
      e.month === month &&
      String(e.year) === String(year) &&
      (selectedGenre.length === 0 || selectedGenre.includes(e.genre))
    );
  }, [events, month, year, selectedGenre]);

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
        <img src="https://images.pexels.com/photos/3807093/pexels-photo-3807093.jpeg" className="event-picture" />
      </div>

      <div className="text-section-right">
        <h1 className="subtitle-sound-agenda">Mark the dates</h1>
        <h1 className="subtitle-sound-agenda">feel the beats</h1>
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
                <div className="date">
                  {dayStr} {dayEvents.length > 0 && <span className="event-dot"></span>}
                </div>
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

        {/* Popup event detail */}
        {selectedEvent && (
          <div className="popup-event-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="popup-event-content" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setSelectedEvent(null)}>×</button>

              <h2>{selectedEvent[0].day} {selectedEvent[0].month}</h2>
              <hr className="popup-divider" />

              {selectedEvent.map((ev, index) => (
                <div key={`${ev.id || ev.title}-${ev.day}-detail`} className="popup-event" style={{ position: 'relative' }}>
                  {/* หัวใจซ้อนบนรูป */}
                  {ev.id && (
                    <button
                      className={`like-button ${ev.likedByMe ? 'liked' : ''}`}
                      title={ev.likedByMe ? 'Unfollow' : 'Follow'}
                      aria-label={ev.likedByMe ? 'Unfollow' : 'Follow'}
                      disabled={busyIds.has(ev.id)}
                      onClick={(e) => { e.stopPropagation(); toggleFollowEvent(ev); }}
                      style={{ position: 'absolute', right: 8, top: 8, zIndex: 2 }}
                    />
                  )}

                  <img
                    src={ev.image}
                    className="popup-image"
                    onError={(e) => { e.currentTarget.src = '/img/graphic-3.png'; }}
                  />

                  <div className="popup-event-section">
                    <h3 className="popup-event-title">{ev.title}</h3>

                    {/* แสดงยอดผู้ติดตาม */}
                    {/* {typeof ev.followersCount === 'number' && (
                      <div style={{ fontSize: 13, opacity: .85, marginBottom: 8 }}>
                        👥 {ev.followersCount} followers
                      </div>
                    )} */}

                    {/* readiness badge (ถ้ามีข้อมูลจาก backend) */}
                    {/* {ev._ready && (
                      <div style={{ fontSize: 12, marginBottom: 8, color: ev._ready.isReady ? '#0a7' : '#b35' }}>
                        {ev._ready.isReady
                          ? 'Ready: all artists accepted'
                          : `Pending: ${ev._ready.accepted}/${ev._ready.totalInvited} accepted`}
                      </div>
                    )} */}

                    <Link to={`/events/${ev.id}`} className="btn-event-detail">
                      View Event
                    </Link>
                  </div>

                  {index < selectedEvent.length - 1 && <hr className="popup-divider" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popup genre filter (เหมือนเดิม) */}
        {showGenrePopup && (
          <div className="popup-overlay" onClick={() => setShowGenrePopup(false)}>
            <div className="popup-content" onClick={e => e.stopPropagation()}>
              <button
                className="close-btn"
                onClick={(e) => { e.stopPropagation(); setShowGenrePopup(false); }}
                aria-label="Close"> ×
              </button>

              <h2>Select Genre</h2>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li
                  key="all"
                  onClick={() => { setSelectedGenre([]); setShowGenrePopup(false); }}
                  style={{ cursor: 'pointer', padding: '8px', fontWeight: selectedGenre.length === 0 ? 'bold' : 'normal' }}
                >
                  All genres
                </li>

                {genres.map(g => (
                  <li
                    key={g}
                    onClick={() => {
                      if (selectedGenre.includes(g)) {
                        setSelectedGenre(selectedGenre.filter(x => x !== g));
                      } else {
                        setSelectedGenre([...selectedGenre, g]);
                      }
                    }}
                    style={{ cursor: 'pointer', padding: '8px', fontWeight: selectedGenre.includes(g) ? 'bold' : 'normal' }}
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
