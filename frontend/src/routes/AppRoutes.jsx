// routes/AppRoutes.jsx (หรือไฟล์ที่คุณวาง router นี้อยู่)
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import AdminRoleRequestsPage from '../pages/AdminRoleRequestsPage';

/** 
 * ตัวห่อเช็คว่า “ตั้งค่าโปรไฟล์แล้วหรือยัง”
 * ถ้า “ยัง” -> เด้งไป /accountsetup (replace) ทำให้กด Back แล้วไม่เด้งกลับมาหน้าเดิม
 * หน้าที่อนุญาตผ่านเสมอ: /login, /signup, /accountsetup (กัน loop)
 */
function RequireProfile({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  // allowlist: หน้า public สำหรับตั้งค่าหรือเข้าระบบ
  const path = location.pathname;
  const allow = path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/accountsetup');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (allow) { // หน้า allowlist ไม่ต้องเช็ค
        alive && setLoading(false);
        alive && setNeedsSetup(false);
        return;
      }
      try {
        setLoading(true);
        const { data } = await axios.get('/api/auth/me', { withCredentials: true });
        // เกณฑ์เบาๆ: ถ้ายังไม่มีชื่อ/genres/วันเกิด/ข้อมูล performer ใดๆ เลย ถือว่ายังไม่ setup
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
        // ถ้าดึงโปรไฟล์ไม่ได้ (เช่นยังไม่ล็อกอิน) ก็ไม่บังคับ setup ที่นี่
        if (alive) setNeedsSetup(false);
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [path, allow]);

  if (loading) return null; // หรือใส่ spinner ก็ได้
  if (needsSetup) {
    return <Navigate to="/accountsetup" replace state={{ from: path }} />;
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* ✅ หน้า public/อนุญาตเสมอ: login / signup / accountsetup */}
        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/logout" element={<Logout />} />

          {/* Account Setup เปิดให้ทุก role เข้ามาตั้งค่าได้ */}
          <Route
            path="/accountsetup"
            element={
              <ProtectedRoute allow={['AUDIENCE', 'ARTIST', 'ORGANIZE', 'ADMIN']}>
                <AccountSetupPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ✅ ที่เหลือ “ต้องมีโปรไฟล์แล้ว” */}
        <Route
          element={
            <RequireProfile>
              <Layout />
            </RequireProfile>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />

          <Route path="/artists" element={<Artist />} />
          <Route path="/artists/:id" element={<Artist />} />

          {/*  หน้ารวม Venue = แผนที่ */}
          <Route path="/venues" element={<VenueMap />} />
          <Route path="/venues/map" element={<VenueMap />} />  {/* alias เพิ่มได้ */}
          
          {/*  หน้าร้าน (รายละเอียด) */}
          <Route path="/venues/:slugOrId" element={<Venue />} />
          
          <Route path="/events" element={<Event />} />
          <Route path="/events/:id" element={<EventDetail />} />
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
