import React, { useEffect, useState } from 'react';
import api, { extractErrorMessage } from '../lib/api';

export default function AdminRoleRequestsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // modal state
  const [show, setShow] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState('');
  const [sortOption, setSort] = useState('asc');
  const [filter, setFilter] = useState('PENDING'); // ALL | PENDING | APPROVED | REJECTED
  const [actionLoadingKey, setActionLoadingKey] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setErr('');
      const { data } = await api.get('/role-requests');
      setItems(data || []);
    } catch (e) {
      setErr(extractErrorMessage(e, 'โหลดคำขอไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    try {
      setActionLoadingKey(`${id}-${action}`);
      const note = prompt(action === 'approve' ? 'หมายเหตุ (ถ้ามี)' : 'เหตุผลที่ปฏิเสธ?');
      if (note === null) return; // User cancelled
      
      await api.post(`/role-requests/${id}/${action}`, { note });
      await load();
      setShow(false);
      setDetail(null);
    } catch (e) {
      alert(extractErrorMessage(e, 'ทำรายการไม่สำเร็จ'));
    } finally {
      setActionLoadingKey(null);
    }
  };

  const view = async (id) => {
    try {
      setDetailLoading(true);
      setDetailErr('');
      const { data } = await api.get(`/role-requests/${id}/detail`);
      setDetail(data);
      setShow(true);
    } catch (e) {
      setDetailErr(extractErrorMessage(e, 'โหลดรายละเอียดไม่สำเร็จ'));
      setShow(true);
    } finally {
      setDetailLoading(false);
    }
  };

  const close = () => { setShow(false); setDetail(null); setDetailErr(''); };

  // Prevent row click when clicking on buttons
  const handleRowClick = (e, item) => {
    // Don't trigger row click if user clicked on a button or action element
    if (e.target.closest('button') || e.target.closest('.no-row-click')) {
      return;
    }
    view(item.id);
  };

  if (sortOption == 'asc') {
    items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else {
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const counts = {
    ALL: items.length,
    PENDING: items.filter(i => i.status === 'PENDING').length,
    APPROVED: items.filter(i => i.status === 'APPROVED').length,
    REJECTED: items.filter(i => i.status === 'REJECTED').length,
  };

  const filteredItems = filter === 'ALL' ? items : items.filter(it => it.status === filter);

  // Status badge styling - matching artist.jsx
  const getStatusBadge = (status) => {
    const styles = {
      PENDING: { background: '#f59e0b', color: '#856404', border: '1px solid #ffeaa7' },
      APPROVED: { background: '#22c55e', color: '#0c5460', border: '1px solid #bee5eb' },
      REJECTED: { background: '#ef4444', color: '#721c24', border: '1px solid #f5c6cb' }
    };
    
    return (
      <span 
        className="badge" 
        style={{ 
          ...styles[status],
          padding: '6px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600',
          display: 'inline-block',
          minWidth: '80px',
          textAlign: 'center'
        }}
      >
        {status}
      </span>
    );
  };

  // Mobile card view for small screens
  const MobileCardView = ({ item }) => {
    const formatDateTime = (dateString) => {
      if (!dateString) return '—';
      
      const date = new Date(dateString);
      const datePart = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const timePart = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return `${datePart} ${timePart}`;
    };

    const isActionLoading = actionLoadingKey?.startsWith(`${item.id}-`);

    return (
      <div 
        className="card mb-3" 
        style={{ 
          border: '1px solid #dee2e6', 
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={(e) => handleRowClick(e, item)}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
      >
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h6 className="card-title mb-0" style={{ fontWeight: '500', color: '#2c3e50' }}>
              {item.user?.email}
            </h6>
            {getStatusBadge(item.status)}
          </div>
          
          <div className="mb-2">
            <small className="text-muted">Current Role:</small>
            <div style={{ color: '#495057' }}>{item.user?.role}</div>
          </div>

          <div className="mb-2">
            <small className="text-muted">Requested Role:</small>
            <div style={{ color: '#495057', fontWeight: '500' }}>{item.requestedRole}</div>
          </div>
          
          <div className="mb-3">
            <small className="text-muted">Requested At:</small>
            <div style={{ color: '#495057' }}>{formatDateTime(item.createdAt)}</div>
          </div>

          <div className="d-flex gap-2 no-row-click">
            {/* <button 
              className="btn btn-outline-secondary flex-fill"
              onClick={() => view(item.id)}
              style={{
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              View Details
            </button> */}

            {item.status === 'PENDING' && (
              <>
                <button
                  className="btn flex-fill"
                  onClick={(e) => {
                    e.stopPropagation();
                    act(item.id, 'reject');
                  }}
                  disabled={isActionLoading}
                  style={{
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginRight: '5px'
                  }}
                >
                  {isActionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Loading...
                    </>
                  ) : (
                    'Reject'
                  )}
                </button>

                <button
                  className="btn-viewdetail-ev flex-fill"
                  onClick={(e) => {
                    e.stopPropagation();
                    act(item.id, 'approve');
                  }}
                  disabled={isActionLoading}
                  style={{
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none'
                  }}
                >
                  {isActionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Loading...
                    </>
                  ) : (
                    'Approve'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '85%', margin: '0 auto', padding: '24px 0' }}>
      <div className="container-fluid py-3 px-2 px-md-3">
        <div className="row">
          <div className="col-12">
            <h2 className="mb-4" style={{ 
              fontWeight: "bold", 
              fontSize: 'clamp(1.5rem, 4vw, 3rem)', 
              color: '#000000'
            }}>
              PERMISSION UPGRADE REQUEST
            </h2>

            {/* Filter Buttons */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex flex-wrap gap-2 gap-md-3">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`btn ${filter === s ? 'ee-btn-primary' : 'ee-btn-primary'}`}
                    onClick={() => setFilter(s)}
                    style={{
                      borderRadius: '20px',
                      padding: '6px 12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      minWidth: 'fit-content',
                      marginRight: '5px'
                    }}
                  >
                    {s} <span className="ms-1">({counts[s] ?? 0})</span>
                  </button>
                ))}
              </div>
              
              {/* Sort Button - In separate container aligned right */}
              <div>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSort(sortOption === 'asc' ? 'desc' : 'asc')}
                  style={{ 
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderWidth: '2px'
                  }}
                >
                  Sort: {sortOption === 'asc' ? 'Oldest First' : 'Newest First'}
                </button>
              </div>
            </div>

            {err && (
              <div className="alert alert-danger" style={{ borderRadius: '12px' }}>
                {err}
              </div>
            )}

            {loading ? (
              <div className="text-center py-5 text-muted">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="mt-3">Loading requests...</div>
              </div>
            ) : !filteredItems.length ? (
              <div className="text-center py-5 text-muted fs-6">
                — No {filter !== 'ALL' ? filter.toLowerCase() : ''} requests —
              </div>
            ) : (
              <>
                {/* Desktop Table View - hidden on mobile */}
                <div className="d-none d-lg-block">
                  <div className="table-responsive" style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <table className="table table-hover mb-0">
                      <thead style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                          <th style={{ padding: '16px', fontWeight: '600', border: 'none', width: '200px'}}>User</th>
                          <th style={{ padding: '16px', fontWeight: '600', border: 'none', width: '120px' }}>Current</th>
                          <th style={{ padding: '16px', fontWeight: '600', border: 'none', width: '120px' }}>Requested</th>
                          <th style={{ padding: '16px', fontWeight: '600', border: 'none', width: '120px' }}>Status</th>
                          <th style={{ padding: '16px', fontWeight: '600', border: 'none', width: '150px' }}>When</th>
                          <th style={{ padding: '16px', fontWeight: '600', border: 'none', width: '200px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map(it => {
                          const formatDateTime = (dateString) => {
                            if (!dateString) return '—';
                            
                            const date = new Date(dateString);
                            const datePart = date.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });
                            
                            const timePart = date.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });
                            
                            return `${datePart} ${timePart}`;
                          };

                          const isActionLoading = actionLoadingKey?.startsWith(`${it.id}-`);

                          return (
                            <tr 
                              key={it.id} 
                              style={{ 
                                borderBottom: '1px solid #dee2e6',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease'
                              }}
                              onClick={(e) => handleRowClick(e, it)}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                            >
                              <td style={{ verticalAlign: 'middle', padding: '16px', border: 'none' }}>
                                <div style={{ fontWeight: '500', color: '#2c3e50' }}>{it.user?.email}</div>
                              </td>

                              <td style={{ verticalAlign: 'middle', padding: '16px', border: 'none', color: '#495057' }}>
                                {it.user?.role}
                              </td>

                              <td style={{ verticalAlign: 'middle', padding: '16px', border: 'none', fontWeight: '500', color: '#2c3e50' }}>
                                {it.requestedRole}
                              </td>

                              <td style={{ verticalAlign: 'middle', padding: '16px', border: 'none' }}>
                                {getStatusBadge(it.status)}
                              </td>

                              <td style={{ verticalAlign: 'middle', padding: '16px', border: 'none', color: '#495057' }}>
                                {formatDateTime(it.createdAt)}
                              </td>

                              <td 
                                style={{ verticalAlign: 'middle', padding: '16px', border: 'none' }}
                                className="no-row-click"
                              >
                                <div className="d-flex gap-2 flex-wrap">
                                  {/* <button 
                                    className="btn"
                                    onClick={() => view(it.id)}
                                    style={{
                                      borderRadius: '20px',
                                      padding: '2px 15px',
                                      fontSize: '13px',
                                      fontWeight: '500',
                                      marginRight: '3px'
                                    }}
                                  >
                                    View
                                  </button> */}

                                  {it.status === 'PENDING' && (
                                    <>
                                      <button
                                        className="btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          act(it.id, 'reject');
                                        }}
                                        disabled={isActionLoading}
                                        style={{
                                          borderRadius: '20px',
                                          padding: '2px 15px',
                                          fontSize: '13px',
                                          fontWeight: '500',
                                          marginRight: '5px'
                                        }}
                                      >
                                        {isActionLoading ? (
                                          <>
                                            <span className="spinner-border spinner-border-sm me-1" />
                                            Loading...
                                          </>
                                        ) : (
                                          'Reject'
                                        )}
                                      </button>
                                      <button
                                        className="btn-viewdetail-ev"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          act(it.id, 'approve');
                                        }}
                                        disabled={isActionLoading}
                                        style={{
                                          borderRadius: '20px',
                                          padding: '2px 16px',
                                          fontSize: '13px',
                                          fontWeight: '500',
                                          border: 'none',
                                          marginRight: '3px'
                                        }}
                                      >
                                        {isActionLoading ? (
                                          <>
                                            <span className="spinner-border spinner-border-sm me-1" />
                                            Loading...
                                          </>
                                        ) : (
                                          'Approve'
                                        )}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Card View - hidden on desktop */}
                <div className="d-lg-none">
                  {filteredItems.map(item => (
                    <MobileCardView key={item.id} item={item} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Modal รายละเอียดคำขอ ---------- */}
      {show && (
        <div style={overlay}>
          <div style={modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontWeight: '600' }}>Request details</h4>
              <button className="close-btn" onClick={close}>×</button>
            </div>

            {detailLoading && (
              <div className="text-center py-3 text-muted">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="mt-2">Loading details...</div>
              </div>
            )}
            {detailErr && <div className="alert alert-danger" style={{ borderRadius: '12px' }}>{detailErr}</div>}

            {!!detail && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={kvGrid}>
                  <div>User</div><div><b>{detail.request.user?.email}</b></div>
                  <div>Current role</div><div>{detail.request.user?.role}</div>
                  <div>Requested</div><div><b>{detail.request.requestedRole}</b></div>
                  <div>Reason</div><div>{detail.request.reason || '—'}</div>
                  <div>When</div><div>{new Date(detail.request.createdAt).toLocaleString()}</div>
                </div>

                {detail.request.requestedRole === 'ARTIST' && (
                  <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
                    <h5>Artist application information</h5>
                    {detail.application?.artist ? (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {detail.application.artist.profilePhotoUrl && (
                          <img
                            src={detail.application.artist.profilePhotoUrl}
                            alt="profile"
                            style={{ maxWidth: 220, borderRadius: 12, border: '1px solid #eee' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}

                        <div style={kvGrid}>
                          <div>Stage name</div><div><b>{detail.application.artist.name || '—'}</b></div>
                          <div>Genre</div><div>{detail.application.artist.genre || '—'}</div>
                          <div>Booking type</div><div>{detail.application.artist.bookingType || '—'}</div>
                          <div>Pitch</div><div>{detail.application.artist.description || '—'}</div>
                          <div>Contact</div>
                          <div>
                            {detail.application.artist.contactEmail || detail.application.artist.contactPhone ? (
                              <>
                                {detail.application.artist.contactEmail && <div>{detail.application.artist.contactEmail}</div>}
                                {detail.application.artist.contactPhone && <div>{detail.application.artist.contactPhone}</div>}
                              </>
                            ) : '—'}
                          </div>
                          <div>Price range</div>
                          <div>
                            {(detail.application.artist.priceMin || detail.application.artist.priceMax)
                              ? `${detail.application.artist.priceMin || '-'} – ${detail.application.artist.priceMax || '-'}`
                              : '—'}
                          </div>
                          <div>Links</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {detail.application.artist.youtubeUrl && <a href={detail.application.artist.youtubeUrl} target="_blank" rel="noreferrer">YouTube</a>}
                            {detail.application.artist.spotifyUrl && <a href={detail.application.artist.spotifyUrl} target="_blank" rel="noreferrer">Spotify</a>}
                            {detail.application.artist.soundcloudUrl && <a href={detail.application.artist.soundcloudUrl} target="_blank" rel="noreferrer">SoundCloud</a>}
                            {!detail.application.artist.youtubeUrl && !detail.application.artist.spotifyUrl && !detail.application.artist.soundcloudUrl && '—'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#777' }}>— There is no application attached. —</div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                  {detail.request.status === 'PENDING' && (
                    <button className="btn" onClick={() => act(detail.request.id, 'reject')}
                        style={{
                          borderRadius: '20px',
                          padding: '2px 15px',
                          fontSize: '13px',
                          fontWeight: '500',
                          marginRight: '3px'
                      }} 
                      >
                      Reject
                    </button>
                  )}
                  {detail.request.status === 'PENDING' && (
                    <button className="btn-viewdetail-ev" onClick={() => act(detail.request.id, 'approve')}
                      style={{
                        borderRadius: '20px',
                        padding: '2px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: 'none',
                        marginRight: '3px'
                      }} 
                      >
                      Approve
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- styles ---------- */
const overlay = {
  position: 'fixed', 
  inset: 0, 
  background: 'rgba(0,0,0,0.4)', 
  zIndex: 1000,
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  padding: 16,
};
const modal = {
  width: 'min(900px, 96vw)',
  maxHeight: '90vh',
  overflow: 'auto',
  background: '#fff',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 10px 30px rgba(0,0,0,.2)',
  position: 'relative', 
};

const kvGrid = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr',
  gap: '6px 12px',
  alignItems: 'baseline',
  fontSize: 14,
};