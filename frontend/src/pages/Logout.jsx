import React, { useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    async function logout() {
      try {
        await axios.post('/auth/logout');
      } catch (err) {
        // ignore errors here
      }
      navigate('/login');
    }
    logout();
  }, [navigate]);

  return <p>Logging out...</p>;
}

