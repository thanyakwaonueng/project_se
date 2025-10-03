// src/pages/Artist.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../css/Artist.css";
import "../css/Artist_profile.css";

/** ---------- LocalStorage follow (client-side) ---------- */
const FOLLOW_KEY = "artist.follow.v1";
const loadFollowed = () => { try { return JSON.parse(localStorage.getItem(FOLLOW_KEY)) || {}; } catch { return {}; } };
const saveFollowed = (obj) => { try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(obj)); } catch {} };

/** ---------- Utils ---------- */
const dtfEvent = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

/** ---------- Social icon (เล็กๆ) ---------- */
function SocialIcon({ href, img, label }) {
  if (!href) return null;
  return (
    <a
      className="social-btn"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      onClick={(e) => e.stopPropagation()}
    >
      <img src={img} alt={label} />
    </a>
  );
}

export default function Artist() {
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState(null);

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [followed, setFollowed] = useState(loadFollowed());
  const [followingIds, setFollowingIds] = useState(new Set());

  const lastFocusRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // ---------- 2) AUTH กันหน้าเด้ง (จับ 401) ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await axios.get("/api/auth/me", { withCredentials: true }); // <-- แก้เป็น axios
        if (alive) setUser(res.data);
      } catch (e) {
        if (alive) setUser(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ---- mock gallery data ----
  const GALLERY_SAMPLE = [
    { type: "image", src: "https://images.pexels.com/photos/210922/pexels-photo-210922.jpeg", alt: "Live at City Hall" },
    { type: "image", src: "https://images.pexels.com/photos/3359713/pexels-photo-3359713.jpeg", alt: "Backstage moment" },
    { type: "image", src: "https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg", alt: "Studio session" },
    { type: "image", src: "https://images.pexels.com/photos/21067/pexels-photo.jpg", alt: "Crowd shot" },
    { type: "image", src: "https://images.pexels.com/photos/109669/pexels-photo-109669.jpeg", alt: "Hall angle" },
    { type: "video", src: "/media/demo-showcase.mp4", poster: "https://images.pexels.com/photos/109669/pexels-photo-109669.jpeg", alt: "Music video teaser" },
    { type: "video", src: "/media/behind-the-scenes.mp4", poster: "https://images.pexels.com/photos/210922/pexels-photo-210922.jpeg", alt: "Behind the scenes" },
    { type: "video", src: "/media/live-clip.mp4", poster: "https://images.pexels.com/photos/3359713/pexels-photo-3359713.jpeg", alt: "Live clip" },
    { type: "video", src: "/media/studio-talk.mp4", poster: "https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg", alt: "Studio talk" },
    { type: "video", src: "/media/interview.mp4", poster: "https://images.pexels.com/photos/21067/pexels-photo.jpg", alt: "Interview" },
  ];

  const imagesAll = useMemo(() => GALLERY_SAMPLE.filter(x => x.type === "image"), []);
  const videosAll = useMemo(() => GALLERY_SAMPLE.filter(x => x.type === "video"), []);

  const [showAllImages, setShowAllImages] = useState(false);
  const [showAllVideos, setShowAllVideos] = useState(false);

  const imagesToShow = showAllImages ? imagesAll : imagesAll.slice(0, 4);
  const videosToShow = showAllVideos ? videosAll : videosAll.slice(0, 4);

  const hasMoreImages = imagesAll.length > 4 && !showAllImages;
  const hasMoreVideos = videosAll.length > 4 && !showAllVideos;

  const [lightbox, setLightbox] = useState({ open: false, index: 0 });
  const openLightbox = (idx) => setLightbox({ open: true, index: idx });
  const closeLightbox = () => setLightbox({ open: false, index: 0 });

  useEffect(() => {
    if (!lightbox.open) return;
    const onKey = (e) => { if (e.key === "Escape") closeLightbox(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open]);

  /** fetch groups */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingGroups(true);
      setGroupsError(null);
      try {
        const res = await axios.get("/api/groups", { withCredentials: true });
        if (!cancelled) setGroups(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (!cancelled) {
          setGroupsError(err);
          console.error("GET /api/groups error:", err);
        }
      } finally {
        if (!cancelled) setLoadingGroups(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /** open detail by id */
  useEffect(() => {
    if (!id) { setSelectedGroup(null); return; }
    const found = groups.find((g) => String(g.id) === String(id));
    setSelectedGroup(found || null);
  }, [id, groups]);

  /** keep selectedGroup fresh when groups changed */
  useEffect(() => {
    if (!selectedGroup) return;
    const updated = groups.find((g) => g.id === selectedGroup.id);
    if (updated) setSelectedGroup(updated);
  }, [groups, selectedGroup]);

  /** save local follow */
  useEffect(() => { saveFollowed(followed); }, [followed]);

  /** ---------- SORTING & FILTERING ---------- */
  // 1) เตรียมลิสต์ที่ "จัดเรียง" ตามแท็บ
  const sortedGroups = useMemo(() => {
    const arr = [...groups];
    if (activeFilter === "popular") {
      // เรียงตามจำนวนผู้ติดตาม (desc) ถ้าเท่ากัน fallback เป็นชื่อ
      arr.sort((a, b) => {
        const fb = (b.followersCount || 0) - (a.followersCount || 0);
        if (fb !== 0) return fb;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
    } else if (activeFilter === "new") {
      // ใหม่สุดก่อน (ถ้าไม่มี debut ให้ไปท้าย)
      arr.sort((a, b) => (Number(b?.stats?.debut || 0) - Number(a?.stats?.debut || 0)));
    } else {
      // เรียงชื่อ A→Z เป็นค่าเริ่มต้น
      arr.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }
    return arr;
  }, [groups, activeFilter]);

  // 2) จากนั้นค่อยกรองด้วยคำค้นหา
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedGroups;
    return sortedGroups.filter((g) => {
      const inGroup =
        g.name?.toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q) ||
        (g.details || "").toLowerCase().includes(q);
      return inGroup;
    });
  }, [sortedGroups, searchQuery]);

  /** follow/unfollow (DB-based) */
  const toggleFollow = async (group) => {
    if (!group?.id) return;
    if (followingIds.has(group.id)) return;
    setFollowingIds((s) => new Set(s).add(group.id));
    try {
      if (group.likedByMe) {
        const { data } = await axios.delete(`/api/artists/${group.id}/like`, { withCredentials: true });
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id
              ? { ...g, likedByMe: false, followersCount: data?.count ?? Math.max(0, (g.followersCount || 0) - 1) }
              : g
          )
        );
      } else {
        const { data } = await axios.post(`/api/artists/${group.id}/like`, {}, { withCredentials: true });
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id
              ? { ...g, likedByMe: true, followersCount: data?.count ?? (g.followersCount || 0) + 1 }
              : g
          )
        );
      }
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate("/login");
      } else {
        console.error("toggleFollow error:", err);
      }
    } finally {
      setFollowingIds((s) => { const next = new Set(s); next.delete(group.id); return next; });
    }
  };

  /** pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 16;
  useEffect(() => { setCurrentPage(1); }, [activeFilter, searchQuery, groups.length]);
  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredGroups.slice(start, start + ITEMS_PER_PAGE);
  const goToPage = (p) => setCurrentPage(Math.min(Math.max(1, p), totalPages));
  const pageNumbers = useMemo(() => {
    const delta = 2;
    const from = Math.max(1, currentPage - delta);
    const to = Math.min(totalPages, currentPage + delta);
    const arr = [];
    for (let i = from; i <= to; i++) arr.push(i);
    return arr;
  }, [currentPage, totalPages]);

  const [scheduleTab, setScheduleTab] = useState("upcoming");

  // genres:
  const groupGenres = useMemo(() => {
    if (!selectedGroup) return [];
    const list = [];
    if (selectedGroup.genre) list.push(selectedGroup.genre);
    if (selectedGroup.subGenre) list.push(selectedGroup.subGenre);
    if (Array.isArray(selectedGroup.genres)) list.push(...selectedGroup.genres);
    if (!list.length && selectedGroup.details) list.push(selectedGroup.details);
    return Array.from(new Set(list.filter(Boolean)));
  }, [selectedGroup]);

  const fmtCompact = (n) => {
    const num = Number(n || 0);
    if (num >= 1_000_000) { const v = (num / 1_000_000).toFixed(num < 10_000_000 ? 1 : 0); return `${v.replace(/\.0$/, "")}m`; }
    if (num >= 1_000)     { const v = (num / 1_000).toFixed(num < 10_000 ? 1 : 0);          return `${v.replace(/\.0$/, "")}k`; }
    return num.toLocaleString();
  };

  // schedule lists
  const now = new Date();
  const scheduleUpcoming = useMemo(() => {
    const arr = (selectedGroup?.schedule || []).filter(ev => new Date(ev.dateISO) >= now);
    return arr.sort((a,b) => new Date(a.dateISO) - new Date(b.dateISO));
  }, [selectedGroup]);

  const schedulePast = useMemo(() => {
    const arr = (selectedGroup?.schedule || []).filter(ev => new Date(ev.dateISO) < now);
    return arr.sort((a,b) => new Date(b.dateISO) - new Date(a.dateISO));
  }, [selectedGroup]);

  if (loadingGroups) {
    return <div className="artist-container a-bleed" style={{padding:16}}>Loading…</div>;
  }
  if (groupsError) {
    return <div className="artist-container a-bleed" style={{padding:16}}>Failed to load artists.</div>;
  }



  const getDocUrl = (g, key) => {
    // key: 'epk' | 'rider' | 'rateCard'
    const obj = g?.[key];
    const legacy = g?.[`${key}Url`] || (key === 'epk' ? g?.techRider?.downloadUrl : null);
    return obj?.downloadUrl || legacy || null;
  };



  return (
  <div className="artist-container a-bleed">
    {/* ====== LIST MODE ====== */}
    {!selectedGroup ? (
      <>
        <div className="container-heading">
          <h1 className="artist-heading">MELODY & MEMORIES</h1>
        </div>
        <h6 className="artist-heading-detail">
          Music is the language of emotions when words are not enough.
        </h6>

        {/* Filter + Search */}
        <div className="seamless-filter-search a-card-min">
          <div className="connected-filter-tabs" role="tablist" aria-label="artist filters">
            <button
              className={`connected-filter-tab ${activeFilter === "all" ? "active" : ""}`}
              onClick={(e) => { setActiveFilter("all"); lastFocusRef.current = e.currentTarget; }}
            >All</button>
            <button
              className={`connected-filter-tab ${activeFilter === "popular" ? "active" : ""}`}
              onClick={(e) => { setActiveFilter("popular"); lastFocusRef.current = e.currentTarget; }}
            >Popular</button>
            <button
              className={`connected-filter-tab ${activeFilter === "new" ? "active" : ""}`}
              onClick={(e) => { setActiveFilter("new"); lastFocusRef.current = e.currentTarget; }}
            >New</button>
          </div>

          <div className="connected-search-container">
            <input
              type="text"
              placeholder="Search artists…"
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

        {/* Grid */}
        <div className="group-grid">
          {pageItems.map(group => (
            <div key={group.id} className="group-card-wrap" ref={lastFocusRef}>
              <button
                className={`like-button ${group.likedByMe ? "liked" : ""}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFollow(group); }}
                aria-label={group.likedByMe ? "Unfollow" : "Follow"}
                disabled={followingIds.has(group.id)}
                title={group.likedByMe ? "Unfollow" : "Follow"}
              />
              <Link
                to={`/artists/${group.id}`}
                className="group-card a-card-min"
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
              <div className="group-card-likes" style={{ marginTop: 0, fontSize: 13, opacity: 0.8, paddingLeft:10 }}>
                👥 {group.followersCount || 0} followers
              </div>
            </div>
          ))}
        </div>

        <div className="a-line-artist" />

        {/* Pagination */}
        {filteredGroups.length > 0 && (
          <nav className="artist-pagination" aria-label="artist pagination">
            <div className="p-nav-left">
              <button className="p-link" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                ← Previous
              </button>
            </div>
            <div className="p-nav-center">
              {pageNumbers[0] > 1 && (
                <>
                  <button className={`p-num ${currentPage === 1 ? "is-active" : ""}`} onClick={() => goToPage(1)} aria-current={currentPage === 1 ? "page" : undefined}>1</button>
                  {pageNumbers[0] > 2 && <span className="p-ellipsis">…</span>}
                </>
              )}
              {pageNumbers.map((p) => (
                <button key={p} className={`p-num ${p === currentPage ? "is-active" : ""}`} onClick={() => goToPage(p)} aria-current={p === currentPage ? "page" : undefined}>
                  {p}
                </button>
              ))}
              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="p-ellipsis">…</span>}
                  <button className={`p-num ${currentPage === totalPages ? "is-active" : ""}`} onClick={() => goToPage(totalPages)} aria-current={currentPage === totalPages ? "page" : undefined}>
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <div className="p-nav-right">
              <button className="p-link" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                Next →
              </button>
            </div>
          </nav>
        )}
      </>
    ) : (
      /* ====== DETAIL MODE ====== */
      <>
        <section className="profile">
          <div className="profile-grid">
            {/* ซ้าย: ชื่อ/คำบรรยาย/EPK */}
            <div className="left-box">
              <h1 className="title">{selectedGroup?.name || "Artist"}</h1>
              <p className="desc">{(selectedGroup?.description || "").trim() || "No description."}</p>

              {/* ปุ่ม EPK */}
              {/* เอกสารศิลปิน — 3 ปุ่มบรรทัดเดียว */}
              <div className="doc-row">
                {[
                  { label: "EPK",       url: getDocUrl(selectedGroup, "epk") },
                  { label: "Rider",     url: getDocUrl(selectedGroup, "rider") },
                  { label: "Rate card", url: getDocUrl(selectedGroup, "rateCard") },
                ].map(({ label, url }) => (
                  url ? (
                    <a key={label} className="epk-pill" href={url} target="_blank" rel="noreferrer" aria-label={`Open ${label}`}>
                      <span>{label}</span>
                      <span className="epk-dot" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </a>
                  ) : (
                    <button key={label} className="epk-pill is-disabled" disabled aria-disabled="true">
                      <span>{label}</span>
                      <span className="epk-dot" aria-hidden="true">–</span>
                    </button>
                  )
                ))}
              </div>


            </div>

            {/* กลาง: รูป + เส้น + GENRE */}
            <div className="center-wrap">
              <div className="center-box">
                <div className="img-like-shell">
                  <button
                    className={`like-button ${selectedGroup.likedByMe ? "liked" : ""}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFollow(selectedGroup); }}
                    aria-label={selectedGroup.likedByMe ? "Unfollow" : "Follow"}
                    disabled={followingIds.has(selectedGroup.id)}
                    title={selectedGroup.likedByMe ? "Unfollow" : "Follow"}
                  />
                </div>

                <figure className="img-frame" aria-label="Artist image">
                  {selectedGroup?.image ? (
                    <img
                      className="img"
                      src={selectedGroup.image}
                      alt={selectedGroup?.name || "Artist"}
                      loading="lazy"
                      onError={(e) => (e.currentTarget.src = "/img/fallback.jpg")}
                    />
                  ) : (
                    <img className="img" src="/img/fallback.jpg" alt="" />
                  )}
                </figure>
              </div>

              <div className="center-hr" aria-hidden="true" />

              <div className="center-caption">
                <div className="center-caption-row">
                  <span className="center-caption-label">GENRE</span>
                  <span className="genre-chip genre-chip--single">
                    {groupGenres.length ? groupGenres.join(" / ") : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* ขวา: ผู้ติดตาม + โซเชียล */}
            <aside className="right-box">
              <div className="follow-box" aria-label="Followers">
                <div className="follow-big">{fmtCompact(selectedGroup?.followersCount)}+</div>
                <div className="follow-sub">follow</div>
              </div>

              <div className="social-bar">
                <div className="social-title2">Find Me Online</div>
                <div className="social-underline"><span className="dot" /><span className="wave" /></div>
                <div className="social-row">
                  <SocialIcon href={selectedGroup?.socials?.instagram} img="/img/instagram.png" label="Instagram" />
                  <SocialIcon href={selectedGroup?.socials?.twitter}   img="/img/twitter.png"   label="Twitter/X" />
                  <SocialIcon href={selectedGroup?.socials?.facebook}  img="/img/facebook.png"  label="Facebook" />
                  <SocialIcon href={selectedGroup?.socials?.tiktok}    img="/img/tiktok.png"    label="TikTok" />
                  <SocialIcon href={selectedGroup?.socials?.youtube}   img="/img/youtube.png"   label="YouTube" />
                </div>
              </div>
            </aside>
          </div>

          {/* LISTEN ON */}
          <div className="listen2">
            <div className="listen2-top">
              <div className="listen2-title">LISTEN ON</div>
              <div className="listen2-quote">“Where words fail, music speaks.”</div>
            </div>
            <div className="listen2-grid">
              <a className="listen2-item" href={selectedGroup?.socials?.spotify || "#"} target="_blank" rel="noreferrer">
                <img src="/img/spotify.png" alt="" /><span>Spotify</span>
              </a>
              <a className="listen2-item" href={selectedGroup?.socials?.appleMusic || "#"} target="_blank" rel="noreferrer">
                <img src="/img/apple-music.png" alt="" /><span>Apple Music</span>
              </a>
              <a className="listen2-item" href={selectedGroup?.socials?.youtube || "#"} target="_blank" rel="noreferrer">
                <img src="/img/youtube.png" alt="" /><span>YouTube Music</span>
              </a>
              <a className="listen2-item" href={selectedGroup?.socials?.soundcloud || "#"} target="_blank" rel="noreferrer">
                <img src="/img/soundcloud.png" alt="" /><span>SoundCloud</span>
              </a>
              <a className="listen2-item" href={selectedGroup?.socials?.bandcamp || "#"} target="_blank" rel="noreferrer">
                <img src="/img/bandcamp.png" alt="" /><span>Bandcamp</span>
              </a>
              <a className="listen2-item" href={selectedGroup?.socials?.shazam || "#"} target="_blank" rel="noreferrer">
                <img src="/img/shazam.png" alt="" /><span>Shazam</span>
              </a>
            </div>
          </div>

          {/* SCHEDULE */}
          <section className="schedule-sec">
            <div className="schedule-head">
              <h2 className="schedule-title">SCHEDULE</h2>
              <div className="schedule-tabs" role="tablist" aria-label="Schedule tabs">
                <button role="tab" aria-selected={scheduleTab === "upcoming"} className={`sch-tab ${scheduleTab === "upcoming" ? "is-active" : ""}`} onClick={() => setScheduleTab("upcoming")}>Upcoming</button>
                <button role="tab" aria-selected={scheduleTab === "past"}      className={`sch-tab ${scheduleTab === "past" ? "is-active" : ""}`}      onClick={() => setScheduleTab("past")}>Past</button>
              </div>
            </div>

            <ul className="schedule-list">
              {(scheduleTab === "upcoming" ? scheduleUpcoming : schedulePast).map((ev) => (
                <li key={ev.id} className="schedule-item">
                  <div className="sch-date">{dtfEvent.format(new Date(ev.dateISO))}</div>
                  <div className="sch-body">
                    <div className="sch-title">{ev.title}</div>
                    <div className="sch-sub">{ev.venue}{ev.city ? ` • ${ev.city}` : ""}</div>
                  </div>
                  {(ev.id || ev.url || ev.ticketUrl) && (
                    ev.id ? <Link className="sch-link" to={`/events/${ev.id}`}>Detail</Link>
                          : <a className="sch-link" href={ev.url || ev.ticketUrl} target="_blank" rel="noreferrer">Detail</a>
                  )}
                </li>
              ))}
              {(scheduleTab === "upcoming" && scheduleUpcoming.length === 0) && <li className="a-empty">No upcoming events</li>}
              {(scheduleTab === "past" && schedulePast.length === 0) && <li className="a-empty">No past events</li>}
            </ul>
          </section>

          {/* <hr className="big-divider" /> */}




          {/* ===================== [6] GALLERY (Photos top / Videos bottom, mock + See more) ===================== */}
          {/* ===================== [6] GALLERY ===================== */}
          <section className="gallery small" aria-label="Artist gallery">
            <div className="gallery-top">
              <h2 className="gallery-title">GALLERY</h2>
              <p className="gallery-quote">Photos on top, videos below.</p>
            </div>

            {/* ---------- Photos Row ---------- */}
            {imagesAll.length > 0 && (
              <div className="gallery-row">
                <div className="gallery-row-head">
                  <h3 className="gallery-row-title">Photos</h3>
                  {hasMoreImages ? (
                    <button className="gallery-see-more" type="button" onClick={() => setShowAllImages(true)}>
                      See more →
                    </button>
                  ) : showAllImages ? (
                    <button className="gallery-see-more" type="button" onClick={() => setShowAllImages(false)}>
                      ← See less
                    </button>
                  ) : null}
                </div>

                <div className={`gallery-grid g-4 ${showAllImages ? "is-expanded" : ""}`}>
                  {imagesToShow.map((it, i) => (
                    <button
                      key={`img-${i}`}
                      type="button"
                      className="gallery-item as-button"
                      onClick={() => openLightbox(showAllImages ? i : i)}  /* index ตามลิสต์ที่โชว์ */
                      aria-label={it.alt || "Open image"}
                      title={it.alt || "Open image"}
                    >
                      <img className="galler  y-media" src={it.src} alt={it.alt || ""} loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ---------- Videos Row ---------- */}
            {videosAll.length > 0 && (
              <div className="gallery-row">
                <div className="gallery-row-head">
                  <h3 className="gallery-row-title">Videos</h3>
                  {hasMoreVideos ? (
                    <button className="gallery-see-more" type="button" onClick={() => setShowAllVideos(true)}>
                      See more →
                    </button>
                  ) : showAllVideos ? (
                    <button className="gallery-see-more" type="button" onClick={() => setShowAllVideos(false)}>
                      ← See less
                    </button>
                  ) : null}
                </div>

                <div className={`gallery-grid g-4 ${showAllVideos ? "is-expanded" : ""}`}>
                  {videosToShow.map((it, i) => (
                    <div className="gallery-item is-video" key={`vid-${i}`}>
                      <video
                        className="gallery-media"
                        controls
                        preload="metadata"
                        poster={it.poster || undefined}
                        aria-label={it.alt || "Artist video"}
                      >
                        <source src={it.src} />
                      </video>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------- Lightbox (เฉพาะรูป) ---------- */}
            {lightbox.open && (
              <div className="lightbox" role="dialog" aria-modal="true" onClick={closeLightbox}>
                <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
                  <img
                    src={(showAllImages ? imagesAll : imagesToShow)[lightbox.index]?.src}
                    alt={(showAllImages ? imagesAll : imagesToShow)[lightbox.index]?.alt || ""}
                  />
                  <button className="lightbox-close" type="button" onClick={closeLightbox} aria-label="Close">×</button>
                </div>
              </div>
            )}
          </section>


          <hr className="big-divider" />

          {/* OTHER (mock) */}
          <section className="other-sec">
            <div className="other-head">
              <h3 className="other-title">OTHER</h3>
              <div className="other-sub">Artists in <b>{groupGenres[0] || "Pop"}</b></div>
            </div>

            <div className="other-strip" role="list">
              {Array.from({ length: 8 }).map((_, i) => (
                <a key={`mock-${i}`} href="#" className="other-card" role="listitem" onClick={(e)=>e.preventDefault()}>
                  <div className="other-thumb">
                    <img src="/img/fallback.jpg" alt="artist" loading="lazy" onError={(e)=>e.currentTarget.src="/img/fallback.jpg"} />
                  </div>
                  <div className="other-name">{(groupGenres[0] || "Pop") + " Artist " + (i+1)}</div>
                </a>
              ))}
            </div>
          </section>
        </section>
      </>
    )}
  </div>
  );
}
