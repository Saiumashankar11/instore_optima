import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import { getItemsByOrderId, createOrderItem, updateOrderItem, deleteOrderItem } from '../services/orderItemsService'
import { getAllOrders } from '../services/ordersService'
import { getAllProducts } from '../services/productsService'
import { getAllStock } from '../services/stockService'
import { useToast } from '../hooks/useToast'
import { parseApiError } from '../utils/validators'

const EMPTY = { orderId: '', productId: '', quantity: '' }

export default function OrderItems() {
  const { show: toast, ToastContainer } = useToast()
  const [data, setData]                   = useState([])
  const [orders, setOrders]               = useState([])
  const [products, setProducts]           = useState([])
  const [stock, setStock]                 = useState([])
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [selectedOrder, setSelectedOrder] = useState('')
  const [showForm, setShowForm]           = useState(false)
  const [showDel, setShowDel]             = useState(false)
  const [editing, setEditing]             = useState(null)
  const [form, setForm]                   = useState(EMPTY)
  const [saving, setSaving]               = useState(false)
  const [delId, setDelId]                 = useState(null)
  const [formErrors, setFormErrors]       = useState({})

  useEffect(() => {
    Promise.all([getAllOrders(), getAllProducts(), getAllStock()]).then(([o, p, s]) => {
      setOrders(o.data || [])
      setProducts(p.data || [])
      setStock(s.data || [])
    })
  }, [])

  const loadItems = async id => {
    if (!id) return setData([])
    setLoading(true)
    try { setData((await getItemsByOrderId(id)).data || []) }
    catch { setError('Failed to load items.') }
    finally { setLoading(false) }
  }

  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const openAdd  = () => { setEditing(null); setForm({ ...EMPTY, orderId: selectedOrder }); setShowForm(true) }
  const openEdit = row => { setEditing(row); setForm({ ...row }); setShowForm(true) }
  const openDel  = id  => { setDelId(id); setShowDel(true) }

  const handleSave = async () => {
    const errors = {}
    if (!form.quantity || Number(form.quantity) < 1) errors.quantity = 'Quantity must be at least 1.'
    if (!editing && !form.productId) errors.productId = 'Please select a product.'
    setFormErrors(errors)
    if (Object.keys(errors).length) { toast(Object.values(errors)[0], 'warning'); return }
    setSaving(true)
    try {
      if (editing) {
        await updateOrderItem(editing.orderItemId, { quantity: Number(form.quantity) })
      } else {
        await createOrderItem({ orderId: Number(form.orderId), productId: Number(form.productId), quantity: Number(form.quantity) })
      }
      setShowForm(false); loadItems(selectedOrder)
      toast(editing ? 'Item updated!' : 'Item added!', 'success')
    } catch (err) {
      toast(parseApiError(err))
    }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try { await deleteOrderItem(delId); setShowDel(false); loadItems(selectedOrder); toast('Item deleted.', 'success') }
    catch (err) { toast(parseApiError(err)) }
    finally { setSaving(false) }
  }

  const getProduct = id => products.find(p => p.productId === id)

  const columns = [
    { key: 'orderItemId', label: 'ID',         render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.orderItemId}</span> },
    { key: 'productId',   label: 'Product',    render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{getProduct(r.productId)?.name || `#${r.productId}`}</span> },
    { key: 'quantity',    label: 'Qty',        render: r => <span style={{ fontWeight: 700, color: 'var(--text-200)' }}>{r.quantity}</span> },
    { key: 'price',       label: 'Unit Price', render: r => <span>₹{Number(r.price || 0).toLocaleString('en-IN')}</span> },
    { key: 'total',       label: 'Line Total', render: r => <span style={{ fontWeight: 600, color: 'var(--text-200)' }}>₹{Number((r.price || 0) * (r.quantity || 0)).toLocaleString('en-IN')}</span> },
    { key: 'actions',     label: 'Actions',    render: r => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon" onClick={() => openEdit(r)}><i className="bi bi-pencil"></i></button>
        <button className="btn-icon danger" onClick={() => openDel(r.orderItemId)}><i className="bi bi-trash"></i></button>
      </div>
    )}
  ]

  return (
    <div className="animate-in">
      <PageHeader title="Order Items" subtitle="View and manage line items within orders" />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            Order Items <span className="count">{data.length}</span>
          </p>
          <div className="table-toolbar-right">
            <select className="form-control-custom" style={{ width: 220 }}
              value={selectedOrder}
              onChange={e => { setSelectedOrder(e.target.value); loadItems(e.target.value) }}>
              <option value="">— Select an Order —</option>
              {orders.map(o => (
                <option key={o.orderId} value={o.orderId}>
                  Order #{o.orderId} — ₹{Number(o.totalAmount || 0).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
            {selectedOrder && (
              <button className="btn-primary-custom" onClick={openAdd}>
                <i className="bi bi-plus-lg"></i> Add Item
              </button>
            )}
          </div>
        </div>
        {!selectedOrder
          ? <div className="empty-state"><i className="bi bi-cart3"></i><p>Select an order to view its items</p></div>
          : <DataTable columns={columns} data={data} loading={loading} error={error} emptyMsg="No items in this order." />
        }
      </div>

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title={editing ? 'Edit Item' : 'Add Item'} loading={saving}>
        {!editing && (
          <div style={{ marginBottom: 14 }}>
            <label className="form-label-custom">Product</label>
            <select className={`form-control-custom${formErrors.productId ? ' input-error' : ''}`} value={form.productId} onChange={e => { set('productId')(e); setFormErrors(f => ({ ...f, productId: undefined })) }}>
              <option value="">— Select Product —</option>
              {products
                .filter(p => {
                  const s = stock.find(st => st.productId === p.productId)
                  return s && s.currentStock > 0
                })
                .map(p => {
                  const s = stock.find(st => st.productId === p.productId)
                  return <option key={p.productId} value={p.productId}>{p.name} — ₹{p.price} (Stock: {s?.currentStock ?? 0})</option>
                })}
            </select>
            {formErrors.productId && <span className="field-error-text">{formErrors.productId}</span>}
            {form.productId && (
              <small style={{ color: 'var(--text-400)', fontSize: 11 }}>Price auto-fetched from product (₹{products.find(p => p.productId === Number(form.productId))?.price ?? '—'})</small>
            )}
          </div>
        )}
        {editing && (
          <div style={{ marginBottom: 14 }}>
            <label className="form-label-custom">Product</label>
            <input className="form-control-custom" value={editing.productName || `#${editing.productId}`} disabled />
            <small style={{ color: 'var(--text-400)', fontSize: 11 }}>Unit price: ₹{Number(editing.price || 0).toLocaleString('en-IN')} (from product)</small>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Quantity</label>
          <input className={`form-control-custom${formErrors.quantity ? ' input-error' : ''}`} type="number" placeholder="1" min="1" value={form.quantity} onChange={e => { set('quantity')(e); setFormErrors(f => ({ ...f, quantity: undefined })) }} />
          {formErrors.quantity && <span className="field-error-text">{formErrors.quantity}</span>}
        </div>
      </FormModal>

      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Remove Item" message="Remove this item from the order?" confirmLabel="Remove" loading={saving} />
      {ToastContainer}
    </div>
  )
}