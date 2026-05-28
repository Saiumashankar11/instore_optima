import { useEffect, useState, useCallback } from 'react'
import PageHeader from '../components/shared/PageHeader'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import StatusBadge from '../components/shared/StatusBadge'
import { getAllOrders, createOrder, updateOrder, deleteOrder } from '../services/ordersService'
import { getItemsByOrderId, createOrderItem, updateOrderItem, deleteOrderItem } from '../services/orderItemsService'
import { getAllProducts } from '../services/productsService'
import { getAllStock } from '../services/stockService'
import { useAuth } from '../context/AuthContext'
import { useUndoDelete } from '../hooks/useUndoDelete'
import { useToast } from '../hooks/useToast'
import { parseApiError, fmtDate } from '../utils/validators'

const ORDER_STATUSES = ['Pending', 'Processing', 'Completed', 'Cancelled']

// Only allow forward transitions; Completed and Cancelled are terminal
const getValidNextStatuses = (current) => {
  if (current === 'Pending')    return ['Pending', 'Processing', 'Cancelled']
  if (current === 'Processing') return ['Processing', 'Completed', 'Cancelled']
  return [current] // Completed / Cancelled — no further changes
}

const isTerminal = (status) => status === 'Completed' || status === 'Cancelled'

export default function Orders() {
  const { user } = useAuth()
  const { scheduleDelete, UndoToast } = useUndoDelete()
  const { show: toast, ToastContainer } = useToast()

  const [orders, setOrders]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [search, setSearch]           = useState('')
  const [selectedOrder, setSelected]  = useState(null)
  const [items, setItems]             = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [products, setProducts]       = useState([])
  const [stock, setStock]             = useState([])

  const [showOrderForm, setShowOrderForm] = useState(false)
  const [editOrder, setEditOrder]     = useState(null)
  const [orderForm, setOrderForm]     = useState({ status: 'Pending' })
  const [savingOrder, setSavingOrder] = useState(false)
  const [showDelOrder, setShowDelOrder] = useState(false)
  const [delOrderId, setDelOrderId]   = useState(null)

  const [showItemForm, setShowItemForm] = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [itemForm, setItemForm]       = useState({ productId: '', quantity: '' })
  const [savingItem, setSavingItem]   = useState(false)
  const [showDelItem, setShowDelItem] = useState(false)
  const [delItemId, setDelItemId]     = useState(null)

  const loadOrders = useCallback(async (keepSelected) => {
    try {
      const list = (await getAllOrders()).data || []
      setOrders(list)
      if (keepSelected) {
        const fresh = list.find(o => o.orderId === keepSelected.orderId)
        setSelected(fresh || null)
      }
    } catch { setError('Failed to load orders.') }
  }, [])

  const loadItems = useCallback(async (orderId) => {
    if (!orderId) return setItems([])
    setItemsLoading(true)
    try { setItems((await getItemsByOrderId(orderId)).data || []) }
    catch { setItems([]) }
    finally { setItemsLoading(false) }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([getAllOrders(), getAllProducts(), getAllStock()]).then(([o, p, s]) => {
      setOrders(o.data || [])
      setProducts(p.data || [])
      setStock(s.data || [])
    }).catch(() => setError('Failed to load.')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedOrder) loadItems(selectedOrder.orderId)
    else setItems([])
  }, [selectedOrder?.orderId])

  // ── Order handlers ──────────────────────────────
  const openAddOrder  = () => { setEditOrder(null); setOrderForm({ status: 'Pending' }); setShowOrderForm(true) }
  const openEditOrder = (o, e) => { e.stopPropagation(); setEditOrder(o); setOrderForm({ status: o.status }); setShowOrderForm(true) }
  const openDelOrder  = (id, e) => { e.stopPropagation(); setDelOrderId(id); setShowDelOrder(true) }

  const handleSaveOrder = async () => {
    setSavingOrder(true)
    try {
      if (editOrder) await updateOrder(editOrder.orderId, { status: orderForm.status, totalAmount: editOrder.totalAmount })
      else await createOrder({ userId: user?.userId })
      setShowOrderForm(false)
      await loadOrders(selectedOrder)
    } catch (err) { toast(parseApiError(err)) }
    finally { setSavingOrder(false) }
  }

  const handleDeleteOrder = () => {
    const id = delOrderId
    setShowDelOrder(false)
    if (selectedOrder?.orderId === id) setSelected(null)
    setOrders(prev => prev.filter(o => o.orderId !== id))
    scheduleDelete({
      id,
      label: `Order #${id}`,
      deleteFn: () => deleteOrder(id),
      onUndo: () => loadOrders(null),
    })
  }

  // ── Item handlers ────────────────────────────────
  const openAddItem  = async () => { setEditItem(null); setItemForm({ productId: '', quantity: '' }); try { setStock((await getAllStock()).data || []) } catch {} setShowItemForm(true) }
  const openEditItem = (item) => { setEditItem(item); setItemForm({ productId: item.productId, quantity: String(item.quantity) }); setShowItemForm(true) }
  const openDelItem  = (id) => { setDelItemId(id); setShowDelItem(true) }

  const handleSaveItem = async () => {
    if (!itemForm.quantity || Number(itemForm.quantity) < 1) return toast('Enter a valid quantity (≥ 1).', 'warning')
    if (!editItem && !itemForm.productId) return toast('Please select a product.', 'warning')
    setSavingItem(true)
    try {
      if (editItem) {
        await updateOrderItem(editItem.orderItemId, { quantity: Number(itemForm.quantity) })
      } else {
        await createOrderItem({ orderId: selectedOrder.orderId, productId: Number(itemForm.productId), quantity: Number(itemForm.quantity) })
      }
      setShowItemForm(false)
      await loadItems(selectedOrder.orderId)
      await loadOrders(selectedOrder)
      toast(editItem ? 'Item updated!' : 'Item added!', 'success')
    } catch (err) { toast(parseApiError(err)) }
    finally { setSavingItem(false) }
  }

  const handleDeleteItem = () => {
    const id = delItemId
    const orderId = selectedOrder.orderId
    setShowDelItem(false)
    setItems(prev => prev.filter(i => i.orderItemId !== id))
    scheduleDelete({
      id,
      label: `Order Item #${id}`,
      deleteFn: () => deleteOrderItem(id),
      onUndo: () => { loadItems(orderId); loadOrders(selectedOrder) },
    })
  }

  const filtered = orders.filter(o =>
    String(o.orderId).includes(search) ||
    o.status?.toLowerCase().includes(search.toLowerCase())
  )

  const getProductName  = id => products.find(p => p.productId === id)?.name || `#${id}`
  const getProductPrice = id => products.find(p => p.productId === id)?.price

  const TH = ({ children }) => (
    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
      color: 'var(--text-header)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{children}</th>
  )

  return (
    <div className="animate-in">
      <PageHeader
        title="Orders"
        subtitle="Manage orders — click a row to view & manage its items"
        action={<button className="btn-primary-custom" onClick={openAddOrder}><i className="bi bi-plus-lg"></i> New Order</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Orders table ── */}
        <div className="table-card" style={{ margin: 0 }}>
          <div className="table-toolbar">
            <p className="table-toolbar-title">All Orders <span className="count">{filtered.length}</span></p>
            <div className="table-toolbar-right">
              <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID or status..." />
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner" style={{ padding: 32 }}><span/><span/><span/></div>
          ) : error ? (
            <div style={{ padding: 24, color: 'var(--danger)', textAlign: 'center' }}>{error}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                <TH>Order</TH><TH>Date</TH><TH>Items</TH><TH>Total</TH><TH>Status</TH><TH></TH>
              </tr></thead>
              <tbody>
                {filtered.map(o => {
                  const active = selectedOrder?.orderId === o.orderId
                  return (
                    <tr key={o.orderId} onClick={() => setSelected(active ? null : o)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer',
                        background: active ? 'rgba(8,145,178,.1)' : 'transparent', transition: 'background .12s' }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.03)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'rgba(8,145,178,.1)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>#{o.orderId}</span>
                        {active && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--cyan)', color: '#fff', borderRadius: 4, padding: '1px 6px' }}>open</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {fmtDate(o.orderDate)}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {o.orderItems?.length ?? 0}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        ₹{Number(o.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge status={o.status} /></td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" title="Edit status" onClick={e => openEditOrder(o, e)} disabled={isTerminal(o.status)}><i className="bi bi-pencil"></i></button>
                          <button className="btn-icon danger" title="Delete" onClick={e => openDelOrder(o.orderId, e)}><i className="bi bi-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No orders found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Items panel (slides in) ── */}
        {selectedOrder && (
          <div className="table-card" style={{ margin: 0 }}>
            <div className="table-toolbar">
              <div>
                <p className="table-toolbar-title">
                  Order <span style={{ color: 'var(--cyan)' }}>#{selectedOrder.orderId}</span> &mdash; Items
                  <span className="count" style={{ marginLeft: 8 }}>{items.length}</span>
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  Total:&nbsp;<strong style={{ color: 'var(--cyan)' }}>
                    ₹{Number(orders.find(o => o.orderId === selectedOrder.orderId)?.totalAmount || 0).toLocaleString('en-IN')}
                  </strong>
                  &nbsp;·&nbsp;<StatusBadge status={selectedOrder.status} />
                </p>
              </div>
              <div className="table-toolbar-right">
                <button className="btn-primary-custom" onClick={openAddItem}><i className="bi bi-plus-lg"></i> Add Item</button>
                <button className="btn-icon" title="Close" onClick={() => setSelected(null)}><i className="bi bi-x-lg"></i></button>
              </div>
            </div>

            {itemsLoading ? (
              <div className="loading-spinner" style={{ padding: 32 }}><span/><span/><span/></div>
            ) : items.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="bi bi-cart3" style={{ fontSize: 32, display: 'block', marginBottom: 8 }}></i>
                No items yet. Click <strong>Add Item</strong>.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <TH>Product</TH><TH>Qty</TH><TH>Unit Price</TH><TH>Line Total</TH><TH></TH>
                </tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.orderItemId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.productName || getProductName(item.productId)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>{item.quantity}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>₹{Number(item.price || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>₹{Number((item.price||0)*(item.quantity||0)).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={() => openEditItem(item)}><i className="bi bi-pencil"></i></button>
                          <button className="btn-icon danger" onClick={() => openDelItem(item.orderItemId)}><i className="bi bi-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td colSpan={3} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: 12 }}>Order Total</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--cyan)', fontSize: 14 }}>
                      ₹{items.reduce((s, i) => s + (i.price||0)*(i.quantity||0), 0).toLocaleString('en-IN')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Order modals ── */}
      <FormModal show={showOrderForm} onHide={() => setShowOrderForm(false)} onSubmit={handleSaveOrder}
        title={editOrder ? `Edit Order #${editOrder.orderId}` : 'New Order'} loading={savingOrder}>
        {editOrder && (
          <div style={{ marginBottom: 14 }}>
            <label className="form-label-custom">Total Amount (₹)</label>
            <input className="form-control-custom" value={`₹${Number(editOrder.totalAmount || 0).toLocaleString('en-IN')}`} disabled />
            <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Auto-calculated from items</small>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Status</label>
          <select className="form-control-custom" value={orderForm.status} onChange={e => setOrderForm(f => ({ ...f, status: e.target.value }))}>
            {getValidNextStatuses(editOrder?.status || 'Pending').map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {!editOrder && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Total starts at ₹0 and updates automatically as you add items.</p>}
      </FormModal>

      <ConfirmModal show={showDelOrder} onHide={() => setShowDelOrder(false)} onConfirm={handleDeleteOrder}
        title="Delete Order" message="Delete this order and all its items permanently?" confirmLabel="Delete" loading={savingOrder} />

      {/* ── Item modals ── */}
      <FormModal show={showItemForm} onHide={() => setShowItemForm(false)} onSubmit={handleSaveItem}
        title={editItem ? 'Edit Item Quantity' : `Add Item to Order #${selectedOrder?.orderId}`} loading={savingItem}>
        {!editItem ? (
          <div style={{ marginBottom: 14 }}>
            <label className="form-label-custom">Product</label>
            <select className="form-control-custom" value={itemForm.productId} onChange={e => setItemForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">— Select Product —</option>
              {products
                .filter(p => {
                  const s = stock.find(st => Number(st.productId) === Number(p.productId))
                  return s && Number(s.currentStock) > 0
                })
                .map(p => {
                  const s = stock.find(st => Number(st.productId) === Number(p.productId))
                  return <option key={p.productId} value={p.productId}>{p.name} — ₹{p.price} (Stock: {s?.currentStock ?? 0})</option>
                })}
            </select>
            {itemForm.productId && (
              <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                Price ₹{getProductPrice(Number(itemForm.productId)) ?? '—'} auto-fetched · stock deducted automatically
              </small>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <label className="form-label-custom">Product</label>
            <input className="form-control-custom" value={editItem.productName || getProductName(editItem.productId)} disabled />
            <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Unit price: ₹{Number(editItem.price || 0).toLocaleString('en-IN')}</small>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Quantity</label>
          <input className="form-control-custom" type="number" min="1" placeholder="1"
            value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} />
        </div>
      </FormModal>

      <ConfirmModal show={showDelItem} onHide={() => setShowDelItem(false)} onConfirm={handleDeleteItem}
        title="Remove Item" message="Remove this item? Stock will be restored automatically." confirmLabel="Remove" loading={savingItem} />

      {UndoToast}
      {ToastContainer}
    </div>
  )
}