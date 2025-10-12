// src/pages/Home.jsx
import '../css/Home.css';
import { useEffect, useMemo, useState } from "react";
import { Link } from 'react-router-dom';
import axios from "axios";

/* ===== helper: format date -> "september 10 ,2025" ===== */
const MONTHS_LOWER = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
function formatHomeDate(input) {
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return "";
  const m = MONTHS_LOWER[dt.getMonth()];
  const day = dt.getDate();
  const year = dt.getFullYear();
  return `${m} ${day},  ${year}`;
}

export default function Home() {
  /* ===== fallback artists (ถ้า API ว่าง) ===== */
  const fallbackArtists = [
    {
      id: 1,
      title: "Polycat",
      date: "september 31 ,2022",
      genre: "pop",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg",
      likedByMe: false,
      followersCount: 0,
    },
    {
      id: 2,
      title: "Renjun",
      date: "september 15 ,2022",
      genre: "indie",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg",
      likedByMe: false,
      followersCount: 0,
    },
    {
      id: 3,
      title: "Jeno",
      date: "august 26 ,2022",
      genre: "pop",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg",
      likedByMe: false,
      followersCount: 0,
    },
  ];

  /* ===== states ===== */
  const [latestArtists, setLatestArtists] = useState([]);     // ศิลปินที่เพิ่มล่าสุด
  const [genreList, setGenreList] = useState([]);             // ดึง genre ที่มีจริงจาก /api/groups
  const [upcomingEvents, setUpcomingEvents] = useState([]);   // 3 อีเวนต์ถัดไป
  const [busyArtistIds, setBusyArtistIds] = useState(new Set());

  const [scrollLeftActive, setScrollLeftActive] = useState(false);
  const [scrollRightActive, setScrollRightActive] = useState(false);

  /* ===== fetch groups → latest artists + unique genres ===== */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get("/api/groups", { withCredentials: true });
        const arr = Array.isArray(data) ? data : [];

        // sort ใหม่ก่อน + map ข้อมูลการ์ด
        const sorted = [...arr].sort((a, b) => {
          const atA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const atB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (atA !== atB) return atB - atA;
          return (b?.id || 0) - (a?.id || 0);
        });

        const mapped = sorted.slice(0, 12).map(g => ({
          id: g.id,
          title: g.name || `Artist #${g.id}`,
          date: g.createdAt ? formatHomeDate(g.createdAt) : "", // ← ใช้ฟอร์แมตใหม่
          genre: g.genre || g?.artistInfo?.genre || "—",
          image: g.image || g.profilePhotoUrl || "/img/fallback.jpg",
          likedByMe: !!g.likedByMe,
          followersCount: g.followersCount ?? 0,
        }));

        // unique genre จากข้อมูลจริง
        const genreMap = new Map();
        arr.forEach(g => {
          const pool = [
            g?.genre,
            g?.subGenre,
            ...(Array.isArray(g?.genres) ? g.genres : []),
            g?.details,
          ].filter(Boolean);
          pool.forEach(label => {
            const key = String(label).trim().toLowerCase();
            if (!key) return;
            if (!genreMap.has(key)) genreMap.set(key, label);
          });
        });
        const genres = Array.from(genreMap.values()).sort((a, b) => String(a).localeCompare(String(b)));

        if (alive) {
          setLatestArtists(mapped);
          setGenreList(genres);
        }
      } catch (e) {
        console.warn("GET /api/groups failed:", e?.response?.data || e?.message);
        if (alive) {
          setLatestArtists([]);  // ใช้ fallback ด้านล่าง
          setGenreList([]);      // ไม่มี genre จาก API
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ===== fetch upcoming events (3 รายการ) ===== */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get("/api/events", { withCredentials: true });
        const arr = Array.isArray(data) ? data : [];
        const today = new Date();
        const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const upcoming = arr
          .filter(ev => ev?.date && new Date(ev.date) >= todayMid)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 3)
          .map(ev => ({
            id: ev.id,
            title: ev.name || ev.title || `Event #${ev.id}`,
            date: formatHomeDate(ev.date), // ← ใช้ฟอร์แมตใหม่
            genre: ev.genre || ev?.venue?.genre || "—",
            image: ev.posterUrl || ev.coverImage || ev.bannerUrl || "/img/graphic-2.png",
            desc: ev.description || "",
          }));

        if (alive) setUpcomingEvents(upcoming);
      } catch (e) {
        console.warn("GET /api/events failed:", e?.response?.data || e?.message);
        if (alive) setUpcomingEvents([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ===== like/unlike artist (persist) ===== */
  async function toggleLikeArtist(artistId, currentLiked) {
    if (!artistId) return;
    if (busyArtistIds.has(artistId)) return;

    setBusyArtistIds(prev => new Set(prev).add(artistId));

    // optimistic
    setLatestArtists(prev => prev.map(a => (
      a.id === artistId
        ? { ...a, likedByMe: !currentLiked, followersCount: Math.max(0, (a.followersCount || 0) + (currentLiked ? -1 : 1)) }
        : a
    )));

    try {
      if (currentLiked) {
        await axios.delete(`/api/artists/${artistId}/like`, { withCredentials: true });
      } else {
        await axios.post(`/api/artists/${artistId}/like`, {}, { withCredentials: true });
      }
    } catch (e) {
      console.error("toggleLikeArtist error:", e?.response?.data || e?.message);
      // rollback
      setLatestArtists(prev => prev.map(a => (
        a.id === artistId
          ? { ...a, likedByMe: currentLiked, followersCount: Math.max(0, (a.followersCount || 0) + (currentLiked ? 1 : -1)) }
          : a
      )));
    } finally {
      setBusyArtistIds(prev => { const n = new Set(prev); n.delete(artistId); return n; });
    }
  }

  /* ===== ArtistCard (stateless) ===== */
  function fmtCompact(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return n.toString();
  }

  function ArtistCard({ id, image, title, genre, likedByMe, followersCount, onToggleLike, likeBusy }) {
    return (
      <div className="artist-card">
        <div className="artist-image-wrapper">
          <a href={`/artists/${id}`} className="artist-image-link" aria-label={title}>
            <img
              src={image}
              className="artist-image"
              alt={title}
              onError={(e)=>{e.currentTarget.src="/img/fallback.jpg"}}
            />
          </a>

          <button
            className={`like-button ${likedByMe ? "liked" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!likeBusy) onToggleLike?.(id, likedByMe);
            }}
            aria-label={likedByMe ? "Unlike" : "Like"}
            disabled={likeBusy}
            title={likedByMe ? "Unfollow" : "Follow"}
          ></button>

          <span className="artist-genre">{genre}</span>
        </div>

        <div className="artist-content">
          <h2 className="artist-title">
            <a href={`/artists/${id}`}>{title}</a>
          </h2>
          <p className="artist-date">{fmtCompact(followersCount ?? 0)} followers</p>
        </div>
      </div>
    );
  }


  /* ===== EventCard → กด View Detail ไปหน้า /events/:id ===== */
  function EventCard({ id, image, title, date, desc, genre }) {
    return (
      <div className="event-card">
        <div className="event-image">
          <img src={image} alt={title} onError={(e)=>{e.currentTarget.src="/img/graphic-3.png"}}/>
        </div>

        <div className="event-details">
          <h2 className="event-title">{title}</h2>
          <p className="event-desc">{desc}</p>

          <div className="event-meta">
            <div className="event-info">
              <span><strong>Date:</strong> {date}</span>
              <span className="event-genre">{genre}</span>
            </div>

            {id ? (
              <a className="view-detail-btn" href={`/events/${id}`}>
                View Detail
              </a>
            ) : (
              <button className="view-detail-btn" disabled>View Detail</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const artistRows = useMemo(
    () => (latestArtists.length ? latestArtists : fallbackArtists),
    [latestArtists]
  );

  return (
    <div className="homepage-content">
      <div className="header-homepage">
        <div className="container-1">
          <h1 className="topic-1">SOUND & CROWD</h1>
        </div>
        <div className="news-box">
          <h1 className="news">NEWS!!</h1>
          <div className="marquee">
            <span>The mega concert CHIANG MAI ORIGINAL tickets are on sale now! ✨ | New artist updates every week | Special early bird promo 🎟️</span>
          </div>
        </div>

        <div className="vinyl-picture-box">
          <img src="https://images.pexels.com/photos/1238941/pexels-photo-1238941.jpeg" className="vinyl-picture"/>
        </div>
      </div>

      <div className="chiangmai-original-content">
        <div className="container-2">
          <div className="text-section">
            <h1 className="chiangmai-original-topic">chiang mai original !</h1>
            <h2 className="chiangmai-original-info">
              Explore the music and lifestyle of the people of the northern city. 
              Discover local artists Listen to the songs you love and discover new music styles with us.
            </h2>
          </div>
        </div>
      </div>

      <div className="divider-nextcontent"></div>

      {/* Discover new artists */}
      <div className="artist-content">
        <div className="discover-artists-header">
          <h1 className="discover-artists">Discover new artists</h1>
          <div className="artist-navigation">
            <button
              type="button"
              className={`nav-arrow ${scrollLeftActive ? 'is-active' : ''}`}
              onClick={() => {
                const grid = document.getElementById('artistGrid');
                grid.scrollBy({ left: -320, behavior: 'smooth' });
                setScrollLeftActive(true);
                setScrollRightActive(false);
              }}
              aria-label="Scroll left"
            >
              <svg viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" fill="none" strokeWidth="1.5">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 5 5 12 12 19" />
              </svg>
            </button>

            <button
              type="button"
              className={`nav-arrow ${scrollRightActive ? 'is-active' : ''}`}
              onClick={() => {
                const grid = document.getElementById('artistGrid');
                grid.scrollBy({ left: 320, behavior: 'smooth' });
                setScrollRightActive(true);
                setScrollLeftActive(false);
              }}
              aria-label="Scroll right"
            >
              <svg viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" fill="none" strokeWidth="1.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>

        <div className="discover-artists-subtitle">
          <p className="artist-subtitle">Your guide to new sounds in Chiang Mai, one vibe at a time</p>
          <Link to="/artists">
            <h2>Explore more artists ↗</h2>
          </Link>
        </div>

        <div className="container-3">
          <div className="artist-grid" id="artistGrid">
            {artistRows.map(artist => (
            <ArtistCard 
              key={artist.id}
              id={artist.id}
              title={artist.title}
              genre={artist.genre}
              image={artist.image}
              likedByMe={artist.likedByMe}
              followersCount={artist.followersCount}
              likeBusy={busyArtistIds.has(artist.id)}
              onToggleLike={toggleLikeArtist}
            />
            ))}
          </div>
        </div>
      </div>

      {/* Discover music by genre (ดึงแนวเพลงจริง) */}
      <div className="music-genre-content">
        <div className="container-4">
          <h1 className="discover-music">Discover music by genre</h1>

          <div className="discover-music-subtitle">
            <p className="subtitle">Explore Chiang Mai’s music scene through genres you love</p>
            <Link to="/artists">
              <h2>Explore more genres ↗</h2>
            </Link>
          </div>
          
          <div className="genre-section">
            <div className="genre-grid">
              {(genreList.length ? genreList : ["pop","indie","rock"]).map((g, i) => (
                <Link key={`${g}-${i}`} to={`/artists?genre=${encodeURIComponent(g)}`} className="genre-item">
                  {g}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming events (3 รายการ) */}
      <div className="event-content">
        <div className="container-5">
          <h1 className="upcoming-event">Upcoming events</h1>
          <p className="artist-subtitle">Catch the next wave of sounds around the city</p>
          <div className="event-grid">
            {(upcomingEvents.length ? upcomingEvents : []).map(ev => (
              <EventCard 
                key={ev.id}
                id={ev.id}
                title={ev.title}
                date={ev.date}
                genre={ev.genre}
                image={ev.image}
                desc={ev.desc}
              />
            ))}

            {!upcomingEvents.length && (
              <div style={{ padding: "20px 0", color: "#666" }}>
                No upcoming events yet.
              </div>
            )}
          </div>
        </div>

        <div className="container-6">
          <iframe
            src="https://open.spotify.com/embed/playlist/7D3gJBkWz9OjfWCdg2q3eA?utm_source=generator" 
            width="320" height="450" frameBorder="0" allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture">
          </iframe>
        </div>
      </div>
    </div>
  );
}
