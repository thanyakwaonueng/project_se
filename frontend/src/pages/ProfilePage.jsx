import { useEffect, useState, useMemo } from "react"; 
import { Link } from "react-router-dom";
import axios from "axios";

export default function ProfilePage() {
  // ---------- Inline CSS ----------
  const styles = `
  :root{
    --card-bg:#fff; --muted:#6b7280; --line:#eef0f2; --chip:#eef6ff;
    --chip-text:#2b6cb0; --primary:#1a73e8; --shadow:0 12px 30px rgba(0,0,0,.08);
    --radius:18px;
  }
  /* พื้นหลังหน้า + คอนเทนเนอร์กลาง */
  .profile-page-wrap{display:block;padding:48px 16px 72px;background:#f7f8fa;}
  .stack{max-width:960px;margin:0 auto;display:grid;gap:18px;}

  /* การ์ดโปรไฟล์ */
  .profile-card{width:100%;max-width:720px;margin:0 auto;background:var(--card-bg);border-radius:var(--radius);box-shadow:var(--shadow);position:relative;overflow:hidden;}
  .profile-cover{height:96px;background:linear-gradient(180deg,#fff4e6,#fff);}
  .profile-avatar-wrap{display:flex;justify-content:center;margin-top:-40px;}
  .profile-avatar{width:84px;height:84px;border-radius:50%;object-fit:cover;border:4px solid #fff;box-shadow:0 8px 20px rgba(0,0,0,.08);background:#fff;}
  .profile-head{text-align:center;padding:8px 16px 4px;}
  .profile-name{font-weight:700;font-size:20px;}
  .badge-verified{margin-left:6px;color:#1da1f2;font-size:16px;vertical-align:middle;}
  .profile-email{color:var(--muted);font-size:14px;margin-top:2px;}
  .profile-sep{border:0;border-top:1px solid var(--line);margin:12px 20px 0;}
  .info-grid{display:grid;grid-template-columns:1fr;gap:12px;padding:16px 20px 8px;}
  .info-row{display:grid;grid-template-columns:140px 1fr;gap:12px;align-items:start;font-size:14px;}
  .info-label{color:var(--muted);display:flex;gap:8px;align-items:center;}
  .info-label .icon{width:18px;text-align:center;}
  .info-value{color:#111;}
  .chip{display:inline-block;padding:2px 8px;border-radius:999px;background:var(--chip);color:var(--chip-text);font-size:12px;margin-right:6px;}
  .chip-active{background:#e7f8ee;color:#15803d;}
  .profile-actions{display:flex;gap:10px;padding:16px 20px 24px;border-top:1px solid var(--line);}
  .btn-primary,.btn-ghost{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 14px;border-radius:10px;font-weight:600;text-decoration:none;transition:.15s ease;}
  .btn-primary{background:var(--primary);color:#fff;}
  .btn-primary:hover{filter:brightness(.96);}
  .btn-ghost{background:#f0f3f6;color:#0f172a;}
  .btn-ghost:hover{filter:brightness(.97);}
  @media (max-width:480px){ .info-row{grid-template-columns:120px 1fr;} }

  /* การ์ด “กำลังติดตาม” — prefix pf- ป้องกันชน */
  .following-card{width:100%;max-width:720px;margin:0 auto;background:var(--card-bg);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
  .following-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line);}
  .following-title{font-weight:700;font-size:16px;}
  .tabs{display:flex;gap:8px;}
  .tab-btn{height:34px;padding:0 12px;border-radius:999px;background:#f0f3f6;color:#0f172a;font-weight:600;border:0;cursor:pointer}
  .tab-btn.active{background:var(--primary);color:#fff;}
  .following-body{padding:12px 12px 8px;}

  /* list แนวนอนแบบบรรทัดยาว (ไม่ตัดชื่อ) */
  .pf-list{display:grid;grid-template-columns:1fr;gap:12px;}
  .pf-card{display:grid;grid-template-columns:64px 1fr auto;gap:12px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:14px;background:#fff;width:100%;}
  .pf-thumb{width:64px;height:64px;border-radius:12px;object-fit:cover;background:#fff;border:1px solid #eee;}
  .pf-main{min-width:0;}
  .pf-name{font-weight:800;font-size:14px;line-height:1.25;margin:0 0 2px 0;white-space:normal;word-break:break-word;}
  .pf-sub{font-size:12px;color:var(--muted);white-space:normal;word-break:break-word;}
  .pf-actions{display:flex;gap:8px;align-self:flex-start;}

  /* ปุ่ม Follow / Following */
  .btn-follow{
    height:32px;padding:0 14px;border-radius:10px;border:0;cursor:pointer;
    font-weight:800;transition:all .18s ease;background:var(--primary);color:#fff;
  }
  .btn-follow:hover{filter:brightness(.95);}
  .btn-follow.is-following{
    background:#f3f4f6;color:#111;border:1px solid #d1d5db;
  }
  .btn-follow.is-following:hover{
    background:#ffe4ea;color:#ef4664;border-color:#ef4664;
  }

  /* pagination */
  .pf-pager{display:flex;justify-content:center;gap:8px;padding:14px 8px 16px;border-top:1px solid var(--line);}
  .pf-page-btn{min-width:34px;height:34px;padding:0 10px;border-radius:10px;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-weight:700}
  .pf-page-btn[disabled]{opacity:.5;cursor:not-allowed}
  .pf-page-btn.active{background:var(--primary);color:#fff;border-color:var(--primary);}
  `;

  // ---------- Hooks ----------
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // following data
  const [tab, setTab] = useState("artists"); // 'artists' | 'events'
  const [allGroups, setAllGroups] = useState([]); // from /api/groups
  const [mutatingIds, setMutatingIds] = useState(new Set()); // ใช้ทั้ง follow/unfollow

  // pagination (artists)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

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

  // fetch groups (for likedByMe) once after me loaded
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

  // ---------- Derive data & hooks-dependent values (ประกาศก่อน return เสมอ) ----------
  const u = me || {};
  const performer = u.performerInfo || null;
  const artist = performer?.artistInfo || null;
  const venue  = performer?.venueInfo  || null;

  const displayName = u.name || (me?.email ? me.email.split("@")[0] : "User");
  const avatar = u.profilePhotoUrl || "/img/default-avatar.png";
  const favGenres = (u.favoriteGenres || []).slice(0, 5).join(" • ");
  const myArtistId = me?.id;

  // artists I'm following (จาก likedByMe)
  const followingArtists = useMemo(
    () => (allGroups || []).filter(g => g.likedByMe),
    [allGroups]
  );
  const artistsCount = followingArtists.length;

  // pagination slice
  const totalPages = Math.max(1, Math.ceil(artistsCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = followingArtists.slice(start, start + PAGE_SIZE);
  useEffect(() => { setPage(1); }, [artistsCount]); // reset เมื่อจำนวนเปลี่ยน

  // follow / unfollow (artists only)
  async function followArtist(artistId) {
    if (!artistId) return;
    if (mutatingIds.has(artistId)) return;
    setMutatingIds(prev => new Set(prev).add(artistId));
    try {
      await axios.post(`/api/artists/${artistId}/like`, {}, { withCredentials: true });
      setAllGroups(prev => prev.map(g => g.id === artistId
        ? { ...g, likedByMe: true, followersCount: (g.followersCount || 0) + 1 }
        : g
      ));
    } catch (e) {
      console.error("followArtist error:", e);
    } finally {
      setMutatingIds(prev => { const n = new Set(prev); n.delete(artistId); return n; });
    }
  }

  async function unfollowArtist(artistId) {
    if (!artistId) return;
    if (mutatingIds.has(artistId)) return;
    setMutatingIds(prev => new Set(prev).add(artistId));
    try {
      await axios.delete(`/api/artists/${artistId}/like`, { withCredentials: true });
      setAllGroups(prev => prev.map(g => g.id === artistId
        ? { ...g, likedByMe: false, followersCount: Math.max(0, (g.followersCount || 0) - 1) }
        : g
      ));
    } catch (e) {
      console.error("unfollowArtist error:", e);
    } finally {
      setMutatingIds(prev => { const n = new Set(prev); n.delete(artistId); return n; });
    }
  }

  // ---------- Guards after all hooks ----------
  if (loading) return (
    <>
      <style>{styles}</style>
      <div className="stack">Loading…</div>
    </>
  );
  if (err) return (
    <>
      <style>{styles}</style>
      <div className="stack alert alert-danger">{err}</div>
    </>
  );
  if (!me) return (
    <>
      <style>{styles}</style>
      <div className="stack">No profile.</div>
    </>
  );

  // pager render
  const Pager = () => (
    <div className="pf-pager">
      <button className="pf-page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>← Prev</button>
      {Array.from({length: totalPages}).map((_,i)=> {
        const n = i+1;
        return (
          <button key={n} className={`pf-page-btn ${page===n?'active':''}`} onClick={()=>setPage(n)}>
            {n}
          </button>
        );
      })}
      <button className="pf-page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}>Next →</button>
    </div>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="profile-page-wrap">
        <div className="stack">
          {/* การ์ดโปรไฟล์ */}
          <div className="profile-card">
            <div className="profile-cover" aria-hidden />
            <div className="profile-avatar-wrap">
              <img
                className="profile-avatar"
                src={avatar}
                alt={displayName}
                onError={(e)=>{e.currentTarget.src="/img/default-avatar.png";}}
              />
            </div>

            <div className="profile-head">
              <div className="profile-name">
                {displayName}
                {me.role === "ARTIST" && <span className="badge-verified" title="Verified artist">✔</span>}
              </div>
              <div className="profile-email">{me.email}</div>
            </div>

            <hr className="profile-sep" />

            <div className="info-grid">
              <InfoRow label="Role" value={me.role} icon="🧩" />
              {favGenres && <InfoRow label="Fav genres" value={favGenres} icon="🎵" />}
              {u.birthday && (
                <InfoRow label="Birthday" value={new Date(u.birthday).toLocaleDateString()} icon="🎂" />
              )}

              {artist && (
                <>
                  <InfoRow label="Artist" value={displayName} icon="🎤" />
                  <InfoRow
                    label="Type"
                    value={
                      <>
                        <span className="chip chip-active">{artist.bookingType}</span>
                        {artist.genre && <span className="chip">{artist.genre}</span>}
                      </>
                    }
                  />
                </>
              )}

              {venue && (
                <>
                  <InfoRow label="Venue" value={displayName} icon="🏟️" />
                  <InfoRow
                    label="Type"
                    value={
                      <>
                        {venue.genre && <span className="chip">{venue.genre}</span>}
                        <span className="chip">{venue.alcoholPolicy}</span>
                      </>
                    }
                  />
                </>
              )}
            </div>

            <div className="profile-actions">
              <Link to="/accountsetup?edit=1" className="btn-primary">Edit profile</Link>
              {artist && <Link to={`/artists/${myArtistId}`} className="btn-ghost">View public artist</Link>}
              {venue && <Link to="/me/venue" className="btn-ghost">Manage venue</Link>}
            </div>
          </div>

          {/* การ์ด “กำลังติดตาม” */}
          <div className="following-card">
            <div className="following-head">
              <div className="following-title">กำลังติดตาม (Following)</div>
              <div className="tabs" role="tablist" aria-label="following tabs">
                <button className={`tab-btn ${tab==='artists'?'active':''}`} onClick={()=>setTab('artists')} role="tab" aria-selected={tab==='artists'}>
                  Artists {artistsCount ? `(${artistsCount})` : ''}
                </button>
                <button className={`tab-btn ${tab==='events'?'active':''}`} onClick={()=>setTab('events')} role="tab" aria-selected={tab==='events'}>
                  Events
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
                            <div className="pf-name">
                              <Link to={`/artists/${a.id}`}>{a.name}</Link>
                            </div>
                            <div className="pf-sub">
                              {(a.details || a.description || '—')} • {Number(a.followersCount||0).toLocaleString()} followers
                            </div>
                          </div>
                          <div className="pf-actions">
                            <button
                              className={`btn-follow ${a.likedByMe ? 'is-following' : ''}`}
                              onClick={()=> a.likedByMe ? unfollowArtist(a.id) : followArtist(a.id)}
                              disabled={mutatingIds.has(a.id)}
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
                  <div className="empty">ยังไม่ได้ติดตามศิลปินใด ๆ</div>
                )
              ) : (
                <div className="empty">ยังไม่เปิดใช้งานการติดตาม Event (จะมาเร็ว ๆ นี้)</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div className="info-row">
      <div className="info-label">{icon ? <span className="icon">{icon}</span> : null}{label}</div>
      <div className="info-value">{value || "—"}</div>
    </div>
  );
}
