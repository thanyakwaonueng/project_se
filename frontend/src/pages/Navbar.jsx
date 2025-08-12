import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../css/Navbar.css';
import { useAuth } from '../lib/auth';

export default function Navbar() {
  const { user, loading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const canCreateEvent = !!user && ['VENUE', 'ORGANIZER', 'ADMIN'].includes(user.role);
  const isArtist = !!user && ['ARTIST', 'ADMIN'].includes(user.role);
  const isVenueSide = !!user && ['VENUE', 'ORGANIZER', 'ADMIN'].includes(user.role);

  function LanguageDropdown() {
    const [language, setLanguage] = useState('th');
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
          <li><button className="dropdown-item" onClick={() => setLanguage('th')}>🇹🇭 Thai</button></li>
          <li><button className="dropdown-item" onClick={() => setLanguage('en')}>🇺🇸 English</button></li>
        </ul>
      </div>
    );
  }

  return (
    <nav className={`navbar navbar-expand-md navbar-dark ${isScrolled ? 'navbar-small' : ''}`}>
      <div className="container">
        <Link to="/">
          <img src="/img/logonavbar.png" className="logo" alt="logo" />
        </Link>

        <form className="form-inline-nav">
          <Link className="nav-item nav-link" id="nav-style" to="/page_artists">ARTISTS</Link>
          <Link className="nav-item nav-link" id="nav-style" to="/page_events">EVENT</Link>
          <Link className="nav-item nav-link" id="nav-style" to="/page_venues">VENUE</Link>

          {canCreateEvent && (
            <Link className="nav-item nav-link" id="nav-style" to="/page_events/new">
              + CREATE EVENT
            </Link>
          )}

          {isArtist && (
            <Link className="nav-item nav-link" id="nav-style" to="/me/artist">
              MY ARTIST
            </Link>
          )}

          {isVenueSide && (
            <Link className="nav-item nav-link" id="nav-style" to="/me/venue">
              MY VENUE
            </Link>
          )}

          <LanguageDropdown />

          {!loading && !user && (
            <>
              <Link className="btn" id="nav-signup-btn" to="/signup" role="button">SIGN UP</Link>
              <Link className="nav-item nav-link" id="nav-style" to="/login">LOGIN</Link>
            </>
          )}
          {!loading && user && (
            <Link className="nav-item nav-link" id="nav-style" to="/logout">LOG OUT</Link>
          )}
        </form>
      </div>
    </nav>
  );
}
