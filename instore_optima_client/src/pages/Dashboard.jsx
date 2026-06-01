import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from '../components/shared/StatusBadge'
import DataTable from '../components/shared/DataTable'
import { getAllProducts } from '../services/productsService'
import { getAllStock } from '../services/stockService'
import { getAllOrders } from '../services/ordersService'
import { getAllSuppliers } from '../services/supplierService'
import { getAllReplenishments } from '../services/replenishmentService'
import { getAllPayments } from '../services/paymentService'
import { fmtDate } from '../utils/validators'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, role, canManage } = useAuth()
  const rp = `/${role?.toLowerCase() || 'staff'}`
  const [stats, setStats] = useState({
    products: 0, lowStock: 0, orders: 0,
    suppliers: 0, pending: 0, approved: 0,
    rejected: 0, fulfilled: 0, totalReplen: 0, revenue: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [products, stock, orders, suppliers, replenishments, payments] =
        await Promise.allSettled([
          getAllProducts(), getAllStock(), getAllOrders(),
          getAllSuppliers(), getAllReplenishments(), getAllPayments()
        ])
      const p   = products.value?.data       || []
      const s   = stock.value?.data          || []
      const o   = orders.value?.data         || []
      const sup = suppliers.value?.data      || []
      const r   = replenishments.value?.data || []
      const pay = payments.value?.data       || []

      const completedOrderIds = new Set(
        pay.filter(x => x.paymentStatus === 'Completed').map(x => x.orderId)
      )
      const revenue = o
        .filter(x => completedOrderIds.has(x.orderId))
        .reduce((acc, x) => acc + (Number(x.totalAmount) || 0), 0)

      // real replenishment counts
      const rPending   = r.filter(x => x.status === 'Pending').length
      const rApproved  = r.filter(x => x.status === 'Approved').length
      const rRejected  = r.filter(x => x.status === 'Rejected').length
      const rFulfilled = r.filter(x => x.status === 'Fulfilled').length
      const rTotal     = r.length

      setStats({
        products:  p.length,
        lowStock:  s.filter(x => x.currentStock <= (x.minStock || 0)).length,
        orders:    o.length,
        suppliers: sup.length,
        pending:   rPending,
        approved:  rApproved,
        rejected:  rRejected,
        fulfilled: rFulfilled,
        totalReplen: rTotal,
        revenue,
      })
      setRecentOrders(o.slice(0, 6))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

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

  const greet = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const orderColumns = [
    { key: 'orderId',     label: 'Order ID',  render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.orderId}</span> },
    { key: 'orderDate',   label: 'Date',      render: r => fmtDate(r.orderDate) },
    { key: 'totalAmount', label: 'Amount',    render: r => <span style={{ fontWeight: 600, color: 'var(--text-950)' }}>₹{Number(r.totalAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'status',      label: 'Status',    render: r => <StatusBadge status={r.status} /> },
  ]

  return (
    <div>
      {/* ── HERO ── */}
      <div className="dash-hero">
        <div className="dash-hero-bg">
          <div className="dash-hero-grid"></div>
          <div className="dash-hero-glow"></div>
          <div className="dash-hero-glow2"></div>
        </div>
        <div className="dash-hero-bgtext">INSTORE OPTIMA</div>

        <div className="dash-hero-inner">

          {/* LEFT */}
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
                <div className="bento-card-a-val">{stats.orders}</div>
                <div className="bento-card-a-sub up">↑ All time total</div>
              </div>
            </div>

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