// frontend/src/pages/AccountSetupPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/* ---------- SweetAlert2 helper (inline, no extra import) ---------- */
async function getSwal() {
  // 1) ลอง dynamic import (ถ้าติดตั้ง sweetalert2 ไว้)
  try {
    const mod = await import(/* @vite-ignore */ "sweetalert2");
    return mod.default;
  } catch {
    // 2) ถ้ายังไม่มี ให้ลองใช้ window.Swal (อาจถูกโหลดไว้แล้ว)
    if (typeof window !== "undefined" && window.Swal) return window.Swal;

    // 3) โหลดจาก CDN แล้วคืนค่า
    if (typeof document !== "undefined") {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      return window.Swal;
    }
    // 4) fallback ง่าย ๆ
    return {
      fire: async ({ icon, title, text }) => alert(`${icon || "info"}: ${title}\n${text || ""}`),
    };
  }
}

/* ---------- form constants ---------- */
const PRESET_GENRES = [
  "Pop","Rock","Indie","Hip-hop","R&B","EDM","Jazz","Blues","Metal","Folk","Country"
];
const BOOKING_TYPES = ["FULL_BAND","TRIO","DUO","SOLO"];

export default function AccountSetupPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");
  const [ok, setOk]           = useState("");

  // ——— โปรไฟล์ผู้ใช้ (ย่อ)
  const [displayName, setDisplayName]         = useState("");
  const [favoriteGenres, setFav]              = useState([]);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [birthday, setBirthday]               = useState("");

  // ——— สถานะผู้ใช้ตอนโหลด (ไว้ตัดสินข้อความหลัง Save)
  const [wasArtist, setWasArtist]         = useState(false);
  const [hadPendingApp, setHadPendingApp] = useState(false);

  // ——— Role ที่เลือกในฟอร์ม
  const [selectedRole, setSelectedRole] = useState("AUDIENCE");

  // ——— ฟอร์มศิลปิน
  const [artist, setArtist] = useState({
    name: "", description: "",
    genre: "", subGenre: "",
    bookingType: "FULL_BAND",
    foundingYear: "", label: "", isIndependent: true,
    memberCount: "", contactEmail: "", contactPhone: "",
    priceMin: "", priceMax: "",
    photoUrl: "", videoUrl: "", profilePhotoUrl: "",
    rateCardUrl: "", epkUrl: "", riderUrl: "",
    spotifyUrl: "", youtubeUrl: "", appleMusicUrl: "",
    facebookUrl: "", instagramUrl: "", twitterUrl: "",
    soundcloudUrl: "", shazamUrl: "", bandcampUrl: "", tiktokUrl: "",
  });
  const setA = (k, v) => setArtist(prev => ({ ...prev, [k]: v }));
  const toggleGenre = g =>
    setFav(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  /* ---------- โหลดข้อมูลผูกฟอร์ม ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const { data } = await axios.get("/api/auth/me", { withCredentials: true });
        if (!alive) return;

        const amArtist = data?.role === "ARTIST";
        const pending  = Boolean(data?.pendingRoleRequest);
        setWasArtist(amArtist);
        setHadPendingApp(pending);

        // Prefill user profile
        const p = data?.profile || null;
        if (p) {
          setDisplayName(p.displayName || "");
          setFav(Array.isArray(p.favoriteGenres) ? p.favoriteGenres : []);
          setProfileImageUrl(p.profileImageUrl || "");
          if (p.birthday) {
            const d = new Date(p.birthday);
            if (!isNaN(d)) {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              setBirthday(`${y}-${m}-${day}`);
            }
          }
        }

        // default radio
        setSelectedRole(amArtist || pending ? "ARTIST" : "AUDIENCE");

        // Prefill artist (จาก profile ที่อนุมัติแล้ว หรือ application ที่ค้าง)
        const src =
          data?.artistProfile
            ? { ...(data.artistProfile || {}) }
            : data?.pendingRoleRequest?.application
              ? { ...(data.pendingRoleRequest.application || {}) }
              : null;

        if (src) {
          const toStr  = v => (v == null ? "" : String(v));
          const toYYYY = v => (Number(v) > 0 ? String(v) : "");
          setArtist({
            name: toStr(src.name),
            description: toStr(src.description),
            genre: toStr(src.genre),
            subGenre: toStr(src.subGenre),
            bookingType: BOOKING_TYPES.includes(src.bookingType) ? src.bookingType : "FULL_BAND",
            foundingYear: toYYYY(src.foundingYear),
            label: toStr(src.label),
            isIndependent: src.isIndependent !== false,
            memberCount: toStr(src.memberCount ?? ""),
            contactEmail: toStr(src.contactEmail),
            contactPhone: toStr(src.contactPhone),
            priceMin: toStr(src.priceMin ?? ""),
            priceMax: toStr(src.priceMax ?? ""),
            photoUrl: toStr(src.photoUrl),
            videoUrl: toStr(src.videoUrl),
            profilePhotoUrl: toStr(src.profilePhotoUrl || src.photoUrl),
            rateCardUrl: toStr(src.rateCardUrl),
            epkUrl: toStr(src.epkUrl),
            riderUrl: toStr(src.riderUrl),
            spotifyUrl: toStr(src.spotifyUrl),
            youtubeUrl: toStr(src.youtubeUrl),
            appleMusicUrl: toStr(src.appleMusicUrl),
            facebookUrl: toStr(src.facebookUrl),
            instagramUrl: toStr(src.instagramUrl),
            twitterUrl: toStr(src.twitterUrl || src.xUrl),
            soundcloudUrl: toStr(src.soundcloudUrl),
            shazamUrl: toStr(src.shazamUrl),
            bandcampUrl: toStr(src.bandcampUrl),
            tiktokUrl: toStr(src.tiktokUrl),
          });
        }
      } catch (e) {
        setErr(e?.response?.data?.error || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ---------- validate ---------- */
  const validateArtist = () => {
    if (selectedRole !== "ARTIST") return null;
    if (!artist.name.trim())  return "กรุณาใส่ชื่อศิลปิน (name)";
    if (!artist.genre.trim()) return "กรุณาใส่แนวดนตรีหลัก (genre)";
    if (!BOOKING_TYPES.includes(artist.bookingType)) return "bookingType ไม่ถูกต้อง";
    if (artist.foundingYear && !/^\d{4}$/.test(String(artist.foundingYear))) return "foundingYear ควรเป็น ค.ศ. 4 หลัก";
    if (artist.memberCount && isNaN(Number(artist.memberCount))) return "memberCount ควรเป็นตัวเลข";
    if (artist.priceMin && isNaN(Number(artist.priceMin))) return "priceMin ควรเป็นตัวเลข";
    if (artist.priceMax && isNaN(Number(artist.priceMax))) return "priceMax ควรเป็นตัวเลข";
    return null;
  };

  /* ---------- submit ---------- */
  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    const aerr = validateArtist();
    if (aerr) { setErr(aerr); return; }

    const isArtistChoice = selectedRole === "ARTIST";

    const payload = {
      displayName: displayName?.trim() || null,
      favoriteGenres,
      profileImageUrl: profileImageUrl?.trim() || null,
      birthday: birthday ? new Date(birthday + "T00:00:00").toISOString() : null,

      // ยื่นขอ ARTIST เฉพาะกรณี "ยังไม่เป็น ARTIST"
      desiredRole: isArtistChoice && !wasArtist ? "ARTIST" : undefined,

      artistApplication: isArtistChoice ? {
        name: artist.name.trim(),
        description: artist.description?.trim() || null,
        genre: artist.genre.trim(),
        subGenre: artist.subGenre?.trim() || null,
        bookingType: artist.bookingType,
        foundingYear: artist.foundingYear ? Number(artist.foundingYear) : null,
        label: artist.label?.trim() || null,
        isIndependent: !!artist.isIndependent,
        memberCount: artist.memberCount ? Number(artist.memberCount) : null,
        contactEmail: artist.contactEmail?.trim() || null,
        contactPhone: artist.contactPhone?.trim() || null,
        priceMin: artist.priceMin ? Number(artist.priceMin) : null,
        priceMax: artist.priceMax ? Number(artist.priceMax) : null,
        photoUrl: artist.photoUrl?.trim() || null,
        videoUrl: artist.videoUrl?.trim() || null,
        profilePhotoUrl: artist.profilePhotoUrl?.trim() || null,
        rateCardUrl: artist.rateCardUrl?.trim() || null,
        epkUrl: artist.epkUrl?.trim() || null,
        riderUrl: artist.riderUrl?.trim() || null,
        spotifyUrl: artist.spotifyUrl?.trim() || null,
        youtubeUrl: artist.youtubeUrl?.trim() || null,
        appleMusicUrl: artist.appleMusicUrl?.trim() || null,
        facebookUrl: artist.facebookUrl?.trim() || null,
        instagramUrl: artist.instagramUrl?.trim() || null,
        twitterUrl: artist.twitterUrl?.trim() || null,
        soundcloudUrl: artist.soundcloudUrl?.trim() || null,
        shazamUrl: artist.shazamUrl?.trim() || null,
        bandcampUrl: artist.bandcampUrl?.trim() || null,
        tiktokUrl: artist.tiktokUrl?.trim() || null,
      } : undefined,
    };

    try {
      setSaving(true);
      await axios.post("/api/me/setup", payload, { withCredentials: true });

      const Swal = await getSwal();
      const isEditArtist = isArtistChoice && (wasArtist || hadPendingApp);

      const title = isArtistChoice
        ? (isEditArtist ? "แก้ไขข้อมูลเรียบร้อย" : "ส่งใบสมัครศิลปินเรียบร้อย!")
        : "บันทึกโปรไฟล์เรียบร้อย";

      const text  = isArtistChoice
        ? (isEditArtist
            ? "อัปเดตใบสมัคร/โปรไฟล์ศิลปินแล้ว"
            : "ระบบได้ส่งคำขอเป็น ARTIST ให้แอดมินตรวจแล้ว")
        : "ข้อมูลโปรไฟล์ถูกบันทึกแล้ว";

      await Swal.fire({
        icon: "success",
        title,
        text,
        confirmButtonText: "OK",
        heightAuto: false,
      });

      navigate("/"); // กลับหน้าแรก
    } catch (e2) {
      const Swal = await getSwal();
      await Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: e2?.response?.data?.error || "กรุณาลองใหม่อีกครั้ง",
        confirmButtonText: "ปิด",
        heightAuto: false,
      });
      setErr(e2?.response?.data?.error || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ maxWidth: 980, margin: "24px auto" }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <h2>Account Setup</h2>
      {err && <div className="alert alert-danger">{err}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
        {/* User mini profile */}
        <div className="card p-3">
          <h5 className="mb-3">User Profile (สั้น)</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-bold">Display name</label>
              <input className="form-control" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">Profile photo URL</label>
              <input className="form-control" value={profileImageUrl} onChange={e=>setProfileImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">Birthday</label>
              <input type="date" className="form-control" value={birthday} onChange={e=>setBirthday(e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label fw-bold">Favorite genres</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PRESET_GENRES.map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`btn btn-sm ${favoriteGenres.includes(g) ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => toggleGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="card p-3">
          <h5 className="mb-3">Role</h5>
          <div className="d-flex gap-3 flex-wrap">
            <label className="d-flex align-items-center gap-2">
              <input type="radio" name="role" value="AUDIENCE" checked={selectedRole==="AUDIENCE"} onChange={e=>setSelectedRole(e.target.value)} />
              <span>AUDIENCE</span>
            </label>
            <label className="d-flex align-items-center gap-2">
              <input type="radio" name="role" value="ARTIST" checked={selectedRole==="ARTIST"} onChange={e=>setSelectedRole(e.target.value)} />
              <span>ARTIST (ยื่นสมัคร)</span>
            </label>
          </div>
        </div>

        {/* Artist full application */}
        {selectedRole === "ARTIST" && (
          <div className="card p-3">
            <h5 className="mb-3">Artist Application (ครบทุกฟิลด์)</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-bold">Name *</label>
                <input className="form-control" value={artist.name} onChange={e=>setA("name", e.target.value)} required />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Profile Photo URL</label>
                <input className="form-control" value={artist.profilePhotoUrl} onChange={e=>setA("profilePhotoUrl", e.target.value)} placeholder="https://..." />
              </div>

              <div className="col-12">
                <label className="form-label fw-bold">Description</label>
                <textarea className="form-control" rows={3} value={artist.description} onChange={e=>setA("description", e.target.value)} />
              </div>

              <div className="col-md-3">
                <label className="form-label fw-bold">Genre *</label>
                <input className="form-control" value={artist.genre} onChange={e=>setA("genre", e.target.value)} required />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-bold">Sub-genre</label>
                <input className="form-control" value={artist.subGenre} onChange={e=>setA("subGenre", e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-bold">Booking type *</label>
                <select className="form-select" value={artist.bookingType} onChange={e=>setA("bookingType", e.target.value)}>
                  {BOOKING_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-bold">Founding year</label>
                <input className="form-control" value={artist.foundingYear} onChange={e=>setA("foundingYear", e.target.value.replace(/[^\d]/g,""))} placeholder="YYYY" />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-bold">Label</label>
                <input className="form-control" value={artist.label} onChange={e=>setA("label", e.target.value)} />
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="isIndie" checked={artist.isIndependent} onChange={(e)=>setA("isIndependent", e.target.checked)} />
                  <label className="form-check-label" htmlFor="isIndie">Independent artist</label>
                </div>
              </div>

              <div className="col-md-4">
                <label className="form-label fw-bold">Member count</label>
                <input className="form-control" value={artist.memberCount} onChange={e=>setA("memberCount", e.target.value.replace(/[^\d]/g,""))} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold">Price min</label>
                <input className="form-control" value={artist.priceMin} onChange={e=>setA("priceMin", e.target.value.replace(/[^0-9.]/g,""))} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold">Price max</label>
                <input className="form-control" value={artist.priceMax} onChange={e=>setA("priceMax", e.target.value.replace(/[^0-9.]/g,""))} />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-bold">Contact email</label>
                <input className="form-control" value={artist.contactEmail} onChange={e=>setA("contactEmail", e.target.value)} placeholder="example@mail.com" />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Contact phone</label>
                <input className="form-control" value={artist.contactPhone} onChange={e=>setA("contactPhone", e.target.value)} placeholder="080-xxx-xxxx" />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-bold">Photo URL</label>
                <input className="form-control" value={artist.photoUrl} onChange={e=>setA("photoUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Video URL</label>
                <input className="form-control" value={artist.videoUrl} onChange={e=>setA("videoUrl", e.target.value)} placeholder="https://..." />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-bold">Rate card URL</label>
                <input className="form-control" value={artist.rateCardUrl} onChange={e=>setA("rateCardUrl", e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold">EPK URL</label>
                <input className="form-control" value={artist.epkUrl} onChange={e=>setA("epkUrl", e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold">Rider URL</label>
                <input className="form-control" value={artist.riderUrl} onChange={e=>setA("riderUrl", e.target.value)} />
              </div>

              {[
                ["spotifyUrl","Spotify"],
                ["youtubeUrl","YouTube"],
                ["appleMusicUrl","Apple Music"],
                ["facebookUrl","Facebook"],
                ["instagramUrl","Instagram"],
                ["twitterUrl","X (Twitter)"],
                ["soundcloudUrl","SoundCloud"],
                ["shazamUrl","Shazam"],
                ["bandcampUrl","Bandcamp"],
                ["tiktokUrl","TikTok"],
              ].map(([key,label]) => (
                <div className="col-md-6" key={key}>
                  <label className="form-label fw-bold">{label} URL</label>
                  <input className="form-control" value={artist[key]} onChange={e=>setA(key, e.target.value)} placeholder="https://..." />
                </div>
              ))}
            </div>
            <small className="text-muted d-block mt-2">
              เมื่อส่งแล้ว ระบบจะสร้าง/อัปเดตคำขออัปเกรดสิทธิ์เป็น ARTIST เพื่อให้แอดมินตรวจอนุมัติ
            </small>
          </div>
        )}

        <div>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
