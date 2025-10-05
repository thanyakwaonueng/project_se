import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/Login.css';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { useGoogleLogin } from '@react-oauth/google';
//import { useAuth } from '../lib/auth';
//import { extractErrorMessage } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  //const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await axios.post('/api/auth/login', { email, password });

      Swal.fire({
        icon: 'success',
        title: 'Login Successful',
        text: 'Welcome back!',
        confirmButtonColor: '#3085d6',
      }).then(() => {
        // redirect หลังจากกด OK
        window.location.assign('/');
      });

    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: err.response?.data?.error || 'Invalid email or password',
        confirmButtonColor: '#d33',
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

    <div className="login-page">
      <div className="login-content">
        <h1>Login</h1>
        <div className="container">
          <div className="login-section">
            <form onSubmit={handleLogin} className="login-form">
              <div>
                <input 
                    type="email" 
                    className="form-control" 
                    autoComplete="username"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Enter your email" 
                    required 
                />
              </div>
              <div>
                <input 
                    type="password" 
                    className="form-control" 
                    autoComplete="current-password"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Enter your password" 
                    required
                />
              </div>
              <button type="submit" className="btn-login" disabled={busy}>
                {busy ? 'Signing in…' : 'Login'}
              </button>
            </form>

            <p className="or-divider">─────── or ───────</p>

            <button type="button" className="btn-google" onClick={() => Googlelogin()}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google logo"
                className="google-icon"
              />
              Login with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}