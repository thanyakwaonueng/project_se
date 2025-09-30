// routes/AppRoutes.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

import Layout from '../pages/Layout';
import Home from '../pages/Home';
import About from '../pages/About';
import Artist from '../pages/Artist';
import Venue from '../pages/Venue';
import Event from '../pages/Event';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Logout from '../pages/Logout';
// import EventCreate from '../pages/EventCreate';
import ArtistProfileForm from '../pages/ArtistProfileForm';
// 🔁 ลบ 2 import เก่า
// import VenueProfileForm from '../pages/VenueProfileForm';
// import CreateVenue from '../pages/CreateVenue';
import CreateArtist from '../pages/CreateArtist';
import CreateEvent from '../pages/CreateEvent';
import ProtectedRoute from '../components/ProtectedRoute';
import EventDetail from '../pages/EventDetail';
import VenueMap from '../pages/VenueMap';
import MyEvents from '../pages/MyEvents';
import InviteArtist from '../pages/InviteArtist';
import ArtistInviteRequestsPage from '../pages/ArtistInviteRequestsPage';
import ProfilePage from "../pages/ProfilePage";
import AccountSetupPage from '../pages/AccountSetupPage';
import AdminRoleRequestsPage from '../pages/AdminRoleRequestsPage';
import UploadFile from '../pages/UploadFile';
import NotificationsPage from '../pages/Notifications';
// เพจใหม่ (ตัวเดียวใช้ได้ทั้งสร้าง/แก้ไข)
import VenueEditor from '../pages/VenueEditor';

/** เช็คว่าตั้งค่าโปรไฟล์ขั้นต่ำหรือยัง */
function RequireProfile({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const path = location.pathname;
  const allow = path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/accountsetup');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (allow) {
        alive && setLoading(false);
        alive && setNeedsSetup(false);
        return;
      }
      try {
        setLoading(true);
        const { data } = await axios.get('/api/auth/me', { withCredentials: true });
        const hasBasic =
          !!(data?.name) ||
          (Array.isArray(data?.favoriteGenres) && data.favoriteGenres.length > 0) ||
          !!(data?.birthday);
        const hasPerformer =
          !!(data?.performerInfo?.artistInfo) ||
          !!(data?.performerInfo?.venueInfo);
        const done = hasBasic || hasPerformer;
        if (alive) setNeedsSetup(!done);
      } catch (_e) {
        if (alive) setNeedsSetup(false);
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [path, allow]);

  if (loading) return null;
  if (needsSetup) {
    return <Navigate to="/accountsetup" replace state={{ from: path }} />;
  }
  return children;
}

/**
 * /me/venue switcher
 * เดิม: ถ้ามี venue -> /venues/:id, ถ้ายังไม่มี -> /me/venue/create
 * ใหม่: พาไปหน้าเดียว /venue/edit เสมอ (หน้าเดียวรองรับทั้งสร้าง/แก้)
 */
function MyVenueSwitch() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/venue/edit', { replace: true });
  }, [navigate]);
  return null;
}

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        
        {/* just for testing purpose */}
        <Route path="/uploadfile" element={<UploadFile />} />


        {/* กลุ่ม public: login / signup / logout / accountsetup */}
        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/logout" element={<Logout />} />
          <Route
            path="/accountsetup"
            element={
              <ProtectedRoute allow={['AUDIENCE', 'ARTIST', 'ORGANIZE', 'ADMIN']}>
                <AccountSetupPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* public: หน้าเนื้อหา */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />

          <Route path="/artists" element={<Artist />} />
          <Route path="/artists/:id" element={<Artist />} />

          <Route path="/events" element={<Event />} />
          <Route path="/events/:id" element={<EventDetail />} />

          <Route path="/venues" element={<VenueMap />} />
          <Route path="/venues/map" element={<VenueMap />} />
          <Route path="/venues/:id" element={<Venue />} />
        </Route>

        {/* ต้องมีโปรไฟล์แล้ว */}
        <Route
          element={
            <RequireProfile>
              <Layout />
            </RequireProfile>
          }
        >
          {/* ✅ หน้าแจ้งเตือนรวมทุกชนิด */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* ✅ แก้ไข/สร้าง venue ใช้หน้าเดียว */}
          <Route
            path="/venue/edit"element={<ProtectedRoute allow={['ORGANIZE', 'ADMIN']}><VenueEditor />
              </ProtectedRoute>
            }
          />

          {/* ✅ My Venue menu → เด้งไปหน้า editor เดียว */}
          <Route
            path="/me/venue"
            element={
              <ProtectedRoute allow={['ORGANIZE', 'ADMIN']}>
                <MyVenueSwitch />
              </ProtectedRoute>
            }
          />

          {/* ❌ ลบ 2 เส้นทางเก่า
              /venues/:id/edit  (VenueProfileForm)
              /me/venue/create  (CreateVenue)
          */}

          {/* อื่น ๆ ที่ต้องล็อกอิน */}
          <Route path="/myevents" element={<MyEvents />} />
          <Route path="/myevents/:id" element={<EventDetail />} />

          <Route
            path="/page_events/new"
            element={
              <ProtectedRoute allow={['ORGANIZE', 'ADMIN']}>
                <CreateEvent />
              </ProtectedRoute>
            }
          />

          <Route path="/me/artist" element={<CreateArtist />} />
          <Route path="/me/event" element={<CreateEvent />} />
          <Route path="/me/event/:eventId" element={<CreateEvent />} />
          <Route path="/me/invite_to_event/:eventId" element={<InviteArtist />} />

          <Route path="/me/profile" element={<ProfilePage />} />

          {/* แอดมิน */}
          <Route
            path="/admin/role_requests"
            element={
              <ProtectedRoute allow={['ADMIN']}>
                <AdminRoleRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/artist/inviterequests"
            element={
              <ProtectedRoute allow={['ADMIN', 'ARTIST']}>
                <ArtistInviteRequestsPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}
