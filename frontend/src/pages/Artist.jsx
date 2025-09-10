import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from 'axios';
import "../css/Artist.css";

/** ---------- LocalStorage: สถานะการติดตาม ---------- */
const FOLLOW_KEY = "artist.follow.v1";
const loadFollowed = () => { try { return JSON.parse(localStorage.getItem(FOLLOW_KEY)) || {}; } catch { return {}; } };
const saveFollowed = (obj) => { try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(obj)); } catch {} };

/** ---------- Mock Data (มี playlist ของ NewJeans) ---------- */
/**

const groups = [
  {
    id: 1,
    slug: "newjeans",
    name: "NewJeans",
    image: "/img/newjeans.jpg",
    description: "เกิร์ลกรุปเกาหลีใต้ที่เดบิวต์ในปี 2022",
    details: "NewJeans เป็นเกิร์ลกรุปเกาหลีใต้ที่เดบิวต์ในปี 2022 ภายใต้สังกัด ADOR มีสมาชิก 5 คน",
    stats: { members: 5, debut: "2022", followers: "10M+" },
    followersCount: 10000000,
    artists: [
      { id: 1, name: "Minji", koreanName: "민지", position: "Leader, Rapper, Vocalist", birth: "2004-05-07", image: "/img/minji.jpg", description: "หัวหน้าวง NewJeans", details: "มินจี (Minji) เกิดเมื่อวันที่ 7 พฤษภาคม 2004 ..." },
      { id: 2, name: "Hanni", koreanName: "하니", position: "Vocalist, Dancer",         birth: "2004-10-06", image: "/img/hanni.jpg", description: "สมาชิกชาวออสเตรเลีย-เวียดนาม", details: "ฮันนี่ (Hanni) เกิดเมื่อวันที่ 6 ตุลาคม 2004 ..." },
      { id: 3, name: "Danielle", koreanName: "다니엘", position: "Vocalist",           birth: "2005-04-11", image: "/img/dear.jpg",  description: "สมาชิกชาวออสเตรเลีย-เกาหลี",  details: "แดเนียล (Danielle) เกิดเมื่อวันที่ 11 เมษายน 2005 ..." },
      { id: 4, name: "Haerin",   koreanName: "해린", position: "Vocalist, Dancer",     birth: "2006-05-15", image: "/img/haerin.jpg",description: "สมาชิกที่มีตาเหมือนแมว",    details: "ฮาริน (Haerin) เกิดเมื่อวันที่ 15 พฤษภาคม 2006 ..." },
      { id: 5, name: "Hyein",    koreanName: "혜인", position: "Vocalist, Maknae",     birth: "2008-04-21", image: "/img/hyein.jpg", description: "สมาชิกที่อายุน้อยที่สุด",   details: "เฮอิน (Hyein) เกิดเมื่อวันที่ 21 เมษายน 2008 ..." }
    ],
    socials: {
      instagram: "https://instagram.com/",
      youtube: "https://youtube.com/",
      spotify: "https://open.spotify.com/"
    },
    schedule: [
      { id: "s1", dateISO: "2025-09-03T19:00:00+07:00", title: "Bangkok Live", venue: "Impact Arena", city: "Nonthaburi", ticketUrl: "#" },
      { id: "s2", dateISO: "2025-10-12T18:30:00+07:00", title: "Fan Meet",     venue: "Union Hall",   city: "Bangkok",    ticketUrl: "#" }
    ],
    techRider: {
      summary: "2 vocal mics, 2 IEMs, 1 DI (keys), 1 guitar amp, 1 bass amp, drum kit 5pc, 2 wedges",
      items: [
        "ไมค์ร้องแบบสาย/ไร้สายอย่างละ 2 (Shure/Beta series ok)",
        "In-Ear Monitor (IEM) 2 ชุด + ระบบแจกจ่าย",
        "DI box 1 ช่องสำหรับคีย์บอร์ด/เพลย์แบ็ก",
        "กีตาร์แอมป์ 1 / เบสแอมป์ 1 (กำลังขับกลาง-สูง)",
        "ชุดกลอง 5 ชิ้น + ฉาบครบ (พร้อมไมค์มิก)",
        "ลำโพงมอนิเตอร์เวที (wedge) อย่างน้อย 2",
        "สายสัญญาณและไฟเลี้ยงตามมาตรฐาน"
      ],
      downloadUrl: "/docs/newjeans_tech_rider.pdf"
    },
    // ✅ Spotify ของ NewJeans (ฝั่งขวา)
    playlistEmbedUrl: "https://open.spotify.com/embed/artist/6HvZYsbFfjnjFrWF950C9d"
  }
];

*/

/** ---------- Utilities ---------- */
const formatCompact = (n) => Intl.NumberFormat(undefined, { notation: "compact" }).format(n);
const dtf = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function Artist() {

  /** ----------BEGIN- Mock Data (version ไม่ hardcode, fetch มาจาก db) ---------- */
  /** ---------- ยังไม่เสร็จ เสร็จละค่อยเปิดคอมเม้น ---------- */
  const [groups, setGroups] = useState([]);  
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState(null);
  /*
  */
  /** ----------END- Mock Data (version ไม่ hardcode, fetch มาจาก db) ---------- */




  // รายการวง (All/Popular/New + Search)
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // รายละเอียดวง + โมดัล
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [followed, setFollowed] = useState(loadFollowed());
  const [popOrigin, setPopOrigin] = useState({ x: "50%", y: "50%" }); // จุดกำเนิดแอนิเมชันโมดัล

  // Schedule tabs
  const [scheduleTab, setScheduleTab] = useState("upcoming");

  const { slug } = useParams();
  const navigate = useNavigate();
  const lastFocusRef = useRef(null);
    
  // fetched on mount for populating groups
  useEffect(() => {
    let cancelled = false;

    const fetchGroups = async () => {
      setLoadingGroups(true);
      setGroupsError(null);
      try {
        // NOTE: use the route your backend exposes:
        const res = await axios.get("/api/groups", { withCredentials: true });
        if (!cancelled) {
          setGroups(res.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setGroupsError(err);
          console.error("Error fetching groups:", err);
        }
      } finally {
        if (!cancelled) setLoadingGroups(false);
      }
    };

    fetchGroups();

    return () => { cancelled = true; };
  }, []);



  // เปิดวงตาม /page_artists/:slug
  useEffect(() => {
    if (!slug) { setSelectedGroup(null); return; }
    const found = groups.find(g => g.slug === slug);
    setSelectedGroup(found || null);
  }, [slug, groups]); //KUYY GU GAE TONG NII, Tanya add groups to that left fucking array

  // จำสถานะ follow
  useEffect(() => { saveFollowed(followed); }, [followed]);

  // ปิดโมดัลด้วย ESC
  useEffect(() => {
    if (!selectedArtist) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSelectedArtist(null);
        setTimeout(() => lastFocusRef.current?.focus?.(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedArtist]);

  // กรองรายการวง + ค้นหา
  const filteredGroups = useMemo(() => {
    const base = groups.filter(g => {
      if (activeFilter === "popular") return (g.followersCount || 0) >= 100000;
      if (activeFilter === "new") return Number(g.stats?.debut || 0) >= 2023;
      return true;
    });
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(g => {
      const inGroup =
        g.name.toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q) ||
        (g.details || "").toLowerCase().includes(q);
      const inMembers = (g.artists || []).some(a =>
        a.name.toLowerCase().includes(q) ||
        (a.koreanName || "").toLowerCase().includes(q) ||
        (a.position || "").toLowerCase().includes(q)
      );
      return inGroup || inMembers;
    });
  }, [groups, activeFilter, searchQuery]); //KUYY GU GAE TONG NII, Tanya add groups to that left fucking array

  // สร้าง Upcoming / Past list
  const now = new Date();
  const scheduleUpcoming = useMemo(() => {
    const arr = (selectedGroup?.schedule || []).filter(ev => new Date(ev.dateISO) >= now);
    return arr.sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
  }, [selectedGroup]);
  const schedulePast = useMemo(() => {
    const arr = (selectedGroup?.schedule || []).filter(ev => new Date(ev.dateISO) < now);
    return arr.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  }, [selectedGroup]);

  const toggleFollow = (groupId) => setFollowed(prev => ({ ...prev, [groupId]: !prev[groupId] }));

  return (
    <div className="artist-container a-bleed">
      {/* ====== รายการวงทั้งหมด ====== */}
      {!selectedGroup ? (
        <>
          <h1 className="artist-heading">
              Melody <br />
            <span className="memories-line">& Memories</span>
          </h1>

          <h6 className="artist-heading-detail">
            Music is the language of emotions when words are not enough.
          </h6>

          {/* Filter + Search */}
          <div className="seamless-filter-search a-card-min">
            <div className="connected-filter-tabs" role="tablist" aria-label="artist filters">
              <button className={`connected-filter-tab ${activeFilter === "all" ? "active" : ""}`} onClick={(e) => { setActiveFilter("all"); lastFocusRef.current = e.currentTarget; }}>All</button>
              <button className={`connected-filter-tab ${activeFilter === "popular" ? "active" : ""}`} onClick={(e) => { setActiveFilter("popular"); lastFocusRef.current = e.currentTarget; }}>Popular</button>
              <button className={`connected-filter-tab ${activeFilter === "new" ? "active" : ""}`} onClick={(e) => { setActiveFilter("new"); lastFocusRef.current = e.currentTarget; }}>New</button>
            </div>

            <div className="connected-search-container">
              <input
                type="text"
                placeholder="Search artists, members, positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="connected-search-box"
              />
              <button className="search-icon" aria-label="search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M11 19c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Grid รายการวง */}
          <div className="group-grid">
            {filteredGroups.map(group => (  
              <div key={group.id} className="group-card-wrap" ref={lastFocusRef}>
                <Link
                  to={`/page_artists/${group.slug}`}
                  className="group-card a-card-min"
                  onClick={() => { setSelectedGroup(group); }}
                >
                  <div className="group-card-image">
                    <img
                      src={group.image}
                      alt={group.name}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = "/img/fallback.jpg"; }}
                    />
                  </div>
                </Link>

                {/* ชื่อวงอยู่นอกการ์ด */}
                <div className="group-card-caption">
                  <h3>{group.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ====== รายละเอียดวง (เลย์เอาต์ 3 คอลัมน์) ====== */
        <div className="group-detail-view a-fullwide">
          {/* <button onClick={() => { setSelectedGroup(null); navigate("/page_artists"); }} className="back-btn">
            ← Back to Groups
          </button> */}

          {/* HERO GRID: ซ้ายรูป · กลางข้อมูล/ปุ่ม · ขวา Spotify */}
          <div className="a-hero-grid">
            {/* ซ้าย: รูปใหญ่ (เด่นขึ้น) */}
            <div className="a-hero-photo a-hero-emph a-shadow-sm">
              <img
                src={selectedGroup.image}
                alt={selectedGroup.name}
                onError={(e) => (e.currentTarget.src = "/img/fallback.jpg")}
              />
            </div>

            {/* กลาง: ชื่อ/ข้อมูล/ปุ่ม + Socials ใต้ปุ่ม */}
            <div className="a-hero-info">
              <h1 className="a-title-28 a-title-dark">{selectedGroup.name}</h1>
              <p className="group-description">{selectedGroup.details}</p>

              {/* KPI */}
              <div className="a-stats-row">
                <div className="a-stat-chip">
                  <div className="a-kpi">
                    {formatCompact(selectedGroup.followersCount + (followed[selectedGroup.id] ? 1 : 0))}
                  </div>
                  <div className="a-kpi-label">Followers</div>
                </div>
                <div className="a-stat-chip">
                  <div className="a-kpi">{selectedGroup.stats.members}</div>
                  <div className="a-kpi-label">Members</div>
                </div>
                <div className="a-stat-chip">
                  <div className="a-kpi">{selectedGroup.stats.debut}</div>
                  <div className="a-kpi-label">Debut</div>
                </div>
              </div>

              {/* ปุ่ม Follow/Unfollow */}
              <button
                className={`a-btn ${followed[selectedGroup.id] ? "a-btn-secondary" : "a-btn-primary"}`}
                onClick={() => toggleFollow(selectedGroup.id)}
              >
                {followed[selectedGroup.id] ? "Unfollow" : "Follow"}
              </button>

              {/* Socials: มาอยู่ใต้ปุ่ม */}
              {(selectedGroup.socials?.instagram || selectedGroup.socials?.youtube || selectedGroup.socials?.spotify) && (
                <div className="a-socials-inline">
                  <div className="a-socials">
                    {selectedGroup.socials?.instagram && (
                      <a className="a-icon-btn" href={selectedGroup.socials.instagram} target="_blank" rel="noreferrer">IG</a>
                    )}
                    {selectedGroup.socials?.youtube && (
                      <a className="a-icon-btn" href={selectedGroup.socials.youtube} target="_blank" rel="noreferrer">YT</a>
                    )}
                    {selectedGroup.socials?.spotify && (
                      <a className="a-icon-btn" href={selectedGroup.socials.spotify} target="_blank" rel="noreferrer">SP</a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ขวา: Spotify (sticky) */}
            {selectedGroup.playlistEmbedUrl && (
              <aside className="a-hero-right">
                <div className="a-spotify-box">
                  <iframe
                    className="a-spotify-embed"
                    src={selectedGroup.playlistEmbedUrl}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title={`${selectedGroup.name} on Spotify`}
                  ></iframe>
                </div>
              </aside>
            )}
          </div>

          {/* ===== Schedule (Tabs) ===== */}
          <section className="a-section">
            <h2 className="a-section-title">Schedule</h2>

            <div className="a-panel">
              <div className="a-tabbar" role="tablist" aria-label="Schedule tabs">
                <button
                  role="tab"
                  aria-selected={scheduleTab === "upcoming"}
                  className={`a-tab ${scheduleTab === "upcoming" ? "is-active" : ""}`}
                  onClick={() => setScheduleTab("upcoming")}
                >
                  Upcoming
                </button>
                <button
                  role="tab"
                  aria-selected={scheduleTab === "past"}
                  className={`a-tab ${scheduleTab === "past" ? "is-active" : ""}`}
                  onClick={() => setScheduleTab("past")}
                >
                  Past
                </button>
              </div>

              <ul className="a-schedule-list">
                {(scheduleTab === "upcoming" ? scheduleUpcoming : schedulePast).map(ev => (
                  <li key={ev.id} className="a-schedule-item">
                    <div className="a-date">{dtf.format(new Date(ev.dateISO))}</div>
                    <div className="a-event">
                      <div className="a-event-title">{ev.title}</div>
                      <div className="a-event-sub">{ev.venue} • {ev.city}</div>
                    </div>
                    {ev.ticketUrl && (
                      <a
                        href={ev.ticketUrl}
                        className="a-link"
                        onClick={(e)=>e.stopPropagation()}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Tickets
                      </a>
                    )}
                  </li>
                ))}
                {(scheduleTab === "upcoming" && scheduleUpcoming.length === 0) && (
                  <li className="a-empty">No upcoming events</li>
                )}
                {(scheduleTab === "past" && schedulePast.length === 0) && (
                  <li className="a-empty">No past events</li>
                )}
              </ul>
            </div>
          </section>

          {/* Socials */}
          {/* <section className="a-section">
            <h2 className="a-section-title">Follow</h2>
            <div className="a-socials">
              {selectedGroup.socials?.instagram && <a className="a-icon-btn" href={selectedGroup.socials.instagram} target="_blank" rel="noreferrer">IG</a>}
              {selectedGroup.socials?.youtube   && <a className="a-icon-btn" href={selectedGroup.socials.youtube}   target="_blank" rel="noreferrer">YT</a>}
              {selectedGroup.socials?.spotify   && <a className="a-icon-btn" href={selectedGroup.socials.spotify}   target="_blank" rel="noreferrer">SP</a>}
            </div>
          </section> */}

          {/* Members */}
          <h2 className="members-title">Members</h2>
          <div className="artist-grid">
            {selectedGroup.artists.map(a => (
              <button
                key={a.id}
                className="a-member-card"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  lastFocusRef.current = e.currentTarget;
                  setPopOrigin({ x: `${x}%`, y: `${y}%` });
                  setSelectedArtist(a);
                }}
                aria-label={`เปิดรายละเอียดของ ${a.name}`}
              >
                <img
                  className="a-member-img"
                  src={a.image}
                  alt={a.name}
                  onError={(e) => (e.currentTarget.src = "/img/fallback.jpg")}
                  loading="lazy"
                />
                <div className="a-member-overlay">
                  <span className="a-member-name">{a.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Tech Rider / ETA */}
          <section className="a-section">
            <h2 className="a-section-title">Equipment / Tech Rider (ETA)</h2>
            <p className="a-text-dim">สรุปอุปกรณ์หลักที่ต้องใช้สำหรับการแสดง</p>
            <div className="a-rider">
              <div className="a-rider-summary">{selectedGroup.techRider?.summary}</div>
              <ul className="a-list">
                {selectedGroup.techRider?.items?.map((it, idx) => <li key={idx}>{it}</li>)}
              </ul>
              {selectedGroup.techRider?.downloadUrl && (
                <a className="a-link" href={selectedGroup.techRider.downloadUrl} target="_blank" rel="noreferrer">
                  ดาวน์โหลดเอกสาร (PDF)
                </a>
              )}
            </div>
          </section>

          {/* Members */}
          {/* <h2 className="members-title">Members</h2>
          <div className="artist-grid">
            {selectedGroup.artists.map(a => (
              <button
                key={a.id}
                className="a-member-card"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  lastFocusRef.current = e.currentTarget;
                  setPopOrigin({ x: `${x}%`, y: `${y}%` });
                  setSelectedArtist(a);
                }}
                aria-label={`เปิดรายละเอียดของ ${a.name}`}
              >
                <img
                  className="a-member-img"
                  src={a.image}
                  alt={a.name}
                  onError={(e) => (e.currentTarget.src = "/img/fallback.jpg")}
                  loading="lazy"
                />
                <div className="a-member-overlay">
                  <span className="a-member-name">{a.name}</span>
                </div>
              </button>
            ))}
          </div> */}
        </div>
      )}

      {/* ====== โมดัลสมาชิก (ป๊อปอัป) ====== */}
      {selectedArtist && (
        <div
          className="artist-modal-overlay a-fade-in"
          onClick={() => { setSelectedArtist(null); setTimeout(() => lastFocusRef.current?.focus?.(), 0); }}
        >
          <div
            className="artist-modal a-modal-rel a-pop-in"
            style={{ "--a-pop-x": popOrigin.x, "--a-pop-y": popOrigin.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-image">
                <img
                  src={selectedArtist.image}
                  alt={selectedArtist.name}
                  onError={(e) => (e.currentTarget.src = "/img/fallback.jpg")}
                />
              </div>
              <div className="modal-info">
                <h2>{selectedArtist.name}</h2>
                <p className="position">{selectedArtist.position}</p>
                {selectedArtist.details && <p className="details">{selectedArtist.details}</p>}
              </div>
              <button
                className="close-btn"
                onClick={() => { setSelectedArtist(null); setTimeout(() => lastFocusRef.current?.focus?.(), 0); }}
                aria-label="close"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
