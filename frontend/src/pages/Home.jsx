import '../css/Home.css';


export default function Home() {
  return (
    
    <div className="container-1">
      <div className="text-section">
        <h1 className="overlay-text-1">Chiang Mai Original</h1>
        <h2 className="overlay-text-2">
          Explore the music and lifestyle of the people of the northern city. 
          Discover local artists Listen to the songs you love and discover new music styles with us.
        </h2>

        <button type="button" className="learn-more-btn" 
          onClick={() => window.location.href = "/page_artists"}>
          <span>Learn more</span>
          <div className="icon-circle">
            <span>➜</span>

          </div>
        </button>
      </div>

      <img src="/img/cat_1.png" className="cat-1" />
    </div>

  );
}



// export default function Home() {
//   return (

//     <div className="container">

//       <div className="container-center">
//           <p className="text-4">Explore the music and lifestyle of the people of the northern city</p>
//           <p className="text-4">Discover local artists Listen to the songs you love and discover new music styles with us</p>
//           <a className="btn" id="get-started" href="/signup" role="button"> get started</a>

//           <img src="/img/graphic-2.png" className="graphic-2"/>
//       </div>




//     </div>

    
//   );
// }


