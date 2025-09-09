import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
//import { useAuth } from '../lib/auth';
//import { extractErrorMessage } from '../lib/api';

export default function Signup() {
  const navigate = useNavigate();
  //const { signup } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ARTIST'); // ดีฟอลต์
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await axios.post('/api/users', {
        email,
        password,
        role,
      });

      // Auto login after signup (optional)
      try {
        const res = await axios.post('/api/auth/login', {
          email,
          password,
        });
      } catch (err) {
        setErr(err.response?.data?.error || 'Login failed');
      }

      navigate('/'); // redirect
    } catch (err) {
      setErr(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Sign Up</h2>
      {err && (
        <div style={{ background: '#ffeef0', color: '#86181d', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {err}
        </div>
      )}

      <form onSubmit={handleSignup} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Email</label>
          <input type="email" className="form-control" autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Password</label>
          <input type="password" className="form-control" autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" required />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Role</label>
          <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="ARTIST">ARTIST</option>
            <option value="VENUE">VENUE</option>
            <option value="FAN">FAN</option>
            <option value="ORGANIZER">ORGANIZER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <small>ระบบจะ map ให้ตรง enum อัตโนมัติ</small>
        </div>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
}
