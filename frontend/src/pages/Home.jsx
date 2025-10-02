import '../css/Home.css';
import { useState } from "react";

export default function Home() {
  // ข้อมูลศิลปิน
  const artists = [
    {
      id: 1,
      title: "Polycat",
      date: "September 31. 2022",
      genre: "pop",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg"
    },
    {
      id: 2,
      title: "Renjun",
      date: "September 15, 2022",
      genre: "indie",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg"
    },
    {
      id: 3,
      title: "Jeno",
      date: "August 26, 2022",
      genre: "pop",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg"
    },
    {
      id: 4,
      title: "Jaemin",
      date: "August 26, 2022",
      genre: "indie",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg"
    },
    {
      id: 5,
      title: "Mark",
      date: "August 26, 2022",
      genre: "alternative",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg"
    },
    {
      id: 6,
      title: "Mark",
      date: "August 26, 2022",
      genre: "alternative",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg"
    },
    {
      id: 7,
      title: "Mark",
      date: "August 26, 2022",
      genre: "alternative",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg"
    },
    {
      id: 8,
      title: "Mark",
      date: "August 26, 2022",
      genre: "alternative",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg"
    },
    {
      id: 9,
      title: "Mark",
      date: "August 26, 2022",
      genre: "alternative",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg"
    },
    {
      id: 10,
      title: "Mark",
      date: "August 26, 2022",
      genre: "alternative",
      image: "https://www.myband.co.th/uploads/20180516/2a4d42f0264c7563812aad9d07aeddf7.jpg"
    }
  ];

  const mainGenres = [
    "pop","electronic", "experimental", "alternative", "rock", "ambient", 
    "hip-hop/rap", "metal", "punk", "techno", "noise", "indie", "jazz"
  ];

  const event = [
    {
      id: 1,
      title: "at cnxog",
      date: "September 31, 2022",
      genre: "pop",
      image: "/img/at cnxog.jpg",
      desc: "Get ready for an unforgettable night of music and energy 🎶 Featuring talented artists across diverse genres — from soulful melodies to electrifying beats that will keep you on your feet. Immerse yourself in dazzling lights, powerful sound, and a vibrant atmosphere where music lovers come together to celebrate and create lasting memories"
    },
    {
      id: 2,
      title: "tipyandtired",
      date: "September 15, 2022",
      genre: "indie",
      image: "/img/tipyandtired.jpg",
      desc: "Get ready for an unforgettable night of music and energy 🎶 Featuring talented artists across diverse genres — from soulful melodies to electrifying beats that will keep you on your feet. Immerse yourself in dazzling lights, powerful sound, and a vibrant atmosphere where music lovers come together to celebrate and create lasting memories"
    },
    {
      id: 3,
      title: "srwkslive",
      date: "August 26, 2022",
      genre: "pop",
      image: "/img/srwkslive.jpg",
      desc: "Get ready for an unforgettable night of music and energy 🎶 Featuring talented artists across diverse genres — from soulful melodies to electrifying beats that will keep you on your feet. Immerse yourself in dazzling lights, powerful sound, and a vibrant atmosphere where music lovers come together to celebrate and create lasting memories"
    }
    ]

  const [scrollLeftActive, setScrollLeftActive] = useState(false);
  const [scrollRightActive, setScrollRightActive] = useState(false);


  function ArtistCard({ image, title, date, tag, genre }) {
  const [liked, setLiked] = useState(false);

  return (
    <div className="artist-card">
      <div className="artist-image-wrapper">
        <img src={image} className="artist-image" alt={title} />
        <button
          className={`like-button ${liked ? "liked" : ""}`}
          onClick={() => setLiked(!liked)}
        ></button>
        <span className="artist-genre">{genre}</span>
      </div>
      <div className="artist-content">
        <h2 className="artist-title">{title}</h2>
        <p className="artist-date">{date}</p>
        <span className="artist-tag">{tag}</span>

      </div>
    </div>
  );
}

function EventCard({ image, title, date, desc, genre }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetail = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="event-card">
      {/* Left: Image */}
      <div className="event-image">
        <img src={image} alt={title} />
      </div>

      {/* Right: Content */}
      <div className="event-details">
        <h2 className="event-title">{title}</h2>
        <p className="event-desc">{desc}</p>

        <div className="event-meta">
          <div className="event-info">
            <span><strong>Date:</strong> {date}</span>
            <span className="event-genre">{genre}</span>
          </div>
          <button className="view-detail-btn" onClick={handleViewDetail}>
            View Detail
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {/* Close button แบบกากบาท */}
            <button className="modal-close-btn" onClick={handleCloseModal}>
              &times;
            </button>

            <h2>{title}</h2>
            <p><strong>Date:</strong> {date}</p>
            <p><strong>Genre:</strong> {genre}</p>
            <p>{desc}</p>
          </div>
        </div>
      )}

    </div>
  );
}


  return (
    <div className="homepage-content">
      <div className="header-homepage">
        <div className="container-1">
          <h1 className="topic-1">SOUND & CROWD</h1>
        </div>
        <div className="news-box">
          <h1 className="news">NEWS!!</h1>
          <div className="marquee">
            <span>The mega concert CHIANG MAI ORIGINAL tickets are on sale now! ✨ | New artist updates every week | Special early bird promo 🎟️</span>
          </div>
        </div>

        <div className="vinyl-picture-box">
          <img src="https://images.pexels.com/photos/1238941/pexels-photo-1238941.jpeg" className="vinyl-picture"/>
        </div>

      </div>


      <div className="chiangmai-original-content">
        <div className="container-2">
          <div className="text-section">
            <h1 className="chiangmai-original-topic">chiang mai original !</h1>
            <h2 className="chiangmai-original-info">
              Explore the music and lifestyle of the people of the northern city. 
              Discover local artists Listen to the songs you love and discover new music styles with us.
            </h2>
          </div>
        </div>
      </div>

      <div className="divider-nextcontent"></div>

      <div className="artist-content">
        <div className="discover-artists-header">
          <h1 className="discover-artists">Discover new artists</h1>
        <div className="artist-navigation">
          <button
            type="button"
            className={`nav-arrow ${scrollLeftActive ? 'is-active' : ''}`}
            onClick={() => {
              const grid = document.getElementById('artistGrid');
              grid.scrollBy({ left: -320, behavior: 'smooth' });
              setScrollLeftActive(true);
              setScrollRightActive(false);
            }}
            aria-label="Scroll left"
          >
            <svg viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" fill="none" strokeWidth="1.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 5 5 12 12 19" />
            </svg>
          </button>

          <button
            type="button"
            className={`nav-arrow ${scrollRightActive ? 'is-active' : ''}`}
            onClick={() => {
              const grid = document.getElementById('artistGrid');
              grid.scrollBy({ left: 320, behavior: 'smooth' });
              setScrollRightActive(true);
              setScrollLeftActive(false);
            }}
            aria-label="Scroll right"
          >
            <svg viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" fill="none" strokeWidth="1.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
        </div>

        <div className="discover-artists-subtitle">
          <p className="artist-subtitle">Your guide to new sounds in Chiang Mai, one vibe at a time</p>
          <a href="/artists">
            <h2>Explore more artists ↗</h2>
          </a>
        </div>

        <div className="container-3">
          <div className="artist-grid" id="artistGrid">
            {artists.map(artist => (
              <ArtistCard 
                key={artist.id}
                title={artist.title}
                date={artist.date}
                genre={artist.genre}
                image={artist.image}
              />
            ))}
          </div>
        </div>
      </div>


      <div className="music-genre-content">
        <div className="container-4">
          <h1 className="discover-music">Discover music by genre</h1>

          <div className="discover-music-subtitle">
          <p className="subtitle">Explore Chiang Mai’s music scene through genres you love</p>
            <a href="/artists">
              <h2>Explore more genres ↗</h2>
            </a>
          </div>
          
          <div className="genre-section">
            <div className="genre-grid">
              {mainGenres.map((genre, index) => (
                <div key={index} className="genre-item">{genre}</div>
              ))}
            </div>
          </div>

        </div>
      </div>


      <div className="event-content">
        <div className="container-5">
            {/* <h1 className="chiangmai-original-playlist">Latest Event</h1> */}
            <div className="event-grid">
              {event.map(artist => (
                <EventCard 
                  key={artist.id}
                  title={artist.title}
                  date={artist.date}
                  genre={artist.genre}
                  image={artist.image}
                  desc={artist.desc}       
                />
              ))}
            </div>
        </div>
        <div className="container-6">
          <iframe src="https://open.spotify.com/embed/playlist/7D3gJBkWz9OjfWCdg2q3eA?utm_source=generator" 
                  width="320" height="450" frameborder="0" allowfullscreen="" 
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture">    
          </iframe>
        </div>
      </div>

      {/* <div className="chiangmai-original-playlist-content">
        <div className="container-6">
            <h1 className="chiangmai-original-playlist">Chiang mai original playlist</h1>
            <p className="chiangmai-original-playlist-subtitle">The sounds of Chiang Mai, all in one playlist</p>
            
            <div className="playlist-card-content">
              <div className="playlist-card">
                <div className="playlist-image-wrapper">
                  <img src="/img/playlist_picture.png" className="playlist-picture" />
                  <img src="/img/graphic-4.png" className="graphic-4" />
                   <a href="https://open.spotify.com/playlist/7D3gJBkWz9OjfWCdg2q3eA?si=77f7e876d73e4b15" className="play-button">▶</a>
                </div>

              </div>
            </div>
        </div>
      </div> */}

    </div>
  );
}
