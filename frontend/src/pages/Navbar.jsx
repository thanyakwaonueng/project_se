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

  // Mobile Auth Menu (Role dropdown)
  function MobileAuthMenu({ user, loading }) {
    const [roleMenuOpen, setRoleMenuOpen] = useState(false);

    if (loading) return <span>กำลังตรวจสอบ…</span>;
    if (!user) {
      return (
        <>
          <a href="/login" onClick={closeMobileMenu}>LOGIN</a>
          <a href="/signup" onClick={closeMobileMenu}>SIGN UP</a>
        </>
      );
    }

    return (
      <>
        {/* Role menu toggle */}
        <a
          href="#"
          className="mobile-menu-link"
          onClick={(e) => {
            e.preventDefault();
            setRoleMenuOpen(!roleMenuOpen);
          }}
        >
          Role: {user.role}{' '}
          <span style={{ fontSize: '0.6em', lineHeight: 1 }}>
            {roleMenuOpen ? '▲' : '▼'}
          </span>
        </a>

        {/* Submenu */}
        {roleMenuOpen && (
          <div className="mobile-submenu" style={{ paddingLeft: '15px' }}>
            <a href="/me/profile" onClick={closeMobileMenu}>Profile</a>
            {(user.role === 'ARTIST' || user.role === 'ADMIN') && (
              <a href="/artist/inviterequests" onClick={closeMobileMenu}>Artist Pending Invite</a>
            )}
            {(user.role === 'ORGANIZE' || user.role === 'ADMIN') && (
              <>
                <a href={`/venues/${user.id}`} onClick={closeMobileMenu}>My Venue</a>
                <a href="/me/event" onClick={closeMobileMenu}>Create Event</a>
                <a href="/myevents" onClick={closeMobileMenu}>My Event</a>
              </>
            )}
            <a href="/logout" onClick={closeMobileMenu}>Logout</a>
          </div>
        )}
      </>
    );
  }


  // LanguageDropdown (เหมือนเดิม)
  function LanguageDropdown() {
    const [language, setLanguage] = useState('th');
    const handleSelect = (lang) => {
      setLanguage(lang);
      closeMobileMenu();
    };

    return (
      <div className="dropdown">
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

  // Desktop Auth Buttons (เดิม)
  function AuthButtons({ user, loading }) {
    if (loading) return <span className="nav-item nav-link">กำลังตรวจสอบ…</span>;

    if (!user) {
      return (
        <>
          <a href="/login" className="navbar-menu-wrapper navbar-menu-link w-inline-block" onClick={closeMobileMenu}>
            <div className="navbar-menu-text">LOGIN</div>
            <div className="navbar-menu-text">LOGIN</div>
          </a>
          <a href="/signup" className="navbar-menu-wrapper navbar-menu-link w-inline-block" id="nav-signup-btn" onClick={closeMobileMenu}>
            SIGN UP
          </a>
        </>
      );
    }

    return (
      <div className="dropdown">
        <button
          className="dropdown-toggle"
          type="button"
          id="accountDropdown"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <img src="/img/profile-user.png" alt="profile" className="profile-icon" />
        </button>

        <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="accountDropdown">
          <li className="dropdown-item-text">Role: {user.role}</li>
          <li><hr className="dropdown-divider" /></li>
          <li>
            <Link className="dropdown-item" to="/me/profile" onClick={closeMobileMenu}>
              Profile
            </Link>
          </li>

          {(user.role === 'ARTIST' || user.role === 'ADMIN') && (
            <li>
              <Link className="dropdown-item" to="/artist/inviterequests" onClick={closeMobileMenu}>
                Artist Pending Invite
              </Link>
            </li>
          )}

          {(user.role === 'ORGANIZE' || user.role === 'ADMIN') && (
            <>
              <li>
                <Link className="dropdown-item" to={`/venues/${user.id}`} onClick={closeMobileMenu}>
                  My Venue
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/me/event" onClick={closeMobileMenu}>
                  Create Event
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/myevents" onClick={closeMobileMenu}>
                  My Event
                </Link>
              </li>
            </>
          )}

          <li><hr className="dropdown-divider" /></li>
          <li>
            <Link className="dropdown-item" to="/logout" onClick={closeMobileMenu}>
              Logout
            </Link>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <nav className={`navbar navbar-expand-lg navbar-dark full-width-navbar ${isScrolled ? 'navbar-small shadow' : ''}`}>
      <div className="container-fluid navbar-container">

        {/* Logo + Hamburger */}
        <div className="d-flex justify-content-between w-100 align-items-center">
          <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
            <img src="/img/logo_black.png" className="logo-navbar" alt="logo" />
          </Link>
          <button
            className="navbar-toggler custom-toggler d-lg-none"
            type="button"
            onClick={toggleMobileMenu}
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        </div>

        {/* Mobile Slide Menu */}
        {isMobileMenuOpen && (
          <div className="mobile-slide-overlay d-lg-none" onClick={closeMobileMenu}>
            <div className="mobile-slide-menu" onClick={(e) => e.stopPropagation()}>
              <MobileAuthMenu user={user} loading={loading} />

              {/* Mobile Notification Link – แสดงเฉพาะตอนมี user */}
              {user && <NotificationBell mobileMode={true} />}

              <a href="/artists" onClick={closeMobileMenu}>ARTISTS</a>
              <a href="/events" onClick={closeMobileMenu}>EVENTS</a>
              <a href="/venues/map" onClick={closeMobileMenu}>VENUES</a>
              {/* <LanguageDropdown /> */}
            </div>
          </div>
        )}

        {/* Desktop Menu */}
        <div className="d-none d-lg-block">
          <div className="navbar-menu-wrapper">
            <a href="/artists" className="navbar-menu-link w-inline-block">
              <div className="navbar-menu-text">ARTISTS</div>
              <div className="navbar-menu-text">ARTISTS</div>
            </a>
            <a href="/events" className="navbar-menu-link w-inline-block">
              <div className="navbar-menu-text">EVENTS</div>
              <div className="navbar-menu-text">EVENTS</div>
            </a>
            <a href="/venues/map" className="navbar-menu-link w-inline-block">
              <div className="navbar-menu-text">VENUES</div>
              <div className="navbar-menu-text">VENUES</div>
            </a>
            <div className="navbar-auth-section">
              {user ? (
                <>
                  <LanguageDropdown />
                  <NotificationBell /> {/* 🔔 Desktop dropdown */}
                  <AuthButtons user={user} loading={loading} />
                </>
              ) : (
                <>
                  <AuthButtons user={user} loading={loading} />
                  <LanguageDropdown />
                </>
              )}
            </div>
          </div>
        </div>


      </div>
    </nav>
  );
}
