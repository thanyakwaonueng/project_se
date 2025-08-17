import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import '../css/Navbar.css';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, loading } = useAuth(); // ใช้สถานะจาก AuthProvider

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function LanguageDropdown() {
    const [language, setLanguage] = useState('th');
    const handleSelect = (lang) => setLanguage(lang);
    return (
      <div className="dropdown">
        <button
          className="language-dropdown-btn nav-item nav-link"
          type="button"
          id="languageDropdown"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          style={{ color: '#f8f4ed', textDecoration: 'none' }}
        >
          <span style={{ marginRight: 8 }}>{language === 'th' ? '🇹🇭' : '🇺🇸'}</span>
          {language === 'th' ? 'TH' : 'EN'}
        </button>
        <ul className="dropdown-menu" aria-labelledby="languageDropdown">
          <li><button className="dropdown-item" onClick={() => handleSelect('th')}>🇹🇭 Thai</button></li>
          <li><button className="dropdown-item" onClick={() => handleSelect('en')}>🇺🇸 English</button></li>
        </ul>
      </div>
    );
  }

  function AuthButtons() {
    if (loading) {
      return <span className="nav-item nav-link" id="nav-style">กำลังตรวจสอบ…</span>;
    }
    if (!user) {
      return (
        <>
          <Link className="btn btn-light" id="nav-login-btn" to="/login">LOGIN</Link>
          <Link className="btn" id="nav-signup-btn" to="/signup" role="button">SIGN UP</Link>
        </>
      );
    }
    return (
      <div className="dropdown">
        <button
          className="btn btn-light dropdown-toggle"
          type="button"
          id="accountDropdown"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          style={{ fontWeight: 600 }}
        >
          {user.email || 'My Account'}
        </button>
        <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="accountDropdown">
          <li className="dropdown-item-text" style={{ fontSize: 12, color: '#666' }}>
            Role: {user.role}
          </li>
          <li><hr className="dropdown-divider" /></li>

          {(user.role === 'ARTIST' || user.role === 'ADMIN') && (
            <li><Link className="dropdown-item" to="/me/artist">My Artist</Link></li>
          )}
          {(user.role === 'VENUE' || user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
            <>
              <li><Link className="dropdown-item" to="/me/venue">My Venue</Link></li>
              <li><Link className="dropdown-item" to="/page_events/new">Create Event</Link></li>
            </>
          )}

          <li><hr className="dropdown-divider" /></li>
          <li><Link className="dropdown-item" to="/logout">Logout</Link></li>
        </ul>
      </div>
    );
  }

  return (
    <nav className={`navbar navbar-expand-md navbar-dark ${isScrolled ? 'navbar-small' : ''}`}>
      <div className="container">
        <Link to="/">
          <img src="/img/logo_navbar.png" className="logo" alt="logo" />
        </Link>

        <form className="form-inline-nav">
          <NavLink className="nav-item nav-link" id="nav-style" to="/page_artists">ARTISTS</NavLink>
          <NavLink className="nav-item nav-link" id="nav-style" to="/page_events">EVENT</NavLink>
          <NavLink className="nav-item nav-link" id="nav-style" to="/page_venues">VENUE</NavLink>
          <NavLink className="nav-item nav-link" id="nav-style" to="/page_venues/map">MAP</NavLink>

          <LanguageDropdown />
          <AuthButtons />
        </form>
      </div>
    </nav>
  );
}
