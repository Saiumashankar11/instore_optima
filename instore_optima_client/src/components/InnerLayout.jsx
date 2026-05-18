import { Outlet, NavLink, useLocation } from 'react-router-dom'
import TopNavbar from './TopNavbar'

const SIDEBARS = {
  inventory: {
    section: 'Inventory',
    links: [
      { to: '/products',       icon: 'bi-box-seam',         label: 'Products' },
      { to: '/stock',          icon: 'bi-layers',           label: 'Stock' },
      { to: '/stock-movement', icon: 'bi-arrow-left-right', label: 'Stock Movement' },
    ]
  },
  procurement: {
    section: 'Procurement',
    links: [
      { to: '/suppliers',       icon: 'bi-truck',             label: 'Suppliers' },
      { to: '/replenishment',   icon: 'bi-arrow-repeat',      label: 'Replenishment' },
      { to: '/purchase-orders', icon: 'bi-file-earmark-text', label: 'Purchase Orders' },
    ]
  },
  finance: {
    section: 'Finance',
    links: [
      { to: '/orders',       icon: 'bi-cart3',              label: 'Orders' },
      { to: '/order-items',  icon: 'bi-list-ul',            label: 'Order Items' },
      { to: '/payments',     icon: 'bi-credit-card',        label: 'Payments' },
      { to: '/invoices',     icon: 'bi-receipt',            label: 'Invoices' },
      { to: '/receipts',     icon: 'bi-file-earmark-check', label: 'Receipts' },
    ]
  },
  admin: {
    section: 'Admin',
    links: [
      { to: '/users',      icon: 'bi-people',       label: 'Users' },
      { to: '/audit-logs', icon: 'bi-shield-check', label: 'Audit Logs' },
    ]
  },
}

function getSidebar(pathname) {
  if (['/products','/stock','/stock-movement'].includes(pathname))            return SIDEBARS.inventory
  if (['/suppliers','/replenishment','/purchase-orders'].includes(pathname))  return SIDEBARS.procurement
  if (['/orders','/order-items','/payments','/invoices','/receipts'].includes(pathname)) return SIDEBARS.finance
  if (['/users','/audit-logs'].includes(pathname))                             return SIDEBARS.admin
  return SIDEBARS.inventory
}

export default function InnerLayout() {
  const { pathname } = useLocation()
  const sidebar = getSidebar(pathname)

  return (
    <div className="app-root">
      <TopNavbar />
      <div className="inner-body">
        <aside className="inner-sidebar">
          <div className="isb-section">{sidebar.section}</div>
          {sidebar.links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
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