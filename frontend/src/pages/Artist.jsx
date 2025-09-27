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
  const { id } = useParams();  // ใช้ id อย่างเดียว
  const navigate = useNavigate();

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

  /** filters & search */
  const filteredGroups = useMemo(() => {
    const base = groups.filter((g) => {
      if (activeFilter === "popular") return (g.followersCount || 0) >= 100000;
      if (activeFilter === "new") return Number(g?.stats?.debut || 0) >= 2023;
      return true;
    });
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((g) => {
      const inGroup =
        g.name?.toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q) ||
        (g.details || "").toLowerCase().includes(q);
      return inGroup;
    });
  }, [groups, activeFilter, searchQuery]);

  /** follow/unfollow (DB-based; backend ใช้ endpoint like เดิม) */
  const toggleFollow = async (group) => {
    if (!group?.id) return;
    if (followingIds.has(group.id)) return;
    setFollowingIds((s) => new Set(s).add(group.id));
    try {
      if (group.likedByMe) {
        // UNFOLLOW
        const { data } = await axios.delete(`/api/artists/${group.id}/like`, { withCredentials: true });
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id
              ? { ...g, likedByMe: false, followersCount: data?.count ?? Math.max(0, (g.followersCount || 0) - 1) }
              : g
          )
        );
      } else {
        // FOLLOW
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

  // genres: กลุ่มเดิมไม่มี `genres[]` ให้แตกมาจาก `details` ถ้ามี
  const groupGenres = useMemo(() => {
    if (!selectedGroup) return [];
    if (Array.isArray(selectedGroup.genres) && selectedGroup.genres.length) return selectedGroup.genres;
    const d = (selectedGroup.details || "").trim();
    if (!d) return [];
    return d.split(/[\/,|•]+/).map(s => s.trim()).filter(Boolean);
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
  }, [selectedGroup]); // ห้ามใส่ now ใน deps

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
              <div className="group-card-likes" style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
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
              <p className="desc">{selectedGroup?.details || selectedGroup?.description || "No description."}</p>

              {/* ปุ่ม EPK => ใช้ techRider.downloadUrl ถ้ามี */}
              {selectedGroup?.techRider?.downloadUrl && (
                <a
                  className="epk-pill"
                  href={selectedGroup.techRider.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open EPK"
                >
                  <span>EPK</span>
                  <span className="epk-dot" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </a>
              )}
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

          {/* ===== LISTEN ON (ใช้ socials.* ที่เป็นบริการสตรีม) ===== */}
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

          {/* ===== SCHEDULE ===== */}
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

          <hr className="big-divider" />

          {/* ===== OTHER: mock ไว้ก่อน (ไม่พึ่ง API) ===== */}
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
