import { useEffect, useState } from "react";
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
  .profile-page-wrap{display:flex;justify-content:center;padding:48px 16px 72px;background:#f7f8fa;}
  .center-wrap{max-width:960px;margin:24px auto;}
  .profile-card{width:min(520px,96vw);background:var(--card-bg);border-radius:var(--radius);box-shadow:var(--shadow);position:relative;overflow:hidden;}
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
  `;

  // ---------- Hooks (เรียงคงที่ทุกครั้ง) ----------
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

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

  // ---------- Early returns (ไม่กระทบลำดับ hooks เพราะไม่มี hook ใต้เงื่อนไข) ----------
  if (loading) return <div className="center-wrap">Loading…</div>;
  if (err) return <div className="center-wrap alert alert-danger">{err}</div>;
  if (!me) return null;

  // ---------- Derive data (ไม่ใช่ hooks) ----------
  const u = me || {};
  const performer = u.performerInfo || null;
  const artist = performer?.artistInfo || null;
  const venue  = performer?.venueInfo  || null;

  const displayName = u.name || me.email?.split("@")[0] || "User";
  const avatar = u.profilePhotoUrl || "/img/default-avatar.png";
  const favGenres = (u.favoriteGenres || []).slice(0, 5).join(" • ");

  return (
    <>
      <style>{styles}</style>
      <div className="profile-page-wrap">
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
            <Link to="/account_setup" className="btn-primary">Edit profile</Link>
            {artist && <Link to={`/page_artists/${slugify(u.name)}`} className="btn-ghost">View public artist</Link>}
            {venue && <Link to="/me/venue" className="btn-ghost">Manage venue</Link>}
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

function slugify(s = "") {
  return s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}