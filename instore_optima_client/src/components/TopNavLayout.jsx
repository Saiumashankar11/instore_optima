import { Outlet } from 'react-router-dom'
import TopNavbar from './TopNavbar'

export default function TopNavLayout({ zoom = 100, setZoom = () => {}, browserZoomDetected = false }) {
  return (
    <div className="app-root">
      <TopNavbar zoom={zoom} setZoom={setZoom} browserZoomDetected={browserZoomDetected} />
      <Outlet />
    </div>
  )
}