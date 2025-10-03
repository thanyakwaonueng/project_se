// src/pages/MyEvents.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // Date formatting function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // CSS Styles
  const styles = {
    container: {
      width: "85%",
      margin: "24px auto",
      // padding: 16,
      // backgroundColor: "#ccc"
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      flexWrap: "wrap",
      gap: 16
    },
    title: {
      color: "#000000ff",
      fontSize: 50,
      fontWeight: 600,
      margin: 0
    },
    eventsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "20px",
      marginTop: 20
    },
    eventCard: {
      border: "1px solid #e1e5e9",
      borderRadius: 4,
      padding: 20,
      background: "#fff",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
      transition: "all 0.3s ease",
      display: "flex",
      flexDirection: "column"
    },
    eventPoster: {
      width: "100%",
      height: 160,
      borderRadius: 4,
      marginBottom: 16,
      objectFit: "cover",
      backgroundColor: "#f8f9fa"
    },
    eventName: {
      fontSize: 16,
      // fontWeight: 600,
      marginBottom: 12,
      color: "#2d3748",
      lineHeight: 1.4
    },
    eventMeta: {
      margin: 0,
      color: "#718096",
      fontSize: "0.9rem",
      marginBottom: 8
    },
    readinessBadge: {
      marginTop: 8,
      fontSize: "0.75rem",
      fontWeight: 600,
      padding: "4px 8px",
      borderRadius: 12,
      display: "inline-block"
    },
    ready: {
      backgroundColor: "#f0fff4",
      color: "#0a7",
      border: "1px solid #9ae6b4"
    },
    pending: {
      backgroundColor: "#fff5f5",
      color: "#b35",
      border: "1px solid #fed7d7"
    },
    eventDescription: {
      marginTop: 12,
      color: "#718096",
      fontSize: 14,
      lineHeight: 1.5,
      flexGrow: 1
    },
    eventActions: {
      display: "flex",
      gap: 12,
      marginTop: 16
    },
    button: {
      padding: "8px 16px",
      border: "none",
      borderRadius: 6,
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.2s ease",
      fontSize: "0.875rem",
      flex: 1,
      textAlign: "center"
    },
    buttonSecondary: {
      backgroundColor: "#edf2f7",
      color: "#4a5568",
      border: "1px solid #e2e8f0"
    },
    buttonOutlineDanger: {
      backgroundColor: "transparent",
      color: "#0a0a0aff",
      border: "1px solid #000000ff"
    },
    loadingText: {
      textAlign: "center",
      color: "#718096",
      fontSize: "1.1rem",
      margin: "40px 0"
    },
    errorText: {
      color: "#e53e3e",
      textAlign: "center",
      backgroundColor: "#fed7d7",
      padding: 16,
      borderRadius: 8,
      margin: "20px auto",
      maxWidth: 400,
      border: "1px solid #feb2b2"
    },
    emptyState: {
      textAlign: "center",
      color: "#718096",
      marginTop: 40,
      fontSize: "1.1rem",
      padding: 40,
      backgroundColor: "#f8f9fa",
      borderRadius: 12,
      border: "2px dashed #e2e8f0"
    }
  };

  // Hover effects
  const handleMouseEnter = (e) => {
    if (e.target.className === 'btn-viewdetail-ev') {
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    } else if (e.target.closest('.event-card')) {
      e.target.closest('.event-card').style.transform = 'translateY(-4px)';
      e.target.closest('.event-card').style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
      // e.target.closest('.event-card').style.borderColor = '#1c1c1cff';
    }
  };

  const handleMouseLeave = (e) => {
    if (e.target.className === 'btn-viewdetail-ev') {
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
    } else if (e.target.closest('.event-card')) {
      e.target.closest('.event-card').style.transform = 'translateY(0)';
      e.target.closest('.event-card').style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
      e.target.closest('.event-card').style.borderColor = '#e1e5e9';
    }
  };

  const handleButtonHover = (e, isHover) => {
    if (e.target.className.includes('btn-secondary')) {
      e.target.style.backgroundColor = isHover ? '#e2e8f0' : '#edf2f7';
      e.target.style.color = isHover ? '#2d3748' : '#4a5568';
    } else if (e.target.className.includes('btn-outline-danger')) {
      e.target.style.backgroundColor = isHover ? '#000000ff' : 'transparent';
      e.target.style.color = isHover ? 'white' : '#0a0a0aff';
    }
  };

  useEffect(() => {
    async function loadEvents() {
      try {
        const meRes = await axios.get("/api/auth/me", { withCredentials: true });
        const me = meRes.data;

        if (!me.performerInfo?.venueInfo) {
          setError("You must create a venue profile before managing events.");
          setLoading(false);
          return;
        }

        const evRes = await axios.get("/api/myevents", { withCredentials: true });
        const myEvents = Array.isArray(evRes.data) ? evRes.data : [];

        myEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

        setEvents(myEvents);
        setLoading(false);
      } catch (err) {
        setError(err?.response?.data?.error || "Failed to load events");
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  if (loading) return <p style={styles.loadingText}>Loading events…</p>;
  if (error) return <p style={styles.errorText}>{error}</p>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>MY EVENTS</h2>
        <button 
          onClick={() => navigate("/me/event")} 
          style={styles.newEventButton}
          className="btn-viewdetail-ev"
        >
          + New Event
        </button>
      </div>

      {events.length === 0 ? (
        <div style={styles.emptyState}>No events created yet.</div>
      ) : (
        <div style={styles.eventsGrid}>
          {events.map((ev) => (
            <div 
              key={ev.id} 
              style={styles.eventCard}
              className="event-card"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <img
                src={ev.posterUrl || "https://via.placeholder.com/300x160?text=No+Poster"}
                alt={ev.name}
                style={styles.eventPoster}
              />
              <h3 style={styles.eventName}>{ev.name}</h3>
              <p style={styles.eventMeta}>
                {formatDate(ev.date)}
                {/* <span className="vmap-eventTypeTag">{ev.eventType}</span> */}
              </p>


              {ev._ready && (
                <div style={{
                  ...styles.readinessBadge,
                  ...(ev._ready.isReady ? styles.ready : styles.pending)
                }}>
                  {ev._ready.isReady
                    ? "Ready: all artists accepted"
                    : `Pending: ${ev._ready.accepted}/${ev._ready.totalInvited} accepted`}
                </div>
              )}

              <p style={styles.eventDescription}>
                {ev.description?.slice(0, 100) || "No description…"}
              </p>

              <div style={styles.eventActions}>
                <button
                  style={{...styles.button, ...styles.buttonSecondary}}
                  className="btn btn-sm btn-secondary"
                  onClick={() => navigate(`/me/event/${ev.id}`)}
                  onMouseEnter={(e) => handleButtonHover(e, true)}
                  onMouseLeave={(e) => handleButtonHover(e, false)}
                >
                  Edit
                </button>

                <button
                  style={{...styles.button, ...styles.buttonOutlineDanger}}
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => navigate(`/myevents/${ev.id}`)}
                  onMouseEnter={(e) => handleButtonHover(e, true)}
                  onMouseLeave={(e) => handleButtonHover(e, false)}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}