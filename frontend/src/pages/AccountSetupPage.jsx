// frontend/src/pages/AccountSetupPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api, { extractErrorMessage } from "../lib/api";
import "../css/AccountSetupPage.css";

/* ---------- ตัวเลือกแนวเพลง ---------- */
const PRESET_GENRES = [
  "Pop","Rock","Indie","Jazz","Blues","Hip-Hop","EDM","Folk","Metal","R&B"
];

/* ---------- helpers ---------- */
function cleanObject(obj) {
  const out = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (typeof v === "string" && v.trim() === "") return;
    if (Array.isArray(v) && v.length === 0) return;
    out[k] = typeof v === "string" ? v.trim() : v;
  });
  return out;
}
const intOrNull = (v) => (v === "" || v == null ? null : parseInt(v, 10));
const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
const strOrNull = (v) => {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
};

export default function AccountSetupPage() {
  /* ---------- Avatar (optional upload) ---------- */
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const avatarInputRef = useRef(null);

  /* ---------- Role ---------- */
  const [role, setRole] = useState(""); // "", "AUDIENCE", "ARTIST"

  /* ---------- โปรไฟล์ผู้ใช้พื้นฐาน ---------- */
  const [displayName, setDisplayName] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [birthDate, setBirthDate] = useState(""); // จะส่งเป็น "birthday"
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /* ---------- ฟอร์มศิลปิน ---------- */
  const [artist, setArtist] = useState({
    name: "",
    profilePhotoUrl: "",
    description: "",

    genre: "",
    subGenre: "",
    bookingType: "", // FULL_BAND | TRIO | DUO | SOLO
    foundingYear: "",

    label: "",
    isIndependent: false,

    memberCount: "",
    priceMin: "",
    priceMax: "",

    contactEmail: "",
    contactPhone: "",

    photoUrl: "",
    videoUrl: "",

    rateCardUrl: "",
    epkUrl: "",
    riderUrl: "",

    spotifyUrl: "",
    youtubeUrl: "",
    appleMusicUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    soundcloudUrl: "",
    shazamUrl: "",
    bandcampUrl: "",
    tiktokUrl: "",
  });
  const setA = (key, value) => setArtist((p) => ({ ...p, [key]: value }));

  /* ---------- UX ---------- */
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  /* ---------- Prefill จาก /auth/me ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      setOk(false);
      try {
        const { data } = await api.get("/api/auth/me", { withCredentials: true });
        if (!mounted || !data) return;

        // โปรไฟล์ผู้ใช้ (บางโปรเจกต์ nested ที่ data.profile)
        const p = data.profile || data;
        setDisplayName(p?.displayName || "");
        setFavoriteGenres(Array.isArray(p?.favoriteGenres) ? p.favoriteGenres : []);
        if (p?.birthday) {
          const d = new Date(p.birthday);
          if (!Number.isNaN(d)) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            setBirthDate(`${y}-${m}-${dd}`);
          }
        }
        if (p?.profileImageUrl) setAvatarPreview(p.profileImageUrl);

        // ถ้าเป็น ARTIST หรือมี pending request อาจอยาก default role = ARTIST
        if (data?.role === "ARTIST" || data?.pendingRoleRequest) {
          setRole("ARTIST");
        }

        // Prefill ฟอร์มศิลปินจาก artistProfile ที่อนุมัติแล้ว
        // หรือจาก application ที่ค้าง (PENDING)
        const src = data?.artistProfile
          ? { ...(data.artistProfile || {}) }
          : data?.pendingRoleRequest?.application
          ? { ...(data.pendingRoleRequest.application || {}) }
          : null;

        if (src) {
          const toStr = (v) => (v == null ? "" : String(v));
          const toYYYY = (v) => (Number(v) > 0 ? String(v) : "");
          setArtist({
            name: toStr(src.name),
            profilePhotoUrl: toStr(src.profilePhotoUrl || src.photoUrl),
            description: toStr(src.description),

            genre: toStr(src.genre),
            subGenre: toStr(src.subGenre),
            bookingType: toStr(src.bookingType || ""),

            foundingYear: toYYYY(src.foundingYear),

            label: toStr(src.label),
            isIndependent: src.isIndependent !== false,

            memberCount: toStr(src.memberCount ?? ""),
            priceMin: toStr(src.priceMin ?? ""),
            priceMax: toStr(src.priceMax ?? ""),

            contactEmail: toStr(src.contactEmail),
            contactPhone: toStr(src.contactPhone),

            photoUrl: toStr(src.photoUrl),
            videoUrl: toStr(src.videoUrl),

            rateCardUrl: toStr(src.rateCardUrl),
            epkUrl: toStr(src.epkUrl),
            riderUrl: toStr(src.riderUrl),

            spotifyUrl: toStr(src.spotifyUrl),
            youtubeUrl: toStr(src.youtubeUrl),
            appleMusicUrl: toStr(src.appleMusicUrl),
            facebookUrl: toStr(src.facebookUrl),
            instagramUrl: toStr(src.instagramUrl),
            twitterUrl: toStr(src.twitterUrl),
            soundcloudUrl: toStr(src.soundcloudUrl),
            shazamUrl: toStr(src.shazamUrl),
            bandcampUrl: toStr(src.bandcampUrl),
            tiktokUrl: toStr(src.tiktokUrl),
          });
        }
      } catch {
        // ไม่ fatal
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- actions ---------- */
  const toggleGenre = (g) =>
    setFavoriteGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );

  const resetForm = () => {
    setRole("");
    setDisplayName("");
    setFavoriteGenres([]);
    setBirthDate("");
    setAvatarFile(null);
    setAvatarPreview("");
    setArtist({
      name: "",
      profilePhotoUrl: "",
      description: "",
      genre: "",
      subGenre: "",
      bookingType: "",
      foundingYear: "",
      label: "",
      isIndependent: false,
      memberCount: "",
      priceMin: "",
      priceMax: "",
      contactEmail: "",
      contactPhone: "",
      photoUrl: "",
      videoUrl: "",
      rateCardUrl: "",
      epkUrl: "",
      riderUrl: "",
      spotifyUrl: "",
      youtubeUrl: "",
      appleMusicUrl: "",
      facebookUrl: "",
      instagramUrl: "",
      twitterUrl: "",
      soundcloudUrl: "",
      shazamUrl: "",
      bandcampUrl: "",
      tiktokUrl: "",
    });
    setOk(false);
    setErr("");
  };

  const handlePickAvatar = () => avatarInputRef.current?.click();

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  /** (ทางเลือก) อัปโหลดไฟล์เพื่อให้ได้ URL จริง */
  async function uploadAvatarIfNeeded() {
    if (!avatarFile) return null;
    const form = new FormData();
    form.append("file", avatarFile);
    // NOTE: แก้เป็น endpoint อัปโหลดจริงของคุณถ้ามี
    const { data } = await api.post("/api/uploads/avatar", form, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.url || null;
  }

  const formRef = useRef(null);
  const chooseRole = (r) => {
    setRole(r);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleSave = async () => {
    setSaving(true);
    setErr("");
    setOk(false);
    try {
      if (!role) throw new Error("กรุณาเลือก Role ก่อน");

      // อัปโหลด avatar ให้ได้ URL จริง (ถ้ามี)
      let avatarUrl = null;
      try {
        avatarUrl = await uploadAvatarIfNeeded();
      } catch {
        // ไม่บังคับล้มเหลว
      }

      // validate ฝั่งหน้า (เฉพาะเลือก ARTIST)
      if (role === "ARTIST") {
        if (!artist.name.trim()) throw new Error("กรุณากรอก Name (Stage name)");
        if (!artist.genre.trim()) throw new Error("กรุณากรอก Genre");
        if (!artist.bookingType.trim()) throw new Error("กรุณาเลือก Booking type");
        const hasSample = [
          artist.spotifyUrl,
          artist.youtubeUrl,
          artist.appleMusicUrl,
          artist.soundcloudUrl,
          artist.bandcampUrl,
          artist.tiktokUrl,
          artist.shazamUrl,
        ].some((v) => v && v.trim() !== "");
        if (!hasSample) throw new Error("ใส่ลิงก์เพลง/ตัวอย่างผลงานอย่างน้อย 1 ช่อง");
        const hasContact =
          (artist.contactEmail && artist.contactEmail.trim() !== "") ||
          (artist.contactPhone && artist.contactPhone.trim() !== "");
        if (!hasContact) throw new Error("ใส่ช่องทางติดต่ออย่างน้อย 1 อย่าง (อีเมลหรือเบอร์)");
      }

      // payload หลัก ไป /api/me/setup ครั้งเดียว
      const payload = {
        displayName,
        favoriteGenres,
        ...(avatarUrl ? { profileImageUrl: avatarUrl } : {}),
        ...(birthDate ? { birthday: birthDate } : {}),
        ...(role === "ARTIST" ? { desiredRole: "ARTIST" } : {}),
        // ส่ง application เฉพาะตอนเลือก ARTIST
        ...(role === "ARTIST"
          ? {
              artistApplication: cleanObject({
                name: artist.name,
                description: strOrNull(artist.description),

                genre: artist.genre,
                subGenre: strOrNull(artist.subGenre),
                bookingType: artist.bookingType,

                foundingYear: intOrNull(artist.foundingYear),
                label: strOrNull(artist.label),
                isIndependent: !!artist.isIndependent,

                memberCount: intOrNull(artist.memberCount),
                priceMin: numOrNull(artist.priceMin),
                priceMax: numOrNull(artist.priceMax),

                contactEmail: strOrNull(artist.contactEmail),
                contactPhone: strOrNull(artist.contactPhone),

                photoUrl: strOrNull(artist.photoUrl),
                videoUrl: strOrNull(artist.videoUrl),
                profilePhotoUrl: strOrNull(artist.profilePhotoUrl),
                rateCardUrl: strOrNull(artist.rateCardUrl),
                epkUrl: strOrNull(artist.epkUrl),
                riderUrl: strOrNull(artist.riderUrl),

                spotifyUrl: strOrNull(artist.spotifyUrl),
                youtubeUrl: strOrNull(artist.youtubeUrl),
                appleMusicUrl: strOrNull(artist.appleMusicUrl),
                facebookUrl: strOrNull(artist.facebookUrl),
                instagramUrl: strOrNull(artist.instagramUrl),
                twitterUrl: strOrNull(artist.twitterUrl),
                soundcloudUrl: strOrNull(artist.soundcloudUrl),
                shazamUrl: strOrNull(artist.shazamUrl),
                bandcampUrl: strOrNull(artist.bandcampUrl),
                tiktokUrl: strOrNull(artist.tiktokUrl),
              }),
            }
          : {}),
      };

      await api.post("/api/me/setup", payload, { withCredentials: true });

      setOk(true);
    } catch (e) {
      setErr(extractErrorMessage?.(e) || e.message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="acc-page">
      <div className="acc-container">
        <h1 className="acc-title">Account setup</h1>

        <div className="a-line"></div>

        {ok && <div className="acc-msg ok">บันทึกโปรไฟล์เรียบร้อย!</div>}
        {err && <div className="acc-msg err">{err}</div>}

        {/* เลือก ROLE */}
        {!role && (
          <section className="acc-section acc-roleIntro">
            <h2 className="acc-sectionTitle">เลือกบทบาทของคุณ</h2>

            <div className="acc-roleGrid">
              <button
                type="button"
                className="acc-roleCard"
                onClick={() => chooseRole("AUDIENCE")}
                aria-label="เลือกบทบาท Audience"
              >
                <div className="acc-roleCardLabel">Audience</div>
                <div className="acc-roleThumb">
                  <img src="/img/audience.png" alt="" className="acc-roleImg" />
                </div>
              </button>

              <button
                type="button"
                className="acc-roleCard"
                onClick={() => chooseRole("ARTIST")}
                aria-label="เลือกบทบาท Artist"
              >
                <div className="acc-roleCardLabel">Artist</div>
                <div className="acc-roleThumb">
                  <img src="/img/artist.png" alt="" className="acc-roleImg" />
                </div>
              </button>
            </div>
          </section>
        )}

        {/* Basic profile */}
        {role && (
          <div ref={formRef}>
            <section className="acc-section" aria-busy={loading}>
              <h2 className="acc-sectionTitle">Without music, life would be a mistake.</h2>

              <div className="acc-basicGrid">
                {/* ซ้าย: Avatar */}
                <div>
                  <div
                    className="acc-avatarCard"
                    onClick={handlePickAvatar}
                    role="button"
                    aria-label="Upload avatar"
                  >
                    {avatarPreview ? (
                      <>
                        <img src={avatarPreview} alt="avatar preview" />
                        <div className="acc-avatarEdit">เปลี่ยนรูป</div>
                      </>
                    ) : (
                      <div className="acc-avatarHint">
                        คลิกเพื่อเพิ่มรูป<br />(สัดส่วน 1:1)
                      </div>
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="acc-fileInput"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* ขวา: fields */}
                <div>
                  <div className="acc-formGrid">
                    <div className="col-span-2">
                      <label className="acc-label">Username</label>
                      <input
                        type="text"
                        className="acc-inputUnderline"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="ตั้งชื่อผู้ใช้"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="acc-label">Birth date</label>
                      <input
                        type="date"
                        className="acc-inputUnderline acc-inputDate"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        max={todayStr}
                        inputMode="numeric"
                        onFocus={(e) => e.target.showPicker?.()}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="acc-label">Favorite genres</label>
                      <div className="acc-chips">
                        {PRESET_GENRES.map((g) => {
                          const selected = favoriteGenres.includes(g);
                          return (
                            <button
                              key={g}
                              type="button"
                              className={`acc-chip ${selected ? "is-selected" : ""}`}
                              aria-pressed={selected}
                              onClick={() => toggleGenre(g)}
                            >
                              {g}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Artist Application */}
        <section className="acc-section" hidden={role !== "ARTIST"}>
          <h2 className="acc-sectionTitle">Artist Application (ครบทุกฟิลด์)</h2>

          <div className="acc-formGrid">
            <div>
              <label className="acc-label">Name *</label>
              <input value={artist.name} onChange={(e) => setA("name", e.target.value)} required />
            </div>
            <div>
              <label className="acc-label">Profile Photo URL</label>
              <input
                value={artist.profilePhotoUrl}
                onChange={(e) => setA("profilePhotoUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="col-span-2">
              <label className="acc-label">Description</label>
              <textarea
                rows={3}
                value={artist.description}
                onChange={(e) => setA("description", e.target.value)}
              />
            </div>

            <div>
              <label className="acc-label">Genre *</label>
              <input value={artist.genre} onChange={(e) => setA("genre", e.target.value)} required />
            </div>
            <div>
              <label className="acc-label">Sub-genre</label>
              <input value={artist.subGenre} onChange={(e) => setA("subGenre", e.target.value)} />
            </div>
            <div>
              <label className="acc-label">Booking type *</label>
              <select
                value={artist.bookingType}
                onChange={(e) => setA("bookingType", e.target.value)}
              >
                <option value="">-- เลือกรูปแบบ --</option>
                <option value="FULL_BAND">Full-band</option>
                <option value="TRIO">Trio</option>
                <option value="DUO">Duo</option>
                <option value="SOLO">Solo</option>
              </select>
            </div>
            <div>
              <label className="acc-label">Founding year</label>
              <input
                value={artist.foundingYear}
                onChange={(e) => setA("foundingYear", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="YYYY"
              />
            </div>

            <div>
              <label className="acc-label">Label</label>
              <input value={artist.label} onChange={(e) => setA("label", e.target.value)} />
            </div>
            <div>
              <label className="acc-label">Independent artist</label>
              <div className="acc-check">
                <input
                  id="isIndie"
                  type="checkbox"
                  checked={artist.isIndependent}
                  onChange={(e) => setA("isIndependent", e.target.checked)}
                />
                <label htmlFor="isIndie">Yes</label>
              </div>
            </div>

            <div>
              <label className="acc-label">Member count</label>
              <input
                value={artist.memberCount}
                onChange={(e) => setA("memberCount", e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div>
              <label className="acc-label">Price min</label>
              <input
                value={artist.priceMin}
                onChange={(e) => setA("priceMin", e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </div>
            <div>
              <label className="acc-label">Price max</label>
              <input
                value={artist.priceMax}
                onChange={(e) => setA("priceMax", e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </div>

            <div>
              <label className="acc-label">Contact email</label>
              <input
                value={artist.contactEmail}
                onChange={(e) => setA("contactEmail", e.target.value)}
                placeholder="example@mail.com"
              />
            </div>
            <div>
              <label className="acc-label">Contact phone</label>
              <input
                value={artist.contactPhone}
                onChange={(e) => setA("contactPhone", e.target.value)}
                placeholder="080-xxx-xxxx"
              />
            </div>

            <div>
              <label className="acc-label">Photo URL</label>
              <input
                value={artist.photoUrl}
                onChange={(e) => setA("photoUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="acc-label">Video URL</label>
              <input
                value={artist.videoUrl}
                onChange={(e) => setA("videoUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="acc-label">Rate card URL</label>
              <input value={artist.rateCardUrl} onChange={(e) => setA("rateCardUrl", e.target.value)} />
            </div>
            <div>
              <label className="acc-label">EPK URL</label>
              <input value={artist.epkUrl} onChange={(e) => setA("epkUrl", e.target.value)} />
            </div>
            <div>
              <label className="acc-label">Rider URL</label>
              <input value={artist.riderUrl} onChange={(e) => setA("riderUrl", e.target.value)} />
            </div>

            {[
              ["spotifyUrl", "Spotify"],
              ["youtubeUrl", "YouTube"],
              ["appleMusicUrl", "Apple Music"],
              ["facebookUrl", "Facebook"],
              ["instagramUrl", "Instagram"],
              ["twitterUrl", "X (Twitter)"],
              ["soundcloudUrl", "SoundCloud"],
              ["shazamUrl", "Shazam"],
              ["bandcampUrl", "Bandcamp"],
              ["tiktokUrl", "TikTok"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="acc-label">{label} URL</label>
                <input
                  value={artist[key]}
                  onChange={(e) => setA(key, e.target.value)}
                  placeholder="https://..."
                />
              </div>
            ))}
          </div>

          <small className="acc-help" style={{ display: "block", marginTop: 8 }}>
            เมื่อส่งแล้ว ระบบจะสร้าง/อัปเดตคำขออัปเกรดสิทธิ์เป็น ARTIST เพื่อให้แอดมินตรวจอนุมัติ
          </small>
        </section>

        {/* ปุ่ม action */}
        <div className="acc-actions">
          <button type="button" className="acc-btn" onClick={resetForm}>
            Reset
          </button>
          <button
            type="button"
            className="acc-btn acc-btnPrimary"
            disabled={!role || saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
