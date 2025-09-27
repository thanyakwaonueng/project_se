// src/pages/MyEvents.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    async function loadEvents() {
      try {
        // ✅ เช็กผู้ใช้และมีโปรไฟล์ venue หรือยัง
        const meRes = await axios.get("/api/auth/me", { withCredentials: true });
        const me = meRes.data;

        if (!me.performerInfo?.venueInfo) {
          setError("You must create a venue profile before managing events.");
          setLoading(false);
          return;
        }

        // ✅ ดึงอีเวนต์ของเราโดยตรง (แบ็กเอนด์กรองให้แล้ว)
        const evRes = await axios.get("/api/myevents", { withCredentials: true });
        const myEvents = Array.isArray(evRes.data) ? evRes.data : [];

        // เรียงวันเก่า→ใหม่
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

  if (loading) return <p style={{ textAlign: "center" }}>Loading events…</p>;
  if (error) return <p style={{ color: "red", textAlign: "center" }}>{error}</p>;

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>My Events</h2>
        <button onClick={() => navigate("/me/event")} className="btn btn-primary">
          + New Event
        </button>
      </div>

      {events.length === 0 ? (
        <p style={{ marginTop: 20 }}>No events created yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
            marginTop: 20,
          }}
        >
          {events.map((ev) => (
            <div
              key={ev.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 16,
                background: "#fff",
              }}
            >
              <img
                src={ev.posterUrl || "https://via.placeholder.com/300x160?text=No+Poster"}
                alt={ev.name}
                style={{ width: "100%", borderRadius: 6, marginBottom: 12 }}
              />
              <h3 style={{ marginBottom: 8 }}>{ev.name}</h3>
              <p style={{ margin: 0, color: "#666" }}>
                {new Date(ev.date).toLocaleDateString()} • {ev.eventType}
              </p>

              {/* readiness badge จาก backend (ถ้ามี) */}
              {ev._ready && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: ev._ready.isReady ? "#0a7" : "#b35",
                  }}
                >
                  {ev._ready.isReady
                    ? "Ready: all artists accepted"
                    : `Pending: ${ev._ready.accepted}/${ev._ready.totalInvited} accepted`}
                </div>
              )}

              <p style={{ marginTop: 8 }}>
                {ev.description?.slice(0, 100) || "No description…"}
              </p>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => navigate(`/me/event/${ev.id}`)}
                >
                  Edit
                </button>

                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => navigate(`/myevents/${ev.id}`)}
                >
                  View
                </button>

                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => navigate(`/me/invite_to_event/${ev.id}`)}
                >
                  invite
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
