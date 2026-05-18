import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'



const SECTIONS = [
  { label: 'Dashboard',   to: '/dashboard', paths: ['/dashboard'] },
  { label: 'Inventory',   to: '/products',  paths: ['/products', '/stock', '/stock-movement'] },
  { label: 'Procurement', to: '/suppliers', paths: ['/suppliers', '/replenishment', '/purchase-orders'] },
  { label: 'Finance',     to: '/orders',    paths: ['/orders', '/order-items', '/payments', '/invoices', '/receipts'] },
  { label: 'Admin',       to: '/users',     paths: ['/users', '/audit-logs'] },
]

export default function TopNavbar() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const handleLogout = () => { logout(); navigate('/login') }

  const isActive = s => s.paths.includes(pathname)

  return (
    <nav className="top-navbar">
      {/* LEFT — brand */}
      <div className="tnav-brand-wrap">
        <NavLink to="/dashboard" className="tnav-brand">
          <div className="tnav-icon">IO</div>
          <div>
            <div className="tnav-name">InStore Optima</div>
            <div className="tnav-sub">Inventory System</div>
          </div>
        </NavLink>
      </div>

      {/* CENTER — nav links */}
      <div className="tnav-center">
        <div className="tnav-pill-bar">
          {SECTIONS.map(s => (
            <NavLink
              key={s.to}
              to={s.to}
              className={`tnav-pill${isActive(s) ? ' active' : ''}`}
            >
              {isActive(s) && <span className="tnav-pill-dot"></span>}
              {s.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* RIGHT — status + user */}
      <div className="tnav-right-wrap">
        <div className="tnav-right">
          <button className="tnav-theme-toggle" onClick={toggle} title="Toggle theme">
            <i className={`bi bi-${dark ? 'sun' : 'moon'}`}></i>
          </button>
          <div className="tnav-status">
            <div className="tnav-dot"></div>
            System live
          </div>
          <div className="tnav-user">
            <div className="tnav-avatar">{initials}</div>
            <span className="tnav-username">{user?.name || 'User'}</span>
            <span className="tnav-role">{user?.role || 'Staff'}</span>
            <button className="tnav-logout" onClick={handleLogout} title="Logout">
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}