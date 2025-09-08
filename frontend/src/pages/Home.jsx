import '../css/Home.css';

export default function Home() {
  return (
    
    <div className="header-homepage">
      <div className="container-1">
        <h1 className="topic-1">SOUND & SOUL</h1>
        {/* <h1 className="topic-1">CHIANG MAI ORIGINAL</h1> */}
      </div>
      <div className="news-box">
        <h1 className="news">NEWS!!</h1>
          <div className="marquee">
            <span>The mega concert SOUND & SOUL tickets are on sale now! ✨ | New artist updates every week | Special early bird promo 🎟️</span>
          </div>
      </div>
      <img src="/img/pexels-padrinan-167092.png" className="vinyl-picture"/>
    </div>

  );
}

// export default function Home() {
//   return (
    
//     <div className="container-1">
//       <div className="text-section">
//         <h1 className="overlay-text-1">Chiang Mai Original</h1>
//         <h2 className="overlay-text-2">
//           Explore the music and lifestyle of the people of the northern city. 
//           Discover local artists Listen to the songs you love and discover new music styles with us.
//         </h2>

//         <button type="button" className="learn-more-btn" 
//           onClick={() => window.location.href = "/page_artists"}>
//           <span>Learn more</span>
//           <div className="icon-circle">
//             <span>➜</span>

//           </div>
//         </button>
//       </div>

//       <img src="/img/cat_1.png" className="cat-1" />
//     </div>

//   );
// }






