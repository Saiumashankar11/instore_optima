// InnerLayout.jsx
// This is the main application shell used after a user logs in.
// It renders the top navigation bar plus a left sidebar that changes
// based on which section (Inventory, Procurement, Finance, Admin) the
// user is currently browsing.  The <Outlet /> placeholder is where React
// Router injects the current page's content.

// React Router utilities: Outlet renders nested routes, NavLink is a link
// that automatically gets an "active" class, useLocation tells us the
// current URL.
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import TopNavbar from './TopNavbar'
// AuthContext gives us the current user's role (Admin / Manager / Staff).
import { useAuth } from '../context/AuthContext'
// AlertBadgesContext tracks the count of items needing attention (e.g. low
// stock, pending orders) and drives the numeric badges in the sidebar.
import { useAlertBadges } from '../context/AlertBadgesContext'

// SIDEBAR_DEFS defines all four sidebar sections and their navigation links.
// Each link specifies: the URL page segment, a Bootstrap icon class, a human
// label, and which roles may see it.  Links not available to a user's role
// are rendered as locked (greyed-out with a padlock) instead of being hidden.
const SIDEBAR_DEFS = {
  inventory: {
    section: 'Inventory',
    links: [
      { page: 'products',       icon: 'bi-box-seam',         label: 'Products',       roles: ['Admin','Manager'] },
      { page: 'stock',          icon: 'bi-layers',           label: 'Stock',          roles: ['Admin','Manager','Staff'] },
      { page: 'stock-movement', icon: 'bi-arrow-left-right', label: 'Stock Movement', roles: ['Admin','Manager','Staff'] },
    ]
  },
  procurement: {
    section: 'Procurement',
    links: [
      { page: 'suppliers',       icon: 'bi-truck',             label: 'Suppliers',       roles: ['Admin','Manager'] },
      { page: 'replenishment',   icon: 'bi-arrow-repeat',      label: 'Replenishment',   roles: ['Admin','Manager'] },
      { page: 'purchase-orders', icon: 'bi-file-earmark-text', label: 'Purchase Orders', roles: ['Admin','Manager','Staff'] },
    ]
  },
  finance: {
    section: 'Finance',
    links: [
      { page: 'orders',    icon: 'bi-cart3',              label: 'Orders',    roles: ['Admin','Manager','Staff'] },
      { page: 'payments',  icon: 'bi-credit-card',        label: 'Payments',  roles: ['Admin','Manager','Staff'] },
      { page: 'invoices',  icon: 'bi-receipt',            label: 'Invoices',  roles: ['Admin','Manager','Staff'] },
      { page: 'receipts',  icon: 'bi-file-earmark-check', label: 'Receipts',  roles: ['Admin','Manager','Staff'] },
    ]
  },
  admin: {
    section: 'Admin',
    links: [
      { page: 'users',      icon: 'bi-people',       label: 'Users',       roles: ['Admin','Manager'] },
      { page: 'audit-logs', icon: 'bi-shield-check', label: 'Audit Logs',  roles: ['Admin'] },
    ]
  },
}

// getSidebarKey maps the last URL segment (e.g. "stock") to one of the four
// sidebar section keys so that the correct group of links is displayed.
// Falls back to 'inventory' for any URL that isn't explicitly matched.
function getSidebarKey(pathname) {
  const page = pathname.split('/').pop()
  if (['products','stock','stock-movement'].includes(page))            return 'inventory'
  if (['suppliers','replenishment','purchase-orders'].includes(page))  return 'procurement'
  if (['orders','payments','invoices','receipts'].includes(page)) return 'finance'
  if (['users','audit-logs'].includes(page))                           return 'admin'
  return 'inventory'
}

// SidebarBadge renders a small numeric pill next to a sidebar link or section
// header showing how many items need attention.  Counts above 99 display "99+"
// to keep the layout tidy.  Returns nothing when count is 0 or falsy.
function SidebarBadge({ count }) {
  if (!count) return null
  return (
    <span className="isb-badge">{count > 99 ? '99+' : count}</span>
  )
}

// InnerLayout is the authenticated page shell.
// Props:
//   zoom              – current app zoom percentage (70–150).
//   setZoom           – callback to update the zoom value.
//   browserZoomDetected – true when the browser's own zoom overrode ours.
export default function InnerLayout({ zoom = 100, setZoom = () => {}, browserZoomDetected = false }) {
  // pathname is the current URL path, used to decide which sidebar to show.
  const { pathname } = useLocation()
  // role is the logged-in user's access level: 'Admin', 'Manager', or 'Staff'.
  const { role } = useAuth()
  // badges = individual counts; inventory/procurement/finance = section totals;
  // glowing = whether a section header should pulse to draw attention.
  const { badges, inventory, procurement, finance, glowing } = useAlertBadges()

  // Build the role-based URL prefix so all nav links go to the right role path.
  const rolePrefix = `/${role.toLowerCase()}`
  // Determine which sidebar section matches the current URL segment.
  const sidebarKey  = getSidebarKey(pathname)
  const sidebar     = SIDEBAR_DEFS[sidebarKey]

  // Aggregate badge count shown on each section header.
  const sectionBadge = { inventory, procurement, finance, admin: 0 }
  // Whether each section header should pulse with a glow animation.
  const sectionGlow  = { inventory: glowing.inventory, procurement: glowing.procurement, finance: glowing.finance, admin: false }

  // Map individual sidebar links to their specific alert counts.
  const linkBadge = {
    'stock':           badges.lowStock,
    'replenishment':   badges.pendingReplenishment,
    'purchase-orders': badges.pendingPurchaseOrders,
    'orders':          badges.pendingOrders,
    'payments':        badges.pendingPayments,
    'invoices':        badges.issuedInvoices,
  }

  return (
    <div className="app-root">
      {/* Top navigation bar (brand, section pills, user avatar) */}
      <TopNavbar zoom={zoom} setZoom={setZoom} browserZoomDetected={browserZoomDetected} />
      <div className="inner-body">
        {/* Left sidebar — shows links for the active section */}
        <aside className="inner-sidebar">
          {/* Section heading; gets a glowing border when there are urgent alerts */}
          <div className={`isb-section${sectionGlow[sidebarKey] ? ' isb-section-glow' : ''}`}>
            {sidebar.section}
            <SidebarBadge count={sectionBadge[sidebarKey]} />
          </div>
          {/* Render each link for the current section */}
          {sidebar.links.map(link => {
            const canAccess = link.roles.includes(role)
            if (canAccess) {
              return (
                // NavLink applies the 'active' CSS class automatically when the
                // route matches, giving the selected link a highlighted style.
                <NavLink
                  key={link.page}
                  to={`${rolePrefix}/${link.page}`}
                  className={({ isActive }) => `isb-link${isActive ? ' active' : ''}`}
                >
                  <i className={`bi ${link.icon}`}></i>
                  {link.label}
                  <SidebarBadge count={linkBadge[link.page]} />
                </NavLink>
              )
            }
            // If the user's role cannot access this link, show it locked/disabled.
            return (
              <div key={link.page} className="isb-link isb-link-locked" title={`Not accessible to ${role}`}>
                <i className={`bi ${link.icon}`}></i>
                {link.label}
                <i className="bi bi-lock-fill" style={{ marginLeft: 'auto', fontSize: 10, opacity: .5 }}></i>
              </div>
            )
          })}
        </aside>
        {/* Main content area — React Router renders the matched child route here */}
        <main className="inner-content animate-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}