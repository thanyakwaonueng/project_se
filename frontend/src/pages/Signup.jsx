import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/Signup.css';
import { useGoogleLogin } from '@react-oauth/google';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
//import { useAuth } from '../lib/auth';
//import { extractErrorMessage } from '../lib/api';

export default function Signup() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);


  const handleSignup = async (e) => {
    e.preventDefault();
    // setErr('');

    if (password.length < 6) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Password',
        text: 'Password ต้องมีอย่างน้อย 6 ตัวอักษรขึ้นไป!',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    setBusy(true);

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

        Swal.fire({
          icon: 'success',
          title: 'Welcome!',
          text: 'Your account has been created successfully.',
          confirmButtonColor: '#3085d6'
        }).then(() => {
          window.location.assign('/accountsetup');
        });
      } catch (loginErr) {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: loginErr?.response?.data?.error || 'Login failed',
          confirmButtonColor: '#d33'
        });
      }
    } catch (signupErr) {
      Swal.fire({
        icon: 'error',
        title: 'Signup Failed',
        text: signupErr?.response?.data?.error || 'Sign up failed',
        confirmButtonColor: '#d33'
      });
    } finally {
      setBusy(false);
    }

  };


  //Google Login Section
  const Googlelogin = useGoogleLogin({
    flow: "auth-code",
    scope: "openid email profile",
    onSuccess: async (accesstoken) => { //ทำการขอเป็น access token
      console.log("Response: ", accesstoken)
      try {
        // ส่ง code ไปให้ backend แลก id_token + access_token พร้อม login ไปเลย
        await axios.post("/api/googlesignup", {code: accesstoken.code,}, {withCredentials: true});

        Swal.fire({
            icon: 'success',
            title: 'Welcome!',
            text: 'Your account has been created successfully.',
            confirmButtonColor: '#3085d6'
          }).then(() => {
            window.location.assign('/accountsetup');
        });

          
        
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Google Signup Failed',
          text: err?.response?.data?.error || 'Sign up failed',
          confirmButtonColor: '#d33'
        });
      }

    },
    onError: () => {
      Swal.fire({
          icon: 'error',
          title: 'Google Signup Failed',
          text: err?.response?.data?.error || 'Google Sign up failed',
          confirmButtonColor: '#d33'
        });
    },
  });



  return (

    <div className="signup-page">

      {/* <div class="container-h2">
        <h2>CHIANG MAI ORIGINAL</h2>
      </div> */}

      <div className="signup-content">
        <h1>Sign Up</h1>

        {/* <img src="/img/graphic-assets-6.png" className="graphic-assets-6"/> */}
        <div className="signup-subtitle">
        <p>Join our community today to stay updated on concerts, discover new sounds and never miss a beat in Chiang Mai.</p>
        </div>
        <div className="container">
          <div className="signup-section">
            <form onSubmit={handleSignup} className="signup-form">
              <div>
                {/* <label>Email</label> */}
                <input
                  type="email"
                  className="form-control"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
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
                  placeholder="Enter your password"
                  minLength={6}
                  required
                  disabled={busy}
                />
              </div>
              
              {/* หมายเหตุ: ระบบจะตั้งค่า role เป็น FAN อัตโนมัติหลังสมัคร
                  ถ้าต้องการสิทธิ์ ARTIST/VENUE/ORGANIZER ให้ไปขออัปเกรดสิทธิ์ภายหลังที่เมนู "Request role upgrade"
                  ใน Account dropdown (ที่ Navbar) */}

              <button type="submit" className="btn-signup" disabled={busy}>
                {busy ? 'Creating account…' : 'Sign Up'}
              </button>
            </form>

            <p className="or-divider">─────── or ───────</p>

            <button type="button" className="btn-google" onClick={() => Googlelogin()}>
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