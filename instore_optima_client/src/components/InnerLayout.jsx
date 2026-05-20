import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom'
import TopNavbar from './TopNavbar'
import { useAuth } from '../context/AuthContext'

const SIDEBAR_DEFS = {
  inventory: {
    section: 'Inventory',
    links: [
      { page: 'products',       icon: 'bi-box-seam',         label: 'Products' },
      { page: 'stock',          icon: 'bi-layers',           label: 'Stock' },
      { page: 'stock-movement', icon: 'bi-arrow-left-right', label: 'Stock Movement' },
    ]
  },
  procurement: {
    section: 'Procurement',
    links: [
      { page: 'suppliers',       icon: 'bi-truck',             label: 'Suppliers' },
      { page: 'replenishment',   icon: 'bi-arrow-repeat',      label: 'Replenishment' },
      { page: 'purchase-orders', icon: 'bi-file-earmark-text', label: 'Purchase Orders' },
    ]
  },
  finance: {
    section: 'Finance',
    links: [
      { page: 'orders',       icon: 'bi-cart3',              label: 'Orders' },
      { page: 'order-items',  icon: 'bi-list-ul',            label: 'Order Items' },
      { page: 'payments',     icon: 'bi-credit-card',        label: 'Payments' },
      { page: 'invoices',     icon: 'bi-receipt',            label: 'Invoices' },
      { page: 'receipts',     icon: 'bi-file-earmark-check', label: 'Receipts' },
    ]
  },
  admin: {
    section: 'Admin',
    links: [
      { page: 'users',      icon: 'bi-people',       label: 'Users' },
      { page: 'audit-logs', icon: 'bi-shield-check', label: 'Audit Logs' },
    ]
  },
}

function getSidebarKey(pathname) {
  const page = pathname.split('/').pop()
  if (['products','stock','stock-movement'].includes(page))            return 'inventory'
  if (['suppliers','replenishment','purchase-orders'].includes(page))  return 'procurement'
  if (['orders','order-items','payments','invoices','receipts'].includes(page)) return 'finance'
  if (['users','audit-logs'].includes(page))                           return 'admin'
  return 'inventory'
}

export default function InnerLayout() {
  const { pathname } = useLocation()
  const { canManage, role } = useAuth()
  const rolePrefix = `/${role.toLowerCase()}`
  const currentPage = pathname.split('/').pop()
  const sidebarKey  = getSidebarKey(pathname)
  const sidebar     = SIDEBAR_DEFS[sidebarKey]

  // If Staff navigates directly to /staff/users or /staff/audit-logs, redirect away
  if (!canManage && ['users', 'audit-logs'].includes(currentPage)) {
    return <Navigate to={`${rolePrefix}/dashboard`} replace />
  }

  return (
    <div className="app-root">
      <TopNavbar />
      <div className="inner-body">
        <aside className="inner-sidebar">
          <div className="isb-section">{sidebar.section}</div>
          {sidebar.links
            .filter(link => {
              if (['users', 'audit-logs'].includes(link.page)) return canManage
              return true
            })
            .map(link => (
            <NavLink
              key={link.page}
              to={`${rolePrefix}/${link.page}`}
              className={({ isActive }) => `isb-link${isActive ? ' active' : ''}`}
            >
              <i className={`bi ${link.icon}`}></i>
              {link.label}
            </NavLink>
          ))}
        </aside>
        <main className="inner-content animate-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}