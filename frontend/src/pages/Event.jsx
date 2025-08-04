import { useState } from 'react';
import '../css/Event.css';

const allEvents = [
  { day: '01', month: 'July', genre: 'Pop', title: 'ผลัดกันเล่น ผลัดการฟัง',
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
  { day: '01', month: 'July', genre: 'Hip hop', title: 'Tipsy & Tired', desc: 'Additional talk', image: '/img/tipyandtired.jpg' },
  { day: '03', month: 'July', genre: 'Country', title: 'SRWKS.', desc: 'Photography', image: '/img/srwkslive.jpg' },

];

// สร้างชุด genre ที่มีในข้อมูล
const genres = Array.from(new Set(allEvents.map(e => e.genre))).sort();

const daysInMonth = {
  January: 31, February: 28, March: 31, April: 30, May: 31, June: 30,
  July: 31, August: 31, September: 30, October: 31, November: 30, December: 31,
};

const monthNameToIndex = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
};

function getStartDayIndex(month) {
  const year = new Date().getFullYear();
  const monthIndex = monthNameToIndex[month];
  const date = new Date(year, monthIndex, 1);
  const day = date.getDay();
  return (day + 6) % 7;
}

export default function Event() {
  const [month, setMonth] = useState('July');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showGenrePopup, setShowGenrePopup] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(null); // null = no filter

  // กรอง event ตามเดือนและ genre (ถ้าเลือก)
  const filteredEvents = allEvents.filter(e => 
    e.month === month && (selectedGenre ? e.genre === selectedGenre : true)
  );

  const days = daysInMonth[month];
  const startDayIndex = getStartDayIndex(month);

  // สำหรับแต่ละวัน หางานทั้งหมด
  const eventsByDay = day => filteredEvents.filter(e => e.day === day);

  return (
    <div className="container">
      <h1 className="topic">EVENTS</h1>
      <div className="divider"></div>

      <div className="month-select">
        <label htmlFor="month">Select Month: </label>
        <select id="month" value={month} onChange={e => setMonth(e.target.value)}>
          {Object.keys(daysInMonth).map(m => (
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
      </div>

      <div className="calendar-header">
        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
      </div>

      <div className="calendar-grid">
        {Array.from({ length: startDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-cell empty"></div>
        ))}

        {Array.from({ length: days }, (_, i) => {
          const day = String(i + 1).padStart(2, '0');
          const dayEvents = eventsByDay(day);

          return (
            <div
              key={day}
              className={`calendar-cell ${dayEvents.length ? 'has-event' : ''}`}
              onClick={() => dayEvents.length && setSelectedEvent(dayEvents)}
              style={{ cursor: dayEvents.length ? 'pointer' : 'default' }}
            >
              <div className="date">{day}</div>
              {dayEvents.length > 0 && (
                <div className="event-summaries">
                  {dayEvents.map((ev, idx) => (
                    <div key={idx} className="event-title-short">
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

            {selectedEvent.map((ev, i) => (
              <div key={i} className="popup-event">
                <h3>{ev.title}</h3>
                <img src={ev.image} alt={ev.title} className="popup-image" />
                <p><strong>Description:</strong> {ev.desc || 'No description provided.'}</p>
                {ev.condition && <p><strong>Condition:</strong><br />{ev.condition.split('\n').map((line, idx) => <span key={idx}>{line}<br /></span>)}</p>}
                <p><strong>Genre:</strong> {ev.genre}</p>
                <p><strong>Event Type:</strong> {ev.eventType || 'N/A'}</p>
                <p><strong>Ticketing:</strong> {ev.ticketing || 'N/A'}</p>
                {ev.ticketLink && <p><strong>Ticket Link:</strong> <a href={ev.ticketLink} target="_blank" rel="noopener noreferrer">{ev.ticketLink}</a></p>}
                <p><strong>Alcohol:</strong> {ev.alcohol || 'N/A'}</p>
                <p><strong>Age Restriction:</strong> {ev.ageRestriction || 'N/A'}</p>
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
                onClick={() => {
                  setSelectedGenre(null);
                  setShowGenrePopup(false);
                }}
                style={{ cursor: 'pointer', padding: '8px', fontWeight: selectedGenre === null ? 'bold' : 'normal' }}
              >
                All genres
              </li>
              {genres.map(g => (
                <li
                  key={g}
                  onClick={() => {
                    setSelectedGenre(g);
                    setShowGenrePopup(false);
                  }}
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
