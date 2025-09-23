import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import InviteArtistStatusList from './InviteArtistStatusList'

export default function InviteArtist() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [form, setForm] = useState({
    artistId: "",
    eventId: Number(eventId),
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const artistIdStr = form.artistId.trim();

      // ✅ Validate: must be digits only (no spaces, no letters, no decimals)
      if (!/^\d+$/.test(artistIdStr)) {
        throw new Error("Artist ID must be a valid integer with no spaces or letters");
      }

      const payload = {
        ...form,
        artistId: parseInt(artistIdStr, 10),
        eventId: Number(form.eventId),
      };

      await axios.post("/api/artist-events/invite", payload, {
        withCredentials: true,
      });

      setMessage("✅ Invite sent successfully!");
    } catch (err) {
      setMessage(
        "❌ Failed to send invite: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4" style={{ maxWidth: 600,  display: "flex", flexDirection: "column"  }}>
      <h2>Invite Artist to Event</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Artist ID</label>
          <input
            type="text"
            name="artistId"
            value={form.artistId}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            className="form-control"
            rows={3}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Sending..." : "Send Invite"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>

      {message && <p className="mt-3">{message}</p>}
      <InviteArtistStatusList/>
    </div>
  );
}