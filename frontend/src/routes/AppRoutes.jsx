import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import About from '../pages/About';
import Artist from '../pages/Artist';
import Venue from '../pages/Venue';
import Event from '../pages/Event';

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />

        <Route path="/artists" element={<Artist />} />
        <Route path="/venues" element={<Venue />} />
        <Route path="/events" element={<Event />} />
      </Routes>
    </Router>
  );
}

