import { Outlet, NavLink, useLocation } from 'react-router-dom'
import TopNavbar from './TopNavbar'
import { useAuth } from '../context/AuthContext'
import { useAlertBadges } from '../context/AlertBadgesContext'

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

function getSidebarKey(pathname) {
  const page = pathname.split('/').pop()
  if (['products','stock','stock-movement'].includes(page))            return 'inventory'
  if (['suppliers','replenishment','purchase-orders'].includes(page))  return 'procurement'
  if (['orders','payments','invoices','receipts'].includes(page)) return 'finance'
  if (['users','audit-logs'].includes(page))                           return 'admin'
  return 'inventory'
}

function SidebarBadge({ count }) {
  if (!count) return null
  return (
    <span className="isb-badge">{count > 99 ? '99+' : count}</span>
  )
}

export default function InnerLayout({ zoom = 100, setZoom = () => {}, browserZoomDetected = false }) {
  const { pathname } = useLocation()
  const { role } = useAuth()
  const { badges, inventory, procurement, finance, glowing } = useAlertBadges()

  const rolePrefix = `/${role.toLowerCase()}`
  const sidebarKey  = getSidebarKey(pathname)
  const sidebar     = SIDEBAR_DEFS[sidebarKey]

  const sectionBadge = { inventory, procurement, finance, admin: 0 }
  const sectionGlow  = { inventory: glowing.inventory, procurement: glowing.procurement, finance: glowing.finance, admin: false }

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
      <TopNavbar zoom={zoom} setZoom={setZoom} browserZoomDetected={browserZoomDetected} />
      <div className="inner-body">
        <aside className="inner-sidebar">
          <div className={`isb-section${sectionGlow[sidebarKey] ? ' isb-section-glow' : ''}`}>
            {sidebar.section}
            <SidebarBadge count={sectionBadge[sidebarKey]} />
          </div>
          {sidebar.links.map(link => {
            const canAccess = link.roles.includes(role)
            if (canAccess) {
              return (
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
            return (
              <div key={link.page} className="isb-link isb-link-locked" title={`Not accessible to ${role}`}>
                <i className={`bi ${link.icon}`}></i>
                {link.label}
                <i className="bi bi-lock-fill" style={{ marginLeft: 'auto', fontSize: 10, opacity: .5 }}></i>
              </div>
            )
          })}
        </aside>
        <main className="inner-content animate-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}