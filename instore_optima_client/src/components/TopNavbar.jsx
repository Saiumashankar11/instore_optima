import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

export default function TopNavbar() {
  const { user, logout, canManage, role } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [toast, setToast] = useState(null)
  const rolePrefix = `/${role?.toLowerCase()}`

  const SECTIONS = [
    { label: 'Dashboard',   to: `${rolePrefix}/dashboard`,       pages: ['dashboard'] },
    { label: 'Inventory',   to: `${rolePrefix}/products`,        pages: ['products', 'stock', 'stock-movement'] },
    { label: 'Procurement', to: `${rolePrefix}/suppliers`,       pages: ['suppliers', 'replenishment', 'purchase-orders'] },
    { label: 'Finance',     to: `${rolePrefix}/orders`,          pages: ['orders', 'order-items', 'payments', 'invoices', 'receipts'] },
    { label: 'Admin',       to: `${rolePrefix}/users`,           pages: ['users', 'audit-logs'], adminOnly: true },
  ]

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const handleLogout = () => { logout(); navigate('/login') }

  const currentPage = pathname.split('/').pop()
  const isActive = s => s.pages.includes(currentPage)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleNavClick = (e, section) => {
    if (section.adminOnly && !canManage) {
      e.preventDefault()
      showToast('Admin section is not accessible for Staff.')
    }
  }

  return (
    <>
    <nav className="top-navbar">
      {/* LEFT — brand */}
      <div className="tnav-brand-wrap">
        <NavLink to="/dashboard" className="tnav-brand">
          <img src="/logo.png" alt="InStore Optima" style={{ height: 35, width: 'auto', objectFit: 'contain' }} />
        </NavLink>
      </div>

      {/* CENTER — nav links */}
      <div className="tnav-center">
        <div className="tnav-pill-bar">
          {SECTIONS.map(s => (
            <NavLink
              key={s.to}
              to={s.to}
              className={`tnav-pill${isActive(s) ? ' active' : ''}${s.adminOnly && !canManage ? ' tnav-pill-locked' : ''}`}
              onClick={e => handleNavClick(e, s)}
            >
              {isActive(s) && <span className="tnav-pill-dot"></span>}
              {s.adminOnly && !canManage && <i className="bi bi-lock" style={{ fontSize: 9, opacity: .6 }}></i>}
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

    {/* Toast rendered via portal directly into document.body — avoids any nav stacking/clipping */}
    {toast && createPortal(
      <div className="app-toast-wrap">
        <div className="app-toast app-toast-warn">
          <i className="bi bi-shield-lock"></i>
          {toast}
        </div>
      </div>,
      document.body
    )}
    </>
  )
}