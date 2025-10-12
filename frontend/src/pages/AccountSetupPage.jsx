// frontend/src/pages/AccountSetupPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api, { extractErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import Swal from "sweetalert2";
import "../css/AccountSetupPage.css";

/* ---------- [ADD] Reusable Picker Modal ---------- */
function PickerModal({ open, title, options = [], onSelect, onClose, renderOption }) {
  if (!open) return null;
  return (
    <div className="acc-modalOverlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="acc-modal">
        <div className="acc-modalHead">
          <h3 className="acc-modalTitle">{title}</h3>
          <button className="acc-modalClose" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="acc-modalBody">
          <ul className="acc-optionList">
            {options.map((opt, i) => (
              <li key={i}>
                <button
                  className="acc-optionItem"
                  type="button"
                  onClick={() => { onSelect(opt); onClose(); }}
                >
                  {renderOption ? renderOption(opt) : String(opt)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------- Price Range Picker (type-in min/max, validate) ---------- */
function PriceRangeModal({
  open,
  title = "Select price range (฿)",
  initialMin = "",
  initialMax = "",
  onConfirm,
  onClose
}) {
  const [minV, setMinV] = React.useState(initialMin ?? "");
  const [maxV, setMaxV] = React.useState(initialMax ?? "");

  React.useEffect(() => {
    setMinV(initialMin ?? "");
    setMaxV(initialMax ?? "");
  }, [initialMin, initialMax, open]);

  // ให้กรอกเฉพาะตัวเลข
  const normNum = (v) => {
    if (v === "" || v == null) return "";
    const n = Number(String(v).replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? String(n) : "";
  };

  const minNorm = normNum(minV);
  const maxNorm = normNum(maxV);

  const bothFilled = minNorm !== "" && maxNorm !== "";
  const invalidRange = bothFilled && Number(minNorm) > Number(maxNorm);

  const disableApply = !bothFilled || invalidRange;

  function commit() {
    if (disableApply) return;
    onConfirm({ min: minNorm, max: maxNorm });
    onClose();
  }

  if (!open) return null;
  return (
    <div className="acc-modalOverlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="acc-modal acc-modalWide">
        <div className="acc-modalHead">
          <h3 className="acc-modalTitle">{title}</h3>
          <button className="acc-modalClose" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="acc-modalBody">
          <div className="acc-priceGrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <div className="acc-priceHead">Min (฿)</div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                className="acc-inputUnderline"
                placeholder="e.g. 1,500"
                value={minV}
                onChange={(e) => setMinV(e.target.value)}
                onKeyDown={(e) => {
                  const allow = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End","Enter"];
                  if (allow.includes(e.key)) return;
                  if (e.key >= "0" && e.key <= "9") return;
                  e.preventDefault();
                }}
                aria-invalid={invalidRange}
              />
            </div>

            <div>
              <div className="acc-priceHead">Max (฿)</div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                className="acc-inputUnderline"
                placeholder="e.g. 5,000"
                value={maxV}
                onChange={(e) => setMaxV(e.target.value)}
                onKeyDown={(e) => {
                  const allow = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End","Enter"];
                  if (allow.includes(e.key)) return;
                  if (e.key >= "0" && e.key <= "9") return;
                  e.preventDefault();
                }}
                aria-invalid={invalidRange}
              />
            </div>
          </div>

          {/* เงื่อนไขแจ้งเตือน: กรอกให้ครบทั้งสองช่อง + ช่วงต้องถูกต้อง */}
          {!bothFilled && (
            <p className="acc-priceWarn" role="alert">
              * Please fill both Min and Max.
            </p>
          )}
          {invalidRange && (
            <p className="acc-priceWarn" role="alert">
              * Min must be less than or equal to Max.
            </p>
          )}
        </div>

        <div className="acc-modalFoot">
          <button type="button" className="acc-btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="acc-btn acc-btnPrimary"
            onClick={commit}
            disabled={disableApply}
            aria-disabled={disableApply}
            title={disableApply ? "Please complete both fields with a valid range" : "Apply"}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}



const MAX_DESC = 200;

/* ---------- [ADD] Options ---------- */
const SUB_GENRES = ["Pop","Rock","Indie","Jazz","Blues","Hip-Hop","EDM","Folk","Metal","R&B"];

const BOOKING_TYPES = [
  { value: "FULL_BAND", label: "Full-band" },
  { value: "TRIO",      label: "Trio" },
  { value: "DUO",       label: "Duo" },
  { value: "SOLO",      label: "Solo" },
];

const YEARS = (() => {
  const arr = [];
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 1960; y--) arr.push(String(y));
  return arr;
})();

const MEMBER_COUNTS = ["Solo", "Duo", "Trio", "4", "5", "6", "7", "8", "9", "10+"];

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
/* ===== Helper components ===== */
function DocField({
  label,
  existing,        // { downloadUrl, name?, size?, mime? } | null
  removed,         // boolean
  onRemoveToggle,  // () => void
  file,            // File | null
  onPick,          // (e) => void   -> ตัวอย่างที่เรียกใช้: (e) => setDocRateCard(e.target.files?.[0] ?? null)
  accept,          // string | undefined
}) {
  // เดาชื่อไฟล์จาก URL ถ้า backend ไม่ส่ง name มา
  const guessNameFromUrl = (u) => {
    try {
      const p = new URL(u || "").pathname.split("/").pop() || "file";
      return decodeURIComponent(p.split("?")[0]);
    } catch {
      return "file";
    }
  };

  // current filename (ฝั่ง existing)
  const currentName =
    existing?.name || guessNameFromUrl(existing?.downloadUrl || "");

  return (
    <div className="doc-field">
      {/* หัวข้อซ้าย + ปุ่ม +Add file (เส้นปะ) ขวา */}
      <div className="doc-field-head">
        <label className="acc-label">{label}</label>

        {/* ใช้ label เป็นปุ่มเลือกไฟล์ เพื่อคงสไตล์เส้นปะ */}
        <label
          className="acc-mini-btn tiny dashed"
          role="button"
          aria-label={`Add file for ${label}`}
        >
          + Add file
          <input type="file" hidden onChange={onPick} accept={accept} />
        </label>
      </div>

      {/* ── แสดงไฟล์เดิม (ยังไม่ถูก mark ลบ) ───────────────────────────── */}
      {!file && existing && !removed && (
        <div className="doc-current">
          {/* ชื่อไฟล์เป็นข้อความปกติ ไม่ใช่ลิงก์สีน้ำเงิน/ไม่มีเส้นใต้ */}
          <span className="doc-filename" title={currentName}>
            {currentName}
          </span>

          {/* ปุ่ม X เรียบ ๆ (ไม่มีพื้นหลัง/เงา) ชิดขวาสุด */}
          <button
            type="button"
            className="doc-remove-icon-plain"
            aria-label="Remove current file"
            title="Remove"
            onClick={onRemoveToggle}
          >
            ×
          </button>
        </div>
      )}

      {/* ── แสดงไฟล์ที่เพิ่งเลือกใหม่ (ยังไม่อัปโหลด) ─────────────────── */}
      {file && (
        <div className="doc-picked">
          <span className="doc-filename" title={file.name}>
            {file.name}
          </span>

          <button
            type="button"
            className="doc-remove-icon-plain"
            aria-label="Remove selected file"
            title="Remove"
            onClick={() => onPick({ target: { files: [] } })}
          >
            ×
          </button>
        </div>
      )}

      {/* ── เส้นใต้ baseline: แสดงเสมอเมื่อ “ยังไม่มีไฟล์ให้โชว์” ───────── */}
      {(!file && (!existing || removed)) && (
        <div className="doc-underline" aria-hidden="true"></div>
      )}
    </div>
  );
}




// Map label -> number (ใช้ตอนตรวจสอบ/บันทึก)
function normalizeMemberCount(val) {
  if (!val) return "";
  const map = { Solo: 1, Duo: 2, Trio: 3 };
  if (val in map) return map[val];
  const n = parseInt(String(val), 10);
  return Number.isFinite(n) ? n : "";
}



export default function AccountSetupPage() {
  const { refresh, user: authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isEdit = params.get("edit") === "1";

  /* ---------- [EXISTING] Picker states (คงชื่อเดิม) ---------- */
  const [showGenrePick,   setShowGenrePick]   = useState(false);
  const [showSubPick,     setShowSubPick]     = useState(false);
  const [showYearPick,    setShowYearPick]    = useState(false);
  const [showBookingPick, setShowBookingPick] = useState(false);
  const [showMemberPick,  setShowMemberPick]  = useState(false);
  const [showPricePick,   setShowPricePick]   = useState(false);

  /* ---- Adapters: ให้ JSX ส่วนใหม่ใช้ชื่อ openX/setOpenX ได้ ---- */
  const openGenre = showGenrePick;           const setOpenGenre = setShowGenrePick;
  const openSubGenre = showSubPick;          const setOpenSubGenre = setShowSubPick;
  const openYear = showYearPick;             const setOpenYear = setShowYearPick;
  const openBooking = showBookingPick;       const setOpenBooking = setShowBookingPick;
  const openMemberCount = showMemberPick;    const setOpenMemberCount = setShowMemberPick;
  const openPriceRange = showPricePick;      const setOpenPriceRange = setShowPricePick;

  // ====== CSV helpers ======
  function splitCsv(str) {
    return (str || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }
  function joinCsv(arr) {
    return (arr || []).filter(Boolean).join(", ");
  }

  // ===== แปลง Google Drive link -> /preview =====
  function normalizeVideoUrl(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    try {
      const u = new URL(s);
      if (u.hostname.includes("drive.google.com")) {
        const parts = u.pathname.split("/");
        const i = parts.findIndex(p => p === "file");
        if (i !== -1 && parts[i+1] === "d" && parts[i+2]) {
          const id = parts[i+2];
          return `https://drive.google.com/file/d/${id}/preview`;
        }
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
  const apmOnPickImages = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setApmImageFiles(prev => [...prev, ...picked]);   // append ไม่ทับของเก่า
    e.target.value = ""; // เคลียร์ค่า input เพื่อให้เลือกไฟล์ชุดเดิมซ้ำได้อีกถ้าต้องการ
  };


  // ===== วิดีโอแบบลิงก์ =====
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
  const [initialRole, setInitialRole] = useState("");

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

  useEffect(() => {
    if (role === "ARTIST") {
      const target = (artist.name || "").trim();
      setDisplayName(prev => (prev === target ? prev : target));
    }
  }, [role, artist.name]);

  /* ---- ช็อตคัตค่าที่ JSX ใช้ ---- */
  const { genre, subGenre, bookingType, foundingYear, memberCount, priceMin, priceMax } = artist;

  /* ---- Map ตัวเลือกให้ชื่อตรงกับ JSX ---- */
  const genreOptions = PRESET_GENRES;
  const subGenreOptions = SUB_GENRES;
  const yearOptions = YEARS;
  const bookingTypeOptions = BOOKING_TYPES;   // [{value,label}]
  const memberCountOptions = MEMBER_COUNTS;   // ["Solo","Duo","Trio","4",...,"10+"]

  // UX
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [ok, setOk]           = useState(false);
  const [err, setErr]         = useState("");

  // ใช้แยก flow ว่าผู้ใช้ “ได้รับอนุมัติเป็น ARTIST แล้วหรือยัง”
  const [meRole, setMeRole] = useState("AUDIENCE");
  const [priceRange, setPriceRange] = useState("");

  // ===== docs upload states & handlers =====
  const [docRateCard, setDocRateCard] = useState(null);
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
        const currentRole = data.role || "AUDIENCE";
        setMeRole(currentRole);

        if (isEdit) {
          setRole(currentRole);
          setInitialRole(currentRole);
        } else if (!role) {
          setRole("");
          setInitialRole("");
        }

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

        // Prefill ช่องกรอกลิงก์
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
    setRole(isEdit ? initialRole : "");
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
    return data?.url ? { downloadUrl: data.url, name: file.name, size: file.size, mime: file.type } : null;
  }

  const handleSave = async () => {
    setSaving(true);
    setErr(""); setOk(false);
    try {
      if (!role) throw new Error("Please select a role.");

      // อัปโหลด avatar ถ้ามี
      let avatarUrl = null;
      try { avatarUrl = await uploadAvatarIfNeeded(); } catch {}

      // อัปโหลดเอกสาร
      const upRate  = await uploadDoc(docRateCard);
      const upEPK   = await uploadDoc(docEPK);
      const upRider = await uploadDoc(docRider);

      // อัปโหลดรูปใหม่
      const newImageUrls = await uploadMany(apmImageFiles);

      // รวมรูป/วิดีโอ
      const mergedPhotoUrls = [...splitCsv(artist.photoUrl), ...newImageUrls].filter(Boolean);
      const typedLinks = videoLinks.map(normalizeVideoUrl).filter(Boolean);
      const mergedVideoUrls = Array.from(new Set([
        ...splitCsv(artist.videoUrl),
        ...typedLinks,
      ])).filter(Boolean);

      const keepOrNew = (uploaded, existing, removed) =>
        removed ? undefined : (uploaded || existing || undefined);

      const urlWhen = (uploaded, existing, removed) => {
        if (removed) return "";
        if (uploaded?.downloadUrl) return uploaded.downloadUrl;
        if (existing?.downloadUrl) return existing.downloadUrl;
        return undefined;
      };

      const effectiveAccountName =
        role === "ARTIST"
          ? (artist.name?.trim() || undefined)
          : (displayName?.trim() || artist?.name || undefined);

      const setupPayload = cleanObject({
        name: effectiveAccountName,
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

          // แนบแบบ array ด้วย
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

      // อัปเดต Artist จริงเมื่อได้รับอนุมัติ
      const approved = meRole === "ARTIST" || meRole === "ADMIN";
      if (approved && role === "ARTIST") {
        const keepOrNew = (uploaded, existing, removed) =>
          removed ? undefined : (uploaded || existing || undefined);
        const urlWhen = (uploaded, existing, removed) => {
          if (removed) return "";
          if (uploaded?.downloadUrl) return uploaded.downloadUrl;
          if (existing?.downloadUrl) return existing.downloadUrl;
          return undefined;
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

          photoUrl: joinCsv(mergedPhotoUrls),
          videoUrl: joinCsv(mergedVideoUrls),

          rateCardUrl: urlWhen(upRate,  existingRateCard, removeRateCard),
          epkUrl:      urlWhen(upEPK,   existingEPK,      removeEPK),
          riderUrl:    urlWhen(upRider, existingRider,    removeRider),

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

      try {
        await refresh();
      } catch (refreshErr) {
        console.error("ACCOUNT_SETUP_REFRESH_ERROR", refreshErr);
      }

      setOk(true);
      await Swal.fire({
        title: "Saved!",
        text: "Your account setup has been updated.",
        icon: "success",
        confirmButtonColor: "#2563eb",
      });
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

  // ราคา: input เดียว min-max (ยังคงโค้ดเดิมเพื่อเข้ากันได้)
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


  function removePickedImage(idx) {
    setApmImageFiles(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="acc-page">
      <div className="acc-container">
        <div className="container-heading">
          <h1 className="acc-title">ACCOUNT SETUP</h1>
        </div>
        <div className="a-line"></div>

        {ok  && <div className="acc-msg ok">บันทึกโปรไฟล์เรียบร้อย!</div>}

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
              {/* <h2 className="acc-sectionTitle">Without music, life would be a mistake.</h2>  */}

              <div className="acc-basicGrid">
                <div>
                  <div className="acc-avatarCard" onClick={handlePickAvatar} role="button" aria-label="Upload avatar">
                    {avatarPreview ? (
                      <>
                        <img src={avatarPreview} alt="avatar preview" />
                        <div className="acc-avatarEdit">change image</div>
                      </>
                    ) : (
                      <div className="acc-avatarEmpty" aria-label="No profile image uploaded">
                        <div className="acc-avatarIcon">📷</div>
                        <div className="acc-avatarText">No profile uploaded</div>
                        <div className="acc-avatarSub">Recommended: Square image, JPG or PNG</div>
                        <div className="acc-avatarHint">Click to upload image</div>
                      </div>
                    )}
                  </div>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="acc-fileInput" onChange={handleAvatarChange} />
                </div>

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
                        disabled={role === "ARTIST"}
                        title={role === "ARTIST" ? "Username จะอิงจาก Name อัตโนมัติ" : undefined}
                      />
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
                      checked={hasLabel}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setHasLabel(v);
                        if (!v) setA("label", "");
                      }}
                    />
                    <span>Has label</span>
                  </label>

                  {hasLabel && (
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


              {/* Description */}
              <div className="acc-col-span-full">
                <label className="acc-label">Description</label>

                <input
                  type="text"
                  className="acc-inputUnderline"
                  value={artist.description || ""}
                  onChange={(e) => setA("description", e.target.value)}
                  placeholder="Briefly introduce the artist…"
                  maxLength={MAX_DESC}               // ← จำกัดความยาวที่นี่
                />

                <div className="acc-charCounter">
                  {(artist.description || "").length} / {MAX_DESC}
                </div>
              </div>


              {/* === Genre (required, underline trigger) === */}
              <div className="acc-field">
                <label className="acc-label" htmlFor="genre">Genre *</label>
                <button
                  type="button"
                  id="genre"
                  className="acc-inputTrigger"
                  onClick={() => setOpenGenre(true)}
                  aria-haspopup="dialog"
                  aria-expanded={openGenre ? true : false}
                >
                  {genre ? genre : <span className="acc-placeholder">Select genre…</span>}
                  <span className="acc-caret">▾</span>
                </button>
              </div>

              <PickerModal
                open={openGenre}
                title="Select genre"
                options={genreOptions}
                onSelect={(val) => { setA("genre", val); setOpenGenre(false); }}
                onClose={() => setOpenGenre(false)}
              />

              {/* === Sub-genre (underline trigger) === */}
              <div className="acc-field">
                <label className="acc-label" htmlFor="subgenre">Sub-genre</label>
                <button
                  type="button"
                  id="subgenre"
                  className="acc-inputTrigger"
                  onClick={() => setOpenSubGenre(true)}
                  aria-haspopup="dialog"
                  aria-expanded={openSubGenre ? true : false}
                >
                  {subGenre ? subGenre : <span className="acc-placeholder">Select sub-genre…</span>}
                  <span className="acc-caret">▾</span>
                </button>
              </div>

              <PickerModal
                open={openSubGenre}
                title="Select sub-genre"
                options={subGenreOptions}
                onSelect={(val) => { setA("subGenre", val); setOpenSubGenre(false); }}
                onClose={() => setOpenSubGenre(false)}
              />

              {/* === Founding year (underline trigger) === */}
              <div className="acc-field">
                <label className="acc-label" htmlFor="foundingYear">Founding year</label>
                <button
                  type="button"
                  id="foundingYear"
                  className="acc-inputTrigger"
                  onClick={() => setOpenYear(true)}
                  aria-haspopup="dialog"
                  aria-expanded={openYear ? true : false}
                >
                  {foundingYear ? foundingYear : <span className="acc-placeholder">Select year…</span>}
                  <span className="acc-caret">▾</span>
                </button>
              </div>

              <PickerModal
                open={openYear}
                title="Select founding year"
                options={yearOptions}
                onSelect={(val) => { setA("foundingYear", val); setOpenYear(false); }}
                onClose={() => setOpenYear(false)}
              />

              {/* === Booking type (required, underline trigger) === */}
              <div className="acc-field">
                <label className="acc-label" htmlFor="bookingType">Booking type *</label>
                <button
                  type="button"
                  id="bookingType"
                  className="acc-inputTrigger"
                  onClick={() => setOpenBooking(true)}
                  aria-haspopup="dialog"
                  aria-expanded={openBooking ? true : false}
                >
                  {bookingType
                    ? (bookingTypeOptions.find(o => o.value === bookingType)?.label || bookingType)
                    : <span className="acc-placeholder">Select booking type…</span>}
                  <span className="acc-caret">▾</span>
                </button>
              </div>

              <PickerModal
                open={openBooking}
                title="Select booking type"
                options={bookingTypeOptions}
                renderOption={(opt) => opt.label}
                onSelect={(opt) => { setA("bookingType", opt.value); setOpenBooking(false); }}
                onClose={() => setOpenBooking(false)}
              />

              {/* === Member count (underline trigger) === */}
              <div className="acc-field">
                <label className="acc-label" htmlFor="memberCount">Member count</label>
                <button
                  type="button"
                  id="memberCount"
                  className="acc-inputTrigger"
                  onClick={() => setOpenMemberCount(true)}
                  aria-haspopup="dialog"
                  aria-expanded={openMemberCount ? true : false}
                >
                  {memberCount ? `${memberCount}` : <span className="acc-placeholder">Select members…</span>}
                  <span className="acc-caret">▾</span>
                </button>
              </div>

              <PickerModal
                open={openMemberCount}
                title="Select member count"
                options={memberCountOptions}
                onSelect={(val) => {
                  const map = { "Solo": 1, "Duo": 2, "Trio": 3, "10+": 10 };
                  const n = map[val] ?? parseInt(val, 10);
                  setA("memberCount", Number.isFinite(n) ? String(n) : "");
                  setOpenMemberCount(false);
                }}
                onClose={() => setOpenMemberCount(false)}
              />

              {/* === Price range (underline trigger → PriceRangeModal) === */}
              <div className="acc-field">
                <label className="acc-label" htmlFor="priceRange">Price range (฿)</label>
                <button
                  type="button"
                  id="priceRange"
                  className="acc-inputTrigger"
                  onClick={() => setOpenPriceRange(true)}
                  aria-haspopup="dialog"
                  aria-expanded={openPriceRange ? true : false}
                >
                  {(artist.priceMin !== "" && artist.priceMax !== "")
                    ? `฿${Number(artist.priceMin).toLocaleString()} – ฿${Number(artist.priceMax).toLocaleString()}`
                    : <span className="acc-placeholder">Enter min – max…</span>}
                  <span className="acc-caret">▾</span>
                </button>
              </div>


              <PriceRangeModal
                open={openPriceRange}
                title="Select price range"
                initialMin={priceMin}
                initialMax={priceMax}
                onConfirm={({ min, max }) => {
                  setA("priceMin", min);
                  setA("priceMax", max);
                  setOpenPriceRange(false);
                }}
                onClose={() => setOpenPriceRange(false)}
              />



              <div>
                <label className="acc-label">Contact email</label>
                <input
                  className="acc-inputUnderline"
                  value={artist.contactEmail}
                  onChange={e => setA("contactEmail", e.target.value)}
                  placeholder="example@mail.com"
                />
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
                {/* HEAD: ชื่อ + ปุ่มอัปโหลดอยู่บรรทัดเดียวกัน */}
                <div className="ve-field-head">
                  <label className="ve-label">Images</label>

                  {/* ใช้ label เป็นปุ่มเลือกไฟล์ */}
                  <label className="acc-mini-btn tiny dashed" role="button" aria-label="Add images">
                    + Add images
                    <input type="file" accept="image/*" multiple hidden onChange={apmOnPickImages} />
                  </label>
                </div>

                {/* กริดรวมรูปเดิม + รูปที่เพิ่งเลือก (โค้ดกริดของคุณเดิมคงไว้) */}
                <div className="apm-mediaGrid" style={{ marginTop: 10 }}>
                  {splitCsv(artist.photoUrl).map((u, i) => (
                    <div key={`old-${i}`} className="apm-mediaThumb">
                      <img src={u} alt={`existing-${i}`} />
                      <button
                        type="button"
                        className="acc-icon-btn danger"
                        title="Remove"
                        aria-label={`Remove existing image ${i + 1}`}
                        onClick={() => removePhotoAt(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {apmImageFiles.map((f, i) => {
                    const src = URL.createObjectURL(f);
                    return (
                      <div key={`new-${i}`} className="apm-mediaThumb">
                        <img src={src} alt={`picked-${i + 1}`} onLoad={() => URL.revokeObjectURL(src)} />
                        <button
                          type="button"
                          className="acc-icon-btn reset"
                          title="Remove"
                          aria-label={`Remove picked image ${i + 1}`}
                          onClick={() => removePickedImage(i)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                <p className="apm-help" style={{ marginTop: 10 }}>
                  {/* Existing images and newly picked images are shown together. You can remove any before saving. */}
                </p>
              </div>



              {/* Videos (Link-only) */}
              {/* Videos (Link-only) */}
              <div className="ve-field">
                {/* หัวข้อซ้าย + ปุ่ม +Add link ขวา */}
                <div className="ve-field-head">
                  <label className="ve-label">Video links</label>
                  <button
                    type="button"
                    className="acc-mini-btn tiny dashed"
                    onClick={addVideoLink}
                    aria-label="Add a new video link"
                  >
                    + Add links
                  </button>
                </div>

                <p className="apm-help">
                  Paste links from YouTube / Vimeo / TikTok / Google Drive / .mp4 files / HLS (.m3u8).
                  Multiple links are supported.
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
              </div>

              {/* Documents */}
              <details className="acc-collapse col-span-2">
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
          <>
            {err && (
              <div className="acc-msg err" style={{ marginTop: 24 }}>
                {err}
              </div>
            )}
            <div className="acc-actions">
              <button type="button" className="acc-btn" onClick={resetForm}>Reset</button>
              <button type="button" className="acc-btn acc-btnPrimary" disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
