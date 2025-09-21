import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../css/Artist.css";
import "../css/Artist_profile.css";

/** ---------- LocalStorage: สถานะการติดตาม ---------- */
const FOLLOW_KEY = "artist.follow.v1";
const loadFollowed = () => {
  try {
    return JSON.parse(localStorage.getItem(FOLLOW_KEY)) || {};
  } catch {
    return {};
  }
};
const saveFollowed = (obj) => {
  try {
    localStorage.setItem(FOLLOW_KEY, JSON.stringify(obj));
  } catch {}
};

/** ---------- Utilities ---------- */
const formatCompact = (n) =>
  Intl.NumberFormat(undefined, { notation: "compact" }).format(n);

const dtfEvent = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function Artist() {
  /** ---------- Fetch groups from API ---------- */
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState(null);

  // รายการวง (All/Popular/New + Search)
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // รายละเอียดวง + โมดัล
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);

  // Local follow (client-side) — แยกจาก like ใน DB
  const [followed, setFollowed] = useState(loadFollowed());

  // กันกด like ซ้ำระหว่างยิง API
  const [likingIds, setLikingIds] = useState(new Set());

  // จุดกำเนิดแอนิเมชันโมดัล + โฟกัสย้อนกลับ
  const [popOrigin, setPopOrigin] = useState({ x: "50%", y: "50%" });
  const lastFocusRef = useRef(null);

  // Schedule tabs
  const [scheduleTab, setScheduleTab] = useState("upcoming");

  const { slug } = useParams();
  const navigate = useNavigate();

  // fetched on mount for populating groups
  useEffect(() => {
    let cancelled = false;

    const fetchGroups = async () => {
      setLoadingGroups(true);
      setGroupsError(null);
      try {
        const res = await axios.get("/api/groups", { withCredentials: true });
        if (!cancelled) {
          setGroups(Array.isArray(res.data) ? res.data : []);
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
    return () => {
      cancelled = true;
    };
  }, []);

  // เปิดวงตาม /page_artists/:slug
  useEffect(() => {
    if (!slug) {
      setSelectedGroup(null);
      return;
    }
    const found = groups.find((g) => g.slug === slug);
    setSelectedGroup(found || null);
  }, [slug, groups]);

  // เมื่อ groups เปลี่ยน (เช่นหลัง like/unlike) อัปเดต selectedGroup ให้เป็นเวอร์ชันล่าสุด
  useEffect(() => {
    if (!selectedGroup) return;
    const updated = groups.find((g) => g.id === selectedGroup.id);
    if (updated) setSelectedGroup(updated);
  }, [groups, selectedGroup]);

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

  // เซฟ follow ลง localStorage ทุกครั้งที่เปลี่ยน
  useEffect(() => {
    saveFollowed(followed);
  }, [followed]);

  // กรองรายการวง + ค้นหา
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

  // สร้าง Upcoming / Past list
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

  const toggleFollow = (groupId) =>
    setFollowed((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

  /** ========================== LIKE / UNLIKE (เชื่อม DB) ========================== */
  const toggleLike = async (group) => {
    if (!group?.id) return;
    if (likingIds.has(group.id)) return; // กันคลิกรัว ๆ
    setLikingIds((s) => new Set(s).add(group.id));

    try {
      if (group.likedByMe) {
        // UNLIKE
        const { data } = await axios.delete(`/api/artists/${group.id}/like`, {
          withCredentials: true,
        });
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id
              ? {
                  ...g,
                  likedByMe: false,
                  followersCount:
                    data?.count ?? Math.max(0, (g.followersCount || 0) - 1),
                }
              : g
          )
        );
      } else {
        // LIKE
        const { data } = await axios.post(
          `/api/artists/${group.id}/like`,
          {},
          { withCredentials: true }
        );
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id
              ? {
                  ...g,
                  likedByMe: true,
                  followersCount: data?.count ?? (g.followersCount || 0) + 1,
                }
              : g
          )
        );
      }
    } catch (err) {
      console.error("toggleLike error:", err);
      // TODO: แจ้งเตือนให้ล็อกอินถ้า 401/403
    } finally {
      setLikingIds((s) => {
        const next = new Set(s);
        next.delete(group.id);
        return next;
      });
    }
  };

  /* ---------- Social icon helper ---------- */
  const SocialIcon = ({ href, img, label, alt }) => {
    const hasUrl = typeof href === "string" && href.trim().length > 0;
    if (hasUrl) {
      return (
        <a
          className="a-social-btn"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
        >
          <img src={img} alt={alt || label} />
        </a>
      );
    }
    return (
      <span
        className="a-social-btn is-disabled"
        aria-disabled="true"
        title={`${label} not provided`}
      >
        <img src={img} alt={alt || label} />
      </span>
    );
  };

  /* ====================== RENDER ====================== */
  if (loadingGroups) {
    return (
      <div className="artist-container a-bleed">
        <div className="a-panel a-skeleton">Loading artists…</div>
      </div>
    );
  }

  if (groupsError) {
    return (
      <div className="artist-container a-bleed">
        <div className="a-panel a-error">
          เกิดข้อผิดพลาดในการดึงรายชื่อศิลปิน
          <br />
          <small>{String(groupsError?.message || groupsError)}</small>
        </div>
      </div>
    );
  }

  return (
    <div className="artist-container a-bleed">
      {/* ====== รายการวงทั้งหมด ====== */}
      {!selectedGroup ? (
        <>
          <h1 className="artist-heading">MELODY &amp; MEMORIES</h1>

          <h6 className="artist-heading-detail">
            Music is the language of emotions when words are not enough.
          </h6>

          {/* Filter + Search */}
          <div className="seamless-filter-search a-card-min">
            <div
              className="connected-filter-tabs"
              role="tablist"
              aria-label="artist filters"
            >
              <button
                className={`connected-filter-tab ${
                  activeFilter === "all" ? "active" : ""
                }`}
                onClick={(e) => {
                  setActiveFilter("all");
                  lastFocusRef.current = e.currentTarget;
                }}
              >
                All
              </button>
              <button
                className={`connected-filter-tab ${
                  activeFilter === "popular" ? "active" : ""
                }`}
                onClick={(e) => {
                  setActiveFilter("popular");
                  lastFocusRef.current = e.currentTarget;
                }}
              >
                Popular
              </button>
              <button
                className={`connected-filter-tab ${
                  activeFilter === "new" ? "active" : ""
                }`}
                onClick={(e) => {
                  setActiveFilter("new");
                  lastFocusRef.current = e.currentTarget;
                }}
              >
                New
              </button>
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
                  <path
                    d="M11 19c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="m21 21-4.35-4.35"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Grid รายการวง */}
          <div className="group-grid">
            {filteredGroups.map((group) => (
              <div key={group.id} className="group-card-wrap">
                {/* ปุ่มหัวใจ */}
                <button
                  className={`like-button ${group.likedByMe ? "liked" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleLike(group);
                  }}
                  aria-pressed={!!group.likedByMe}
                  aria-label={group.likedByMe ? "Unlike" : "Like"}
                  disabled={likingIds.has(group.id)}
                  title={
                    likingIds.has(group.id)
                      ? "Processing…"
                      : group.likedByMe
                      ? "Unlike"
                      : "Like"
                  }
                />

                <Link
                  to={`/page_artists/${group.slug}`}
                  className="group-card a-card-min"
                  onClick={() => {
                    setSelectedGroup(group);
                  }}
                >
                  <div className="group-card-image">
                    <img
                      src={group.image}
                      alt={group.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/img/fallback.jpg";
                      }}
                    />
                  </div>
                </Link>

                <div className="group-card-caption">
                  <h3>{group.name}</h3>
                  {/* ตัวอย่าง KPI แสดง Followers (รวม follow แบบ local) */}
                  {typeof group.followersCount === "number" && (
                    <div className="a-kpi-mini">
                      {formatCompact(
                        group.followersCount + (followed[group.id] ? 1 : 0)
                      )}{" "}
                      followers
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ====== รายละเอียดวง (เลย์เอาต์ 3 คอลัมน์) ====== */
        <div className="group-detail-view a-fullwide">
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

            {/* กลาง: ชื่อ Artist */}
            <div className="a-hero-name">{selectedGroup.name || "Artist"}</div>

            {/* รายละเอียด */}
            <div className="a-hero-detail">
              {selectedGroup.details ||
                selectedGroup.description ||
                "No description."}
            </div>

            {/* กลุ่ม META ใต้รูป */}
            <div className="a-hero-photo-meta">
              {/* LISTEN ON */}
              <div className="a-hero-photo-caption">
                <span className="caption-text">LISTEN ON</span>
                <div className="a-listen-icons">
                  <SocialIcon
                    href={selectedGroup?.socials?.spotify}
                    img="/img/spotify.png"
                    label="Spotify"
                  />
                  <SocialIcon
                    href={selectedGroup?.socials?.youtube}
                    img="/img/youtube.png"
                    label="YouTube"
                  />
                  {/* ไอคอนเสียง (ตกแต่ง) */}
                  <span className="a-social-btn" aria-hidden="true" title="Sound">
                    <img src="/img/wave-sound.png" alt="Sound" />
                  </span>
                </div>
              </div>

              {/* เส้นคั่น */}
              <div className="a-hero-photo-line"></div>

              {/* Date */}
              <div className="a-hero-photo-date">
                <span className="date-label">Date</span>
                <span className="date-value">{dtfEvent.format(new Date())}</span>
              </div>

              {/* ETA / PDF */}
              <div className="a-hero-photo-eta">
                <span className="eta-label">ETA</span>
                <a
                  className="a-social-btn eta-btn"
                  href={
                    selectedGroup?.etaPdfUrl ||
                    `/pdf/${selectedGroup?.slug || "artist"}.pdf`
                  }
                  download
                  title="Download ETA PDF"
                  aria-label="Download ETA PDF"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src="/img/download.png" alt="PDF" />
                </a>
              </div>

              {/* Share */}
              <div className="a-hero-photo-share">
                <span className="share-label">Share</span>
                <div className="share-icons">
                  <SocialIcon
                    href={selectedGroup?.socials?.instagram}
                    img="/img/instagram.png"
                    label="Instagram"
                  />
                  <SocialIcon
                    href={selectedGroup?.socials?.twitter}
                    img="/img/twitter.png"
                    label="Twitter / X"
                  />
                  <SocialIcon
                    href={selectedGroup?.socials?.facebook}
                    img="/img/facebook.png"
                    label="Facebook"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ===== Schedule (Tabs) ===== */}
          <section className="a-section">
            <h2 className="a-section-title">Schedule</h2>

            <div className="a-panel">
              <div className="a-tabbar" role="tablist" aria-label="Schedule tabs">
                <button
                  role="tab"
                  aria-selected={scheduleTab === "upcoming"}
                  className={`a-tab ${
                    scheduleTab === "upcoming" ? "is-active" : ""
                  }`}
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
                {(scheduleTab === "upcoming" ? scheduleUpcoming : schedulePast).map(
                  (ev) => (
                    <li key={ev.id} className="a-schedule-item">
                      <div className="a-date">
                        {dtfEvent.format(new Date(ev.dateISO))}
                      </div>
                      <div className="a-event">
                        <div className="a-event-title">{ev.title}</div>
                        <div className="a-event-sub">
                          {ev.venue} • {ev.city}
                        </div>
                      </div>
                      {(ev.id || ev.url || ev.ticketUrl) &&
                        (ev.id ? (
                          <Link className="a-link" to={`/page_events/${ev.id}`}>
                            Detail
                          </Link>
                        ) : ev.url ? (
                          <a
                            className="a-link"
                            href={ev.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Detail
                          </a>
                        ) : (
                          <a
                            className="a-link"
                            href={ev.ticketUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Detail
                          </a>
                        ))}
                    </li>
                  )
                )}
                {scheduleTab === "upcoming" && scheduleUpcoming.length === 0 && (
                  <li className="a-empty">No upcoming events</li>
                )}
                {scheduleTab === "past" && schedulePast.length === 0 && (
                  <li className="a-empty">No past events</li>
                )}
              </ul>
            </div>
          </section>
        </div>
      )}

      {/* ===== โมดัลสมาชิก (ตอนนี้ปิดไว้ ถ้าจะใช้ให้เอาคอมเมนต์ออก) ===== */}
      {/* {selectedArtist && (...)} */}
    </div>
  );
}
