import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import '../css/Navbar.css';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Dropdown เปลี่ยนภาษา
  function LanguageDropdown() {
    const [language, setLanguage] = useState('th');
    const handleSelect = (lang) => {
      setLanguage(lang);
      closeMobileMenu();
    };

    return (
      <div className="dropdown ml-4">
        <button
          className="language-dropdown-btn navbar-menu-link w-inline-block d-flex align-items-center"
          type="button"
          id="languageDropdown"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          style={{ color: '#1c1c1c', textDecoration: 'none' }}
        >
          <img
            src={language === 'th' ? '/img/thailand.png' : '/img/united-kingdom.png'}
            alt={language === 'th' ? 'Thai' : 'English'}
            style={{ width: 18, height: 18, marginRight: 8 }}
          />
          {language === 'th' ? 'TH' : 'EN'}
        </button>

        <ul className="dropdown-menu" aria-labelledby="languageDropdown">
          <li>
            <button className="dropdown-item d-flex align-items-center" onClick={() => handleSelect('th')}>
              <img src="/img/thailand.png" alt="Thai" style={{ width: 18, height: 18, marginRight: 8 }} />
              Thai
            </button>
          </li>
          <li>
            <button className="dropdown-item d-flex align-items-center" onClick={() => handleSelect('en')}>
              <img src="/img/united-kingdom.png" alt="English" style={{ width: 18, height: 18, marginRight: 8 }} />
              English
            </button>
          </li>
        </ul>
      </div>
    );
  }

  // ปุ่ม Login/Signup หรือ Account Dropdown
  function AuthButtons({ user, loading }) {
    if (loading) return <span className="nav-item nav-link">กำลังตรวจสอบ…</span>;

    if (!user) {
      return (
        <>
          <a href="/login" className="navbar-menu-link w-inline-block" onClick={closeMobileMenu}>
            <div className="navbar-menu-text">LOGIN</div>
            <div className="navbar-menu-text">LOGIN</div>
          </a>

          <a href="/signup" className="navbar-menu-link w-inline-block" id="nav-signup-btn" onClick={closeMobileMenu}>
            SIGN UP
          </a>
        </>
      );
    }

    return (
      <div className="dropdown">
        <button
          className="navbar-menu-link w-inline-block dropdown-toggle"
          type="button"
          id="accountDropdown"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >

        <img src="/img/users-circles-freepik.png" className="navbar-menu-link profile-icon"/>
        </button>
        
        <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="accountDropdown">
          <li className="dropdown-item-text">
            Role: {user.role}
          </li>
          <li><hr className="dropdown-divider" /></li>

          {/*  ไปหน้าโปรไฟล์ก่อน */}
          <li>
            <Link className="dropdown-item" to="/me/profile" onClick={closeMobileMenu}>
              Profile
            </Link>
          </li>

          {(user.role === 'ARTIST' || user.role === 'ADMIN') && (
            <>
              <li><Link className="dropdown-item" to="/artist/inviterequests" onClick={closeMobileMenu}>Artist Pending Invite</Link></li>
            </>
          )}

          {(user.role === 'ORGANIZE' || user.role === 'ADMIN') && (
            <>
              <li><Link className="dropdown-item" to="/me/venue" onClick={closeMobileMenu}>My Venue</Link></li>
              <li><Link className="dropdown-item" to="/me/event" onClick={closeMobileMenu}>Create Event</Link></li>
              <li><Link className="dropdown-item" to="/myevents" onClick={closeMobileMenu}>My Event</Link></li>
            </>
          )}

          <li><hr className="dropdown-divider" /></li>
          <li><Link className="dropdown-item" to="/logout" onClick={closeMobileMenu}>Logout</Link></li>
        </ul>
      </div>
    );
  }

  return (
    <nav className={`navbar navbar-expand-lg navbar-dark full-width-navbar ${isScrolled ? 'navbar-small shadow' : ''}`}>
      <div className="container-fluid navbar-container">
        {/* Logo and mobile menu toggle */}
        <div className="d-flex justify-content-between w-50 align-items-center">
          <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
            <img src="/img/logo_black.png" className="logo" alt="logo" />
          </Link>

          {/* Hamburger menu for mobile with black icon */}
          <button
            className="navbar-toggler custom-toggler"
            type="button"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        </div>

        {/* Collapsible menu */}
        <div className={`collapse navbar-collapse ${isMobileMenuOpen ? 'show' : ''}`}>
          <div className="navbar-menu-wrapper">
            <a href="/artists" className="navbar-menu-link w-inline-block" onClick={closeMobileMenu}>
              <div className="navbar-menu-text">ARTISTS</div>
              <div className="navbar-menu-text">ARTISTS</div>
            </a>

            <a href="/events" className="navbar-menu-link w-inline-block" onClick={closeMobileMenu}>
              <div className="navbar-menu-text">EVENTS</div>
              <div className="navbar-menu-text">EVENTS</div>
            </a>

            {/* 🔁 เหลือเมนู VENUE อย่างเดียว (รวม list + map) */}
            <a href="/venues/map" className="navbar-menu-link w-inline-block" onClick={closeMobileMenu}>
              <div className="navbar-menu-text">VENUES</div>
              <div className="navbar-menu-text">VENUES</div>
            </a>

            {/* (ลบ MAP ออก) */}

            {/* Dropdowns */}
            <div className="navbar-auth-section">
              {user ? (
                <>
                  <LanguageDropdown />        {/* ย้ายมาเป็นอันแรก */}
                  <NotificationBell />
                  <AuthButtons user={user} loading={loading} />
                </>
              ) : (
                <>
                  <AuthButtons user={user} loading={loading} />
                  <LanguageDropdown />        {/* สำหรับผู้ใช้ไม่ล็อกอิน */}
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </nav>
  );
}
