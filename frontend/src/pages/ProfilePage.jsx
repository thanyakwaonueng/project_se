// src/pages/ProfilePage.jsx
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../css/Profile.css";

export default function ProfilePage() {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("artists");

  // Artists
  const [allGroups, setAllGroups] = useState([]);
  const [mutatingArtistIds, setMutatingArtistIds] = useState(new Set());

  // Events
  const [allEvents, setAllEvents] = useState([]);
  const [mutatingEventIds, setMutatingEventIds] = useState(new Set());

  // paging (artists)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  /* me */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get("/api/auth/me", { withCredentials: true });
        if (alive) setMe(data);
      } catch (e) {
        setErr(e?.response?.data?.error || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* groups (artists) */
  useEffect(() => {
    if (!me) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get("/api/groups", { withCredentials: true });
        if (alive) setAllGroups(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("GET /api/groups error:", e);
      }
    })();
    return () => { alive = false; };
  }, [me]);

  /* events */
  useEffect(() => {
    if (!me) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get("/api/events", { withCredentials: true });
        if (alive) setAllEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("GET /api/events error:", e);
      }
    })();
    return () => { alive = false; };
  }, [me]);

  const u = me || {};
  const performer = u.performerInfo || null;
  const artistInfo = performer?.artistInfo || null;
  const venue  = performer?.venueInfo  || null;

  const displayName = u.name || (me?.email ? me.email.split("@")[0] : "User");
  const avatar = u.profilePhotoUrl || "/img/default-avatar.png";
  const favGenres = (u.favoriteGenres || []).slice(0, 5).join(" • ");
  const myArtistId = me?.id;

  const isArtistApproved = me?.role === "ARTIST";

  // followers ของศิลปิน (นับเฉพาะตอนเราเป็น ARTIST)
  const myFollowersCount = useMemo(() => {
    if (!isArtistApproved) return 0;
    const rows = performer?.likedBy;
    return Array.isArray(rows) ? rows.length : 0;
  }, [isArtistApproved, performer?.likedBy]);

  // ===== Artists following =====
  const followingArtists = useMemo(
    () => (allGroups || []).filter(g => g.likedByMe),
    [allGroups]
  );
  const artistsCount = followingArtists.length;

  const totalPages = Math.max(1, Math.ceil(artistsCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = followingArtists.slice(start, start + PAGE_SIZE);
  useEffect(() => { setPage(1); }, [artistsCount]);

  async function followArtist(artistId) {
    if (!artistId || mutatingArtistIds.has(artistId)) return;
    setMutatingArtistIds(prev => new Set(prev).add(artistId));
    try {
      await axios.post(`/api/artists/${artistId}/like`, {}, { withCredentials: true });
      setAllGroups(prev => prev.map(g => g.id === artistId
        ? { ...g, likedByMe: true, followersCount: (g.followersCount || 0) + 1 }
        : g
      ));
    } catch (e) {
      console.error("followArtist error:", e);
    } finally {
      setMutatingArtistIds(prev => { const n = new Set(prev); n.delete(artistId); return n; });
    }
  }
  async function unfollowArtist(artistId) {
    if (!artistId || mutatingArtistIds.has(artistId)) return;
    setMutatingArtistIds(prev => new Set(prev).add(artistId));
    try {
      await axios.delete(`/api/artists/${artistId}/like`, { withCredentials: true });
      setAllGroups(prev => prev.map(g => g.id === artistId
        ? { ...g, likedByMe: false, followersCount: Math.max(0, (g.followersCount || 0) - 1) }
        : g
      ));
    } catch (e) {
      console.error("unfollowArtist error:", e);
    } finally {
      setMutatingArtistIds(prev => { const n = new Set(prev); n.delete(artistId); return n; });
    }
  }

  // ===== Events following =====
  const followingEvents = useMemo(
    () => (allEvents || []).filter(ev => ev.likedByMe),
    [allEvents]
  );

  async function followEvent(eventId) {
    if (!eventId || mutatingEventIds.has(eventId)) return;
    setMutatingEventIds(prev => new Set(prev).add(eventId));
    try {
      await axios.post(`/api/events/${eventId}/like`, {}, { withCredentials: true });
      setAllEvents(prev => prev.map(e => e.id === eventId
        ? { ...e, likedByMe: true, followersCount: (e.followersCount || 0) + 1 }
        : e
      ));
    } catch (e) {
      console.error("followEvent error:", e);
    } finally {
      setMutatingEventIds(prev => { const n = new Set(prev); n.delete(eventId); return n; });
    }
  }
  async function unfollowEvent(eventId) {
    if (!eventId || mutatingEventIds.has(eventId)) return;
    setMutatingEventIds(prev => new Set(prev).add(eventId));
    try {
      await axios.delete(`/api/events/${eventId}/like`, { withCredentials: true });
      setAllEvents(prev => prev.map(e => e.id === eventId
        ? { ...e, likedByMe: false, followersCount: Math.max(0, (e.followersCount || 0) - 1) }
        : e
      ));
    } catch (e) {
      console.error("unfollowEvent error:", e);
    } finally {
      setMutatingEventIds(prev => { const n = new Set(prev); n.delete(eventId); return n; });
    }
  }

  // ====== Info Row ======
  function InfoRow({ label, value }) {
    return (
      <div className="info-row">
        <div className="info-label">{label}</div>
        <div className="info-value">{value || "—"}</div>
      </div>
    );
  }

  // ===== Format Date ======
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

  if (loading) return <div className="stack">Loading…</div>;
  if (err) return <div className="stack alert alert-danger">{err}</div>;
  if (!me) return <div className="stack">No profile.</div>;

  // const Pager = () => (
  //   <div className="pf-pager">
  //     <button className="pf-page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>← Prev</button>
  //     {Array.from({length: totalPages}).map((_,i)=> {
  //       const n = i+1;
  //       return (
  //         <button key={n} className={`pf-page-btn ${page===n?'active':''}`} onClick={()=>setPage(n)}>
  //           {n}
  //         </button>
  //       );
  //     })}
  //     <button className="pf-page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}>Next →</button>
  //   </div>
  // );

  return (
    <div className="profile-page-wrap">
      <div className="stack">

        {/* Profile Content */}
        <div className="profile-card">
          <div className="profile-cover-wrap">

            {/* Cover image */}
            <img
              className="profile-cover"
              src={avatar || "/img/default-avatar.png"}
              alt="Profile cover"
              onError={(e) => {
                e.currentTarget.src = "/img/default-avatar.png";
              }}
            />
          </div>

            {/* Avatar overlapping */}
            <div className="profile-avatar-wrap">
              <img
                className="profile-avatar"
                src={avatar || "/img/default-avatar.png"}
                alt={displayName}
                onError={(e) => {
                  e.currentTarget.src = "/img/default-avatar.png";
                }}
              />
            </div>

            {/* Name and Email */}
            <div className="profile-head">
              <div className="profile-name">
                {displayName}
                {isArtistApproved && (
                  <span className="badge-verified" title="Verified artist">
                    ✔
                  </span>
                )}
              </div>
            <div className="profile-email">{me.email}</div>
          </div>


          <hr className="profile-sep" />

          {/* Info */}
          <div className="info-grid">
            <InfoRow label="Role" value={me.role} />
            {favGenres && <InfoRow label="Fav genres" value={favGenres} />}
            {u.birthday && (
              <InfoRow label="Birthday" value={fmtDate(u.birthday, "en-GB")} />
            )}


            {isArtistApproved && artistInfo && (
              <>
                {/* <InfoRow label="Artist" value={displayName} /> */}
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
              <>
                {/* <InfoRow label="Venue" value={displayName} /> */}
                <InfoRow
                  label="Type"
                  value={
                    <>
                      {venue.genre && <span className="chip-normal">{venue.genre}</span>}
                      <span className="chip-transparent">{venue.alcoholPolicy}</span>
                    </>
                  }
                />
              </>
            )}
          </div>

          <div className="profile-actions">
            <Link to="/accountsetup?edit=1" className="btn-editprofile">Edit profile</Link>
            {isArtistApproved && artistInfo && (
              <Link to={`/artists/${myArtistId}`} className="btn-ghost">View public artist</Link>
            )}
            {venue && (
              <Link to={`/venues/${venue.performerId}`} className="btn-ghost">Manage venue</Link>
            )}
          </div>
        </div>

        {/* Following Content */}
        <div className="following-card">
          <div className="following-head">
            <div className="following-title">Following</div>
            <div className="tabs" role="tablist" aria-label="following tabs">
              <button className={`tab-btn ${tab==='artists'?'active':''}`} onClick={()=>setTab('artists')} role="tab" aria-selected={tab==='artists'}>
                Artists {artistsCount ? `(${artistsCount})` : ''}
              </button>
              <button className={`tab-btn ${tab==='events'?'active':''}`} onClick={()=>setTab('events')} role="tab" aria-selected={tab==='events'}>
                Events {followingEvents.length ? `(${followingEvents.length})` : ''}
              </button>
            </div>
          </div>

          <div className="following-body">
            {tab === 'artists' ? (
              artistsCount ? (
                <>
                  <div className="pf-list">
                    {pageItems.map(a => (
                      <div key={a.id} className="pf-card">
                        <img className="pf-thumb" src={a.image} alt={a.name} onError={(e)=>{e.currentTarget.src="/img/fallback.jpg";}} />
                        <div className="pf-main">
                          <div className="pf-name"><Link to={`/artists/${a.id}`}>{a.name}</Link></div>
                          <div className="pf-sub">
                            <span>{a.details || a.description || '—'}</span>
                            <span className="pf-separator">{Number(a.followersCount||0).toLocaleString()} followers</span>
                          </div>
                        </div>
                        <div className="pf-actions">
                          <button
                            className={`btn-follow ${a.likedByMe ? 'is-following' : ''}`}
                            onClick={()=> a.likedByMe ? unfollowArtist(a.id) : followArtist(a.id)}
                            disabled={mutatingArtistIds.has(a.id)}
                            title={a.likedByMe ? "Following" : "Follow"}
                          >
                            {a.likedByMe ? "Unfollow" : "Follow"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && <Pager />}
                </>
              ) : (
                <div className="empty">You haven’t followed any artists</div>
              )
            ) : (
              followingEvents.length ? (
                <div className="pf-list">
                  {followingEvents.map(ev => (
                    <div key={ev.id} className="pf-card">
                      <img
                        className="pf-thumb"
                        src={ev.posterUrl || ev.coverImage || ev.bannerUrl || "/img/fallback.jpg"}
                        alt={ev.name || ev.title}
                        onError={(e)=>{e.currentTarget.src="/img/fallback.jpg";}}
                      />
                      <div className="pf-main">
                        <div className="pf-name">
                          <Link to={`/events/${ev.id}`}>{ev.name || ev.title || `Event #${ev.id}`}</Link>
                        </div>
                        <div className="pf-sub">
                          <span>{fmtDate(ev.date, "en-GB")}</span>
                          {ev.venue?.name && <span className="pf-separator">{ev.venue.name}</span>}
                          <span className="pf-separator">{Number(ev.followersCount||0).toLocaleString()} likes</span>
                        </div>
                      </div>
                      <div className="pf-actions">
                        <button
                          className={`btn-follow ${ev.likedByMe ? 'is-following' : ''}`}
                          onClick={()=> ev.likedByMe ? unfollowEvent(ev.id) : followEvent(ev.id)}
                          disabled={mutatingEventIds.has(ev.id)}
                          title={ev.likedByMe ? "Following" : "Follow"}
                        >
                          {ev.likedByMe ? "Unfollow" : "Follow"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">You haven’t followed any events</div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
