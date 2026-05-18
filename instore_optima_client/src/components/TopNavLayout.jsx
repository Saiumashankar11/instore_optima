import { Outlet } from 'react-router-dom'
import TopNavbar from './TopNavbar'

export default function TopNavLayout() {
  return (
    <div className="app-root">
      <TopNavbar />
      <Outlet />
    </div>
  )
}