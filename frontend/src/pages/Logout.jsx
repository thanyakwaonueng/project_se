import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Logout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    (async () => {
      await logout();
      navigate('/');
    })();
  }, [logout, navigate]);

  return <div style={{ padding: 16 }}>Logging out…</div>;
}
