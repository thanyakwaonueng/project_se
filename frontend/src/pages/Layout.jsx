import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { AuthProvider } from '../lib/auth';

export default function Layout() {
  const location = useLocation();  // ดึง path ปัจจุบัน
  const hideNavandFooter = location.pathname === '/signup' || location.pathname === '/login'; // หน้า signup จะไม่แสดง

  return (
    <AuthProvider>
      <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
        {!hideNavandFooter && <Navbar />}

        {!hideNavandFooter && (
          <div
            style={{
              width: "90%",
              height: "1.2px",
              backgroundColor: "#080808ff",
              margin: "30px auto", 
            }}
          ></div>
        )}

        <main style={{ flex: 1 }}>
          <Outlet />
        </main>

        {!hideNavandFooter && <Footer />}
      </div>
    </AuthProvider>
  );
}
