// src/pages/EventDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
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
  let m = s.match(/^(\d{1,2})[:.\-]?(\d{2})$/);
  if (!m && s.length === 4) m = [s, s.slice(0,2), s.slice(2)];
  if (!m) return s;
  const hh = String(Math.min(23, parseInt(m[1],10))).padStart(2,'0');
  const mm = String(Math.min(59, parseInt(m[2],10))).padStart(2,'0');
  return `${hh}:${mm}`;
}
const toMin = (hhmm) => {
  const m = (hhmm||'').match(/^(\d{2}):(\d{2})$/);
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
  invitedStatusMap = new Map(), // <-- เปลี่ยนจาก invitedIds เป็น map: artistId -> STATUS
}) {
  const DURATIONS = [15, 30, 45, 60, 90, 120];

  const [loadingArtists, setLoadingArtists] = useState(false);
  const [artists, setArtists] = useState([]);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(initial?.artistId ?? null);
  const [warn, setWarn] = useState('');

  // replace declined mode (ยังคงไว้ได้)
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

  useEffect(() => {
    if (!open) return;
    const sm = toMin(form.startTime || '');
    if (sm==null) return;
    const minM = windowStartHHMM ? toMin(windowStartHHMM) : 18*60;
    const maxM = windowEndHHMM   ? toMin(windowEndHHMM)   : 24*60;
    const d = Number(form.duration) || 60;
    const endM = Math.min(maxM, sm + d);
    setForm(f => ({ ...f, endTime: minToHHMM(endM) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.startTime, form.duration, windowStartHHMM, windowEndHHMM]);

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

  // ====== logic C6: เชิญคนที่เคย DECLINED/CANCELED ได้ ======
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
    // บล็อคเฉพาะที่ยัง active อยู่: PENDING / ACCEPTED (หรือสถานะอื่นที่ควรนับว่า active)
    return st === 'PENDING' || st === 'ACCEPTED';
  };

  const validate = () => {
    if (selectedId && isActiveInLineup(selectedId)) {
      // อนุญาตก็ต่อเมื่อเป็น replace mode ของคนเดิม
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
            {loadingArtists ? 'Loading…' : `Found ${filtered.length} artist(s)`}
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
        <form onSubmit={submit} className="frm" style={{marginTop:12}}>
          {/* Quick slots */}
          {(() => {
            const slots = [];
            const step = 30;
            const d = Number(form.duration) || 60;
            const minM = windowStartHHMM ? toMin(windowStartHHMM) : 18*60;
            const maxM = windowEndHHMM   ? toMin(windowEndHHMM)   : 24*60;
            for (let m = minM; m + d <= maxM && slots.length < 6; m += step) {
              slots.push([m, m + d]);
            }
            if (slots.length === 0) return null;
            return (
              <div className="chips">
                {slots.map(([s,e],i)=>(
                  <button key={i} type="button" className="chip"
                    onClick={()=>setForm(f=>({ ...f, startTime:minToHHMM(s), endTime:minToHHMM(e) }))}>
                    {minToHHMM(s)}–{minToHHMM(e)}
                  </button>
                ))}
              </div>
            );
          })()}

          <div className="grid2">
            <label>Start time
              <input
                type="time"
                step="300"
                value={form.startTime}
                onChange={(e)=>{
                  const st = normTime(e.target.value);
                  setForm(v=>({ ...v, startTime: st }));
                }}
                placeholder="19:30"
              />
            </label>

            <label>Duration
              <div className="duration-wrap">
                <select
                  value={form.duration}
                  onChange={(e)=>setForm(v=>({ ...v, duration: Number(e.target.value) || 60 }))}>
                  {DURATIONS.map(d=><option key={d} value={d}>{d} min</option>)}
                </select>
                <div className="duration-chips">
                  {DURATIONS.slice(0,5).map(d=>(
                    <button key={d} type="button"
                      className={`chip ${Number(form.duration)===d?'on':''}`}
                      onClick={()=>setForm(v=>({ ...v, duration:d }))}>
                      {d}′
                    </button>
                  ))}
                </div>
              </div>
            </label>
          </div>

          <div className="kv" style={{marginTop:4}}>
            <b>End time</b><span>{form.endTime || '—'}</span>
          </div>

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
        setEv(prev => ({ ...prev, likedByMe:false, followersCount: data?.count ?? Math.max(0,(prev.followersCount||0)-1) }));
      } else {
        const { data } = await api.post(`/events/${ev.id}/like`, {}, { withCredentials: true });
        setEv(prev => ({ ...prev, likedByMe:true, followersCount: data?.count ?? (prev.followersCount||0)+1 }));
      }
    } finally { setBusy(false); }
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
    setPublishing(true);
    try {
      await api.post(`/events/${ev.id}/publish`, {}, { withCredentials: true });
      await fetchEvent();
    } catch (e) {
      alert(e?.response?.data?.error || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const canDeleteEvent = !!(ev?._isOwner);

  // ตาราง lineup (เหมือนเดิม)
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

  // 🔄 เปลี่ยนจาก invitedIds เป็น invitedStatusMap (artistId -> STATUS)
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
    if (!window.confirm(`Cancel invite for "${row.name}"?`)) return;
    try {
      await api.delete(`/events/${ev.id}/invites/${row.artistId}`, { withCredentials: true });
      await fetchEvent();
    } catch (e) {
      alert(extractErrorMessage?.(e, 'Cancel invite failed') || 'Cancel invite failed');
    }
  };

  const onDeleteEvent = async () => {
    if (!ev?.id) return;
    const reason = window.prompt('Type a reason (optional):', '');
    if (!window.confirm('This will permanently delete the event. Continue?')) return;
    setDeleting(true);
    try {
      await api.post(`/events/${ev.id}/cancel`, { reason: reason || null }, { withCredentials: true });
      navigate(location.pathname.startsWith('/myevents') ? '/myevents' : '/events', { replace: true });
    } catch (e) {
      alert(extractErrorMessage?.(e, 'Delete failed') || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="page"><div className="note">กำลังโหลด…</div></div>;
  if (err) return (
    <div className="page">
      <div className="note err">{err}</div>
      <div style={{ marginTop: 8 }}>
        <button className="btn" onClick={() => navigate(-1)}>← กลับ</button>
      </div>
    </div>
  );
  if (!ev) return null;

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

            <div className="ed-meta"><span className="ed-k">Date</span><span className="ed-v">{formatDateEN(ev.date)}</span></div>
            <div className="ed-meta"><span className="ed-k">Hours</span><span className="ed-v">{scheduleRange}</span></div>
            <div className="ed-meta"><span className="ed-k">Event Type</span><span className="ed-v">{ev?.eventType || '—'}</span></div>
            <div className="ed-meta"><span className="ed-k">Location</span><span className="ed-v">{venueName}{' '}</span></div>
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
            <h3 className="ed-info-title">CONTACT</h3>
            <div className="ed-kv"><div>Email</div><div>—</div></div>
            <div className="ed-kv"><div>Phone</div><div>—</div></div>
            <div className="ed-kv">
              <div>Location</div>
              <div>
                {locationUrl
                  ? <a className="alink" href={locationUrl} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>
                  : '—'}
              </div>
            </div>
          </div>

          <div className="ed-info-block">
            <h3 className="ed-info-title">DESCRIPTION</h3>
            <p className="ed-text">{ev?.description || '—'}</p>
          </div>

          <div className="ed-info-block">
            <h3 className="ed-info-title">LINKS</h3>
            <p className="ed-text">
              {ev?.ticketLink
                ? <a className="alink" href={ev.ticketLink} target="_blank" rel="noreferrer">Tickets ↗</a>
                : '—'}
            </p>
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section className="ed-schedule">
        <div className="ed-schedule-head">
          <h2 className="h2">Artist Schedule</h2>
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

        {ev?.isPublished ? (
          <div className="note" style={{ background: '#eef6ff', border: '1px solid #bfdbfe', color: '#1e40af', marginBottom: 10 }}>
            This event is published (read-only). You can’t modify the lineup.
          </div>
        ) : ev?._ready ? (
          <div style={{margin:'6px 0 10px', fontSize:13, color: (ev._ready?.isReady ? '#0a7' : '#b35')}}>
            {ev._ready?.isReady
              ? (ev._isOwner ? 'Ready: All artists accepted — you can Publish now.' : 'Ready: All artists accepted.')
              : `Pending: ${ev._ready.accepted}/${ev._ready.totalInvited} accepted`}
          </div>
        ) : null}

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
          invitedStatusMap={invitedStatusMap} // <-- ส่ง map สถานะไปแทน
        />
      </section>
    </div>
  );
}
