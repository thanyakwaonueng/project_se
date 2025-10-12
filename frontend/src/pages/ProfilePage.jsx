// src/pages/ProfilePage.jsx
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../css/Profile.css";
import { useAuth } from "../lib/auth";

export default function ProfilePage() {
  const { user: me, loading: authLoading, error: authError } = useAuth();
  const [err, setErr] = useState("");

  const [tab, setTab] = useState("artists");

  // Following: artists/events
  const [allGroups, setAllGroups] = useState([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [mutatingArtistIds, setMutatingArtistIds] = useState(new Set());
  const [allEvents, setAllEvents] = useState([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [mutatingEventIds, setMutatingEventIds] = useState(new Set());

  // Artist schedule
  const [aePending, setAePending] = useState([]);
  const [aeAccepted, setAeAccepted] = useState([]);
  const [artistScheduleLoaded, setArtistScheduleLoaded] = useState(false);
  // const [aeDeclined, setAeDeclined] = useState([]);

  // Organizer schedule (raw /myevents)
  const [orgEvents, setOrgEvents] = useState([]);
  const [orgScheduleLoaded, setOrgScheduleLoaded] = useState(false);

  // paging (following artists)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    setAllGroups([]);
    setGroupsLoaded(false);
    setAllEvents([]);
    setEventsLoaded(false);
    setAePending([]);
    setAeAccepted([]);
    setArtistScheduleLoaded(false);
    setOrgEvents([]);
    setOrgScheduleLoaded(false);
    setPage(1);
  }, [me?.id]);

  useEffect(() => {
    if (authError) setErr(authError);
  }, [authError]);

  /* ===== groups (artists) ===== */
  useEffect(() => {
    if (!me || tab !== "artists" || groupsLoaded) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get("/api/groups?take=200", { withCredentials: true });
        if (!alive) return;
        setAllGroups(Array.isArray(data) ? data : []);
        setGroupsLoaded(true);
      } catch (e) {
        console.error("GET /api/groups error:", e);
        if (alive) setGroupsLoaded(true);
        if (alive) setErr("โหลดรายชื่อศิลปินไม่สำเร็จ");
      }
    })();
    return () => { alive = false; };
  }, [me, tab, groupsLoaded]);

  /* ===== events (following) ===== */
  useEffect(() => {
    if (!me || tab !== "events" || eventsLoaded) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get("/api/events", { withCredentials: true });
        if (!alive) return;
        setAllEvents(Array.isArray(data) ? data : []);
        setEventsLoaded(true);
      } catch (e) {
        console.error("GET /api/events error:", e);
        if (alive) setEventsLoaded(true);
        if (alive) setErr("โหลดอีเวนต์ไม่สำเร็จ");
      }
    })();
    return () => { alive = false; };
  }, [me, tab, eventsLoaded]);

  const u = me || {};
  const performer  = u.performerInfo || null;
  const artistInfo = performer?.artistInfo || null;
  const venue      = performer?.venueInfo  || null;
  const hasVenue = !!(venue && (venue.name?.trim() || venue.description?.trim() || venue.genre || (Array.isArray(venue.events) && venue.events.length > 0)));

  const displayName = u.name || (me?.email ? me.email.split("@")[0] : "User");
  const avatar = u.profilePhotoUrl || "/img/default-avatar.png";
  const favGenres = (u.favoriteGenres || []).slice(0, 5).join(" • ");
  const myId = me?.id;

  const isArtistApproved = me?.role === "ARTIST";
  const isOrganizer = me?.role === "ORGANIZE"; // ✅ ตรง backend
  const canManageVenue = me?.role === "ORGANIZE" || me?.role === "ADMIN";

  /* ===== Artist schedule load ===== */
  useEffect(() => {
    if (!isArtistApproved || !myId || artistScheduleLoaded) return;
    let alive = true;
    (async () => {
      try {
        const [p, a/*, d*/] = await Promise.all([
          axios.get(`/api/artist-events/pending/${myId}`,  { withCredentials: true }),
          axios.get(`/api/artist-events/accepted/${myId}`, { withCredentials: true }),
          // axios.get(`/api/artist-events/declined/${myId}`, { withCredentials: true }),
        ]);
        if (!alive) return;
        setAePending(Array.isArray(p.data) ? p.data : []);
        setAeAccepted(Array.isArray(a.data) ? a.data : []);
        setArtistScheduleLoaded(true);
        // setAeDeclined(Array.isArray(d.data) ? d.data : []);
      } catch (e) {
        console.error("Load my artist schedule error:", e);
        if (alive) setErr("โหลดตารางศิลปินไม่สำเร็จ");
        if (alive) setArtistScheduleLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [isArtistApproved, myId, artistScheduleLoaded]);

  /* ===== Organizer schedule load (/myevents) ===== */
  useEffect(() => {
    if (!isOrganizer || orgScheduleLoaded) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get("/api/myevents", { withCredentials: true });
        if (!alive) return;
        setOrgEvents(Array.isArray(data) ? data : []);
        setOrgScheduleLoaded(true);
      } catch (e) {
        console.error("GET /api/myevents error:", e);
        if (alive) setErr("โหลดตารางผู้จัดไม่สำเร็จ");
        if (alive) setOrgScheduleLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [isOrganizer, orgScheduleLoaded]);

  /* ===== following artists/events ===== */
  const myFollowersCount = useMemo(() => {
    if (!isArtistApproved) return 0;
    const rows = performer?.likedBy;
    return Array.isArray(rows) ? rows.length : 0;
  }, [isArtistApproved, performer?.likedBy]);

  const followingArtists = useMemo(
    () => (allGroups || []).filter((g) => g.likedByMe),
    [allGroups]
  );
  const artistsCount = followingArtists.length;

  const totalPages = Math.max(1, Math.ceil(artistsCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = followingArtists.slice(start, start + PAGE_SIZE);
  useEffect(() => { setPage(1); }, [artistsCount]);

  async function followArtist(artistId) {
    if (!artistId || mutatingArtistIds.has(artistId)) return;
    setMutatingArtistIds((prev) => new Set(prev).add(artistId));
    try {
      await axios.post(`/api/artists/${artistId}/like`, {}, { withCredentials: true });
      setAllGroups((prev) =>
        prev.map((g) =>
          g.id === artistId ? { ...g, likedByMe: true, followersCount: (g.followersCount || 0) + 1 } : g
        )
      );
    } catch (e) {
      console.error("followArtist error:", e);
    } finally {
      setMutatingArtistIds((prev) => { const n = new Set(prev); n.delete(artistId); return n; });
    }
  }
  async function unfollowArtist(artistId) {
    if (!artistId || mutatingArtistIds.has(artistId)) return;
    setMutatingArtistIds((prev) => new Set(prev).add(artistId));
    try {
      await axios.delete(`/api/artists/${artistId}/like`, { withCredentials: true });
      setAllGroups((prev) =>
        prev.map((g) =>
          g.id === artistId ? { ...g, likedByMe: false, followersCount: Math.max(0, (g.followersCount || 0) - 1) } : g
        )
      );
    } catch (e) {
      console.error("unfollowArtist error:", e);
    } finally {
      setMutatingArtistIds((prev) => { const n = new Set(prev); n.delete(artistId); return n; });
    }
  }

  const followingEvents = useMemo(
    () => (allEvents || []).filter((ev) => ev.likedByMe),
    [allEvents]
  );

  async function followEvent(eventId) {
    if (!eventId || mutatingEventIds.has(eventId)) return;
    setMutatingEventIds((prev) => new Set(prev).add(eventId));
    try {
      await axios.post(`/api/events/${eventId}/like`, {}, { withCredentials: true });
      setAllEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, likedByMe: true, followersCount: (e.followersCount || 0) + 1 } : e))
      );
    } catch (e) {
      console.error("followEvent error:", e);
    } finally {
      setMutatingEventIds((prev) => { const n = new Set(prev); n.delete(eventId); return n; });
    }
  }
  async function unfollowEvent(eventId) {
    if (!eventId || mutatingEventIds.has(eventId)) return;
    setMutatingEventIds((prev) => new Set(prev).add(eventId));
    try {
      await axios.delete(`/api/events/${eventId}/like`, { withCredentials: true });
      setAllEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, likedByMe: false, followersCount: Math.max(0, (e.followersCount || 0) - 1) } : e
        )
      );
    } catch (e) {
      console.error("unfollowEvent error:", e);
    } finally {
      setMutatingEventIds((prev) => { const n = new Set(prev); n.delete(eventId); return n; });
    }
  }

  /* ===== Organizer datasets mapping — Published/Draft ===== */
  const oeAccepted = useMemo(() => {
    return (orgEvents || [])
      .filter(e => e?.date)
      .filter(e => e.isPublished)
      .map(e => ({
        id: e.id,
        status: "ACCEPTED", // map to "Published" in labelMap
        event: { id: e.id, name: e.name, date: e.date },
        posterUrl: e.posterUrl || e.coverImage || e.bannerUrl || null, // ✅ keep poster for CalendarSection
        slotStartAt: null,
        slotEndAt: null,
        slotStage: null,
      }));
  }, [orgEvents]);

  const oePending = useMemo(() => {
    return (orgEvents || [])
      .filter(e => e?.date)
      .filter(e => !e.isPublished)
      .map(e => ({
        id: e.id,
        status: "PENDING", // map to "Draft" in labelMap
        event: { id: e.id, name: e.name, date: e.date },
        posterUrl: e.posterUrl || e.coverImage || e.bannerUrl || null, // ✅ keep poster for CalendarSection
        slotStartAt: null,
        slotEndAt: null,
        slotStage: null,
      }));
  }, [orgEvents]);

  // const oeDeclined = useMemo(() => [], []); // ไม่มีข้อมูลยกเลิกจาก /myevents ตอนนี้

  /* ===== helpers (not hooks) ===== */
  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }
  const fmtTimeHM = (d) => d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  /* ===== early returns AFTER all hooks declared ===== */
  if (authLoading) return <div className="stack">Loading…</div>;
  if (err) return <div className="stack alert alert-danger">{err}</div>;
  if (!me) return <div className="stack">กรุณาล็อกอินเพื่อดูโปรไฟล์</div>;

  return (
    <div className="profile-page-wrap">
      <div className="stack">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-cover-wrap">
            <img
              className="profile-cover"
              src={avatar || "/img/default-avatar.png"}
              alt="Profile cover"
              onError={(e) => { e.currentTarget.src = "/img/default-avatar.png"; }}
            />
          </div>

          <div className="profile-avatar-wrap">
            <img
              className="profile-avatar"
              src={avatar || "/img/default-avatar.png"}
              alt={displayName}
              onError={(e) => { e.currentTarget.src = "/img/default-avatar.png"; }}
            />
          </div>

          <div className="profile-head">
            <div className="profile-name">
              {displayName}
              {isArtistApproved && <span className="badge-verified" title="Verified artist">✔</span>}
            </div>
            <div className="profile-email">{me.email}</div>
          </div>

          <hr className="profile-sep" />

          <div className="info-grid">
            <InfoRow label="Role" value={me.role} />
            {favGenres && <InfoRow label="Fav genres" value={favGenres} />}
            {u.birthday && <InfoRow label="Birthday" value={fmtDate(u.birthday, "en-GB")} />}

            {isArtistApproved && artistInfo && (
              <>
                <InfoRow
                  label="Followers"
                  value={`${Number(myFollowersCount || 0).toLocaleString()} followers`}
                />
                <InfoRow
                  label="Type"
                  value={
                    <>
                      {artistInfo.genre && <span className="chip-normal">{artistInfo.genre}</span>}
                      <span className="chip-transparent">{artistInfo.bookingType}</span>
                    </>
                  }
                />
              </>
            )}

            {venue && (
              <InfoRow
                label="Type"
                value={
                  <>
                    {venue.genre && <span className="chip-normal">{venue.genre}</span>}
                    <span className="chip-transparent">{venue.alcoholPolicy}</span>
                  </>
                }
              />
            )}
          </div>

          <div className="profile-actions">
            <Link to="/accountsetup?edit=1" className="btn-editprofile">Edit profile</Link>
            {isArtistApproved && artistInfo && (
              <Link to={`/artists/${myId}`} className="btn-ghost">View public artist</Link>
            )}
            {canManageVenue && (
              <Link
                to={hasVenue && venue?.performerId ? `/venues/${venue.performerId}` : "/venue/edit"}
                className="btn-ghost"
              >
                Manage venue
              </Link>
            )}
          </div>
        </div>

        {/* Calendar: Artist */}
        {isArtistApproved && (
          <CalendarSection
            title="My Schedule"
            datasets={[
              { rows: aeAccepted, status: "accepted" },
              { rows: aePending,  status: "pending"  },
              // { rows: aeDeclined, status: "declined" },
            ]}
            fmtDate={fmtDate}
            fmtTimeHM={fmtTimeHM}
          />
        )}

        {/* Calendar: Organizer (Published/Draft) */}
        {isOrganizer && (
          <CalendarSection
            title="My Schedule"
            datasets={[
              { rows: oeAccepted, status: "accepted" }, // published
              { rows: oePending,  status: "pending"  }, // draft
              // { rows: oeDeclined, status: "declined" },
            ]}
            fmtDate={fmtDate}
            fmtTimeHM={fmtTimeHM}
            labelMap={{ accepted: "Published", pending: "Pending" }}
          />
        )}

        {/* Following Content */}
        <div className="following-card">
          <div className="following-head">
            <div className="following-title">Following</div>
            <div className="tabs" role="tablist" aria-label="following tabs">
              <button
                className={`tab-btn ${tab === "artists" ? "active" : ""}`}
                onClick={() => setTab("artists")}
                role="tab"
                aria-selected={tab === "artists"}
              >
                Artists {artistsCount ? `(${artistsCount})` : ""}
              </button>
              <button
                className={`tab-btn ${tab === "events" ? "active" : ""}`}
                onClick={() => setTab("events")}
                role="tab"
                aria-selected={tab === "events"}
              >
                Events {followingEvents.length ? `(${followingEvents.length})` : ""}
              </button>
            </div>
          </div>

          <div className="following-body">
            {tab === "artists" ? (
              !groupsLoaded ? (
                <div className="pf-loading">Loading followed artists…</div>
              ) : artistsCount ? (
                <div className="pf-list">
                  {pageItems.map((a) => (
                    <div key={a.id} className="pf-card">
                      <img
                        className="pf-thumb"
                        src={a.image}
                        alt={a.name}
                        onError={(e) => { e.currentTarget.src = "/img/fallback.jpg"; }}
                      />
                      <div className="pf-main">
                        <div className="pf-name"><Link to={`/artists/${a.id}`}>{a.name}</Link></div>
                        <div className="pf-sub">
                          <span>{a.details || a.description || "—"}</span>
                          <span className="pf-separator">{Number(a.followersCount || 0).toLocaleString()} followers</span>
                        </div>
                      </div>
                      <div className="pf-actions">
                        <button
                          className={`btn-follow ${a.likedByMe ? "is-following" : ""}`}
                          onClick={() => (a.likedByMe ? unfollowArtist(a.id) : followArtist(a.id))}
                          disabled={mutatingArtistIds.has(a.id)}
                          title={a.likedByMe ? "Following" : "Follow"}
                        >
                          {a.likedByMe ? "Unfollow" : "Follow"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">You haven’t followed any artists</div>
              )
            ) : followingEvents.length ? (
              <div className="pf-list">
                {followingEvents.map((ev) => (
                  <div key={ev.id} className="pf-card">
                    <img
                      className="pf-thumb"
                      src={ev.posterUrl || ev.coverImage || ev.bannerUrl || "/img/fallback.jpg"}
                      alt={ev.name || ev.title}
                      onError={(e) => { e.currentTarget.src = "/img/fallback.jpg"; }}
                    />
                    <div className="pf-main">
                      <div className="pf-name">
                        <Link to={`/events/${ev.id}`}>{ev.name || ev.title || `Event #${ev.id}`}</Link>
                      </div>
                      <div className="pf-sub">
                        <span>{fmtDate(ev.date, "en-GB")}</span>
                        {ev.venue?.name && <span className="pf-separator">{ev.venue.name}</span>}
                        <span className="pf-separator">{Number(ev.followersCount || 0).toLocaleString()} likes</span>
                      </div>
                    </div>
                    <div className="pf-actions">
                      <button
                        className={`btn-follow ${ev.likedByMe ? "is-following" : ""}`}
                        onClick={() => (ev.likedByMe ? unfollowEvent(ev.id) : followEvent(ev.id))}
                        disabled={mutatingEventIds.has(ev.id)}
                        title={ev.likedByMe ? "Following" : "Follow"}
                      >
                        {ev.likedByMe ? "Unfollow" : "Follow"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !eventsLoaded ? (
              <div className="pf-loading">Loading followed events…</div>
            ) : (
              <div className="empty">You haven’t followed any events</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Reusable Calendar Section (รองรับ labelMap สำหรับข้อความสถานะและ legend) ===== */
function CalendarSection({ title, datasets, fmtDate, fmtTimeHM, labelMap }) {
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const onlyUpcoming = true;

  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth   = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const addMonths    = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
  const sameDay = (a, b) =>
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const fmtMonthYear = (d) => d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const calendarEvents = useMemo(() => {
    const pack = (rows, status) =>
      (rows || [])
        .filter((x) => x?.event?.date)
        .map((x) => ({
          id: x.id,
          status,
          date:  new Date(x.event.date),
          start: x.slotStartAt ? new Date(x.slotStartAt) : null,
          end:   x.slotEndAt   ? new Date(x.slotEndAt)   : null,
          stage: x.slotStage || null,
          eventId: x.event?.id,
          title: x.event?.name || `Event #${x.event?.id || "?"}`,
          // ✅ collect an image from various potential fields
          img:
            x.posterUrl ||
            x.image ||
            x.event?.posterUrl ||
            x.event?.coverImage ||
            x.event?.bannerUrl ||
            x.event?.poster ||
            null,
        }));
    const merged = [];
    for (const ds of datasets) merged.push(...pack(ds.rows, ds.status));
    return merged;
  }, [datasets]);

  const byDate = useMemo(() => {
    const m = new Map();
    for (const ev of calendarEvents) {
      const key = ev.date.toISOString().slice(0, 10);
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(ev);
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));
    }
    return m;
  }, [calendarEvents]);

  const dayNames = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const daysInThisMonth = () => {
    const s = startOfMonth(calMonth);
    const e = endOfMonth(calMonth);
    const padStart = s.getDay();
    const totalDays = e.getDate();
    const cells = [];
    for (let i = 0; i < padStart; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), d));
    }
    return cells;
  };

  // const prettyDefault = { accepted: "Accepted", pending: "Pending", declined: "Declined" };
  const prettyDefault = { accepted: "Accepted", pending: "Pending" };
  const labels = { ...prettyDefault, ...(labelMap || {}) };

  return (
    <div className="following-card">
      <div className="following-head">
        <div className="following-title">{title}</div>
        <div className="cal-nav">
          {/* Prev button */}
          <button
            type="button"
            className="nav-arrow"
            onClick={() => setCalMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" fill="none" strokeWidth="1.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 5 5 12 12 19" />
            </svg>
          </button>

          {/* Month title */}
          <div className="cal-month">{fmtMonthYear(calMonth)}</div>

          {/* Next button */}
          <button
            type="button"
            className="nav-arrow"
            onClick={() => setCalMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" fill="none" strokeWidth="1.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

      </div>

      <div className="following-subbar">
        <div className="cal-legend">
          <span className="dot dot-acc" /> {labels.accepted}
          <span className="dot dot-pen" /> {labels.pending}
          {/* <span className="dot dot-dec" /> {labels.declined} */}
        </div>
      </div>

      <div className="calendar">
        <div className="cal-row cal-header">
          {dayNames.map((d) => <div key={d} className="cal-headcell">{d}</div>)}
        </div>

        <div className="cal-grid">
          {daysInThisMonth().map((cell, idx) => {
            if (!cell) return <div key={`pad-${idx}`} className="cal-cell cal-empty" />;
            const key = cell.toISOString().slice(0, 10);

            let items = byDate.get(key) || [];
            if (onlyUpcoming) {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              items = items.filter((it) => it.date >= today);
            }

            const hasToday = sameDay(cell, new Date());
            const isSelected = selectedDate && sameDay(cell, selectedDate);

            return (
              <button
                key={key}
                type="button"
                className={`cal-cell cal-day ${hasToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
                onClick={() => setSelectedDate(cell)}
                title={`${cell.toDateString()}`}
              >
                <div className="cal-date">{String(cell.getDate()).padStart(2, "0")}</div>
                <div className="cal-dots">
                  {items.slice(0, 4).map((ev) => (
                    <span
                      key={`${ev.status}-${ev.id}`}
                      className={`dot ${
                        String(ev.status).toLowerCase() === "accepted" ? "dot-acc"
                        : String(ev.status).toLowerCase() === "pending" ? "dot-pen"
                        : "dot-dec"
                      }`}
                      title={`${ev.title}${ev.start ? " • " + fmtTimeHM(ev.start) : ""}`}
                    />
                  ))}
                  {items.length > 4 && <span className="more">+{items.length - 4}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="following-body" style={{ marginTop: 12 }}>
        <div className="pf-list">
          {(() => {
            const key = selectedDate ? selectedDate.toISOString().slice(0, 10) : null;
            let list = key ? (byDate.get(key) || []) : [];
            if (onlyUpcoming) {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              list = list.filter((it) => it.date >= today);
            }
            if (!list.length) {
              return (
                <div className="empty">
                  {selectedDate ? "No shows in this day" : "Pick a date to see details"}
                </div>
              );
            }
            return list.map((ev) => {
              const st = String(ev.status).toLowerCase(); // accepted/pending/declined
              const label = labels[st] || st;
              return (
                <div key={`ev-${ev.id}`} className="pf-card">
                  <img
                    className="pf-thumb"
                    src={ev.img || "/img/fallback.jpg"}
                    alt={ev.title}
                    onError={(e) => { e.currentTarget.src = "/img/fallback.jpg"; }}
                  />
                  <div className="pf-main">
                    <div className="pf-name">
                      {ev.eventId ? <Link to={`/events/${ev.eventId}`}>{ev.title}</Link> : ev.title}
                    </div>
                    <div className="pf-sub">
                      <span>{fmtDate(ev.date)}</span>
                      {(ev.start || ev.end) && (
                        <span className="pf-separator">
                          {fmtTimeHM(ev.start)}–{fmtTimeHM(ev.end)}
                        </span>
                      )}
                      {ev.stage && <span className="pf-separator">{ev.stage}</span>}
                      <span className={`pf-separator badge-${st}`}>
                        {label}
                      </span>
                    </div>
                  </div>
                  <div className="pf-actions">
                    {ev.eventId && <Link className="btn-viewdetail-ev" to={`/events/${ev.eventId}`}>Detail</Link>}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

/* ===== Small presentational helper ===== */
function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <div className="info-label">{label}</div>
      <div className="info-value">{value || "—"}</div>
    </div>
  );
}
