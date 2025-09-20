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
//import EventCreate from '../pages/EventCreate';
import ArtistProfileForm from '../pages/ArtistProfileForm';
import VenueProfileForm from '../pages/VenueProfileForm';
import CreateArtist from '../pages/CreateArtist';
import CreateVenue from '../pages/CreateVenue';
import CreateEvent from '../pages/CreateEvent';
import ProtectedRoute from '../components/ProtectedRoute';
import EventDetail from '../pages/EventDetail';
import VenueMap from '../pages/VenueMap';
import MyEvents from '../pages/MyEvents';
import InviteArtist from '../pages/InviteArtist';
import ArtistInviteRequestsPage from '../pages/ArtistInviteRequestsPage';
import ProfilePage from "../pages/ProfilePage";


import AccountSetupPage from '../pages/AccountSetupPage';
//import RoleUpgradePage from '../pages/RoleUpgradePage';
import AdminRoleRequestsPage from '../pages/AdminRoleRequestsPage';



export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />

          <Route path="/page_artists" element={<Artist />} />
          <Route path="/page_artists/:slug" element={<Artist />} />

          {/* ✅ หน้ารวม Venue = แผนที่ */}
          <Route path="/page_venues" element={<VenueMap />} />
          <Route path="/page_venues/map" element={<VenueMap />} />  {/* alias เพิ่มได้ */}
          {/* ✅ หน้าร้าน (รายละเอียด) */}
          <Route path="/page_venues/:slugOrId" element={<Venue />} />
          
          <Route path="/page_events" element={<Event />} />
          <Route path="/page_events/:id" element={<EventDetail />} />
          <Route path="/my_events" element={<MyEvents />} />
          <Route path="/my_events/:id" element={<EventDetail />} />

          <Route
            path="/page_events/new"
            element={
              <ProtectedRoute allow={['ORGANIZE', 'ADMIN']}>
                <CreateEvent />
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
              //<ProtectedRoute allow={['ORGANIZER', 'ADMIN']}>
              //</ProtectedRoute>
                //<VenueProfileForm />
                <CreateVenue/>
            }
          />
          <Route path="/me/event" element={<CreateEvent/>} />
          <Route path="/me/event/:eventId" element={<CreateEvent />} />
          <Route path="/me/invite_to_event/:eventId" element={<InviteArtist />} />


          <Route path="/me/profile" element={<ProfilePage />} />
          {/* ✅ ใหม่: Account Setup หลังสมัคร/แก้โปรไฟล์ได้ */}
          <Route
            path="/account_setup"
            element={
              <ProtectedRoute allow={['AUDIENCE', 'ARTIST', 'ORGANIZE', 'ADMIN']}>
                <AccountSetupPage />
              </ProtectedRoute>
            }
          />



          {/*หน้าแอดมินตรวจคำขอ/อนุมัติ/ปฏิเสธ */}
          <Route
            path="/admin/role_requests"
            element={
              <ProtectedRoute allow={['ADMIN']}>
                <AdminRoleRequestsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/artist/invite_requests"
            element={
              <ProtectedRoute allow={['ADMIN', 'ARTIST']}>
                <ArtistInviteRequestsPage />
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
