import Navbar from './Navbar';
import Footer from './Footer';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="container mt-4">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
