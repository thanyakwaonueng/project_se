import '../css/Footer.css';

export default function Footer() {
  return (
    <div className="footer">
      <div className="footer-container">

        {/* Logo + Social */}
        <div className="footer-section">
          <div className="footer-logo">
            <img src="/img/logocnx.png" alt="Chiangmai Original" className="logo"/>
            {/* <p className="brand-text">It is about sound & crowd in Chiang Mai Town</p> */}
          </div>
          {/* <div className="social-icons">
            <a href="https://www.facebook.com/chiangmaioriginal/?locale=th_TH" target="_blank">
              <img src="/img/facebook.png" alt="Facebook"/>
            </a>
            <a href="https://www.instagram.com/cnx.og/?hl=en" target="_blank">
              <img src="/img/instagram.png" alt="Instagram"/>
            </a>
            <a href="https://www.youtube.com/c/ChiangmaiOriginal" target="_blank">
              <img src="/img/youtube.png" alt="YouTube"/>
            </a>
            <a href="https://www.tiktok.com/@chiangmaioriginal" target="_blank">
              <img src="/img/tiktok.png" alt="TikTok"/>
            </a>
          </div> */}
          {/* <p className="brand-text">It is about sound & crowd in Chiang Mai Town</p> */}
        </div>

        {/* Contact Us */}
        <div className="footer-section">
          <h4>CONTACT US</h4>
          <p>chiangmai.original@gmail.com</p>
          <p>083 680 6868</p>
          <p>Chiang Mai, Thailand</p>
        </div>

        <div className="footer-section">
          <h4>FOLLOW US</h4>
          <p>Be part of the Chiang Mai Original community</p>
          {/* <a href="/signup" className="signup-btn">Get Started ↗</a> */}
          <div className="social-icons">
            <a href="https://www.facebook.com/chiangmaioriginal/?locale=th_TH" target="_blank">
              <img src="/img/facebook.png" alt="Facebook"/>
            </a>
            <a href="https://www.instagram.com/cnx.og/?hl=en" target="_blank">
              <img src="/img/instagram.png" alt="Instagram"/>
            </a>
            <a href="https://www.youtube.com/c/ChiangmaiOriginal" target="_blank">
              <img src="/img/youtube.png" alt="YouTube"/>
            </a>
            <a href="https://www.tiktok.com/@chiangmaioriginal" target="_blank">
              <img src="/img/tiktok.png" alt="TikTok"/>
            </a>
          </div>
        </div>


        {/* Subscribe */}
        {/* <div className="footer-section">
          <h4>SUBSCRIBE</h4>
          <p>Enter your email to get notified about our events</p>
          <div className="subscribe-box">
            <input type="email" placeholder="Email" />
            <button>✉</button>
          </div>
        </div> */}
      </div>

      <hr className="footer-divider" />
      <p className="footer-bottom">2025 Chiang Mai Original</p>
    </div>
  );
}
