// frontend/src/pages/AccountSetupPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

/* ===== Helper components ===== */
function DocField({
  label,
  existing,         // { downloadUrl, name?, size?, mime? } | null
  removed,          // boolean
  onRemoveToggle,   // () => void
  file,             // File | null
  onPick,           // (e) => void
  accept,           // string | undefined
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="acc-label">{label}</label>

      {/* แสดงไฟล์เดิมถ้ายังไม่ได้เลือกไฟล์ใหม่ และยังไม่กดลบ */}
      {!file && existing && !removed && (
        <div className="acc-doc-current">
          <a
            href={existing.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="acc-doc-link"
          >
            View current file{existing.name ? ` (${existing.name})` : ""}
          </a>
          <button
            type="button"
            className="acc-mini-btn danger"
            style={{ marginLeft: 8 }}
            onClick={onRemoveToggle}
          >
            Remove
          </button>
        </div>
      )}

      {/* ถ้ากด Remove แล้ว ให้ขึ้นสถานะลบ และสามารถ Undo ได้ */}
      {!file && existing && removed && (
        <div className="acc-doc-removed">
          <em>Marked to remove</em>
          <button
            type="button"
            className="acc-mini-btn"
            style={{ marginLeft: 8 }}
            onClick={onRemoveToggle}
          >
            Undo
          </button>
        </div>
      )}

      {/* ปุ่มเลือกไฟล์ใหม่ */}
      <label className="apm-fileBtn apm-fileBtn-secondary" style={{ display: "inline-block", marginTop: 8 }}>
        Choose file
        <input type="file" hidden onChange={onPick} accept={accept} />
      </label>

      {/* แสดงชื่อไฟล์ใหม่ที่เลือก */}
      {file && (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          Selected: <strong>{file.name}</strong>
        </div>
      )}
    </div>
  );
}

export default function AccountSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isEdit = params.get("edit") === "1";

  // ====== CSV helpers (ย้ายมาไว้บนสุดของ component เพื่อให้ใช้ได้ทุกที่) ======
  function splitCsv(str) {
    return (str || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }
  function joinCsv(arr) {
    return (arr || []).filter(Boolean).join(", ");
  }

  // ===== แปลง Google Drive link -> /preview ให้เล่นใน react-player ได้ดีขึ้น =====
  function normalizeVideoUrl(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    try {
      const u = new URL(s);
      if (u.hostname.includes("drive.google.com")) {
        // รูปแบบ: /file/d/<ID>/view?usp=sharing
        const parts = u.pathname.split("/");
        const i = parts.findIndex(p => p === "file");
        if (i !== -1 && parts[i+1] === "d" && parts[i+2]) {
          const id = parts[i+2];
          return `https://drive.google.com/file/d/${id}/preview`;
        }
        // รูปแบบ: /open?id=<ID>
        if (u.searchParams.get("id")) {
          const id = u.searchParams.get("id");
          return `https://drive.google.com/file/d/${id}/preview`;
        }
      }
      return s;
    } catch {
      return s;
    }
  }

  // Avatar (basic)
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  // ===== รูปภาพ (ยังคงอัปโหลดไฟล์) =====
  const [apmImageFiles, setApmImageFiles] = useState([]); // เลือกรูปหลายไฟล์
  const apmOnPickImages = (e) => setApmImageFiles(Array.from(e.target.files || []));

  // ===== วิดีโอแบบลิงก์ (Link-only) =====
  const [videoLinks, setVideoLinks] = useState([""]);
  function updateVideoLinkAt(i, val) {
    setVideoLinks(prev => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  }
  function addVideoLink() { setVideoLinks(prev => [...prev, ""]); }
  function removeVideoLink(i) { setVideoLinks(prev => prev.filter((_, idx) => idx !== i)); }

  // Role
  const [role, setRole] = useState(""); // "", "AUDIENCE", "ARTIST"

  // Basic profile
  const [displayName, setDisplayName] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [birthDate, setBirthDate] = useState("");
  const todayStr = React.useMemo(() => new Date().toISOString().slice(0,10), []);

  // Artist form
  const [artist, setArtist] = useState({
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
  const setA = (key, value) => setArtist(prev => ({ ...prev, [key]: value }));

  // UX
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [ok, setOk]           = useState(false);
  const [err, setErr]         = useState("");

  // ใช้แยก flow ว่าผู้ใช้ “ได้รับอนุมัติเป็น ARTIST แล้วหรือยัง”
  const [meRole, setMeRole] = useState("AUDIENCE");
  const [priceRange, setPriceRange] = useState("");

  // ===== docs upload states & handlers =====
  const [docRateCard, setDocRateCard] = useState(null); // File | null
  const [docEPK, setDocEPK]           = useState(null);
  const [docRider, setDocRider]       = useState(null);
  const onPickRateCard = (e) => setDocRateCard(e.target.files?.[0] ?? null);
  const onPickEPK      = (e) => setDocEPK(e.target.files?.[0] ?? null);
  const onPickRider    = (e) => setDocRider(e.target.files?.[0] ?? null);

  // NEW: เก็บไฟล์เดิม + ธงลบไฟล์
  const [existingRateCard, setExistingRateCard] = useState(null);
  const [existingEPK, setExistingEPK]           = useState(null);
  const [existingRider, setExistingRider]       = useState(null);
  const [removeRateCard, setRemoveRateCard] = useState(false);
  const [removeEPK, setRemoveEPK]           = useState(false);
  const [removeRider, setRemoveRider]       = useState(false);

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

      // role จริงของระบบ
      setMeRole(data.role || "AUDIENCE");

      // ตั้งค่า role ในฟอร์ม
      if (isEdit) setRole(data.role || "AUDIENCE");
      else setRole("");

      setDisplayName(data.name || (data.email ? data.email.split("@")[0] : "") || "");
      setFavoriteGenres(Array.isArray(data.favoriteGenres) ? data.favoriteGenres : []);
      if (data.birthday) {
        const d = new Date(data.birthday);
        if (!Number.isNaN(d)) setBirthDate(d.toISOString().slice(0, 10));
      }
      if (data.profilePhotoUrl) setAvatarPreview(data.profilePhotoUrl);

      const p = data.performerInfo || {};
      const a = p.artistInfo || {};
      const pendingApp = data.pendingRoleRequest?.application?.artist || null;

      // โหลด media ล่าสุดจาก ArtistRecord (ถ้ามี)
      const recs = Array.isArray(a.artistRecords) ? [...a.artistRecords] : [];
      recs.sort((r1, r2) => {
        const t1 = Math.max(r1.date ? +new Date(r1.date) : 0, r1.createdAt ? +new Date(r1.createdAt) : 0);
        const t2 = Math.max(r2.date ? +new Date(r2.date) : 0, r2.createdAt ? +new Date(r2.createdAt) : 0);
        return t2 - t1;
      });
      const latest = recs[0] || null;
      const recPhoto = latest?.thumbnailUrl || (latest?.photoUrls?.[0] ?? "");
      const recVideos = Array.isArray(latest?.videoUrls) ? latest.videoUrls.filter(Boolean) : [];

      if (a && Object.keys(a).length) {
        setArtist(prev => ({
          ...prev,
          name: (pendingApp?.name) || data.name || prev.name,
          profilePhotoUrl: (a.profilePhotoUrl ?? pendingApp?.profilePhotoUrl ?? data.profilePhotoUrl ?? recPhoto) || prev.profilePhotoUrl,

          description: a.description || prev.description,
          genre: a.genre || prev.genre,
          subGenre: a.subGenre || prev.subGenre,
          bookingType: a.bookingType || prev.bookingType,
          foundingYear: a.foundingYear || prev.foundingYear,
          label: a.label || prev.label,
          isIndependent: typeof a.isIndependent === "boolean" ? a.isIndependent : prev.isIndependent,
          memberCount: a.memberCount ?? prev.memberCount,
          priceMin: a.priceMin ?? prev.priceMin,
          priceMax: a.priceMax ?? prev.priceMax,

          contactEmail: p.contactEmail || pendingApp?.contactEmail || prev.contactEmail,
          contactPhone: p.contactPhone || pendingApp?.contactPhone || prev.contactPhone,

          // รวม CSV จาก application + วิดีโอจาก ArtistRecord (ทั้งลิสต์)
          photoUrl: (pendingApp?.photoUrl ?? recPhoto) || prev.photoUrl,
          videoUrl: (() => {
            const fromApp = splitCsv(pendingApp?.videoUrl || a.videoUrl || "");
            const merged  = [...fromApp, ...recVideos];
            return merged.length ? joinCsv(merged) : (prev.videoUrl || "");
          })(),

          rateCardUrl: a.rateCardUrl || pendingApp?.rateCardUrl || prev.rateCardUrl,
          epkUrl: a.epkUrl || pendingApp?.epkUrl || prev.epkUrl,
          riderUrl: a.riderUrl || pendingApp?.riderUrl || prev.riderUrl,

          spotifyUrl: a.spotifyUrl || pendingApp?.spotifyUrl || prev.spotifyUrl,
          youtubeUrl: p.youtubeUrl || a.youtubeUrl || pendingApp?.youtubeUrl || prev.youtubeUrl,
          appleMusicUrl: a.appleMusicUrl || pendingApp?.appleMusicUrl || prev.appleMusicUrl,
          facebookUrl: p.facebookUrl || a.facebookUrl || pendingApp?.facebookUrl || prev.facebookUrl,
          instagramUrl: p.instagramUrl || a.instagramUrl || pendingApp?.instagramUrl || prev.instagramUrl,
          twitterUrl: p.twitterUrl || a.twitterUrl || pendingApp?.twitterUrl || prev.twitterUrl,
          soundcloudUrl: a.soundcloudUrl || pendingApp?.soundcloudUrl || prev.soundcloudUrl,
          shazamUrl: a.shazamUrl || pendingApp?.shazamUrl || prev.shazamUrl,
          bandcampUrl: a.bandcampUrl || pendingApp?.bandcampUrl || prev.bandcampUrl,
          tiktokUrl: p.tiktokUrl || a.tiktokUrl || pendingApp?.tiktokUrl || prev.tiktokUrl,
        }));

        // เก็บไฟล์เดิม (object-style ถ้ามี, ไม่มีก็ห่อจาก URL)
        setExistingRateCard(
          a.rateCard?.downloadUrl
            ? a.rateCard
            : (a.rateCardUrl ? { downloadUrl: a.rateCardUrl } : null)
        );
        setExistingEPK(
          a.epk?.downloadUrl
            ? a.epk
            : (a.epkUrl ? { downloadUrl: a.epkUrl } : null)
        );
        setExistingRider(
          a.rider?.downloadUrl
            ? a.rider
            : (a.riderUrl ? { downloadUrl: a.riderUrl } : null)
        );
      }

      // Prefill ช่องกรอกลิงก์: ใช้ทั้งลิสต์ (application CSV + ArtistRecord)
      setVideoLinks(() => {
        const fromApp = splitCsv(pendingApp?.videoUrl || a.videoUrl || "");
        const merged  = [...fromApp, ...recVideos];
        return merged.length ? merged : [""];
      });

      const min = a.priceMin ?? "";
      const max = a.priceMax ?? "";
      setPriceRange(min !== "" || max !== "" ? `${min}${max !== "" ? "-" + max : ""}` : "");
    } catch {
      /* ignore */
    } finally {
      mounted && setLoading(false);
    }
  })();
  return () => { mounted = false; };
}, [isEdit]);


  const toggleGenre = (g) => {
    setFavoriteGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const resetForm = () => {
    setRole(isEdit ? role : "");
    setDisplayName("");
    setFavoriteGenres([]);
    setBirthDate("");
    setAvatarFile(null);
    setAvatarPreview("");
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
    setOk(false);
    setErr("");
    setPriceRange("");
    setDocRateCard(null);
    setDocEPK(null);
    setDocRider(null);
    setExistingRateCard(null);
    setExistingEPK(null);
    setExistingRider(null);
    setRemoveRateCard(false);
    setRemoveEPK(false);
    setRemoveRider(false);
    setApmImageFiles([]);
    setVideoLinks([""]);
  };

  async function uploadDoc(file) {
    if (!file) return null;
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post("/api/upload", form, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    });
    // สมมติ backend ตอบ { url, name?, size?, mime? }
    return data?.url ? { downloadUrl: data.url, name: file.name, size: file.size, mime: file.type } : null;
  }

 const handleSave = async () => {
  setSaving(true);
  setErr(""); setOk(false);
  try {
    if (!role) throw new Error("กรุณาเลือก Role ก่อน");

    // อัปโหลด avatar ถ้ามี
    let avatarUrl = null;
    try { avatarUrl = await uploadAvatarIfNeeded(); } catch {}

    // อัปโหลดเอกสาร 3 ไฟล์ (ถ้าเลือกมา)
    const upRate  = await uploadDoc(docRateCard); // => {downloadUrl, name, ...} | null
    const upEPK   = await uploadDoc(docEPK);
    const upRider = await uploadDoc(docRider);

    // อัปโหลดรูปใหม่
    const newImageUrls = await uploadMany(apmImageFiles);

    // รวมรูปกับของเดิม (CSV เดิมในฟอร์ม)
    const mergedPhotoUrls = [...splitCsv(artist.photoUrl), ...newImageUrls].filter(Boolean);

    // รวมวิดีโอจาก “ช่องกรอกลิงก์” + ของเดิม (CSV) + dedupe
    const typedLinks = videoLinks.map(normalizeVideoUrl).filter(Boolean);
    const mergedVideoUrls = Array.from(new Set([
      ...splitCsv(artist.videoUrl),
      ...typedLinks,
    ])).filter(Boolean);

    // helper: คืนค่า object-style ถ้ามีไฟล์ใหม่, ถ้าไม่มีก็ใช้ของเดิม (ถ้าไม่ถูกกดลบ)
    const keepOrNew = (uploaded, existing, removed) =>
      removed ? undefined : (uploaded || existing || undefined);

    // helper: สำหรับช่อง URL legacy
    const urlWhen = (uploaded, existing, removed) => {
      if (removed) return "";                                   // ล้าง
      if (uploaded?.downloadUrl) return uploaded.downloadUrl;    // จากไฟล์ใหม่
      if (existing?.downloadUrl) return existing.downloadUrl;    // ของเดิม
      return undefined; // ไม่มีอะไร
    };

    // 1) บันทึกโปรไฟล์พื้นฐาน (+ แนบใบสมัครถ้าเลือก ARTIST)
    const setupPayload = cleanObject({
      name: displayName || artist?.name || undefined,
      favoriteGenres,
      profileImageUrl: avatarUrl ?? (avatarPreview && !avatarPreview.startsWith("blob:") ? avatarPreview : undefined),
      birthday: birthDate || undefined,
      ...(role === "ARTIST" ? { desiredRole: "ARTIST" } : {}),
    });

    if (role === "ARTIST") {
      if (!artist.name.trim())  throw new Error("กรุณากรอก Name (Stage name)");
      if (!artist.genre.trim()) throw new Error("กรุณากรอก Genre");
      if (!artist.bookingType.trim()) throw new Error("กรุณาเลือก Booking type");

      const hasSample = [
        artist.spotifyUrl, artist.youtubeUrl, artist.appleMusicUrl, artist.soundcloudUrl,
        artist.bandcampUrl, artist.tiktokUrl, artist.shazamUrl
      ].some(v => v && v.trim() !== "");
      if (!hasSample) throw new Error("ใส่ลิงก์เพลง/ตัวอย่างผลงานอย่างน้อย 1 ช่อง");

      const hasContact = (artist.contactEmail && artist.contactEmail.trim() !== "") ||
                         (artist.contactPhone && artist.contactPhone.trim() !== "");
      if (!hasContact) throw new Error("ใส่ช่องทางติดต่ออย่างน้อย 1 อย่าง (อีเมลหรือเบอร์)");

      const foundingYearNum = artist.foundingYear ? parseInt(artist.foundingYear, 10) : null;
      const memberCountNum  = artist.memberCount  ? parseInt(artist.memberCount, 10)  : null;
      const priceMinNum     = artist.priceMin     ? Number(artist.priceMin)           : null;
      const priceMaxNum     = artist.priceMax     ? Number(artist.priceMax)           : null;

      setupPayload.artistApplication = cleanObject({
        name: artist.name,
        description: artist.description,
        genre: artist.genre,
        subGenre: artist.subGenre,
        bookingType: artist.bookingType,
        foundingYear: foundingYearNum,
        label: artist.label,
        isIndependent: !!artist.isIndependent,
        memberCount: memberCountNum,
        priceMin: priceMinNum,
        priceMax: priceMaxNum,
        profilePhotoUrl: artist.profilePhotoUrl,

        // legacy CSV เพื่อให้ดูต่อเนื่องใน admin
        photoUrl: joinCsv(mergedPhotoUrls),
        videoUrl: joinCsv(mergedVideoUrls),

        // แนบแบบ array ด้วย (ยืดหยุ่นกว่า)
        photoUrls: mergedPhotoUrls,
        videoUrls: mergedVideoUrls,

        // legacy url fields
        rateCardUrl: urlWhen(upRate,  existingRateCard, removeRateCard),
        epkUrl:      urlWhen(upEPK,   existingEPK,      removeEPK),
        riderUrl:    urlWhen(upRider, existingRider,    removeRider),

        // object-style (ใหม่)
        rateCard: keepOrNew(upRate,  existingRateCard, removeRateCard),
        epk:      keepOrNew(upEPK,   existingEPK,      removeEPK),
        rider:    keepOrNew(upRider, existingRider,    removeRider),

        contactEmail: artist.contactEmail,
        contactPhone: artist.contactPhone,
        spotifyUrl: artist.spotifyUrl,
        youtubeUrl: artist.youtubeUrl,
        appleMusicUrl: artist.appleMusicUrl,
        facebookUrl: artist.facebookUrl,
        instagramUrl: artist.instagramUrl,
        twitterUrl: artist.twitterUrl,
        soundcloudUrl: artist.soundcloudUrl,
        shazamUrl: artist.shazamUrl,
        bandcampUrl: artist.bandcampUrl,
        tiktokUrl: artist.tiktokUrl,
      });
    }

    await api.post("/api/me/setup", setupPayload, { withCredentials: true });

    // 2) “อัปเดต Artist จริง” เฉพาะเมื่อ role จริงเป็น ARTIST/ADMIN
    // 2) “อัปเดต Artist จริง” เฉพาะเมื่อ role จริงเป็น ARTIST/ADMIN
const approved = meRole === "ARTIST" || meRole === "ADMIN";
if (approved && role === "ARTIST") {
  // ใช้ helper เดิมที่คำนวณไว้ข้างบน
  const keepOrNew = (uploaded, existing, removed) =>
    removed ? undefined : (uploaded || existing || undefined);

  const urlWhen = (uploaded, existing, removed) => {
    if (removed) return "";                                   // สั่งลบ
    if (uploaded?.downloadUrl) return uploaded.downloadUrl;    // ใช้ไฟล์ใหม่
    if (existing?.downloadUrl) return existing.downloadUrl;    // ใช้ของเดิม
    return undefined; // ไม่แตะต้อง
  };

  await api.post("/api/artists", {
    description: artist.description || null,
    genre: artist.genre,
    subGenre: artist.subGenre || null,
    bookingType: artist.bookingType,
    foundingYear: artist.foundingYear ? parseInt(artist.foundingYear, 10) : null,
    label: artist.label || null,
    isIndependent: !!artist.isIndependent,
    memberCount: artist.memberCount ? parseInt(artist.memberCount, 10) : null,
    priceMin: artist.priceMin ? Number(artist.priceMin) : null,
    priceMax: artist.priceMax ? Number(artist.priceMax) : null,

    // อัปเดตรูป/วิดีโอจริง
    photoUrl: joinCsv(mergedPhotoUrls),
    videoUrl: joinCsv(mergedVideoUrls),

    // ✅ เพิ่ม URL เอกสาร 3 ตัวให้ artist โดยตรง
    rateCardUrl: urlWhen(upRate,  existingRateCard, removeRateCard),
    epkUrl:      urlWhen(upEPK,   existingEPK,      removeEPK),
    riderUrl:    urlWhen(upRider, existingRider,    removeRider),

    // ช่องทางติดต่อ + โซเชียล
    contact: {
      email: artist.contactEmail || null,
      phone: artist.contactPhone || null,
    },
    links: {
      youtube: artist.youtubeUrl || null,
      tiktok: artist.tiktokUrl || null,
      facebook: artist.facebookUrl || null,
      instagram: artist.instagramUrl || null,
      twitter: artist.twitterUrl || null,
      line: null,
      spotify: artist.spotifyUrl || null,
      appleMusic: artist.appleMusicUrl || null,
      soundcloud: artist.soundcloudUrl || null,
      shazam: artist.shazamUrl || null,
      bandcamp: artist.bandcampUrl || null,
    },
  }, { withCredentials: true });
}

    setOk(true);
    navigate("/me/profile", { replace: true });
  } catch (e) {
    setErr(extractErrorMessage?.(e) || e.message || "เกิดข้อผิดพลาด");
  } finally {
    setSaving(false);
  }
};


  const avatarInputRef = React.useRef(null);
  const handlePickAvatar = () => { avatarInputRef.current?.click(); };
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  async function uploadAvatarIfNeeded() {
    if (!avatarFile) return null;
    const form = new FormData();
    form.append("file", avatarFile);
    const { data } = await api.post("/api/upload", form, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.url || null;
  }

  async function uploadMany(files) {
    const urls = [];
    for (const f of files) {
      const form = new FormData();
      form.append("file", f);
      const { data } = await api.post("/api/upload", form, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.url) urls.push(data.url);
    }
    return urls;
  }

  const formRef = React.useRef(null);
  const chooseRole = (r) => {
    setRole(r);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // ราคา: input เดียว min-max
  useEffect(() => {
    const min = artist?.priceMin ?? "";
    const max = artist?.priceMax ?? "";
    const next = (min !== "" || max !== "") ? `${min}${max!==""?'-'+max:''}` : "";
    setPriceRange(next);
  }, [artist.priceMin, artist.priceMax]);

  function handlePriceRangeChange(e) {
    let s = e.target.value.replace(/\s+/g, "");
    s = s.replace(/[^\d-]/g, "");
    const parts = s.split("-").slice(0, 2);
    const norm = parts.map(p => p.replace(/^0+(?=\d)/, ""));
    setPriceRange(norm.join(s.includes("-") ? "-" : (parts.length>1 ? "-" : "")));
  }

  function commitPriceRange() {
    let min = "", max = "";
    if (priceRange === "") { setA("priceMin",""); setA("priceMax",""); return; }
    const [a="", b=""] = priceRange.split("-").slice(0,2);
    if (a !== "") min = String(+a);
    if (b !== "") max = String(+b);
    if (min !== "" && max !== "" && +min > +max) { const t=min; min=max; max=t; }
    setA("priceMin", min); setA("priceMax", max);
    setPriceRange((min !== "" || max !== "") ? `${min}${max!==""?'-'+max:''}` : "");
  }

  function guardPriceKeys(e) {
    const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End","Enter"];
    if (allowed.includes(e.key)) return;
    if (e.key >= "0" && e.key <= "9") return;
    if (e.key === "-") { if (e.currentTarget.value.includes("-")) e.preventDefault(); return; }
    e.preventDefault();
  }

  // === Phone fields ===
  function getPhones(str) {
    return (str || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }
  const [hasLabel, setHasLabel] = useState(!!(artist.label && artist.label.trim() !== ""));
  const [phones, setPhones] = useState(() => getPhones(artist.contactPhone));

  useEffect(() => { setHasLabel(!!(artist.label && artist.label.trim() !== "")); }, [artist.label]);
  useEffect(() => { setA("contactPhone", phones.join(", ")); }, [phones]);

  function updatePhoneAt(idx, val) {
    setPhones(prev => {
      const list = [...prev];
      list[idx] = val;
      return list;
    });
  }
  function addPhone() { setPhones(prev => [...prev, ""]); }
  function removePhoneAt(idx) { setPhones(prev => prev.filter((_, i) => i !== idx)); }

  // ลบรูป/วิดีโอเดิมทีละรายการ (วิดีโอเป็นลิงก์)
  function removePhotoAt(idx) {
    const arr = splitCsv(artist.photoUrl);
    arr.splice(idx, 1);
    setA("photoUrl", joinCsv(arr));
  }
  function removeVideoAt(idx) {
    const arr = splitCsv(artist.videoUrl);
    arr.splice(idx, 1);
    setA("videoUrl", joinCsv(arr));
  }

  if (loading) {
    return (
      <div className="acc-page">
        <div className="acc-container" style={{padding: 16}}>Loading…</div>
      </div>
    );
  }

  return (
    <div className="acc-page">
      <div className="acc-container">
        <div className="container-heading">
          <h1 className="acc-title">ACCOUNT SETUP</h1>
        </div>
        <div className="a-line"></div>

        {ok  && <div className="acc-msg ok">บันทึกโปรไฟล์เรียบร้อย!</div>}
        {err && <div className="acc-msg err">{err}</div>}

        {/* เลือก ROLE */}
        {!isEdit && !role && (
          <section className="acc-section acc-roleIntro">
            <h2 className="acc-sectionTitle">เลือกบทบาทของคุณ</h2>
            <div className="acc-roleGrid">
              <button type="button" className="acc-roleCard" onClick={() => chooseRole("AUDIENCE")} aria-label="เลือกบทบาท Audience">
                <div className="acc-roleCardLabel">Audience</div>
                <div className="acc-roleThumb"><img src="/img/audience.png" alt="" className="acc-roleImg" /></div>
              </button>
              <button type="button" className="acc-roleCard" onClick={() => chooseRole("ARTIST")} aria-label="เลือกบทบาท Artist">
                <div className="acc-roleCardLabel">Artist</div>
                <div className="acc-roleThumb"><img src="/img/artist.png" alt="" className="acc-roleImg" /></div>
              </button>
            </div>
          </section>
        )}

        {/* Basic profile */}
        {(isEdit || !!role) && (
          <div ref={formRef}>
            <section className="acc-section">
              <h2 className="acc-sectionTitle">Without music, life would be a mistake.</h2>

              <div className="acc-basicGrid">
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
                  <input ref={avatarInputRef} type="file" accept="image/*" className="acc-fileInput" onChange={handleAvatarChange} />
                </div>

                <div>
                  <div className="acc-formGrid">
                    <div className="col-span-2">
                      <label className="acc-label">Username</label>
                      <input type="text" className="acc-inputUnderline" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ตั้งชื่อผู้ใช้" />
                    </div>

                    <div className="col-span-2">
                      <label className="acc-label">Birth date</label>
                      <input
                        type="date"
                        className="acc-inputUnderline acc-inputDate"
                        value={birthDate || ""}
                        onChange={(e) => setBirthDate(e.target.value)}
                        max={todayStr}
                        inputMode="numeric"
                        onFocus={(e) => e.target.showPicker?.()}
                        lang="en-GB"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="acc-label">Favorite genres</label>
                      <div className="acc-chips">
                        {PRESET_GENRES.map((g) => {
                          const selected = favoriteGenres.includes(g);
                          return (
                            <button key={g} type="button" className={`acc-chip ${selected ? "is-selected" : ""}`} aria-pressed={selected} onClick={() => toggleGenre(g)}>
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

        {/* ARTIST */}
        {(isEdit || role === "ARTIST") && (
          <section className="acc-section" hidden={role !== "ARTIST"}>
            <div className="acc-formGrid">
              <div>
                <label className="acc-label">Name *</label>
                <input className="form-control" value={artist.name} onChange={e => setA("name", e.target.value)} placeholder="e.g., NewJeans" required />
              </div>

              <div>
                <label className="acc-label">Label</label>
                <div className="acc-label-wrap">
                  <label className="acc-check">
                    <input
                      type="checkbox"
                      checked={!!(artist.label && artist.label.trim() !== "")}
                      onChange={(e) => {
                        const v = e.target.checked;
                        if (!v) setA("label", "");
                      }}
                    />
                    <span>Has label</span>
                  </label>

                  {(artist.label && artist.label.trim() !== "") && (
                    <input
                      type="text"
                      className="acc-inputUnderline"
                      placeholder="Specify label name (e.g., HYBE, JYP, SM...)"
                      value={artist.label || ""}
                      onChange={(e) => setA("label", e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="acc-col-span-full">
                <label className="acc-label">Description</label>
                <textarea
                  className="acc-inputUnderline"
                  value={artist.description || ""}
                  onChange={(e) => setA("description", e.target.value)}
                  placeholder="Briefly introduce the artist…"
                  rows={4}
                />
              </div>

              <div>
                <label className="acc-label">Genre *</label>
                <input value={artist.genre} onChange={e => setA("genre", e.target.value)} placeholder="e.g., Pop" required />
              </div>
              <div>
                <label className="acc-label">Sub-genre</label>
                <input value={artist.subGenre} onChange={e => setA("subGenre", e.target.value)} placeholder="e.g., Synth-pop" />
              </div>
              <div>
                <label className="acc-label">Founding year</label>
                <input value={artist.foundingYear} onChange={e => setA("foundingYear", e.target.value.replace(/[^\d]/g, ""))} placeholder="YYYY" />
              </div>
              <div>
                <label className="acc-label">Booking type *</label>
                <select value={artist.bookingType} onChange={e => setA("bookingType", e.target.value)}>
                  <option value="">-- Select type --</option>
                  <option value="FULL_BAND">Full-band</option>
                  <option value="TRIO">Trio</option>
                  <option value="DUO">Duo</option>
                  <option value="SOLO">Solo</option>
                </select>
              </div>
              <div>
                <label className="acc-label">Member count</label>
                <input value={artist.memberCount} onChange={e => setA("memberCount", e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g., 5" />
              </div>
              <div>
                <label className="acc-label">Price range (฿)</label>
                <input value={priceRange} onChange={handlePriceRangeChange} onBlur={commitPriceRange} onKeyDown={guardPriceKeys} placeholder="0-10000" inputMode="numeric" aria-label="Price range in THB, min-max" />
              </div>
              <div>
                <label className="acc-label">Contact email</label>
                <input value={artist.contactEmail} onChange={e => setA("contactEmail", e.target.value)} placeholder="example@mail.com" />
              </div>

              {/* Contact phone หลายเบอร์ */}
              <div className="acc-field">
                <div className="acc-field-head">
                  <label className="acc-label">Contact phone</label>
                  <button type="button" className="acc-mini-btn tiny" onClick={() => setPhones(prev => [...prev, ""])}>
                    + Add phone
                  </button>
                </div>

                <div className="acc-phoneList">
                  {(phones.length === 0 ? [""] : phones).map((ph, idx) => (
                    <div className="acc-phone-row" key={idx}>
                      <input
                        type="tel"
                        className="acc-inputUnderline"
                        placeholder="e.g. +66 81 234 5678"
                        value={ph}
                        onChange={(e) => updatePhoneAt(idx, e.target.value)}
                        inputMode="tel"
                        autoComplete="tel"
                      />
                      <button
                        type="button"
                        className="acc-icon-btn reset"
                        aria-label="Remove phone"
                        onClick={() => removePhoneAt(idx)}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Images */}
              <div className="ve-field">
                <label className="ve-label">Images</label>
                <div>
                  <label className="apm-fileBtn apm-fileBtn-secondary">
                    Choose images
                    <input type="file" accept="image/*" multiple hidden onChange={apmOnPickImages} />
                  </label>
                </div>

                {/* Existing images */}
                {splitCsv(artist.photoUrl).length > 0 && (
                  <>
                    <div className="apm-mediaGrid" style={{ marginTop: 10 }}>
                      {splitCsv(artist.photoUrl).map((u, i) => (
                        <div key={`old-img-${i}`} className="apm-mediaThumb">
                          <img src={u} alt={`existing-${i}`} />
                          <button
                            type="button"
                            className="acc-icon-btn danger"
                            title="Remove"
                            onClick={() => removePhotoAt(i)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="apm-help">Existing images (remove any you don't want to keep).</p>
                  </>
                )}

                {/* New images (picked) */}
                {!!apmImageFiles.length && (
                  <>
                    <div className="apm-mediaGrid" style={{ marginTop: 10 }}>
                      {apmImageFiles.map((f, i) => (
                        <div key={`img-${i}`} className="apm-mediaThumb">
                          <img src={URL.createObjectURL(f)} alt={`image-${i + 1}`} />
                        </div>
                      ))}
                    </div>
                    <p className="apm-help">Images will be uploaded when you click Save.</p>
                  </>
                )}
              </div>

              {/* Videos (Link-only) */}
<div className="ve-field">
  <label className="ve-label">Video links</label>
  <p className="apm-help">
    วางลิงก์จาก YouTube / Vimeo / TikTok / Google Drive (<code>/preview</code>) / ไฟล์ .mp4 / HLS (.m3u8) ได้หลายรายการ
  </p>

  {videoLinks.map((v, i) => (
    <div key={i} className="acc-phone-row">
      <input
        className="acc-inputUnderline"
        placeholder="https://youtube.com/watch?v=... หรือ https://drive.google.com/file/d/.../preview"
        value={v}
        onChange={(e) => updateVideoLinkAt(i, e.target.value)}
      />
      <button
        type="button"
        className="acc-icon-btn reset"
        aria-label="Remove link"
        onClick={() => removeVideoLink(i)}
        title="Remove"
      >
        ×
      </button>
    </div>
  ))}

  <button
    type="button"
    className="acc-mini-btn tiny"
    style={{ marginTop: 8 }}
    onClick={addVideoLink}
  >
    + Add link
  </button>
</div>


              {/* Documents */}
              <details className="acc-collapse col-span-2" open>
                <summary className="acc-summary">
                  <span>Documents (Rate card / EPK / Rider)</span>
                  <span className="acc-summaryArrow" aria-hidden>▾</span>
                </summary>
                <div className="acc-collapseBody">
                  <DocField
                    label="Rate card file"
                    existing={existingRateCard}
                    removed={removeRateCard}
                    onRemoveToggle={() => setRemoveRateCard(v => !v)}
                    file={docRateCard}
                    onPick={onPickRateCard}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                  />

                  <DocField
                    label="EPK file"
                    existing={existingEPK}
                    removed={removeEPK}
                    onRemoveToggle={() => setRemoveEPK(v => !v)}
                    file={docEPK}
                    onPick={onPickEPK}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,image/*"
                  />

                  <DocField
                    label="Rider file"
                    existing={existingRider}
                    removed={removeRider}
                    onRemoveToggle={() => setRemoveRider(v => !v)}
                    file={docRider}
                    onPick={onPickRider}
                    accept=".pdf,.doc,.docx,.xlsx,image/*"
                  />
                </div>
              </details>

              {/* Streaming */}
              <details className="acc-collapse col-span-2">
                <summary className="acc-summary">
                  <span>Music streaming</span>
                  <span className="acc-summaryArrow" aria-hidden>▾</span>
                </summary>
                <div className="acc-collapseBody">
                  <div>
                    <label className="acc-label">Spotify URL</label>
                    <input value={artist.spotifyUrl} onChange={e => setA("spotifyUrl", e.target.value)} placeholder="https://open.spotify.com/..." />
                  </div>
                  <div>
                    <label className="acc-label">YouTube URL</label>
                    <input value={artist.youtubeUrl} onChange={e => setA("youtubeUrl", e.target.value)} placeholder="https://www.youtube.com/..." />
                  </div>
                  <div>
                    <label className="acc-label">Apple Music URL</label>
                    <input value={artist.appleMusicUrl} onChange={e => setA("appleMusicUrl", e.target.value)} placeholder="https://music.apple.com/..." />
                  </div>
                  <div>
                    <label className="acc-label">SoundCloud URL</label>
                    <input value={artist.soundcloudUrl} onChange={e => setA("soundcloudUrl", e.target.value)} placeholder="https://soundcloud.com/..." />
                  </div>
                  <div>
                    <label className="acc-label">Shazam URL</label>
                    <input value={artist.shazamUrl} onChange={e => setA("shazamUrl", e.target.value)} placeholder="https://www.shazam.com/..." />
                  </div>
                  <div>
                    <label className="acc-label">Bandcamp URL</label>
                    <input value={artist.bandcampUrl} onChange={e => setA("bandcampUrl", e.target.value)} placeholder="https://bandcamp.com/..." />
                  </div>
                </div>
              </details>

              {/* Social */}
              <details className="acc-collapse col-span-2">
                <summary className="acc-summary">
                  <span>Social media</span>
                  <span className="acc-summaryArrow" aria-hidden>▾</span>
                </summary>
                <div className="acc-collapseBody">
                  <div>
                    <label className="acc-label">Facebook URL</label>
                    <input value={artist.facebookUrl} onChange={e => setA("facebookUrl", e.target.value)} placeholder="https://facebook.com/..." />
                  </div>
                  <div>
                    <label className="acc-label">X (Twitter) URL</label>
                    <input value={artist.twitterUrl} onChange={e => setA("twitterUrl", e.target.value)} placeholder="https://x.com/..." />
                  </div>
                  <div>
                    <label className="acc-label">Instagram URL</label>
                    <input value={artist.instagramUrl} onChange={e => setA("instagramUrl", e.target.value)} placeholder="https://instagram.com/..." />
                  </div>
                  <div>
                    <label className="acc-label">TikTok URL</label>
                    <input value={artist.tiktokUrl} onChange={e => setA("tiktokUrl", e.target.value)} placeholder="https://www.tiktok.com/@..." />
                  </div>
                </div>
              </details>
            </div>

            <small className="acc-help" style={{ display: "block", marginTop: 8 }}>
              Upon submission, the system will create/update your ARTIST upgrade request for admin review.
            </small>
          </section>
        )}

        {/* Actions */}
        {(isEdit || !!role) && (
          <div className="acc-actions">
            <button type="button" className="acc-btn" onClick={resetForm}>Reset</button>
            <button type="button" className="acc-btn acc-btnPrimary" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
