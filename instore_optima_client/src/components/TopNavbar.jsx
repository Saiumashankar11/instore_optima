// TopNavbar.jsx
// The horizontal navigation bar rendered at the top of every page.
// Responsibilities:
//   • Brand logo on the left.
//   • Section pill links (Dashboard, Inventory, Procurement, Finance, Admin) in the centre.
//   • Theme toggle, unread message bell, system-live indicator, and a user
//     profile dropdown (with zoom controls, profile link, contact support, and
//     sign out) on the right.
//   • A toast notification that appears when the browser's own zoom is detected.

// NavLink — like <a> but adds 'active' class when the route matches.
// useNavigate — lets us redirect programmatically (e.g. after logout).
// useLocation — gives us the current URL path.
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
// AuthContext supplies the logged-in user object, logout function, role, and
// the canManage flag (true for Admin and Manager, false for Staff).
import { useAuth } from '../context/AuthContext'
// ThemeContext provides the current dark/light mode state and a toggle.
import { useTheme } from '../context/ThemeContext'
// MessagesContext exposes the count of unread internal messages.
import { useMessages } from '../context/MessagesContext'
// AlertBadgesContext tracks pending-action counts across sections.
import { useAlertBadges } from '../context/AlertBadgesContext'
import { useState, useCallback, useRef, useEffect } from 'react'
// createPortal renders JSX directly into document.body, escaping the navbar's
// CSS stacking context so toasts and modals always appear on top.
import { createPortal } from 'react-dom'
import ContactSupportModal from './ContactSupportModal'

// Props:
//   zoom              – current app-level zoom percentage.
//   setZoom           – function to update the zoom value.
//   browserZoomDetected – passed in from the root when browser zoom is detected.
export default function TopNavbar({ zoom = 100, setZoom = () => {}, browserZoomDetected = false }) {
  // Destructure what we need from each context.
  const { user, logout, canManage, role } = useAuth()
  const { dark, toggle } = useTheme()
  const { unreadCount } = useMessages()
  // muteSection clears the glowing animation for a section when the user visits it.
  const { inventory, procurement, finance, glowing, muteSection } = useAlertBadges()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // --- Local state ---
  const [toast, setToast] = useState(null)         // text of the temporary toast message, or null
  const [profileOpen, setProfileOpen] = useState(false) // controls profile dropdown visibility
  const [supportOpen, setSupportOpen] = useState(false) // controls ContactSupportModal visibility
  // profileRef lets us detect clicks outside the dropdown to close it.
  const profileRef = useRef(null)
  // Build the URL prefix for the current user's role (e.g. '/admin', '/staff').
  const rolePrefix = `/${role?.toLowerCase()}`

  // Show browser zoom detected toast
  useEffect(() => {
    if (browserZoomDetected) {
      setToast('Browser zoom detected — app zoom reset to 100%')
      setTimeout(() => setToast(null), 4000)
    }
  }, [browserZoomDetected])
  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // --- Zoom helpers ---
  // applyZoom clamps the value to the allowed range (70–150) before storing it.
  const applyZoom = z => {
    const clamped = Math.min(150, Math.max(70, z))
    setZoom(clamped)
  }
  // changeZoom adjusts zoom by a relative amount (e.g. +10 or -10).
  const changeZoom = delta => applyZoom(zoom + delta)
  const resetZoom  = () => applyZoom(100)

  // SECTIONS drives the centre pill navigation.  Each entry includes:
  //   pages     – URL segments that belong to this section (used to compute active state).
  //   badge     – numeric count shown on the pill (0 hides it).
  //   glow      – whether the pill should animate to signal pending alerts.
  //   glowKey   – the key passed to muteSection() when the user clicks this pill.
  //   adminOnly – if true, Staff users see a lock icon and the click is blocked.
  const SECTIONS = [
    { label: 'Dashboard',   to: `${rolePrefix}/dashboard`,       pages: ['dashboard'],                                                    badge: 0,           glow: false,                   glowKey: null },
    { label: 'Inventory',   to: `${rolePrefix}/products`,        pages: ['products', 'stock', 'stock-movement'],                          badge: inventory,   glow: glowing.inventory,       glowKey: 'inventory' },
    { label: 'Procurement', to: `${rolePrefix}/suppliers`,       pages: ['suppliers', 'replenishment', 'purchase-orders'],                badge: procurement, glow: glowing.procurement,     glowKey: 'procurement' },
    { label: 'Finance',     to: `${rolePrefix}/orders`,          pages: ['orders', 'order-items', 'payments', 'invoices', 'receipts'],    badge: finance,     glow: glowing.finance,         glowKey: 'finance' },
    { label: 'Admin',       to: `${rolePrefix}/users`,           pages: ['users', 'audit-logs'], adminOnly: true,                        badge: 0,           glow: false,                   glowKey: null },
  ]

  // Derive the user's two-letter avatar initials from their full name.
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  // handleLogout clears the auth session and redirects to the login page.
  const handleLogout = () => { logout(); navigate('/login') }

  // isActive checks whether the current URL belongs to a given nav section.
  const currentPage = pathname.split('/').pop()
  const isActive = s => s.pages.includes(currentPage)

  // showToast displays a brief notification message and auto-hides after 3 s.
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // handleNavClick blocks Staff from navigating to admin-only sections and
  // instead shows a toast explaining why access is restricted.
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
              className={`tnav-pill${isActive(s) ? ' active' : ''}${s.adminOnly && !canManage ? ' tnav-pill-locked' : ''}${s.glow ? ' tnav-pill-glow' : ''}`}
              onClick={e => { handleNavClick(e, s); if (s.glowKey) muteSection(s.glowKey) }}
            >
              {isActive(s) && <span className="tnav-pill-dot"></span>}
              {s.adminOnly && !canManage && <i className="bi bi-lock" style={{ fontSize: 9, opacity: .6 }}></i>}
              {s.label}
              {s.badge > 0 && <span className="tnav-alert-badge">{s.badge > 99 ? '99+' : s.badge}</span>}
            </NavLink>
          ))}
        </div>
      </div>

      {/* RIGHT — controls + user */}
      <div className="tnav-right-wrap">
        <div className="tnav-right">
          <button className="tnav-theme-toggle" onClick={toggle} title="Toggle theme">
            {dark ? '☀️' : '🌙'}
          </button>
          <NavLink to={`${rolePrefix}/messages`} className="tnav-msg-bell" title="Internal Messages">
            <i className="bi bi-envelope"></i>
            {unreadCount > 0 && (
              <span className="tnav-msg-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </NavLink>
          <div className="tnav-status">
            <div className="tnav-dot"></div>
            System live
          </div>

          {/* Profile dropdown */}
          <div className="tnav-profile-wrap" ref={profileRef}>
            <button className="tnav-user" onClick={() => setProfileOpen(o => !o)}>
              <div className="tnav-avatar">{initials}</div>
              <span className="tnav-username">{user?.name || 'User'}</span>
              <span className="tnav-role">{user?.role || 'Staff'}</span>
              <i className={`bi bi-chevron-${profileOpen ? 'up' : 'down'}`} style={{ fontSize: 10, opacity: 0.6, marginLeft: 2 }}></i>
            </button>

            {profileOpen && (
              <div className="tnav-profile-dropdown">
                {/* Avatar + name header */}
                <div className="tnav-pd-header">
                  <div className="tnav-pd-avatar">{initials}</div>
                  <div>
                    <div className="tnav-pd-name">{user?.name || 'User'}</div>
                    <div className="tnav-pd-role-badge">{user?.role || 'Staff'}</div>
                  </div>
                </div>

                <div className="tnav-pd-divider" />

                {/* Details */}
                <div className="tnav-pd-details">
                  <div className="tnav-pd-row">
                    <i className="bi bi-envelope"></i>
                    <span>{user?.email || '—'}</span>
                  </div>
                  <div className="tnav-pd-row">
                    <i className="bi bi-person-badge"></i>
                    <span>ID: #{user?.userId || '—'}</span>
                  </div>
                  <div className="tnav-pd-row">
                    <i className="bi bi-shield-check"></i>
                    <span>Role: {user?.role || '—'}</span>
                  </div>
                </div>

                <div className="tnav-pd-divider" />

                {/* Navigation links */}
                <div style={{ padding: '4px 0' }}>
                  <NavLink
                    to={`${rolePrefix}/profile`}
                    className="tnav-pd-navlink"
                    onClick={() => setProfileOpen(false)}
                  >
                    <i className="bi bi-person-circle"></i>
                    My Profile
                  </NavLink>
                </div>

                <div className="tnav-pd-divider" />

                {/* Zoom controls */}
                <div className="tnav-pd-zoom">
                  <span className="tnav-pd-zoom-label"><i className="bi bi-zoom-in" style={{ marginRight: 5 }}></i>Page Zoom</span>
                  <div className="tnav-pd-zoom-controls">
                    <button className="tnav-pd-zoom-btn" onClick={() => changeZoom(-10)} title="Zoom out"><i className="bi bi-dash"></i></button>
                    <span className="tnav-pd-zoom-pct" onClick={resetZoom} title="Reset to 100%">{zoom}%</span>
                    <button className="tnav-pd-zoom-btn" onClick={() => changeZoom(10)} title="Zoom in"><i className="bi bi-plus"></i></button>
                  </div>
                </div>

                <div className="tnav-pd-divider" />

                {/* Contact support */}
                <button
                  className="tnav-pd-support"
                  onClick={() => { setProfileOpen(false); setSupportOpen(true) }}>
                  <i className="bi bi-headset"></i>
                  Contact Support
                </button>

                <div className="tnav-pd-divider" />

                {/* Sign out */}
                <button className="tnav-pd-signout" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right"></i>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>

    <ContactSupportModal
      show={supportOpen}
      onHide={() => setSupportOpen(false)}
      prefillName={user?.name || ''}
      prefillEmail={user?.email || ''}
    />

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