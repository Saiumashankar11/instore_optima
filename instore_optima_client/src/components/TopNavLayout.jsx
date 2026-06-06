// TopNavLayout.jsx
// A minimal page shell used for full-width pages that do NOT need a left sidebar
// (e.g. the Dashboard or Messages page).
// It simply wraps the top navigation bar and lets React Router render the
// matched child route into <Outlet />.

// Outlet renders the currently matched child route component in place.
import { Outlet } from 'react-router-dom'
import TopNavbar from './TopNavbar'

// Props:
//   zoom              – current app zoom level (70–150).
//   setZoom           – callback to change the zoom value.
//   browserZoomDetected – true when the browser's native zoom was detected.
export default function TopNavLayout({ zoom = 100, setZoom = () => {}, browserZoomDetected = false }) {
  return (
    <div className="app-root">
      {/* Shared top navigation bar — same bar used across all layouts */}
      <TopNavbar zoom={zoom} setZoom={setZoom} browserZoomDetected={browserZoomDetected} />
      {/* The matched child route (e.g. Dashboard) is rendered here */}
      <Outlet />
    </div>
  )
}