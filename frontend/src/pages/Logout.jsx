import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../lib/auth';

export default function Logout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        await logout();
        await Swal.fire({
          icon: 'success',
          title: 'Logged out',
          text: 'See you next time!',
          confirmButtonColor: '#2563eb',
          timer: 1600,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      } catch (e) {
        await Swal.fire({
          icon: 'error',
          title: 'Logout failed',
          text: 'Please try again.',
          confirmButtonColor: '#d33',
        });
      } finally {
        navigate('/');
      }
    })();
  }, [logout, navigate]);

  return null;
}
