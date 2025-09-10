import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
//import { useAuth } from '../lib/auth';
//import { extractErrorMessage } from '../lib/api';

export default function Signup() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setErr('');

    if (password.length < 6) { //Check password length
      setErr("Password ต้องมีอย่างน้อย 6 ตัวอักษรขึ้นไป!");
      return;
    }
    try {
      // สมัคร: backend จะบังคับ role = FAN เสมอ
      await axios.post('/api/users', { email, password });

      // Auto login หลังสมัคร (ต้องส่ง cookie กลับมาด้วย)
      try {
        await axios.post(
          '/api/auth/login',
          { email, password },
          { withCredentials: true }
        );
        navigate('/'); // สำเร็จ → กลับหน้าแรก
      } catch (loginErr) {
        setErr(loginErr?.response?.data?.error || 'Login failed');
      }
    } catch (signupErr) {
      setErr(signupErr?.response?.data?.error || 'Signup failed');
    } finally {
      setBusy(false);
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
          <input
            type="email"
            className="form-control"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={busy}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Password</label>
          <input
            type="password"
            className="form-control"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            minLength={6}
            required
            disabled={busy}
          />
        </div>

        {/* หมายเหตุ: ระบบจะตั้งค่า role เป็น FAN อัตโนมัติหลังสมัคร
            ถ้าต้องการสิทธิ์ ARTIST/VENUE/ORGANIZER ให้ไปขออัปเกรดสิทธิ์ภายหลังที่เมนู "Request role upgrade"
            ใน Account dropdown (ที่ Navbar) */}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
}