import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from 'axios';
import "../css/Artist.css";
import "../css/Artist_profile.css";

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
// const dtf = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const dtfEvent = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

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
  useEffect(() => {
  if (!selectedGroup) return;
  const updated = groups.find(g => g.id === selectedGroup.id);
  if (updated) setSelectedGroup(updated);
}, [groups]); // เมื่อ groups เปลี่ยน (เพราะกด like/unlike) ให้ดึงเวอร์ชันล่าสุดมาแสดง

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
    /** ========================== LIKE / UNLIKE (เชื่อม DB) ========================== */
  const toggleLike = async (group) => {
    try {
      if (group.likedByMe) {
        // UNLIKE
        const { data } = await axios.delete(`/api/artists/${group.id}/like`, { withCredentials: true });
        setGroups(prev =>
          prev.map(g =>
            g.id === group.id
              ? {
                  ...g,
                  likedByMe: false,
                  followersCount: data?.count ?? Math.max(0, (g.followersCount || 0) - 1),
                }
              : g
          )
        );
      } else {
        // LIKE
        const { data } = await axios.post(`/api/artists/${group.id}/like`, {}, { withCredentials: true });
        setGroups(prev =>
          prev.map(g =>
            g.id === group.id
              ? {
                  ...g,
                  likedByMe: true,
                  followersCount: data?.count ?? ((g.followersCount || 0) + 1),
                }
              : g
          )
        );
      }
    } catch (err) {
      console.error("toggleLike error:", err);
      // ถ้าส่ง 401/403 มา อาจแจ้งให้ล็อกอินก่อนตาม UX ที่ต้องการ
    }
  };


  // ===== Pagination state & helpers =====
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 16;

  // รีเซ็ตหน้าเมื่อผลลัพธ์เปลี่ยน (เช่น เปลี่ยนแท็บ/ค้นหา)
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery, groups.length]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredGroups.slice(start, start + ITEMS_PER_PAGE);

  const goToPage = (p) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  // สร้างช่วงเลขหน้าแบบกระชับ (แสดงรอบ ๆ หน้าเดิม)
  const pageNumbers = useMemo(() => {
    const delta = 2; // โชว์เลขหน้าแถว ๆ ปัจจุบัน ±2
    const from = Math.max(1, currentPage - delta);
    const to = Math.min(totalPages, currentPage + delta);
    const arr = [];
    for (let i = from; i <= to; i++) arr.push(i);
    return arr;
  }, [currentPage, totalPages]);



  return (
    <div className="artist-container a-bleed">
      {/* ====== รายการวงทั้งหมด ====== */}
      {!selectedGroup ? (
        <>
          <div className="container-heading">
            <h1 className="artist-heading"> MELODY & MEMORIES</h1>
          </div>

          <h6 className="artist-heading-detail"> Music is the language of emotions when words are not enough.</h6>

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
            {pageItems.map(group => (  
              <div key={group.id} className="group-card-wrap" ref={lastFocusRef}>
                {/* ✅ ปุ่มหัวใจ */}
                <button
            className={`like-button ${group.likedByMe ? "liked" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleLike(group);               // << ใช้ API
            }}
            aria-label={group.likedByMe ? "Unlike" : "Like"}
          />

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

                <div className="group-card-caption">
                  <h3>{group.name}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* เส้นคั่น */}
          <div className="a-line"></div>

          {/* ======== PAGINATION ======== */}
          {/* ======== PAGINATION (แบบ 3 โซน) ======== */}
          {filteredGroups.length > 0 && (
            <nav className="artist-pagination" aria-label="artist pagination">
              {/* ซ้าย: Previous */}
              <div className="p-nav-left">
                <button
                  className="p-link"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
              </div>

              {/* กลาง: เลขหน้า + จุดไข่ปลา */}
              <div className="p-nav-center">
                {/* โชว์เลข 1 ด้านซ้ายถ้าจำเป็น */}
                {pageNumbers[0] > 1 && (
                  <>
                    <button
                      className={`p-num ${currentPage === 1 ? "is-active" : ""}`}
                      onClick={() => goToPage(1)}
                      aria-current={currentPage === 1 ? "page" : undefined}
                    >
                      1
                    </button>
                    {pageNumbers[0] > 2 && <span className="p-ellipsis">…</span>}
                  </>
                )}

                {/* ช่วงเลขรอบ ๆ หน้าปัจจุบัน */}
                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    className={`p-num ${p === currentPage ? "is-active" : ""}`}
                    onClick={() => goToPage(p)}
                    aria-current={p === currentPage ? "page" : undefined}
                  >
                    {p}
                  </button>
                ))}

                {/* โชว์เลขสุดท้ายด้านขวาถ้าจำเป็น */}
                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                      <span className="p-ellipsis">…</span>
                    )}
                    <button
                      className={`p-num ${currentPage === totalPages ? "is-active" : ""}`}
                      onClick={() => goToPage(totalPages)}
                      aria-current={currentPage === totalPages ? "page" : undefined}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              {/* ขวา: Next */}
              <div className="p-nav-right">
                <button
                  className="p-link"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            </nav>
          )}
        </>
        
      ) : (
        /* ====== รายละเอียดวง (เลย์เอาต์ 3 คอลัมน์) ====== */
        <div className="group-detail-view a-fullwide">
          {/* <button onClick={() => { setSelectedGroup(null); navigate("/page_artists"); }} className="back-btn">
            ← Back to Groups
          </button> */}

          {/* HERO GRID: ซ้ายรูป · กลางชื่อ/ข้อมูล · ขวา Spotify */}
          <div className="a-hero-grid">
            {/* ซ้าย: รูปใหญ่ */}
            <div className="a-hero-photo a-hero-emph a-shadow-sm">
              <img
                src={selectedGroup.image}
                alt={selectedGroup.name}
                onError={(e) => (e.currentTarget.src = "/img/fallback.jpg")}
              />
            </div>

             {/* กลาง: ชื่อ Artist ด้านขวาของรูป */}
            <div className="a-hero-name">
              {selectedGroup.name || "NewJeans"}
            </div>

            {/* Artist detail */}
            <div className="a-hero-detail">
              NewJeans is a South Korean girl group under ADOR, a subsidiary of HYBE Corporation. 
              They debuted on July 22, 2022, with the single <em>Attention</em> and quickly gained global popularity. 
              Known for their fresh music style, distinctive fashion, and simple yet powerful image, 
              the group consists of five members: Minji, Hanni, Danielle, Haerin, and Hyein.
            </div>



            {/* กลุ่ม META ใต้รูป (ซ้ายคอลัมน์เดียวกับรูป) */}
            <div className="a-hero-photo-meta">
              {/* แถว LISTEN ON + ปุ่มรูปภาพ */}
              <div className="a-hero-photo-caption">
                <span className="caption-text">LISTEN ON</span>
                <div className="a-listen-icons">
                  <a
                    className="a-social-btn"
                    href={selectedGroup?.socials?.spotify || "https://open.spotify.com/"}
                    target="_blank" rel="noopener noreferrer"
                    aria-label="Spotify" title="Spotify"
                  >
                    <img src="/img/spotify.png" alt="Spotify" />
                  </a>

                  <a
                    className="a-social-btn"
                    href={selectedGroup?.socials?.youtube || "https://www.youtube.com/"}
                    target="_blank" rel="noopener noreferrer"
                    aria-label="YouTube" title="YouTube"
                  >
                    <img src="/img/youtube.png" alt="YouTube" />
                  </a>

                  {/* ปุ่ม “เสียง” (ไม่มีลิงก์) */}
                  <span className="a-social-btn" aria-hidden="true" title="Sound">
                    <img src="/img/wave-sound.png" alt="Sound" />
                  </span>
                </div>
              </div>

              {/* เส้นคั่น */}
              <div className="a-hero-photo-line"></div>

              {/* แถว Date */}
              <div className="a-hero-photo-date">
                <span className="date-label">Date</span>
                <span className="date-value">September 11, 2025</span>
              </div>

              {/* แถว ETA */}
              <div className="a-hero-photo-eta">
                <span className="eta-label">ETA</span>
                <a
                  className="a-social-btn eta-btn"
                  href={selectedGroup?.etaPdfUrl || `/pdf/${selectedGroup?.slug || 'artist'}.pdf`}
                  download
                  title="Download ETA PDF"
                  aria-label="Download ETA PDF"
                  onClick={(e)=>e.stopPropagation()}
                >
                  <img src="/img/download.png" alt="PDF" />
                </a>
              </div>

              {/* แถว Share */}
              <div className="a-hero-photo-share">
                <span className="share-label">Share</span>
                <div className="share-icons">
                  <a href={selectedGroup?.socials?.instagram || "https://www.instagram.com"}
                    target="_blank" rel="noopener noreferrer"
                    className="a-social-btn" title="Instagram" aria-label="Instagram">
                    <img src="/img/instagram.png" alt="Instagram" />
                  </a>

                  <a href={selectedGroup?.socials?.twitter || "https://twitter.com"}
                    target="_blank" rel="noopener noreferrer"
                    className="a-social-btn" title="Twitter / X" aria-label="Twitter / X">
                    <img src="/img/twitter.png" alt="Twitter / X" />
                  </a>

                  <a href={selectedGroup?.socials?.facebook || "https://facebook.com"}
                    target="_blank" rel="noopener noreferrer"
                    className="a-social-btn" title="Facebook" aria-label="Facebook">
                    <img src="/img/facebook.png" alt="Facebook" />
                  </a>
                </div>
              </div>
            </div>

           








            {/* กลาง: ชื่อ/ข้อมูล/ปุ่ม + Socials ใต้ปุ่ม */}
            {/* <div className="a-hero-info">
              <h1 className="a-title-28 a-title-dark">{selectedGroup.name}</h1>
              <p className="group-description">{selectedGroup.details}</p> */}

              {/* KPI */}
              {/* <div className="a-stats-row">
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
              </div> */}

              {/* ปุ่ม Follow/Unfollow */}
              {/* <button
                className={`a-btn ${followed[selectedGroup.id] ? "a-btn-secondary" : "a-btn-primary"}`}
                onClick={() => toggleFollow(selectedGroup.id)}
              >
                {followed[selectedGroup.id] ? "Unfollow" : "Follow"}
              </button> */}

              {/* Socials: มาอยู่ใต้ปุ่ม */}
              {/* {(selectedGroup.socials?.instagram || selectedGroup.socials?.youtube || selectedGroup.socials?.spotify) && (
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
            </div> */}

            {/* ขวา: Spotify (sticky) */}
            {/* {selectedGroup.playlistEmbedUrl && (
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
            )} */}
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
                    <div className="a-date">{dtfEvent.format(new Date(ev.dateISO))}</div>
                    <div className="a-event">
                      <div className="a-event-title">{ev.title}</div>
                      <div className="a-event-sub">{ev.venue} • {ev.city}</div>
                    </div>
                    {(ev.id || ev.url || ev.ticketUrl) && (
                      ev.id ? (
                        <Link className="a-link" to={`/page_events/${ev.id}`}>Detail</Link>
                      ) : ev.url ? (
                        <a className="a-link" href={ev.url} target="_blank" rel="noreferrer">Detail</a>
                      ) : (
                        <a className="a-link" href={ev.ticketUrl} target="_blank" rel="noreferrer">Detail</a>
                      )
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

          {/* Tech Rider / ETA */}
          {/* <section className="a-section">
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
          </section> */}

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
      {/* {selectedArtist && (
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
      )} */}
    </div>
  );
}
