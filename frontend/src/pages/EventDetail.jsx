// src/pages/EventDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import api, { extractErrorMessage } from '../lib/api';

/* ========== helpers ========== */
function formatDT(iso) {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeStyle: 'short' }).format(dt);
  } catch { return iso; }
}
// รองรับ 19:30, 19.30, 19-30, 1930 → 19:30
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

/* ========== invite/edit modal ========== */
function InviteModal({
  open,
  onClose,
  eventId,
  initial,
  onSaved,
  windowStartHHMM,   // HH:MM ของ doorOpenTime (อาจว่าง)
  windowEndHHMM,     // HH:MM ของ endTime (อาจว่าง)
  invitedIds = [],   // รายชื่อ artistId ที่ถูกเชิญแล้ว
}) {
  const DURATIONS = [15, 30, 45, 60, 90, 120]; // นาที

  const [loadingArtists, setLoadingArtists] = useState(false);
  const [artists, setArtists] = useState([]);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(initial?.artistId ?? null);
  const [warn, setWarn] = useState('');

  // โหมด "แทนที่ศิลปินที่ปฏิเสธ"
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
      return (sm!=null && em!=null && em>sm) ? (em-sm) : 60; // default 60 นาที
    })(),
  });

  // เมื่อเปลี่ยน initial ให้รีเซ็ต
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

  // โหลดรายชื่อศิลปิน
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

  // คำนวณ endTime อัตโนมัติเมื่อ startTime/duration เปลี่ยน และ clamp ด้วยกรอบงาน
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

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return artists;
    return artists.filter(a => displayName(a).toLowerCase().includes(s));
  }, [artists, q]);

  const alreadyInvited = (id) => invitedIds?.includes?.(Number(id));

  const validate = () => {
    // ถ้าเป็นโหมดแทนที่ และเลือกเป็นคนเดิม ให้อนุญาต (re-invite/เวลาใหม่)
    if (selectedId && alreadyInvited(selectedId)) {
      const isSameDeclinedArtist = isReplaceMode && Number(selectedId) === Number(initial?.artistId);
      if (!isSameDeclinedArtist) {
        return 'ศิลปินคนนี้อยู่ในไลน์อัปของงานนี้อยู่แล้ว';
      }
    }

    const st = normTime(form.startTime);
    const et = normTime(form.endTime);
    if (!st || !et) return 'กรอกเวลาเริ่มและเวลาจบให้ครบ';
    const sm = toMin(st), em = toMin(et);
    if (sm==null || em==null) return 'รูปแบบเวลาไม่ถูกต้อง (เช่น 19:30)';
    if (sm >= em) return 'เวลาเริ่มต้องน้อยกว่าเวลาจบ';

    const wmS = windowStartHHMM ? toMin(windowStartHHMM) : null;
    const wmE = windowEndHHMM ? toMin(windowEndHHMM) : null;
    if (wmS!=null && sm < wmS) return `เวลาเริ่มก่อนเวลาเปิดงาน (${windowStartHHMM})`;
    if (wmE!=null && em > wmE) return `เวลาจบเกินเวลาสิ้นสุดงาน (${windowEndHHMM})`;

    return '';
  };

  useEffect(() => {
    setWarn(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, form.startTime, form.endTime, windowStartHHMM, windowEndHHMM, invitedIds]);

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
    await api.post('/artist-events/invite', payload, { withCredentials: true });
    onSaved?.();
    onClose?.();
  };

  if (!open) return null;
  return (
    <div className="mdl-backdrop" onClick={onClose}>
      <div className="mdl" onClick={(e)=>e.stopPropagation()}>
        <h3 style={{marginTop:0}}>
          {isReplaceMode ? 'แทนที่ศิลปินที่ปฏิเสธ' : 'เชิญศิลปิน/จัดตาราง'}
        </h3>

        {(windowStartHHMM || windowEndHHMM) && (
          <div className="note" style={{marginBottom:8, fontSize:13}}>
            ช่วงเวลางาน: {windowStartHHMM || '—'} – {windowEndHHMM || '—'}
          </div>
        )}

        {/* ค้นหา */}
        <div className="artist-header">
          <label className="search-wrap">
            <input
              className="search-input"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="ค้นหาด้วยชื่อศิลปิน…"
            />
            <span className="search-ico" aria-hidden>🔎</span>
          </label>
          <div className="search-meta">
            {loadingArtists ? 'กำลังโหลด…' : `พบ ${filtered.length} ศิลปิน`}
          </div>
        </div>

        {/* รายการศิลปิน */}
        <div className="artist-list">
          <div className="artist-grid">
            {filtered.map(a => {
              const id = a.performerId;
              const sel = Number(selectedId) === Number(id);
              const disabled =
                alreadyInvited(id) &&
                !(isReplaceMode && Number(id) === Number(initial?.artistId)); // อนุญาตถ้าเป็นคนเดิมในโหมดแทนที่
              return (
                <div
                  key={id}
                  className={`artist-card ${sel ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                  onClick={()=>{ if (!disabled) setSelectedId(id); }}
                  role="button"
                  title={disabled ? 'ศิลปินอยู่ในไลน์อัปแล้ว' : displayName(a)}
                >
                  <img className="artist-thumb" src={displayThumb(a)} alt={displayName(a)}
                       onError={(e)=>{e.currentTarget.src='/img/graphic-3.png';}} />
                  <div className="artist-info">
                    <div className="artist-name" title={displayName(a)}>{displayName(a)}</div>
                    <div className="artist-actions">
                      <Link to={`/artists/${id}`} className="btn-xs">View detail</Link>
                      {disabled
                        ? <span className="pill" style={{opacity:.75}}>Already in lineup</span>
                        : <span className={`pill ${sel ? 'on':''}`}>{sel ? 'Selected' : 'Select'}</span>
                      }
                    </div>
                  </div>
                </div>
              );
            })}
            {!loadingArtists && filtered.length === 0 && (
              <div style={{gridColumn:'1 / -1', color:'#6b7280', padding:'8px 2px'}}>ไม่พบศิลปินที่ชื่อ “{q}”</div>
            )}
          </div>
        </div>

        {/* เตือน validate */}
        {warn && <div className="warn">{warn}</div>}

        {/* เวลา (Start + Duration) */}
        <form onSubmit={submit} className="frm" style={{marginTop:12}}>
          {/* Quick slots ภายในกรอบงาน */}
          {(() => {
            const slots = [];
            const step = 30; // ทุก 30 นาที
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
            {/* เวลาเริ่ม */}
            <label>เวลาเริ่ม
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

            {/* ระยะเวลา */}
            <label>ระยะเวลา
              <div className="duration-wrap">
                <select
                  value={form.duration}
                  onChange={(e)=>setForm(v=>({ ...v, duration: Number(e.target.value) || 60 }))}>
                  {DURATIONS.map(d=><option key={d} value={d}>{d} นาที</option>)}
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

          {/* Preview เวลาจบ */}
          <div className="kv" style={{marginTop:4}}>
            <b>เวลาจบ</b><span>{form.endTime || '—'}</span>
          </div>

          {/* ปุ่ม */}
          <div className="act">
            <button type="button" className="btn" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn primary" disabled={!selectedId || !!warn}>
              {isReplaceMode ? 'แทนที่ศิลปิน' : 'เชิญศิลปิน'}
            </button>
          </div>
        </form>
      </div>
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

  // แก้ได้เฉพาะตอนยังไม่ publish และเป็นเจ้าของ/แอดมิน
  const canEdit = useMemo(() => {
    if (!me || !ev?.venue) return false;
    const isOrg = me.role === 'ORGANIZE' || me.role === 'ADMIN';
    const owns = Number(me.id) === Number(ev.venue.performerId);
    return isOrg && owns && !ev.isPublished;
  }, [me, ev]);

  // ปุ่ม Publish (แสดงเฉพาะ HERO)
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

  // แปลง artistEvents + scheduleSlots เป็นแถว
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
        aeId: ae.id,            // ✅ เก็บ id ของ artistEvent ไว้ใช้ตอนแทนที่
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

  const invitedIds = useMemo(() => {
    const aes = Array.isArray(ev?.artistEvents) ? ev.artistEvents : [];
    return aes.map(ae => Number(ae.artistId));
  }, [ev]);

  // ขอบเขตเวลาโชว์
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

  return (
    <div className="page">
      {/* แจ้งเตือนเจ้าของ/แอดมิน */}
      {ev?._isOwner && ev?._ready && !ev._ready.isReady && (
        <div className="note" style={{ background:'#fff3cd', border:'1px solid #ffe69c', color:'#664d03', marginBottom:12 }}>
          งานนี้ยังไม่เผยแพร่ต่อสาธารณะ: รอศิลปินตอบรับ {ev._ready.accepted}/{ev._ready.totalInvited}
          {typeof ev._ready.pending === 'number' ? ` (pending ${ev._ready.pending})` : ''}
        </div>
      )}

      {/* HERO */}
      <div className="hero">
        <div className="heroL">
          <div className="d-flex" style={{display:'flex', alignItems:'center', gap:8}}>
            <h1 className="title">{ev.name || `Event #${ev.id}`}</h1>
            {ev.isPublished ? (
              <span className="badge bg-success" style={badgeCss}>Published</span>
            ) : (
              <span className="badge bg-secondary" style={badgeCss}>Draft</span>
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
          </div>

          <div className="kv"><b>วันเวลา</b><span>{formatDT(ev.date)}</span></div>
          {(ev.doorOpenTime || ev.endTime) && (
            <div className="kv"><b>ช่วงงาน</b><span>{normTime(ev.doorOpenTime)||'—'} – {normTime(ev.endTime)||'—'}</span></div>
          )}
          <div className="kv"><b>ประเภท</b><span>{ev.eventType||'—'}</span></div>
          <div className="kv"><b>แนวเพลง</b><span>{ev.genre||'—'}</span></div>
          <div className="kv"><b>บัตร</b><span>{ev.ticketing||'—'}</span></div>
          <div className="kv"><b>ผู้ติดตาม</b>
            <span>👥 {ev.followersCount||0} <button className={`like ${ev.likedByMe?'on':''}`} onClick={toggleFollow} aria-label="follow" /></span>
          </div>
          {ev.ticketLink && (
            <div className="kv"><b>ลิงก์บัตร</b><a className="alink" href={ev.ticketLink} target="_blank" rel="noreferrer">เปิดลิงก์</a></div>
          )}
        </div>
        <div className="heroR">
          {ev.posterUrl
            ? <img src={ev.posterUrl} alt={ev.name||`Event #${ev.id}`} onError={(e)=>{ e.currentTarget.style.display='none'; }} />
            : <div className="ph">ไม่มีโปสเตอร์</div>}
        </div>
      </div>

      {/* VENUE */}
      <section className="sec">
        <h2 className="h2">สถานที่จัด</h2>
        {ev.venue ? (
          <div className="grid2">
            <div className="kv"><b>ชื่อสถานที่</b><span>{ev.venue?.performer?.user?.name || ev.venue?.name || '—'}</span></div>
            <div className="kv"><b>แนวถนัด</b><span>{ev.venue.genre || '—'}</span></div>
            <div className="kv"><b>ความจุ</b><span>{typeof ev.venue.capacity==='number'?ev.venue.capacity:'—'}</span></div>
            <div className="kv"><b>แผนที่</b><span>{ev.venue.location?.locationUrl
              ? <a className="alink" href={ev.venue.location.locationUrl} target="_blank" rel="noreferrer">เปิดแผนที่</a> : '—'}</span></div>
          </div>
        ) : <div className="empty">—</div>}
      </section>

      {/* ===== SCHEDULE ===== */}
      <section className="sec">
        <div className="secHead">
          <h2 className="h2" style={{margin:0}}>ตารางศิลปิน</h2>
          <div style={{display:'flex', gap:8}}>
            {/* ปุ่มเชิญ/แก้ตาราง: เฉพาะตอนยังไม่ publish */}
            {canEdit && (
              <button className="btn primary" onClick={()=>{ setEditing(null); setModalOpen(true); }}>
                จัดตาราง/เชิญศิลปิน
              </button>
            )}
            {location.pathname.startsWith('/myevents')
              ? <Link to="/myevents" className="btn">ไปหน้าเมื่อกี้</Link>
              : <Link to="/events" className="btn">กลับไปหน้า Events</Link>}
          </div>
        </div>

        {/* แถบสถานะรวม */}
        {ev?.isPublished ? (
          <div
            className="note"
            style={{ background: '#eef6ff', border: '1px solid #bfdbfe', color: '#1e40af', marginBottom: 10 }}
          >
            งานนี้เผยแพร่แล้ว (read-only) — ไม่สามารถเชิญศิลปินเพิ่มหรือแก้ไลน์อัปได้
          </div>
        ) : ev?._ready ? (
          <div style={{margin:'6px 0 10px', fontSize:13, color: (ev._ready?.isReady ? '#0a7' : '#b35')}}>
            {ev._ready?.isReady
              ? (ev._isOwner ? 'Ready: ศิลปินตอบรับครบแล้ว — กด Publish ได้เลย' : 'Ready: ศิลปินตอบรับครบแล้ว')
              : `Pending: ${ev._ready.accepted}/${ev._ready.totalInvited} accepted`}
          </div>
        ) : null}

        {/* ตารางเวลา */}
        {scheduleRows.length === 0 ? (
          <div className="empty">—</div>
        ) : (
          <BasicSchedule
            rows={scheduleRows}
            minM={windowRange.minM}
            maxM={windowRange.maxM}
            onBarClick={canEdit ? (row)=>{ setEditing(row); setModalOpen(true); } : undefined}
          />
        )}

        {/* MODAL: ปิดอัตโนมัติเมื่อ publish แล้ว */}
        <InviteModal
          open={modalOpen && !ev.isPublished}
          onClose={()=>setModalOpen(false)}
          eventId={ev.id}
          initial={editing}
          onSaved={fetchEvent}
          windowStartHHMM={windowRange.rawStart || null}
          windowEndHHMM={windowRange.rawEnd || null}
          invitedIds={invitedIds}
        />
      </section>

      {/* ===== CSS ===== */}
      <style>{`
  .page{max-width:1100px;margin:0 auto;padding:24px 20px 64px}
  .note{background:#fff3cd;color:#664d03;padding:12px 14px;border-radius:10px}
  .note.err{background:#fde8ea;color:#a6232f}
  .btn{padding:10px 14px;border-radius:10px;border:1px solid #d0d7de;background:#fff;cursor:pointer}
  .btn.primary{background:#1f6feb;color:#fff;border-color:#1f6feb}
  .btn-xs{padding:6px 10px;border-radius:8px;border:1px solid #d0d7de;background:#fff;font-size:12px}
  .alink{color:#1f6feb}
  .like{width:24px;height:24px;border-radius:50%;border:1px solid #d0d7de;background:#fff;margin-left:8px}
  .like.on{background:#ffeff0;border-color:#ffccd1}

  .hero{display:grid;grid-template-columns:1fr 380px;gap:20px;align-items:start}
  .heroR img{width:100%;height:300px;object-fit:cover;border-radius:12px;border:1px solid #e5e7eb}
  .ph{height:300px;border:1px dashed #e5e7eb;border-radius:12px;display:grid;place-items:center;color:#8a8a8a}
  .title{margin:0 0 8px 0}
  .kv{display:grid;grid-template-columns:110px 1fr;gap:10px;margin:6px 0}
  .sec{margin-top:28px}
  .h2{font-size:20px}
  .grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .empty{padding:12px;border:1px dashed #e5e7eb;border-radius:10px;color:#8a8a8a}
  .secHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}

  /* ===== Schedule ===== */
  .bs-wrap{display:grid;row-gap:12px}
  .bs-head{display:grid;grid-template-columns:220px 1fr;column-gap:12px;align-items:end}
  .bs-colname{font-weight:700}
  .bs-scale{display:flex;justify-content:space-between;color:#6b7280;font-size:12px;padding:0 4px}
  .bs-row{display:grid;grid-template-columns:220px 1fr;column-gap:12px;align-items:center}
  .bs-name{font-weight:600;margin-bottom:4px}
  .bs-sub{color:#6b7280;font-size:12px}
  .bs-sub .st{font-size:12px;padding:2px 8px;border-radius:999px;border:1px solid transparent;margin-right:6px}
  .bs-track{position:relative;height:38px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;overflow:hidden}
  .bs-bar{position:absolute;top:3px;height:32px;border-radius:8px;border:1px solid #cfe1ff;background:#eaf2ff;
          display:flex;align-items:center;justify-content:center;font-size:13px;color:#1d2a3a;white-space:nowrap;padding:0 8px;transition:box-shadow .15s}
  .bs-bar.tbd{background:#fff;border-style:dashed;color:#6b7280}

  /* สีตามสถานะ */
  .bs-bar.ok{background:#e8f8f0;border-color:#a5e3c6;color:#0f5132}
  .bs-bar.wait{background:#fff7e6;border-color:#ffe0a3;color:#7a5200}
  .bs-bar.no{background:#fde8ea;border-color:#f5b5bd;color:#842029}
  .bs-sub .st.ok{background:#e8f8f0;border-color:#a5e3c6;color:#0f5132}
  .bs-sub .st.wait{background:#fff7e6;border-color:#ffe0a3;color:#7a5200}
  .bs-sub .st.no{background:#fde8ea;border-color:#f5b5bd;color:#842029}

  /* ===== Modal / Artist selector ===== */
  .mdl-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:grid;place-items:center;z-index:50}
  .mdl{
    background:#fff;
    border-radius:14px;
    max-width:820px;
    width:96vw;
    padding:18px 18px 16px;
    max-height:88vh;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    box-shadow:0 18px 36px rgba(0,0,0,.12)
  }

  /* ฟอร์มเวลาอยู่ล่างติดเสมอ */
  .frm{
    position:sticky; bottom:0;
    background:#fff;
    padding-top:10px;
    margin-top:12px;
    border-top:1px solid #eee;
    display:grid; gap:12px
  }
  .frm input{width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px}
  .act{display:flex;gap:8px;justify-content:flex-end}

  /* ส่วนหัวค้นหา */
  .artist-header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:6px 2px 10px}
  .search-wrap{position:relative;flex:1}
  .search-input{width:100%;padding:10px 34px 10px 40px;border:1px solid #e5e7eb;border-radius:999px;background:#f8fafc;outline:none}
  .search-input:focus{border-color:#1f6feb;box-shadow:0 0 0 3px rgba(31,111,235,.15)}
  .search-ico{position:absolute;left:12px;top:50%;transform:translateY(-50%);opacity:.65}
  .search-meta{font-size:12px;color:#6b7280}

  /* ลิสต์ศิลปินให้เตี้ยลง + เป็นตัวสกรอลล์หลัก */
  .artist-list{
    flex:1;
    max-height:38vh;
    overflow:auto;
    padding-right:6px;
    margin-bottom:8px;
    scrollbar-width:thin
  }
  .artist-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
  .artist-card{display:flex;gap:10px;border:1px solid #e5e7eb;border-radius:14px;padding:8px 10px;align-items:center;background:#fff;cursor:pointer;transition:box-shadow .15s,border-color .15s}
  .artist-card:hover{box-shadow:0 6px 18px rgba(0,0,0,.06)}
  .artist-card.selected{border-color:#1f6feb;box-shadow:0 0 0 3px rgba(31,111,235,.18)}
  .artist-card.disabled{opacity:.55;pointer-events:none}
  .artist-thumb{width:48px;height:48px;border-radius:12px;object-fit:cover;border:1px solid #e5e7eb;background:#fafafa}
  .artist-info{display:flex;flex-direction:column;gap:4px;min-width:0}
  .artist-name{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .artist-actions{display:flex;gap:8px;align-items:center}
  .pill{font-size:12px;padding:4px 10px;border-radius:999px;border:1px solid #d0d7de;background:#f1f5f9}
  .pill.on{background:#1f6feb;color:#fff;border-color:#1f6feb}
  .warn{margin:6px 2px 0;background:#fff7e6;border:1px solid #ffe0a3;color:#7a5200;padding:8px 10px;border-radius:10px;font-size:13px}

  /* Duration & quick slots */
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}
  .chip{padding:6px 10px;border-radius:999px;border:1px solid #d0d7de;background:#f8fafc;font-size:12px;cursor:pointer}
  .chip:hover{background:#eef2ff;border-color:#cfe1ff}
  .chip.on{background:#1f6feb;color:#fff;border-color:#1f6feb}
  .duration-wrap{display:flex;flex-direction:column;gap:6px}
  .duration-wrap select{width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;background:#fff}
  .duration-chips{display:flex;flex-wrap:wrap;gap:6px}

  @media (min-width:900px){
    .artist-list{max-height:44vh}
  }
  @media (max-width:980px){
    .hero{grid-template-columns:1fr}
    .artist-list{max-height:32vh}
  }
      `}</style>
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
function BasicSchedule({ rows, minM, maxM, onBarClick }) {
  const total = Math.max(1, maxM - minM);
  const percent = (m) => ((m - minM) / total) * 100;

  const hours = [];
  for (let m = minM; m <= maxM; m += 60) hours.push(m);

  return (
    <div className="bs-wrap">
      <div className="bs-head">
        <div className="bs-colname">ศิลปิน</div>
        <div>
          <div className="bs-scale">
            {hours.map(h => <span key={h}>{minToHHMM(h)}</span>)}
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

        return (
          <div key={r.key} className="bs-row">
            <div>
              <div className="bs-name">{r.name}</div>
              <div className="bs-sub">
                <span className={`st ${cls}`}>{st}</span>
              </div>
            </div>
            <div className="bs-track">
              {ok ? (
                <button
                  className={`bs-bar ${cls}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={onBarClick?()=>onBarClick(r):undefined}
                  title={`${r.start} – ${r.end}`}
                >
                  {r.start} – {r.end}
                </button>
              ) : (
                <div className="bs-bar tbd" style={{ left:'2%', width:'96%' }}>
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
