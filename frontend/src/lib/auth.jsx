// frontend/src/lib/auth.jsx
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { extractErrorMessage } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, email, role, ... } | null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // ต้องเป็น '/auth/me' (baseURL '/api' → รวมเป็น '/api/auth/me')
      const { data } = await api.get('/auth/me');
      setUser(data || null);
    } catch (e) {
      setUser(null); // ยังไม่ล็อกอินก็ไม่เป็นไร
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    await api.post('/auth/login', { email, password });
    await refresh();
  }, [refresh]);

  const signup = useCallback(async (email, password, role) => {
    await api.post('/users', { email, password, role });
    await login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    setUser(null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = { user, loading, error, refresh, login, signup, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;
  // fallback ปลอดภัย เผื่อถูกใช้ผิดที่ (นอก Provider)
  return {
    user: null,
    loading: false,
    error: '',
    refresh: () => {},
    login: async () => {},
    signup: async () => {},
    logout: async () => {},
  };
}
