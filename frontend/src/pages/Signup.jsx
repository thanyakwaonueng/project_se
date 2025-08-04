import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('FAN');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('/users', {
        email,
        password,
        role,
      });

      // Auto login after signup (optional)
      const res = await axios.post('/auth/login', {
        email,
        password,
      });
      localStorage.setItem('token', res.data.token);
      //navigate('/dashboard');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <form onSubmit={handleSignup}>
      <h2>Sign Up</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <br />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <br />
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="FAN">FAN</option>
        <option value="ARTIST">ARTIST</option>
        <option value="VENUE">VENUE</option>
        {/* Add other roles as needed */}
      </select>
      <br />
      <button type="submit">Sign Up</button>
    </form>
  );
}

