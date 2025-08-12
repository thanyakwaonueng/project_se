import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '../pages/Layout';
import Home from '../pages/Home';
import About from '../pages/About';
import Artist from '../pages/Artist';
import Venue from '../pages/Venue';
import Event from '../pages/Event';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Logout from '../pages/Logout';
import EventCreate from '../pages/EventCreate';
import ArtistProfileForm from '../pages/ArtistProfileForm';
import VenueProfileForm from '../pages/VenueProfileForm';
import ProtectedRoute from '../components/ProtectedRoute';

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

          {/* Event create: VENUE / ORGANIZER / ADMIN */}
          <Route
            path="/page_events/new"
            element={
              <ProtectedRoute allow={['VENUE', 'ORGANIZER', 'ADMIN']}>
                <EventCreate />
              </ProtectedRoute>
            }
          />

          {/* My profiles */}
          <Route
            path="/me/artist"
            element={
              <ProtectedRoute allow={['ARTIST', 'ADMIN']}>
                <ArtistProfileForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/me/venue"
            element={
              <ProtectedRoute allow={['VENUE', 'ORGANIZER', 'ADMIN']}>
                <VenueProfileForm />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/logout" element={<Logout />} />
        </Route>
      </Routes>
    </Router>
  );
}
