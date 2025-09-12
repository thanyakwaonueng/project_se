import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function InviteArtist() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [form, setForm] = useState({
    artistId: "",
    eventId: Number(eventId), // make sure it's a number
    role: "",
    fee: "",   // will parse to int before sending
    order: "", // will parse to int before sending
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
      // parse numbers correctly before sending
      const payload = {
        ...form,
        artistId: Number(form.artistId),
        eventId: Number(form.eventId),
        fee: form.fee ? Number(form.fee) : undefined,
        order: form.order ? Number(form.order) : undefined,
      };

      const res = await axios.post("/api/artist-events/invite", payload, {
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
    <div className="container mt-4" style={{ maxWidth: 600 }}>
      <h2>Invite Artist to Event</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Artist ID</label>
          <input
            type="number"
            name="artistId"
            value={form.artistId}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Role</label>
          <input
            type="text"
            name="role"
            value={form.role}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Fee (in cents)</label>
          <input
            type="number"
            name="fee"
            value={form.fee}
            onChange={handleChange}
            className="form-control"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Order</label>
          <input
            type="number"
            name="order"
            value={form.order}
            onChange={handleChange}
            className="form-control"
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

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Sending..." : "Send Invite"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>

      {message && <p className="mt-3">{message}</p>}
    </div>
  );
}

