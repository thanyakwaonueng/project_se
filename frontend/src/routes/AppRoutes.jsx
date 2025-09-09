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
import CreateArtist from '../pages/CreateArtist';
import CreateVenue from '../pages/CreateVenue';
import CreateEvent from '../pages/CreateEvent';
import ProtectedRoute from '../components/ProtectedRoute';
import EventDetail from '../pages/EventDetail';
import VenueMap from '../pages/VenueMap';

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />

          <Route path="/page_artists" element={<Artist />} />
          <Route path="/page_artists/:slug" element={<Artist />} />
          <Route path="/page_venues" element={<Venue />} />
          <Route path="/page_venues/map" element={<VenueMap />} />
          <Route path="/page_events" element={<Event />} />
          <Route path="/page_events/:id" element={<EventDetail />} />

          <Route
            path="/page_events/new"
            element={
              <ProtectedRoute allow={['VENUE', 'ORGANIZER', 'ADMIN']}>
                <EventCreate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/me/artist"
            element={
              //เดี๋ยวมาเปิดคืนให้ขี้เกียจแก้โรลตอนล้อกอินให้เป็นแอดมิน
              //<ProtectedRoute allow={['ARTIST', 'ADMIN']}>
              //</ProtectedRoute>
                //<ArtistProfileForm />
                <CreateArtist />
            }
          />
          <Route
            path="/me/venue"
            element={
              //<ProtectedRoute allow={['VENUE', 'ORGANIZER', 'ADMIN']}>
              //</ProtectedRoute>
                //<VenueProfileForm />
                <CreateVenue/>
            }
          />
          <Route
            path="/me/event"
            element={
              <CreateEvent/>
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
