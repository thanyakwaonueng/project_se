// src/pages/artist.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../css/Artist.css";
import "../css/Artist_profile.css";

/** ---------- LocalStorage follow (client-side) ---------- */
const FOLLOW_KEY = "artist.follow.v1";
const loadFollowed = () => {
  try { return JSON.parse(localStorage.getItem(FOLLOW_KEY)) || {}; } catch { return {}; }
};
const saveFollowed = (obj) => { try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(obj)); } catch {} };

/** ---------- Utils ---------- */
const dtfEvent = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

/** ---------- Social icon (เล็กๆ) ---------- */
function SocialIcon({ href, img, label }) {
  if (!href) return null;
  return (
    <a
      className="a-social-btn"
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
  const [likingIds, setLikingIds] = useState(new Set());

  const lastFocusRef = useRef(null);
  const { id } = useParams();               // ✅ ใช้เฉพาะ id
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
      if (activeFilter === "new") return Number(g.stats?.debut || 0) >= 2023;
      return true;
    });
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((g) => {
      const inGroup =
        g.name?.toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q) ||
        (g.details || "").toLowerCase().includes(q);
      const inMembers = (g.artists || []).some(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          (a.koreanName || "").toLowerCase().includes(q) ||
          (a.position || "").toLowerCase().includes(q)
      );
      return inGroup || inMembers;
    });
  }, [groups, activeFilter, searchQuery]);

  /** schedule */
  const now = new Date();
  const scheduleUpcoming = useMemo(() => {
    const arr = (selectedGroup?.schedule || []).filter(
      (ev) => new Date(ev.dateISO) >= now
    );
    return arr.sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
  }, [selectedGroup, now]);

  const schedulePast = useMemo(() => {
    const arr = (selectedGroup?.schedule || []).filter(
      (ev) => new Date(ev.dateISO) < now
    );
    return arr.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  }, [selectedGroup, now]);

  /** like/unlike (DB-based) */
  const toggleLike = async (group) => {
    if (!group?.id) return;
    if (likingIds.has(group.id)) return;
    setLikingIds((s) => new Set(s).add(group.id));
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
        console.error("toggleLike error:", err);
      }
    } finally {
      setLikingIds((s) => { const next = new Set(s); next.delete(group.id); return next; });
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

  if (loadingGroups) {
    return <div className="artist-container a-bleed" style={{padding:16}}>Loading…</div>;
  }
  if (groupsError) {
    return <div className="artist-container a-bleed" style={{padding:16}}>Failed to load artists.</div>;
  }

  return (
    <div className="artist-container a-bleed">
      {/* ====== รายการวงทั้งหมด ====== */}
      {!selectedGroup ? (
        <>
          <div className="container-heading">
            <h1 className="artist-heading">MELODY & MEMORIES</h1>
          </div>
          <h6 className="artist-heading-detail">Music is the language of emotions when words are not enough.</h6>

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

          {/* Grid */}
          <div className="group-grid">
            {pageItems.map(group => (
              <div key={group.id} className="group-card-wrap" ref={lastFocusRef}>
                <button
                  className={`like-button ${group.likedByMe ? "liked" : ""}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleLike(group); }}
                  aria-label={group.likedByMe ? "Unlike" : "Like"}
                  disabled={likingIds.has(group.id)}
                />
                <Link
                  to={`/artists/${group.id}`}       // ✅ id-only
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

          <div className="a-line-artist"></div>

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
        /* ====== รายละเอียดวง ====== */
        <div className="group-detail-view a-fullwide">
          <div className="a-hero-grid">
            <div className="a-hero-photo a-hero-emph a-shadow-sm">
              <img src={selectedGroup.image} alt={selectedGroup.name} onError={(e) => (e.currentTarget.src = "/img/fallback.jpg")} />
            </div>
            <div className="a-hero-name">{selectedGroup.name || "Artist"}</div>
            <div className="a-hero-detail">{selectedGroup.details || selectedGroup.description || "No description."}</div>

            <div className="a-hero-photo-meta">
              <div className="a-hero-photo-caption">
                <span className="caption-text">LISTEN ON</span>
                <div className="a-listen-icons">
                  <SocialIcon href={selectedGroup?.socials?.spotify} img="/img/spotify.png" label="Spotify" />
                  <SocialIcon href={selectedGroup?.socials?.youtube} img="/img/youtube.png" label="YouTube" />
                  <span className="a-social-btn" aria-hidden="true" title="Sound">
                    <img src="/img/wave-sound.png" alt="Sound" />
                  </span>
                </div>
              </div>

              <div className="a-hero-photo-line"></div>

              <div className="a-hero-photo-date">
                <span className="date-label">Date</span>
                <span className="date-value">{dtfEvent.format(new Date())}</span>
              </div>

              <div className="a-hero-photo-eta">
                <span className="eta-label">ETA</span>
                <a
                  className="a-social-btn eta-btn"
                  href={selectedGroup?.etaPdfUrl || `/pdf/artist-${selectedGroup?.id}.pdf`}  // ✅ fallback เป็น id
                  download
                  title="Download ETA PDF"
                  aria-label="Download ETA PDF"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src="/img/download.png" alt="PDF" />
                </a>
              </div>

              <div className="a-hero-photo-share">
                <span className="share-label">Share</span>
                <div className="share-icons">
                  <SocialIcon href={selectedGroup?.socials?.instagram} img="/img/instagram.png" label="Instagram" />
                  <SocialIcon href={selectedGroup?.socials?.twitter} img="/img/twitter.png" label="Twitter / X" />
                  <SocialIcon href={selectedGroup?.socials?.facebook} img="/img/facebook.png" label="Facebook" />
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <section className="a-section">
            <h2 className="a-section-title">Schedule</h2>
            <div className="a-panel">
              <div className="a-tabbar" role="tablist" aria-label="Schedule tabs">
                <button role="tab" aria-selected={scheduleTab === "upcoming"} className={`a-tab ${scheduleTab === "upcoming" ? "is-active" : ""}`} onClick={() => setScheduleTab("upcoming")}>Upcoming</button>
                <button role="tab" aria-selected={scheduleTab === "past"} className={`a-tab ${scheduleTab === "past" ? "is-active" : ""}`} onClick={() => setScheduleTab("past")}>Past</button>
              </div>

              <ul className="a-schedule-list">
                {(scheduleTab === "upcoming" ? scheduleUpcoming : schedulePast).map((ev) => (
                  <li key={ev.id} className="a-schedule-item">
                    <div className="a-date">{dtfEvent.format(new Date(ev.dateISO))}</div>
                    <div className="a-event">
                      <div className="a-event-title">{ev.title}</div>
                      <div className="a-event-sub">{ev.venue} • {ev.city}</div>
                    </div>
                    {(ev.id || ev.url || ev.ticketUrl) &&
                      (ev.id ? (
                        <Link className="a-link" to={`/events/${ev.id}`}>Detail</Link>
                      ) : ev.url ? (
                        <a className="a-link" href={ev.url} target="_blank" rel="noreferrer">Detail</a>
                      ) : (
                        <a className="a-link" href={ev.ticketUrl} target="_blank" rel="noreferrer">Detail</a>
                      ))}
                  </li>
                ))}
                {scheduleTab === "upcoming" && scheduleUpcoming.length === 0 && <li className="a-empty">No upcoming events</li>}
                {scheduleTab === "past" && schedulePast.length === 0 && <li className="a-empty">No past events</li>}
              </ul>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}