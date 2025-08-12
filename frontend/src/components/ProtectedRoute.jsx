// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

/**
 * ใช้ครอบหน้า/Route ที่ต้องการป้องกัน
 * props:
 *  - allow: อาร์เรย์ของ role ที่อนุญาต เช่น ['VENUE','ORGANIZER','ADMIN']
 * 
 * ใช้แบบ:
 * <ProtectedRoute allow={['VENUE','ORGANIZER','ADMIN']}>
 *   <EventCreate />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ allow = [], children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 16 }}>Loading…</div>;
  }

  // ยังไม่ล็อกอิน → ส่งไปหน้า login พร้อมจำ path เดิม
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // ล็อกอินแล้วแต่ role ไม่อยู่ใน allow → เด้งกลับหน้าแรก
  if (allow.length > 0 && !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
