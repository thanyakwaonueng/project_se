import { useState, useEffect } from 'react';
import '../css/Navbar.css';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30); // หดเมื่อ scroll เกิน 30px
    };

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
          <span style={{ marginRight: '8px' }}>
            {language === 'th' ? '🇹🇭' : '🇺🇸'}
          </span>
          {language === 'th' ? 'TH' : 'EN'}
        </button>
        <ul className="dropdown-menu" aria-labelledby="languageDropdown">
          <li>
            <button className="dropdown-item" onClick={() => handleSelect('th')}>
              🇹🇭 Thai
            </button>
          </li>
          <li>
            <button className="dropdown-item" onClick={() => handleSelect('en')}>
              🇺🇸 English
            </button>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <nav className={`navbar navbar-expand-md navbar-dark ${isScrolled ? 'navbar-small' : ''}`}>
      <div className="container">
        <a href="/">
          <img src="/img/logo_navbar.png" className="logo" alt="logo" />
        </a>

        <form className="form-inline-nav">
          <a className="nav-item nav-link" id="nav-style" href="/page_artists"> ARTISTS</a>
          <a className="nav-item nav-link" id="nav-style" href="/page_events"> EVENT </a>
          <a className="nav-item nav-link" id="nav-style" href="/page_venues"> VENUE </a>

          <LanguageDropdown />

          <a className="btn" id="nav-signup-btn" href="/signup" role="button">SIGN UP</a>
        </form>
      </div>
    </nav>
  );
}
