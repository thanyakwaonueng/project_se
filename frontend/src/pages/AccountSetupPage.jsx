import React, { useEffect, useState } from "react";
import api, { extractErrorMessage } from "../lib/api";
import "../css/AccountSetupPage.css";

/* แนวเพลงตัวอย่าง */
const PRESET_GENRES = ["Pop","Rock","Indie","Jazz","Blues","Hip-Hop","EDM","Folk","Metal","R&B"];

/* ล้างค่าว่างออกก่อนส่ง */
function cleanObject(obj) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (typeof v === "string" && v.trim() === "") return;
    if (Array.isArray(v) && v.length === 0) return;
    out[k] = typeof v === "string" ? v.trim() : v;
  });
  return out;
}

export default function AccountSetupPage() {

  // Avatar (basic)
  const [avatarPreview, setAvatarPreview] = useState(""); // URL สำหรับพรีวิว
  const [avatarFile, setAvatarFile] = useState(null);     // ไฟล์ดิบ

  // 1) Role (เริ่มจากยังไม่เลือก)
  const [role, setRole] = useState(""); // "", "AUDIENCE", "ARTIST"

  // 2) โปรไฟล์พื้นฐาน
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [bio, setBio]               = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [birthDate, setBirthDate] = useState("");

  // ใช้คุม max ให้เลือกได้ไม่เกิน “วันนี้”
  const todayStr = React.useMemo(() => new Date().toISOString().slice(0,10), []);

  // 3) ฟอร์ม Artist (ครบทุกฟิลด์ตามที่ให้มา)
  const [artist, setArtist] = useState({
    name: "",
    profilePhotoUrl: "",
    description: "",

    genre: "",
    subGenre: "",
    bookingType: "", // FULL_BAND | TRIO | DUO | SOLO | etc.
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

  const setA = (key, value) => setArtist(prev => ({ ...prev, [key]: value }));

  // 4) UX
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [ok, setOk]           = useState(false);
  const [err, setErr]         = useState("");

  // Prefill
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      setOk(false);
      try {
        const { data } = await api.get("/api/auth/me", { withCredentials: true });
        if (!mounted || !data) return;

        setDisplayName(data.displayName || "");
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setBio(data.bio || "");
        setFavoriteGenres(Array.isArray(data.favoriteGenres) ? data.favoriteGenres : []);
      } catch (_e) {
        // ไม่ fatal
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleGenre = (g) => {
    setFavoriteGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const resetForm = () => {
    setRole("");
    setDisplayName(""); setFirstName(""); setLastName(""); setBio(""); setFavoriteGenres([]);
    setArtist({
      name: "", profilePhotoUrl: "", description: "",
      genre: "", subGenre: "", bookingType: "", foundingYear: "",
      label: "", isIndependent: false,
      memberCount: "", priceMin: "", priceMax: "",
      contactEmail: "", contactPhone: "",
      photoUrl: "", videoUrl: "",
      rateCardUrl: "", epkUrl: "", riderUrl: "",
      spotifyUrl: "", youtubeUrl: "", appleMusicUrl: "", facebookUrl: "",
      instagramUrl: "", twitterUrl: "", soundcloudUrl: "", shazamUrl: "",
      bandcampUrl: "", tiktokUrl: "",
    });
    setOk(false); setErr("");
  };

  

  const handleSave = async () => {
    setSaving(true);
    setErr(""); setOk(false);
    try {
      if (!role) throw new Error("กรุณาเลือก Role ก่อน");

      // (ทางเลือก) อัปโหลดไฟล์ก่อน เพื่อให้ได้ URL จริง
      let avatarUrl = null;
      try {
        avatarUrl = await uploadAvatarIfNeeded(); // ถ้าไม่ได้เลือกภาพ จะเป็น null
      } catch (_) {
        // ถ้าอัปโหลดล้มเหลว ไม่ถือเป็น fatal ในขั้นนี้ (ยังเซฟฟิลด์อื่นได้)
        // คุณจะเลือก throw เพื่อบังคับให้สำเร็จทั้งหมดก็ได้
      }

      // 1) บันทึกโปรไฟล์พื้นฐาน
      const setupPayload = {
        displayName,
        favoriteGenres,
        ...(avatarUrl ? { avatarUrl } : {}),        // ใส่เฉพาะเมื่อมี URL จริง
        ...(birthDate ? { birthDate } : {}),        // ใส่เมื่อผู้ใช้เลือกจริง
        ...(role === "ARTIST" ? { desiredRole: "ARTIST" } : {}),
      };

      await api.post("/api/me/setup", setupPayload, { withCredentials: true });

      // 2) ถ้า ARTIST -> ตรวจและส่งแบบฟอร์มครบทุกฟิลด์
      if (role === "ARTIST") {
        // validate ขั้นต่ำ
        if (!artist.name.trim())  throw new Error("กรุณากรอก Name (Stage name)");
        if (!artist.genre.trim()) throw new Error("กรุณากรอก Genre");
        if (!artist.bookingType.trim()) throw new Error("กรุณาเลือก Booking type");

        const hasSample =
          [artist.spotifyUrl, artist.youtubeUrl, artist.appleMusicUrl, artist.soundcloudUrl,
           artist.bandcampUrl, artist.tiktokUrl, artist.shazamUrl].some(v => v && v.trim() !== "");
        if (!hasSample) throw new Error("ใส่ลิงก์เพลง/ตัวอย่างผลงานอย่างน้อย 1 ช่อง");

        const hasContact =
          (artist.contactEmail && artist.contactEmail.trim() !== "") ||
          (artist.contactPhone && artist.contactPhone.trim() !== "");
        if (!hasContact) throw new Error("ใส่ช่องทางติดต่ออย่างน้อย 1 อย่าง (อีเมลหรือเบอร์)");

        // แปลงตัวเลข
        const foundingYearNum = artist.foundingYear ? parseInt(artist.foundingYear, 10) : undefined;
        const memberCountNum  = artist.memberCount  ? parseInt(artist.memberCount, 10)  : undefined;
        const priceMinNum     = artist.priceMin     ? Number(artist.priceMin)           : undefined;
        const priceMaxNum     = artist.priceMax     ? Number(artist.priceMax)           : undefined;

        const artistPayload = cleanObject({
          // mapping เข้ากับ backend (คงทั้งชื่อที่ตรง backend เดิม + ช่องใหม่)
          stageName: artist.name,         // เดิมเราเรียก stageName
          name: artist.name,              // เก็บซ้ำไว้ทั้งสอง key เผื่อ backend เครื่องคุณรองรับแบบใดแบบหนึ่ง
          genre: artist.genre,
          subGenre: artist.subGenre,
          bookingType: artist.bookingType,
          description: artist.description, // รายละเอียดยาว
          profilePhotoUrl: artist.profilePhotoUrl, // โปรไฟล์

          foundingYear: foundingYearNum,
          label: artist.label,
          isIndependent: !!artist.isIndependent,
          memberCount: memberCountNum,

          priceMin: priceMinNum,
          priceMax: priceMaxNum,

          contact: cleanObject({
            email: artist.contactEmail,
            phone: artist.contactPhone,
          }),

          // รูป/วิดีโอ/ไฟล์
          photoUrl: artist.photoUrl,
          videoUrl: artist.videoUrl,
          rateCardUrl: artist.rateCardUrl,
          epkUrl: artist.epkUrl,
          riderUrl: artist.riderUrl,

          // ลิงก์โซเชียล/สตรีมมิ่ง (รวมเป็นกลุ่ม links)
          links: cleanObject({
            spotify: artist.spotifyUrl,
            youtube: artist.youtubeUrl,
            appleMusic: artist.appleMusicUrl,
            facebook: artist.facebookUrl,
            instagram: artist.instagramUrl,
            twitter: artist.twitterUrl,
            soundcloud: artist.soundcloudUrl,
            shazam: artist.shazamUrl,
            bandcamp: artist.bandcampUrl,
            tiktok: artist.tiktokUrl,
          }),
        });

        await api.post("/api/artists", artistPayload, { withCredentials: true });
      }

      setOk(true);
    } catch (e) {
      setErr(extractErrorMessage?.(e) || e.message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };


  const avatarInputRef = React.useRef(null);

  const handlePickAvatar = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  /** (ทางเลือก) อัปโหลดไฟล์ไปเซิร์ฟเวอร์เพื่อให้ได้ URL จริง
   *  - เปลี่ยน endpoint ให้ตรงหลังบ้านของคุณ เช่น /api/uploads/avatar
   *  - ถ้า backend ยังไม่พร้อม เราจะส่งเฉพาะข้อมูลอื่นไปก่อนก็ได้
   */
  async function uploadAvatarIfNeeded() {
    if (!avatarFile) return null;
    const form = new FormData();
    form.append("file", avatarFile);
    // NOTE: เปลี่ยนเป็น endpoint จริงของคุณ
    const { data } = await api.post("/api/uploads/avatar", form, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.url || null; // สมมติ backend ส่ง { url: "https://..." }
  }


  const formRef = React.useRef(null);

  const chooseRole = (r) => {
    setRole(r);
    // เลื่อนลงไปยังฟอร์มหลังเลือก
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };




  return (
    <div className="acc-page">
      <div className="acc-container">
        <h1 className="acc-title">Account setup</h1>

        {/* เส้นคั่น */}
        <div className="a-line"></div>

        {ok  && <div className="acc-msg ok">บันทึกโปรไฟล์เรียบร้อย!</div>}
        {err && <div className="acc-msg err">{err}</div>}

        {/* ===== เลือก ROLE (แสดงเฉพาะยังไม่เลือก) ===== */}
        {!role && (
          <section className="acc-section acc-roleIntro">
            <h2 className="acc-sectionTitle">เลือกบทบาทของคุณ</h2>

            <div className="acc-roleGrid">
              {/* Audience Card */}
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

              {/* Artist Card */}
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

            {/* <div className="acc-help" style={{ marginTop: 10 }}>
              Organizer จะขอสิทธิ์ผ่านผู้ดูแลระบบเท่านั้น
            </div> */}
          </section>
        )}

        {/* ===== Basic profile ===== */}
        {role && (
          <div ref={formRef}>
          <section className="acc-section" aria-busy={loading}>
            <h2 className="acc-sectionTitle">Without music, life would be a mistake.</h2>

            <div className="acc-basicGrid">
              {/* ซ้าย: อวาตาร์ (ของเดิม) */}
              <div>
                <div className="acc-avatarCard" onClick={handlePickAvatar} role="button" aria-label="Upload avatar">
                  {avatarPreview ? (
                    <>
                      <img src={avatarPreview} alt="avatar preview" />
                      <div className="acc-avatarEdit">เปลี่ยนรูป</div>
                    </>
                  ) : (
                    <div className="acc-avatarHint">คลิกเพื่อเพิ่มรูป<br/>(สัดส่วน 1:1)</div>
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

              {/* ขวา: ฟิลด์ */}
              <div>
                <div className="acc-formGrid">
                  {/* Username (เส้นใต้ + โฟกัสดำ) */}
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

                  {/* วันเกิด */}
                  <div className="col-span-2">
                    <label className="acc-label">Birth date</label>

                    <input
                      type="date"
                      className="acc-inputUnderline acc-inputDate"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      max={todayStr}
                      inputMode="numeric"      // บนมือถือจะขึ้นแป้นตัวเลข
                      // ✅ อนุญาตให้พิมพ์: ไม่ใส่ onKeyDown ป้องกันอีกต่อไป
                      onFocus={(e) => e.target.showPicker?.()} // ยังเด้งปฏิทินได้
                    />
                  </div>

                  

                  {/* Favorite genres (เดิม) */}
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

        {/* ===== ARTIST: คงอยู่ตลอด (ซ่อนด้วย hidden กัน state หาย) ===== */}
        <section className="acc-section" hidden={role !== "ARTIST"}>
          <h2 className="acc-sectionTitle">Artist Application (ครบทุกฟิลด์)</h2>

          <div className="acc-formGrid">
            <div>
              <label className="acc-label">Name *</label>
              <input className="form-control"
                     value={artist.name}
                     onChange={e=>setA("name", e.target.value)}
                     required />
            </div>
            <div>
              <label className="acc-label">Profile Photo URL</label>
              <input value={artist.profilePhotoUrl}
                     onChange={e=>setA("profilePhotoUrl", e.target.value)}
                     placeholder="https://..." />
            </div>

            <div className="col-span-2">
              <label className="acc-label">Description</label>
              <textarea rows={3}
                        value={artist.description}
                        onChange={e=>setA("description", e.target.value)} />
            </div>

            <div>
              <label className="acc-label">Genre *</label>
              <input value={artist.genre}
                     onChange={e=>setA("genre", e.target.value)}
                     required />
            </div>
            <div>
              <label className="acc-label">Sub-genre</label>
              <input value={artist.subGenre}
                     onChange={e=>setA("subGenre", e.target.value)} />
            </div>
            <div>
              <label className="acc-label">Booking type *</label>
              <select value={artist.bookingType}
                      onChange={e=>setA("bookingType", e.target.value)}>
                <option value="">-- เลือกรูปแบบ --</option>
                <option value="FULL_BAND">Full-band</option>
                <option value="TRIO">Trio</option>
                <option value="DUO">Duo</option>
                <option value="SOLO">Solo</option>
              </select>
            </div>
            <div>
              <label className="acc-label">Founding year</label>
              <input value={artist.foundingYear}
                     onChange={e=>setA("foundingYear", e.target.value.replace(/[^\d]/g,""))}
                     placeholder="YYYY" />
            </div>

            <div>
              <label className="acc-label">Label</label>
              <input value={artist.label}
                     onChange={e=>setA("label", e.target.value)} />
            </div>
            <div>
              <label className="acc-label">Independent artist</label>
              <div className="acc-check">
                <input id="isIndie"
                       type="checkbox"
                       checked={artist.isIndependent}
                       onChange={(e)=>setA("isIndependent", e.target.checked)} />
                <label htmlFor="isIndie">Yes</label>
              </div>
            </div>

            <div>
              <label className="acc-label">Member count</label>
              <input value={artist.memberCount}
                     onChange={e=>setA("memberCount", e.target.value.replace(/[^\d]/g,""))} />
            </div>
            <div>
              <label className="acc-label">Price min</label>
              <input value={artist.priceMin}
                     onChange={e=>setA("priceMin", e.target.value.replace(/[^0-9.]/g,""))} />
            </div>
            <div>
              <label className="acc-label">Price max</label>
              <input value={artist.priceMax}
                     onChange={e=>setA("priceMax", e.target.value.replace(/[^0-9.]/g,""))} />
            </div>

            <div>
              <label className="acc-label">Contact email</label>
              <input value={artist.contactEmail}
                     onChange={e=>setA("contactEmail", e.target.value)}
                     placeholder="example@mail.com" />
            </div>
            <div>
              <label className="acc-label">Contact phone</label>
              <input value={artist.contactPhone}
                     onChange={e=>setA("contactPhone", e.target.value)}
                     placeholder="080-xxx-xxxx" />
            </div>

            <div>
              <label className="acc-label">Photo URL</label>
              <input value={artist.photoUrl}
                     onChange={e=>setA("photoUrl", e.target.value)}
                     placeholder="https://..." />
            </div>
            <div>
              <label className="acc-label">Video URL</label>
              <input value={artist.videoUrl}
                     onChange={e=>setA("videoUrl", e.target.value)}
                     placeholder="https://..." />
            </div>

            <div>
              <label className="acc-label">Rate card URL</label>
              <input value={artist.rateCardUrl}
                     onChange={e=>setA("rateCardUrl", e.target.value)} />
            </div>
            <div>
              <label className="acc-label">EPK URL</label>
              <input value={artist.epkUrl}
                     onChange={e=>setA("epkUrl", e.target.value)} />
            </div>
            <div>
              <label className="acc-label">Rider URL</label>
              <input value={artist.riderUrl}
                     onChange={e=>setA("riderUrl", e.target.value)} />
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
              <div key={key}>
                <label className="acc-label">{label} URL</label>
                <input value={artist[key]}
                       onChange={e=>setA(key, e.target.value)}
                       placeholder="https://..." />
              </div>
            ))}
          </div>
          <small className="acc-help" style={{ display: "block", marginTop: 8 }}>
            เมื่อส่งแล้ว ระบบจะสร้าง/อัปเดตคำขออัปเกรดสิทธิ์เป็น ARTIST เพื่อให้แอดมินตรวจอนุมัติ
          </small>
        </section>

        {/* Actions */}
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
