import '../css/Footer.css'

export default function Footer() {
  return (
    <div className="bottom-bar">
      <div className="follow-us-box">
        <p className="follow-us">FOLLOW US:</p>
        <hr className="social-divider" />

        <div className="social-media">
          <div className="formline-social">
            <a className="btn" id="btn-social"
              href="https://www.facebook.com/chiangmaioriginal/?locale=th_TH"
              role="button">
              <img src="/img/facebook.png" alt="Facebook" className="btn-full-image" />
            </a>
            <p className="social-name">FACEBOOK</p>
          </div>

          <div className="formline-social">
            <a className="btn" id="btn-social"
              href="https://www.instagram.com/cnx.og/?hl=en"
              role="button">
              <img src="/img/instagram.png" alt="Instagram" className="btn-full-image" />
            </a>
            <p className="social-name">INSTAGRAM</p>
          </div>

          <div className="formline-social">
            <a className="btn" id="btn-social"
              href="https://www.youtube.com/c/ChiangmaiOriginal"
              role="button">
              <img src="/img/youtube.png" alt="youtube" className="btn-full-image" />
            </a>
            <p className="social-name">YOUTUBE</p>
          </div>

          <div className="formline-social">
            <a className="btn" id="btn-social"
              href="https://www.tiktok.com/@chiangmaioriginal"
              role="button">
              <img src="/img/tiktok.png" alt="tiktok" className="btn-full-image" />
            </a>
            <p className="social-name">TIKTOK</p>
          </div>
        </div>
      </div>

      <p className="bottom-text">© 2025 CHIANG MAI ORIGINAL</p>
    </div>
  );
}
