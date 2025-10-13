// src/pages/EventDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api, { extractErrorMessage } from '../lib/api';
import '../css/EventDetail.css';

/* ========== helpers ========== */
function formatDateEN(iso) {
  if (!iso) return '—';
  try {
    const s = new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }).format(new Date(iso));
    return s.toLowerCase();
  } catch { return '—'; }
}

function normTime(t) {
  if (!t) return null;
  const s = String(t).trim();

  // already HH:mm
  let m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m) {
    const hh = String(parseInt(m[1],10)).padStart(2,'0');
    const mm = String(parseInt(m[2],10)).padStart(2,'0');
    return `${hh}:${mm}`;
  }

  // 1930, 19.30, 19-30, 7:5?
  m = s.match(/^(\d{1,2})[:.\-]?([0-5]?\d)$/);
  if (m) {
    const hh = String(Math.min(23, parseInt(m[1],10))).padStart(2,'0');
    const mm = String(Math.min(59, parseInt(m[2],10))).padStart(2,'0');
    return `${hh}:${mm}`;
  }

  // 1:00 PM / 01 PM / 7pm
  m = s.match(/^(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)$/i);
  if (m) {
    let hh = parseInt(m[1],10);
    const mm = m[2] ?? "00";
    const isPM = /PM/i.test(m[3]);
    if (hh === 12) hh = isPM ? 12 : 0;
    else if (isPM) hh += 12;
    return `${String(hh).padStart(2,"0")}:${mm}`;
  }

  // 7pm, 12am
  m = s.match(/^(\d{1,2})(am|pm)$/i);
  if (m) {
    let hh = parseInt(m[1],10);
    const isPM = /pm/i.test(m[2]);
    if (hh === 12) hh = isPM ? 12 : 0;
    else if (isPM) hh += 12;
    return `${String(hh).padStart(2,"0")}:00`;
  }

  // keep as-is (จะโดน validate ซ้ำ)
  return s;
}
const HHMM_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const toMin = (hhmm) => {
  const s = typeof hhmm === 'string' ? hhmm : String(hhmm ?? '');
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1],10)*60 + parseInt(m[2],10);
};
const minToHHMM = (m) => {
  const hh = String(Math.floor(m/60)).padStart(2,'0');
  const mm = String(m%60).padStart(2,'0');
  return `${hh}:${mm}`;
};
// อ่านเป็น UTC ชั่วโมง/นาที กัน timezone shift
function dtToHHMM(x) {
  if (!x) return null;
  try {
    const d = (x instanceof Date) ? x : new Date(x);
    if (isNaN(d.getTime())) return null;
    const hh = String(d.getUTCHours()).padStart(2,'0');
    const mm = String(d.getUTCMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  } catch { return null; }
}

/* ========== invite/edit modal (EN) ========== */
function InviteModal({
  open,
  onClose,
  eventId,
  initial,
  onSaved,
  windowStartHHMM,
  windowEndHHMM,
  invitedStatusMap = new Map(), // artistId -> STATUS
}) {
  const DURATIONS = [15, 30, 45, 60, 90, 120];

  const [loadingArtists, setLoadingArtists] = useState(false);
  const [artists, setArtists] = useState([]);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(initial?.artistId ?? null);
  const [warn, setWarn] = useState('');
  // Use either a quick slot OR manual time (mutually exclusive)
  const [selectedSlot, setSelectedSlot] = useState(null);

  // replace declined mode
  const replaceDeclinedId = (initial?.status === 'DECLINED' && initial?.aeId) ? initial.aeId : null;
  const isReplaceMode = !!replaceDeclinedId;

  const [form, setForm] = useState({
    startTime: normTime(initial?.start) || '',
    endTime: normTime(initial?.end) || '',
    duration: (() => {
      const st = normTime(initial?.start);
      const et = normTime(initial?.end);
      const sm = toMin(st || '');
      const em = toMin(et || '');
      return (sm!=null && em!=null && em>sm) ? (em-sm) : 60;
    })(),
  });
  const [endDirty, setEndDirty] = useState(false);

  useEffect(() => {
    const st = normTime(initial?.start) || '';
    const et = normTime(initial?.end) || '';
    const sm = toMin(st || '');
    const em = toMin(et || '');
    setSelectedId(initial?.artistId ?? null);
    setForm({
      startTime: st,
      endTime: et,
      duration: (sm!=null && em!=null && em>sm) ? (em-sm) : 60,
    });
    setSelectedSlot(null);
    setEndDirty(false);
    setWarn('');
  }, [initial]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        setLoadingArtists(true);
        const { data } = await api.get('/artists');
        if (alive) setArtists(Array.isArray(data) ? data : []);
      } finally {
        if (alive) setLoadingArtists(false);
      }
    })();
    return () => { alive = false; };
  }, [open]);

  // อัปเดต endTime อัตโนมัติตาม start + duration (ยังคงเดิม)
  useEffect(() => {
    if (!open) return;
    const sm = toMin(form.startTime || '');
    if (sm==null) return;
    const minM = windowStartHHMM ? toMin(windowStartHHMM) : 18*60;
    const maxM = windowEndHHMM   ? toMin(windowEndHHMM)   : 24*60;
    const d = Number(form.duration) || 60;
    const endM = Math.min(maxM, sm + d);
    if (!endDirty) setForm(f => ({ ...f, endTime: minToHHMM(endM) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.startTime, form.duration, windowStartHHMM, windowEndHHMM, endDirty]);

  const displayName = (a) =>
    a?.performer?.user?.name || `Artist #${a?.performerId ?? ''}`;

  const displayThumb = (a) => {
    const r0 = Array.isArray(a?.artistRecords) ? a.artistRecords[0] : null;
    return r0?.thumbnailUrl
      || (Array.isArray(r0?.photoUrls) && r0.photoUrls[0])
      || a?.performer?.user?.profilePhotoUrl
      || '/img/graphic-3.png';
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return artists;
    return artists.filter(a => displayName(a).toLowerCase().includes(s));
  }, [artists, q]);

  // ====== logic C6 ======
  const statusOf = (id) => {
    const key = Number(id);
    if (invitedStatusMap instanceof Map) return invitedStatusMap.get(key);
    return invitedStatusMap?.[key];
  };
  const isReinvitable = (id) => {
    const st = String(statusOf(id) || '').toUpperCase();
    return st === 'DECLINED' || st === 'CANCELED';
  };
  const isActiveInLineup = (id) => {
    const st = String(statusOf(id) || '').toUpperCase();
    return st === 'PENDING' || st === 'ACCEPTED';
  };

  const validate = () => {
    if (selectedId && isActiveInLineup(selectedId)) {
      const isSameDeclinedArtist = isReplaceMode && Number(selectedId) === Number(initial?.artistId);
      if (!isSameDeclinedArtist) return 'This artist is already in the current lineup.';
    }
    const st = normTime(form.startTime);
    const et = normTime(form.endTime);
    if (!st || !et) return 'Please fill start time and end time.';
    const sm = toMin(st), em = toMin(et);
    if (sm==null || em==null) return 'Invalid time format (e.g., 19:30).';
    if (sm >= em) return 'Start time must be earlier than end time.';
    const wmS = windowStartHHMM ? toMin(windowStartHHMM) : null;
    const wmE = windowEndHHMM ? toMin(windowEndHHMM) : null;
    if (wmS!=null && sm < wmS) return `Start time is before event window (${windowStartHHMM}).`;
    if (wmE!=null && em > wmE) return `End time exceeds event window (${windowEndHHMM}).`;
    return '';
  };

  useEffect(() => {
    setWarn(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, form.startTime, form.endTime, windowStartHHMM, windowEndHHMM, invitedStatusMap]);

  const submit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setWarn(msg); return; }
    if (!selectedId) return;

    const payload = {
      artistId: Number(selectedId),
      eventId: Number(eventId),
      startTime: normTime(form.startTime),
      endTime: normTime(form.endTime),
      ...(isReplaceMode ? { replaceDeclinedOf: replaceDeclinedId } : {}),
    };

    try {
      await api.post('/artist-events/invite', payload, { withCredentials: true });
      onSaved?.();
      onClose?.();
    } catch (err) {
      const m =
        err?.response?.data?.message ||
        err?.message ||
        'เชิญศิลปินไม่สำเร็จ';
      const details = err?.response?.data?.details;
      const extra = Array.isArray(details) && details.length
        ? ' • ' + details.map(d => `${d.artistName} (${d.status}) ${d.start}–${d.end}`).join(' | ')
        : '';
      setWarn(m + extra);
    }
  };

  if (!open) return null;

  // helper: normalize on blur (ให้เป็น HH:mm ชัดเจน)
  const onBlurTime = (val, key) => {
    const t = normTime(val);
    setForm(f => ({ ...f, [key]: (t && HHMM_REGEX.test(t)) ? t : (t || '') }));
  };

  return (
    <div className="mdl-backdrop" onClick={onClose}>
      <div className="mdl" onClick={(e)=>e.stopPropagation()}>
        <h3 style={{marginTop:0}}>
          {isReplaceMode ? 'Replace Declined Artist' : 'Invite / Schedule Artist'}
        </h3>

        {(windowStartHHMM || windowEndHHMM) && (
          <div className="note" style={{marginBottom:8, fontSize:13}}>
            Event window: {windowStartHHMM || '—'} – {windowEndHHMM || '—'}
          </div>
        )}

        {/* Search */}
        <div className="artist-header">
          <label className="search-wrap">
            <input
              className="search-input"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Search artists…"
            />
            <span className="search-ico" aria-hidden>🔎</span>
          </label>
          <div className="search-meta">
            {loadingArtists
              ? <div className="loader loader-inline" aria-label="Loading artists"></div>
              : `Found ${filtered.length} artist(s)`}
          </div>
        </div>

        {/* Artist list */}
        <div className="artist-list">
          <div className="evartist-grid">
            {filtered.map(a => {
              const id = a.performerId;
              const sel = Number(selectedId) === Number(id);
              const active = isActiveInLineup(id);
              const reinvitable = isReinvitable(id);
              const disabled =
                active &&
                !(isReplaceMode && Number(id) === Number(initial?.artistId));

              return (
                <div
                  key={id}
                  className={`evartist-card ${sel ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                  onClick={()=>{ if (!disabled) setSelectedId(id); }}
                  role="button"
                  title={disabled ? 'Already in lineup' : displayName(a)}
                >
                  <img className="artist-thumb" src={displayThumb(a)} alt={displayName(a)}
                       onError={(e)=>{e.currentTarget.src='/img/graphic-3.png';}} />
                  <div className="artist-info">
                    <div className="artist-name" title={displayName(a)}>{displayName(a)}</div>
                    <div className="artist-actions" style={{gap:6}}>
                      <Link to={`/artists/${id}`} className="btn-xs">View detail</Link>
                      {active && !isReplaceMode
                        ? <span className="pill" style={{opacity:.8}}>Already in lineup</span>
                        : <span className={`pill ${sel ? 'on':''}`}>{sel ? 'Selected' : 'Select'}</span>
                      }
                      {reinvitable && (
                        <span className="pill" title="Previously declined – reinvite allowed">
                          Reinvite OK
                        </span>
                      )}
                    </div>
                    {reinvitable && (
                      <div style={{fontSize:12, color:'#64748b', marginTop:4}}>
                        Previously declined/canceled — you can invite again.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {!loadingArtists && filtered.length === 0 && (
              <div style={{gridColumn:'1 / -1', color:'#6b7280', padding:'8px 2px'}}>
                No artists found for “{q}”
              </div>
            )}
          </div>
        </div>

        {/* Validation warning */}
        {warn && <div className="warn">{warn}</div>}

        {/* Time form */}
        <form onSubmit={submit} className="frm invite-form" style={{marginTop:12}}>
          {/* Quick slots removed per request */}

          <div className="grid3">
            <label>Start time
              {/* 👉 เปลี่ยนเป็นกรอก 24 ชั่วโมง (ไม่ใช้ am/pm/ไม่ใช้ type=time) */}
              <input
                type="text"
                inputMode="numeric"
                placeholder="HH:mm"
                title="เวลาแบบ 24 ชั่วโมง เช่น 19:30"
                pattern="^([01]?\\d|2[0-3]):([0-5]\\d)$"
                value={form.startTime}
                onChange={(e)=>{
                  if (selectedSlot!=null) setSelectedSlot(null);
                  const d = String(e.target.value||'').replace(/[^0-9]/g,'').slice(0,4);
                  const v = d.length<=2 ? d : `${d.slice(0,2)}:${d.slice(2)}`;
                  setForm(v=>({ ...v, startTime: v }));
                }}
                onBlur={(e)=>{
                  const t = normTime(e.target.value);
                  setForm(v=>({ ...v, startTime: (t && HHMM_REGEX.test(t)) ? t : (t || '') }));
                }}
                disabled={selectedSlot!=null}
              />
            </label>

            <label>End time
              <input
                type="text"
                inputMode="numeric"
                placeholder="HH:mm"
                title="เวลาแบบ 24 ชั่วโมง เช่น 20:30"
                pattern="^([01]?\\d|2[0-3]):([0-5]\\d)$"
                value={form.endTime}
                onChange={(e)=>{
                  const d = String(e.target.value||'').replace(/[^0-9]/g,'').slice(0,4);
                  const v = d.length<=2 ? d : `${d.slice(0,2)}:${d.slice(2)}`;
                  setForm(v=>({ ...v, endTime: v }));
                }}
                onBlur={(e)=>{
                  const t = normTime(e.target.value);
                  setForm(v=>({ ...v, endTime: (t && HHMM_REGEX.test(t)) ? t : (t || '') }));
                }}
              />
            </label>

            <label>Duration
              <div className="duration-wrap">
                <select
                  value={form.duration}
                  onChange={(e)=>{
                    if (selectedSlot!=null) setSelectedSlot(null);
                    setForm(v=>({ ...v, duration: Number(e.target.value) || 60 }));
                  }}
                  disabled={selectedSlot!=null}>
                  {DURATIONS.map(d=><option key={d} value={d}>{d} min</option>)}
                </select>
                {/* duration chips removed */}
              </div>
            </label>
          </div>

          {/* End time input moved beside Start time */}/}

          <div className="act">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!selectedId || !!warn}>
              {isReplaceMode ? 'Replace Artist' : 'Invite Artist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===== helpers (ภายในไฟล์) ===== */
const badgeCss = {
  display:'inline-block',
  padding:'4px 8px',
  borderRadius: '999px',
  fontSize: 12,
  height: 'fit-content'
};

/* ===== Schedule component ===== */
function BasicSchedule({ rows, minM, maxM, onBarClick, onCancelInvite, canCancelInvite, isPublished }) {
  const total = Math.max(1, maxM - minM);
  const percent = (m) => ((m - minM) / total) * 100;

  const numCols = Math.max(1, Math.ceil((maxM - minM) / 60));
  const ticks = [];
  for (let m = minM; m <= maxM; m += 60) ticks.push(m);

  return (
    <div className="bs-wrap">
      <div className="bs-head">
        <div className="bs-colname">Artists</div>
        <div>
          <div
            className="bs-scale"
            style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}
          >
            {ticks.map((t, i) => {
              const isLast = i === ticks.length - 1;
              return (
                <span
                  key={t}
                  style={isLast ? { gridColumnStart: numCols, justifySelf: 'end', whiteSpace:'nowrap' } : {whiteSpace:'nowrap'}}
                >
                  {minToHHMM(t)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {rows.map(r => {
        const s = toMin(r.start), e = toMin(r.end);
        const ok = s!=null && e!=null && e>s;
        const left = ok ? percent(s) : 0;
        const width = ok ? (percent(e) - percent(s)) : 0;

        const st = String(r.status || 'PENDING').toUpperCase();
        const cls = st === 'ACCEPTED' ? 'ok' : (st === 'DECLINED' ? 'no' : 'wait');

        const endsAtRight = ok && Math.abs(e - maxM) < 0.0001;
        const styleObj = endsAtRight
          ? { left: `${left}%`, right: 0 }
          : { left: `${left}%`, width: `${width}%` };

        const allowCancel = canCancelInvite && !isPublished && st === 'PENDING';

        return (
          <div key={r.key} className="bs-row">
            <div>
              <div className="bs-name">{r.name}</div>
              <div className="bs-sub">
                <span className={`st ${cls}`}>{st}</span>
                {allowCancel && (
                  <button
                    className="btn-xs cancel"
                    onClick={() => onCancelInvite?.(r)}
                    title="Cancel this pending invite"
                  >
                    CANCEL INVITE
                  </button>
                )}
              </div>
            </div>
            <div className="bs-track">
              {ok ? (
                <button
                  className={`bs-bar ${cls}`}
                  style={styleObj}
                  onClick={onBarClick?()=>onBarClick(r):undefined}
                  title={`${r.start} – ${r.end}`}
                >
                  {r.start} – {r.end}
                </button>
              ) : (
                <div className="bs-bar tbd" style={{ left: 0, right: 0 }}>
                  TBD
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ========== main page ========== */
export default function EventDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [ev, setEv] = useState(null);
  const [me, setMe] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [deleting, setDeleting] = useState(false);

  const fetchEvent = async () => {
    const { data } = await api.get(`/events/${id}`, { withCredentials: true });
    setEv(data);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(''); setLoading(true);
        await fetchEvent();
      } catch (e) {
        if (!alive) return;
        setErr(extractErrorMessage?.(e, 'โหลดข้อมูลอีเวนต์ไม่สำเร็จ') || 'โหลดข้อมูลอีเวนต์ไม่สำเร็จ');
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/auth/me', { withCredentials: true });
        if (alive) setMe(data);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

const toggleFollow = async () => {
  if (!ev?.id || busy) return;
  setBusy(true);
  try {
    if (ev.likedByMe) {
      const { data } = await api.delete(`/events/${ev.id}/like`, { withCredentials: true });
      setEv(prev => ({
        ...prev,
        likedByMe: false,
        followersCount: data?.count ?? Math.max(0, (prev.followersCount || 0) - 1),
      }));
    } else {
      const { data } = await api.post(`/events/${ev.id}/like`, {}, { withCredentials: true });
      setEv(prev => ({
        ...prev,
        likedByMe: true,
        followersCount: data?.count ?? (prev.followersCount || 0) + 1,
      })); // ← ตรงนี้เมื่อกี้มีวงเล็บเกินมา 1 ตัว
    }
  } finally {
    setBusy(false);
  }
};


  const canEdit = useMemo(() => {
    if (!me || !ev?.venue) return false;
    const isOrg = me.role === 'ORGANIZE' || me.role === 'ADMIN';
    const owns = Number(me.id) === Number(ev.venue.performerId);
    return isOrg && owns && !ev.isPublished;
  }, [me, ev]);

  const canPublish = !!(ev?._isOwner) && !ev?.isPublished;
  const isReady = !!(ev?._ready?.isReady);
  const onPublish = async () => {
    if (!canPublish || !isReady || publishing) return;
    const result = await Swal.fire({
      title: 'Publish this event?',
      text: 'Followers and accepted artists will be notified.',
      icon: 'question',
      confirmButtonText: 'Publish',
      confirmButtonColor: '#2563eb',
      cancelButtonText: 'Not yet',
      showCancelButton: true,
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    setPublishing(true);
    try {
      await api.post(`/events/${ev.id}/publish`, {}, { withCredentials: true });
      await fetchEvent();
      Swal.fire({
        title: 'Published!',
        text: 'The event is now live.',
        icon: 'success',
        confirmButtonColor: '#2563eb',
      });
    } catch (e) {
      Swal.fire({
        title: 'Publish failed',
        text: extractErrorMessage?.(e, 'Publish failed') || 'Publish failed',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
    } finally {
      setPublishing(false);
    }
  };

  const canDeleteEvent = !!(ev?._isOwner);

  // ตาราง lineup
  const scheduleRows = useMemo(() => {
    const rows = [];
    const aes = Array.isArray(ev?.artistEvents) ? ev.artistEvents : [];
    for (const ae of aes) {
      const name =
        ae?.artist?.performer?.user?.name ||
        ae?.artist?.performer?.user?.email ||
        `Artist ${ae?.artistId ?? ''}`;
      rows.push({
        key: `${ae.artistId}-${ae.eventId}`,
        aeId: ae.id,
        artistId: ae.artistId,
        name,
        status: ae?.status || 'PENDING',
        start: dtToHHMM(ae?.slotStartAt),
        end: dtToHHMM(ae?.slotEndAt),
        stage: ae?.slotStage || 'Main',
      });
    }
    const slots = Array.isArray(ev?.scheduleSlots) ? ev.scheduleSlots : [];
    for (const s of slots) {
      if (!s.artistId) continue;
      const exists = rows.find(r => r.artistId === s.artistId);
      if (!exists) {
        const at = aes.find(ae => ae.artistId === s.artistId);
        const name =
          at?.artist?.performer?.user?.name ||
          at?.artist?.performer?.user?.email ||
          `Artist ${s.artistId}`;
        rows.push({
          key: `slot-${s.id}`,
          aeId: null,
          artistId: s.artistId,
          name,
          status: 'PENDING',
          start: dtToHHMM(s.startAt),
          end: dtToHHMM(s.endAt),
          stage: s.stage || 'Main',
        });
      }
    }
    return rows
      .map(r => ({ ...r, _s: toMin(r.start ?? ''), _e: toMin(r.end ?? '') }))
      .sort((a,b) => {
        if (a._s!=null && b._s!=null && a._s!==b._s) return a._s - b._s;
        if (a._s!=null && b._s==null) return -1;
        if (a._s==null && b._s!=null) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [ev]);

  // invitedStatusMap
  const invitedStatusMap = useMemo(() => {
    const aes = Array.isArray(ev?.artistEvents) ? ev.artistEvents : [];
    const mp = new Map();
    for (const ae of aes) {
      mp.set(Number(ae.artistId), String(ae.status || '').toUpperCase());
    }
    return mp;
  }, [ev]);

  const windowRange = useMemo(() => {
    const eventStart = normTime(ev?.doorOpenTime);
    const eventEnd   = normTime(ev?.endTime);
    let minM = toMin(eventStart ?? '') ?? Infinity;
    let maxM = toMin(eventEnd   ?? '') ?? -Infinity;

    scheduleRows.forEach(r => {
      const s = toMin(r.start), e = toMin(r.end);
      if (s!=null) minM = Math.min(minM, s);
      if (e!=null) maxM = Math.max(maxM, e);
    });

    if (minM === Infinity) minM = 18*60;
    if (maxM === -Infinity) maxM = 24*60;
    if (maxM <= minM) maxM = minM + 60;

    minM = Math.floor(minM/60)*60;
    maxM = Math.ceil(maxM/60)*60;

    return { minM, maxM, startHH: minToHHMM(minM), endHH: minToHHMM(maxM), rawStart: eventStart, rawEnd: eventEnd };
  }, [ev, scheduleRows]);

  const onCancelInvite = async (row) => {
    if (!row?.artistId || !ev?.id) return;
    const result = await Swal.fire({
      title: `Cancel invite for "${row.name}"?`,
      text: 'The artist will be notified and removed from this line-up.',
      icon: 'warning',
      confirmButtonText: 'Cancel invite',
      confirmButtonColor: '#d33',
      cancelButtonText: 'Keep invite',
      showCancelButton: true,
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/events/${ev.id}/invites/${row.artistId}`, { withCredentials: true });
      await fetchEvent();
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Cancel failed',
        text: extractErrorMessage?.(e, 'Cancel invite failed') || 'Cancel invite failed',
        confirmButtonColor: '#d33',
      });
    }
  };

  const onDeleteEvent = async () => {
    if (!ev?.id) return;
    const result = await Swal.fire({
      title: 'Delete this event?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      confirmButtonText: 'Delete event',
      confirmButtonColor: '#d33',
      showCancelButton: true,
      cancelButtonText: 'Keep event',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    setDeleting(true);
    try {
      await api.post(
        `/events/${ev.id}/cancel`,
        { reason: null },
        { withCredentials: true },
      );
      navigate(location.pathname.startsWith('/myevents') ? '/myevents' : '/events', { replace: true });
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Delete failed',
        text: extractErrorMessage?.(e, 'Delete failed') || 'Delete failed',
        confirmButtonColor: '#d33',
      });
    } finally {
      setDeleting(false);
    }
  };

  // if (loading) return <div className="page"><div className="note">กำลังโหลด…</div></div>;
  if (loading) {
    return (
      <div className="page" aria-busy="true">
        <div className="page-loading">
          <div className="loader" aria-label="Loading event" />
        </div>
      </div>
    );
  }

  if (err) return (
    <div className="page">
      <div className="note err">{err}</div>
      <div style={{ marginTop: 8 }}>
        <button className="btn" onClick={() => navigate(-1)}>← กลับ</button>
      </div>
    </div>
  );
  if (!ev) {
    return (
      <div className="page">
        <div className="note err">Event not found.</div>
        <div style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => navigate(-1)}>Go back</button>
        </div>
      </div>
    );
  }

  /* ================= HERO ================= */
  const poster = ev?.posterUrl || '/img/graphic-3.png';
  const venueName = ev?.venue?.performer?.user?.name || ev?.venue?.name || '—';
  const locationUrl = ev?.venue?.location?.locationUrl || null;
  const scheduleRange = (ev.doorOpenTime || ev.endTime)
    ? `${normTime(ev.doorOpenTime) || '—'} – ${normTime(ev.endTime) || '—'}`
    : '—';

  return (
    <div className="page">
      {ev?._isOwner && ev?._ready && !ev._ready.isReady && (
        <div className="note" style={{ background:'#fff3cd', border:'1px solid #ffe69c', color:'#664d03', marginBottom:12 }}>
          This event is not public yet: waiting for artist acceptance {ev._ready.accepted}/{ev._ready.totalInvited}
          {typeof ev._ready.pending === 'number' ? ` (pending ${ev._ready.pending})` : ''}
        </div>
      )}

      <div className="ed-hero" style={{ backgroundImage: `url(${poster})` }}>
        <div className="ed-hero-inner">
          <div className="ed-hero-left">
            <div className="ed-title-row">
              <h1 className="ed-title">{ev.name || `Event #${ev.id}`}</h1>
              {ev.isPublished ? (
                <span className="badge" style={{background:'#16a34a',color:'#fff'}}>Published</span>
              ) : (
                <span className="badge" style={{background:'#6b7280',color:'#fff'}}>Draft</span>
              )}
            </div>
            
            <div className="ed-meta">
              <img src="/img/calendar-white-icon.png" alt="Date" className="ed-icon"/>
              <span className="ed-v">{formatDateEN(ev.date)}</span>
              <span className="ed-v">{scheduleRange}</span>
            </div>
            
            <div className="ed-meta">
              <img src="/img/pin_white.png" alt="Venue" className="ed-icon"/>
              <span className="ed-v"> 
                {locationUrl
                  ? <a className="alink" href={locationUrl} target="_blank" rel="noreferrer">{venueName} ↗</a>
                  : '—'}
              </span>
            </div>

            <div className="ed-meta">
              {ev.genre && <span className="ev-chip">{ev.genre}</span>}
              {ev.eventType && (
                <span className="ev-chip-transparent">{ev.eventType}</span>
              )}
              {ev.alcoholPolicy && (
                <span className="ev-chip-transparent">Alcohol: {ev.alcoholPolicy}</span>
              )}
              {ev.ageRestriction && (
                <span className="ev-chip-transparent">Age: {ev.ageRestriction}+</span>
              )}
            </div>
          </div>

          <div className="ed-hero-right">
            <img
              src={poster}
              alt={ev.name || `Event #${ev.id}`}
              onError={(e)=>{ e.currentTarget.src='/img/graphic-3.png'; }}
            />
          </div>
        </div>
      </div>

      {/* INFO GRID */}
      <section className="ed-info">
        <div className="ed-info-grid">
          <div className="ed-info-block">
            <h3 className="ed-info-title">TICKET LINK</h3>
            <p className="ed-text">
              {ev?.ticketLink
                ? <a className="alink" href={ev.ticketLink} target="_blank" rel="noreferrer">Tickets ↗</a>
                : '—'}
            </p>
          </div>

          <div className="ed-info-block">
            <h3 className="ed-info-title">DESCRIPTION</h3>
            <p className="ed-text">{ev?.description || '—'}</p>
          </div>

          <div className="ed-info-block">
            <h3 className="ed-info-title">CONDITIONS</h3>
            <p className="ed-text">{ev?.conditions || '—'}</p>
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section className="ed-schedule">
        <div className="ed-schedule-head">
          <h2 className="ed-info-title">Artist Schedule</h2>
          <div style={{display:'flex', gap:8}}>
            {canEdit && (
              <button className="btn primary" onClick={()=>{ setEditing(null); setModalOpen(true); }}>
                Schedule / Invite Artists
              </button>
            )}
            {canPublish && (
              <button
                className="btn primary"
                onClick={onPublish}
                disabled={!isReady || publishing}
                title={!isReady ? 'All invited artists must accept first' : 'Publish this event'}
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            )}
            {canDeleteEvent && (
              <button className="btn danger" onClick={onDeleteEvent} disabled={deleting} title="Delete event">
                {deleting ? 'Deleting…' : 'Delete Event'}
              </button>
            )}
          </div>
        </div>

        {/* {ev?.isPublished ? (
          <div className="note" style={{ background: '#eef6ff', border: '1px solid #bfdbfe', color: '#1e40af', marginBottom: 10 }}>
            This event is published (read-only). You can’t modify the lineup.
          </div>
        ) : ev?._ready ? (
          <div style={{margin:'6px 0 10px', fontSize:13, color: (ev._ready?.isReady ? '#0a7' : '#b35')}}>
            {ev._ready?.isReady
              ? (ev._isOwner ? 'Ready: All artists accepted — you can Publish now.' : 'Ready: All artists accepted.')
              : `Pending: ${ev._ready.accepted}/${ev._ready.totalInvited} accepted`}
          </div>
        ) : null} */}

        {scheduleRows.length === 0 ? (
          <div className="empty">—</div>
        ) : (
          <BasicSchedule
            rows={scheduleRows}
            minM={windowRange.minM}
            maxM={windowRange.maxM}
            onBarClick={canEdit ? (row)=>{ setEditing(row); setModalOpen(true); } : undefined}
            onCancelInvite={onCancelInvite}
            canCancelInvite={!!(ev?._isOwner)}
            isPublished={!!ev?.isPublished}
          />
        )}

        {/* Invite Modal */}
        <InviteModal
          open={modalOpen && !ev.isPublished}
          onClose={()=>setModalOpen(false)}
          eventId={ev.id}
          initial={editing}
          onSaved={fetchEvent}
          windowStartHHMM={windowRange.rawStart || null}
          windowEndHHMM={windowRange.rawEnd || null}
          invitedStatusMap={invitedStatusMap}
        />
      </section>
    </div>
  );
}
