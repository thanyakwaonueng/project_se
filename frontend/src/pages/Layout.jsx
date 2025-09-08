import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { AuthProvider } from '../lib/auth';

export default function Layout() {
  return (
    <AuthProvider>
      <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
        <Navbar />
          <div
            style={{
              width: "80%",
              height: "1.2px",
              backgroundColor: "#080808ff",
              margin: "-30px auto", 
            }}
          ></div>

          <main style={{ flex: 1 }}>
          
          <Outlet />
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
