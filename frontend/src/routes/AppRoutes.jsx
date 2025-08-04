import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '../pages/Layout'; // ปรับ path ให้ถูกต้อง
import Home from '../pages/Home';
import About from '../pages/About';
import Artist from '../pages/Artist';
import Venue from '../pages/Venue';
import Event from '../pages/Event';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Logout from '../pages/Logout';

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />

        <Route path="/page_artists" element={<Artist />} />
        <Route path="/page_venues" element={<Venue />} />
        <Route path="/page_events" element={<Event />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/logout" element={<Logout />} />
        </Route>
      </Routes>
    </Router>
  );
}

