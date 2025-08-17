import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { extractErrorMessage } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (e2) {
      setErr(extractErrorMessage(e2, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Login</h2>
      {err && <div style={{ background: '#ffeef0', color: '#86181d', padding: 12, borderRadius: 8, marginBottom: 12 }}>{err}</div>}

      <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Email</label>
          <input type="email" className="form-control" autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Password</label>
          <input type="password" className="form-control" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required />
        </div>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </div>
  );
}
