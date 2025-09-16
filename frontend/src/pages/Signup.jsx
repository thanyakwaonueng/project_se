import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/Signup.css';
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
        window.location.assign('/account_setup'); // สำเร็จ → กลับหน้าแรก
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

    <div className="signup-page">

      {/* <div class="container-h2">
        <h2>CHIANG MAI ORIGINAL</h2>
      </div> */}

      <div className="signup-content">
        <h1>Sign Up</h1>
        <div className="signup-subtitle">
          <p>Join our community today to stay updated on concerts, discover new sounds and never miss a beat in Chiang Mai.</p>
        </div>

        <div className="container">

          <div className="signup-section">

            {err && (
              <div className="error-popup">
                {err}
                <button className="close-btn" onClick={() => setErr('')}>×</button>
              </div>
            )}


            <form onSubmit={handleSignup} className="signup-form">
              <div>
                {/* <label>Email</label> */}
                <input
                  type="email"
                  className="form-control"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  disabled={busy}
                />
              </div>

              <div>
                {/* <label>Password</label> */}
                <input
                  type="password"
                  className="form-control"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  minLength={6}
                  required
                  disabled={busy}
                />
              </div>

              {/* หมายเหตุ: ระบบจะตั้งค่า role เป็น FAN อัตโนมัติหลังสมัคร
                  ถ้าต้องการสิทธิ์ ARTIST/VENUE/ORGANIZER ให้ไปขออัปเกรดสิทธิ์ภายหลังที่เมนู "Request role upgrade"
                  ใน Account dropdown (ที่ Navbar) */}

              <button type="submit" className="btn btn-signup" disabled={busy}>
                {busy ? 'Creating account…' : 'Sign Up'}
              </button>
            </form>

     
          <p className="or-divider">─────── or ───────</p>

          <button type="button" className="btn-google">
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
              className="google-icon"
            />
            Sign up with Google
          </button>


          </div>
        </div>



      </div>

    </div>
  );
}