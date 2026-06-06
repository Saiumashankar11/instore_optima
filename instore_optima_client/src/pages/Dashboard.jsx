// =============================================================================
// Dashboard.jsx
// =============================================================================
// The main landing page shown after login. It fetches a high-level summary of
// the store (products, orders, stock health, replenishment pipeline, revenue)
// and displays it in a hero section with stat cards, a bento sidebar, and a
// "Recent Orders" table at the bottom.
//
// Data is refreshed automatically every 30 seconds AND whenever the browser
// tab regains focus, so the numbers stay live without a full page reload.
// =============================================================================

// React core hooks — useCallback lets us memoize fetchAll so the useEffect
// dependency array stays stable.
import { useEffect, useState, useCallback } from 'react'
// Link is used for in-app navigation without a full browser reload.
import { Link } from 'react-router-dom'
// Shared UI components used across multiple pages.
import StatusBadge from '../components/shared/StatusBadge'
import DataTable from '../components/shared/DataTable'
// Service that calls the backend /api/dashboard/summary endpoint.
import { getDashboardSummary } from '../services/dashboardService'
// fmtDate formats ISO date strings into human-readable form.
import { fmtDate } from '../utils/validators'
// useAuth provides the current user object, their role, and permission helpers.
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  // Pull the current user, their role string ("Admin" / "Manager" / "Staff"),
  // and the canManage boolean (true for Admin and Manager) from auth context.
  const { user, role, canManage } = useAuth()
  // rp is the role-specific route prefix, e.g. "/admin" or "/staff".
  // Used to build navigation links that are correct for the current user's role.
  const rp = `/${role?.toLowerCase() || 'staff'}`

  // ── State ──────────────────────────────────────────────────────────────────
  // All dashboard KPIs are kept in a single stats object so one setState call
  // updates the whole set atomically.
  const [stats, setStats] = useState({
    products: 0, lowStock: 0, orders: 0, todayOrders: 0,
    suppliers: 0, pending: 0, approved: 0,
    rejected: 0, fulfilled: 0, totalReplen: 0, revenue: 0
  })
  // The five most recent orders rendered in the bottom table.
  const [recentOrders, setRecentOrders] = useState([])
  // While true the page shows a spinner instead of the stat cards.
  const [loading, setLoading] = useState(true)

  // ── Data fetching ──────────────────────────────────────────────────────────
  // fetchAll is wrapped in useCallback so its identity is stable across renders.
  // This prevents the useEffect below from re-registering its event listeners
  // on every render cycle.
  const fetchAll = useCallback(async () => {
    try {
      // Call the backend and destructure the response payload.
      // The ?? 0 fallback ensures we never render "undefined" or "NaN" in the UI.
      const d = (await getDashboardSummary()).data || {}
      setStats({
        products:    d.products       ?? 0,
        lowStock:    d.lowStock        ?? 0,
        orders:      d.orders          ?? 0,
        todayOrders: d.todayOrders     ?? 0,
        suppliers:   d.suppliers       ?? 0,
        pending:     d.replenPending   ?? 0,
        approved:    d.replenApproved  ?? 0,
        rejected:    d.replenRejected  ?? 0,
        fulfilled:   d.replenFulfilled ?? 0,
        totalReplen: d.replenTotal     ?? 0,
        revenue:     d.revenue         ?? 0,
      })
      // recentOrders is a separate array returned inside the same response.
      setRecentOrders(d.recentOrders || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  // ── Live-refresh effect ────────────────────────────────────────────────────
  // Registers three separate refresh triggers so the dashboard never goes stale:
  //   1. An interval that polls every 30 seconds.
  //   2. A 'focus' listener that fires when the user switches back to this tab.
  //   3. A 'visibilitychange' listener that fires when the tab becomes visible
  //      again (e.g. the user minimised and then restored the browser).
  // The cleanup function returned here tears everything down when the component
  // unmounts, preventing memory leaks and ghost intervals.
  useEffect(() => {
    fetchAll()                                    // initial load
    const id = setInterval(fetchAll, 30000)       // live refresh every 30s
    const onVisible = () => { if (!document.hidden) fetchAll() }
    window.addEventListener('focus', fetchAll)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', fetchAll)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchAll])

  // ── Helpers ────────────────────────────────────────────────────────────────
  // Returns a time-appropriate greeting based on the user's local clock hour.
  const greet = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Column definitions for the Recent Orders DataTable.
  // Each object maps a data key to a label and an optional custom render function.
  // The render functions return JSX that styles or transforms the raw value.
  const orderColumns = [
    { key: 'orderId',     label: 'Order ID',  render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.orderId}</span> },
    { key: 'orderDate',   label: 'Date',      render: r => fmtDate(r.orderDate) },
    { key: 'totalAmount', label: 'Amount',    render: r => <span style={{ fontWeight: 600, color: 'var(--text-950)' }}>₹{Number(r.totalAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'status',      label: 'Status',    render: r => <StatusBadge status={r.status} /> },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── HERO ── */}
      {/* The hero section spans the full width and contains decorative background
          elements (grid, glows) plus the main content split into left and right. */}
      <div className="dash-hero">
        <div className="dash-hero-bg">
          <div className="dash-hero-grid"></div>
          <div className="dash-hero-glow"></div>
          <div className="dash-hero-glow2"></div>
        </div>
        <div className="dash-hero-bgtext">INSTORE OPTIMA</div>

        <div className="dash-hero-inner">

          {/* LEFT — headline, greeting, CTA buttons, and the 4 quick-stat tiles */}
          <div className="dash-hero-left">
            <div className="dash-eyebrow">
              <div className="dash-eyebrow-dot"></div>
              Intelligent Inventory System
            </div>
            <div className="dash-title">
              Shelf-perfect.<br />
              <span>Always.</span>
            </div>
            <div className="dash-subtitle">
              {greet()}, {user?.name?.split(' ')[0] || 'there'}. Real-time inventory, automated replenishment, complete order pipeline — all in one place.
            </div>
            <div className="dash-actions">
              <Link to={canManage ? `${rp}/products` : `${rp}/stock`} className="dash-btn-primary">
                <i className="bi bi-arrow-right-circle"></i> {canManage ? 'Go to Inventory' : 'View Stock'}
              </Link>
              <Link to={`${rp}/orders`} className="dash-btn-secondary">
                View Orders
              </Link>
            </div>

            {/* While data is loading show a spinner; once ready render the 4 stat tiles. */}
            {loading ? (
              <div className="loading-spinner" style={{ padding: 16 }}><span/><span/><span/></div>
            ) : (
              <div className="dash-stat-grid">
                <div className="dash-stat c1">
                  <div className="dash-stat-val">{stats.products}</div>
                  <div className="dash-stat-lbl">Total Products</div>
                  <div className="dash-stat-delta up">↑ Active catalog</div>
                </div>
                <div className="dash-stat c2">
                  <div className="dash-stat-val">{stats.orders}</div>
                  <div className="dash-stat-lbl">Total Orders</div>
                  <div className="dash-stat-delta up">↑ All time</div>
                </div>
                <div className="dash-stat c3">
                  <div className="dash-stat-val">{stats.lowStock}</div>
                  <div className="dash-stat-lbl">Low Stock</div>
                  <div className="dash-stat-delta dn">
                    {stats.lowStock > 0 ? '⚠ Needs reorder' : '✓ All stocked'}
                  </div>
                </div>
                <div className="dash-stat c4">
                  <div className="dash-stat-val">{stats.suppliers}</div>
                  <div className="dash-stat-lbl">Suppliers</div>
                  <div className="dash-stat-delta up">↑ Active vendors</div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Bento A */}
          <div className="dash-hero-right">

            {/* Replenishment pipeline bento card — shows a proportional bar for each
                status (approved / rejected / pending / fulfilled) relative to the total.
                Bar widths are calculated as percentages of totalReplen. */}
            <div className="bento-replen">
  <div className="bento-replen-top">
    <div className="bento-replen-left">
      <div className="bento-replen-label">Replenishment Pipeline</div>
      <div className="bento-replen-count">
        {stats.totalReplen}
        <span className="bento-replen-unit">total</span>
      </div>
    </div>
    <div className="bento-replen-bars">
      <div className="bento-replen-bar-row">
        <div className="bento-replen-bar-track">
          <div className="bento-replen-bar-fill cyan"
            style={{ width: stats.totalReplen > 0 ? `${Math.round((stats.approved / stats.totalReplen) * 100)}%` : '0%' }}>
          </div>
        </div>
        <span className="bento-replen-bar-label">{stats.approved} approved</span>
      </div>
      <div className="bento-replen-bar-row">
        <div className="bento-replen-bar-track">
          <div className="bento-replen-bar-fill red"
            style={{ width: stats.totalReplen > 0 ? `${Math.round((stats.rejected / stats.totalReplen) * 100)}%` : '0%' }}>
          </div>
        </div>
        <span className="bento-replen-bar-label">{stats.rejected} rejected</span>
      </div>
      <div className="bento-replen-bar-row">
        <div className="bento-replen-bar-track">
          <div className="bento-replen-bar-fill" style={{
            width: stats.totalReplen > 0 ? `${Math.round((stats.pending / stats.totalReplen) * 100)}%` : '0%',
            background: '#fbbf24'
          }}>
          </div>
        </div>
        <span className="bento-replen-bar-label">{stats.pending} pending</span>
      </div>
      <div className="bento-replen-bar-row">
        <div className="bento-replen-bar-track">
          <div className="bento-replen-bar-fill" style={{
            width: stats.totalReplen > 0 ? `${Math.round((stats.fulfilled / stats.totalReplen) * 100)}%` : '0%',
            background: '#818cf8'
          }}>
          </div>
        </div>
        <span className="bento-replen-bar-label">{stats.fulfilled} fulfilled</span>
      </div>
    </div>
  </div>
</div>

            {/* 2-col small bento cards: Revenue (total from payments) and Today's Orders count. */}
            {/* 2-col small cards */}
            <div className="bento-row">
              <div className="bento-card-a">
                <div className="bento-card-a-label">Revenue</div>
                <div className="bento-card-a-val">
                  {stats.revenue > 0
                    ? `₹${Number(stats.revenue).toLocaleString('en-IN')}`
                    : '—'}
                </div>
                <div className="bento-card-a-sub up">↑ From payments</div>
              </div>
              <div className="bento-card-a">
                <div className="bento-card-a-label">Today's Orders</div>
                <div className="bento-card-a-val">{stats.todayOrders}</div>
                <div className="bento-card-a-sub up">↑ Placed today</div>
              </div>
            </div>

            {/* Quick-navigation chip grid.
                Each chip is defined in the array below with its label, destination route,
                Bootstrap icon class, and which roles can see it. The .filter() call removes
                chips the current user's role is not allowed to access before rendering. */}
            {/* quick links card */}
            <div className="bento-links">
              <div className="bento-links-label">Quick Navigation</div>
              <div className="bento-links-row">
                {[
                  { label: 'Products',      to: `${rp}/products`,      icon: 'bi-box-seam',    roles: ['Admin','Manager'] },
                  { label: 'Stock',         to: `${rp}/stock`,         icon: 'bi-layers',      roles: ['Admin','Manager','Staff'] },
                  { label: 'Orders',        to: `${rp}/orders`,        icon: 'bi-cart3',       roles: ['Admin','Manager','Staff'] },
                  { label: 'Replenishment', to: `${rp}/replenishment`, icon: 'bi-arrow-repeat',roles: ['Admin','Manager'] },
                  { label: 'Invoices',      to: `${rp}/invoices`,      icon: 'bi-receipt',     roles: ['Admin','Manager','Staff'] },
                  { label: 'Purchase Orders', to: `${rp}/purchase-orders`, icon: 'bi-file-earmark-text', roles: ['Admin','Manager','Staff'] },
                  { label: 'Internal Mail',   to: `${rp}/messages`,        icon: 'bi-envelope',          roles: ['Admin','Manager','Staff'] },
                  { label: 'My Profile',      to: `${rp}/profile`,         icon: 'bi-person-circle',     roles: ['Admin','Manager','Staff'] },
                ].filter(item => item.roles.includes(role)).map(item => (
                  <Link key={item.to} to={item.to} className="bento-link-chip">
                    <i className={`bi ${item.icon}`}></i>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── RECENT ORDERS ── */}
      {/* Bottom section: a card with a DataTable showing the last few orders.
          "View all" links to the full Orders page for the current role. */}
      <div className="dash-lower animate-in">
        <div className="dash-lower-header">
          <div>
            <h2 className="dash-lower-title">Recent Orders</h2>
            <p className="dash-lower-sub">Latest activity across your store</p>
          </div>
          <Link to={`${rp}/orders`} className="btn-outline-custom" style={{ fontSize: 12 }}>
            View all <i className="bi bi-arrow-right"></i>
          </Link>
        </div>
        <div className="table-card">
          <DataTable
            columns={orderColumns}
            data={recentOrders}
            loading={loading}
            error=""
            emptyMsg="No orders yet."
          />
        </div>
      </div>
    </div>
  )
}