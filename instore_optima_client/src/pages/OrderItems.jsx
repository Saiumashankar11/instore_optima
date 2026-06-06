// OrderItems.jsx
// Displays the individual line items (products + quantities) that belong to a selected order.
// Users can pick an order from a dropdown, then add, edit, or remove its items.
// The product dropdown only shows items that actually have stock on hand.

// React hooks for state and side-effects
import { useEffect, useState } from 'react'
// Shared UI building blocks used across the app
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
// API service functions for order items, orders, products, and stock
import { getItemsByOrderId, createOrderItem, updateOrderItem, deleteOrderItem } from '../services/orderItemsService'
import { getAllOrders } from '../services/ordersService'
import { getAllProducts } from '../services/productsService'
import { getAllStock } from '../services/stockService'
// Custom hook that shows brief toast notification messages to the user
import { useToast } from '../hooks/useToast'
// Utility that extracts a human-readable message from API error objects
import { parseApiError } from '../utils/validators'

// Default blank values used when opening the "Add Item" form
const EMPTY = { orderId: '', productId: '', quantity: '' }

export default function OrderItems() {
  // Pull the toast helper and its rendering container from the hook
  const { show: toast, ToastContainer } = useToast()

  // --- Component State ---
  const [data, setData]                   = useState([]) // Line items for the currently selected order
  const [orders, setOrders]               = useState([]) // All orders, used to populate the order dropdown
  const [products, setProducts]           = useState([]) // All products, used to look up names and prices
  const [stock, setStock]                 = useState([]) // Current stock levels, used to filter available products
  const [loading, setLoading]             = useState(false) // True while fetching order items from the API
  const [error, setError]                 = useState('')    // Error message shown in the table if the fetch fails
  const [selectedOrder, setSelectedOrder] = useState('')    // The order ID currently chosen in the dropdown
  const [showForm, setShowForm]           = useState(false) // Controls whether the add/edit modal is visible
  const [showDel, setShowDel]             = useState(false) // Controls whether the delete confirmation modal is visible
  const [editing, setEditing]             = useState(null)  // Holds the row being edited; null when adding a new item
  const [form, setForm]                   = useState(EMPTY) // Current values inside the add/edit form fields
  const [saving, setSaving]               = useState(false) // True while the save/delete API call is in flight
  const [delId, setDelId]                 = useState(null)  // ID of the order item scheduled for deletion
  const [formErrors, setFormErrors]       = useState({})    // Per-field validation error messages shown in the form

  // On first render, load all orders, products, and stock in parallel.
  // allSettled is used so that a failure in one request doesn't block the others.
  useEffect(() => {
    Promise.allSettled([getAllOrders(), getAllProducts(), getAllStock()]).then(([o, p, s]) => {
      setOrders(o.value?.data || [])
      setProducts(p.value?.data || [])
      setStock(s.value?.data || [])
    })
  }, [])

  // Fetches the line items for the given order ID and stores them in `data`.
  // Clears the table when no order is selected.
  const loadItems = async id => {
    if (!id) return setData([])
    setLoading(true)
    try { setData((await getItemsByOrderId(id)).data || []) }
    catch { setError('Failed to load items.') }
    finally { setLoading(false) }
  }

  // --- Form helpers ---
  // Generic field updater: set('quantity') returns an onChange handler for that field.
  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  // Opens the Add form, pre-filling the order ID and fetching fresh stock data.
  const openAdd  = async () => {
    setEditing(null); setForm({ ...EMPTY, orderId: selectedOrder })
    try {
      const freshStock = (await getAllStock()).data || []
      setStock(freshStock)
    } catch {}
    setShowForm(true)
  }
  // Opens the Edit form pre-filled with the existing row values.
  const openEdit = row => { setEditing(row); setForm({ ...row }); setShowForm(true) }
  // Stores the item ID to delete and shows the confirmation modal.
  const openDel  = id  => { setDelId(id); setShowDel(true) }

  // --- Save handler ---
  // Validates the form, then either creates a new item or updates an existing one.
  const handleSave = async () => {
    const errors = {}
    if (!form.quantity || Number(form.quantity) < 1) errors.quantity = 'Quantity must be at least 1.'
    if (!editing && !form.productId) errors.productId = 'Please select a product.'
    setFormErrors(errors)
    // Stop early and show the first validation error as a toast
    if (Object.keys(errors).length) { toast(Object.values(errors)[0], 'warning'); return }
    setSaving(true)
    try {
      if (editing) {
        // Edit mode: only quantity can be changed; product and price are locked
        await updateOrderItem(editing.orderItemId, { quantity: Number(form.quantity) })
        setShowForm(false); loadItems(selectedOrder)
        toast('Item updated!', 'success')
      } else {
        // Add mode: IDs are converted from strings (from <select>) to numbers before sending
        await createOrderItem({ orderId: Number(form.orderId), productId: Number(form.productId), quantity: Number(form.quantity) })
        setShowForm(false); loadItems(selectedOrder)
        // Refresh stock so the dropdown reflects updated availability
        try {
          const freshStock = (await getAllStock()).data || []
          setStock(freshStock)
        } catch {}
        toast('Item added!', 'success')
      }
    } catch (err) {
      toast(parseApiError(err))
    }
    finally { setSaving(false) }
  }

  // --- Delete handler ---
  // Calls the API to remove the item then refreshes the list.
  const handleDelete = async () => {
    setSaving(true)
    try { await deleteOrderItem(delId); setShowDel(false); loadItems(selectedOrder); toast('Item deleted.', 'success') }
    catch (err) { toast(parseApiError(err)) }
    finally { setSaving(false) }
  }

  // Helper: looks up the full product object by its ID (used for displaying product names)
  const getProduct = id => products.find(p => p.productId === id)

  // --- Table column definitions ---
  // Each entry describes one column: its data key, header label, and a render function
  // that returns the JSX shown in that cell.
  const columns = [
    { key: 'orderItemId', label: 'ID',         render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.orderItemId}</span> },
    // Product name looked up from the products list; falls back to the raw ID if not found
    { key: 'productId',   label: 'Product',    render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{getProduct(r.productId)?.name || `#${r.productId}`}</span> },
    { key: 'quantity',    label: 'Qty',        render: r => <span style={{ fontWeight: 700, color: 'var(--text-200)' }}>{r.quantity}</span> },
    { key: 'price',       label: 'Unit Price', render: r => <span>₹{Number(r.price || 0).toLocaleString('en-IN')}</span> },
    // Line total = unit price × quantity, calculated on the fly from the row data
    { key: 'total',       label: 'Line Total', render: r => <span style={{ fontWeight: 600, color: 'var(--text-200)' }}>₹{Number((r.price || 0) * (r.quantity || 0)).toLocaleString('en-IN')}</span> },
    { key: 'actions',     label: 'Actions',    render: r => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon" aria-label="Edit item" title="Edit" onClick={() => openEdit(r)}><i className="bi bi-pencil" aria-hidden="true"></i></button>
        <button className="btn-icon danger" aria-label="Remove item" title="Remove" onClick={() => openDel(r.orderItemId)}><i className="bi bi-trash" aria-hidden="true"></i></button>
      </div>
    )}
  ]

  // --- Render ---
  return (
    <div className="animate-in">
      {/* Page title and description banner at the top */}
      <PageHeader title="Order Items" subtitle="View and manage line items within orders" />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            {/* Item count badge updates as items are loaded */}
            Order Items <span className="count">{data.length}</span>
          </p>
          <div className="table-toolbar-right">
            {/* Dropdown to pick which order to inspect; triggers loadItems on change */}
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
            {/* "Add Item" button only appears once an order has been selected */}
            {selectedOrder && (
              <button className="btn-primary-custom" onClick={openAdd}>
                <i className="bi bi-plus-lg"></i> Add Item
              </button>
            )}
          </div>
        </div>
        {/* Show a prompt when no order is chosen; otherwise render the items table */}
        {!selectedOrder
          ? <div className="empty-state"><i className="bi bi-cart3"></i><p>Select an order to view its items</p></div>
          : <DataTable columns={columns} data={data} loading={loading} error={error} emptyMsg="No items in this order." />
        }
      </div>

      {/* Add / Edit modal — title and fields change depending on whether we are editing */}
      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title={editing ? 'Edit Item' : 'Add Item'} loading={saving}>
        {/* Product selector shown only in Add mode; locked when editing */}
        {!editing && (
          <div style={{ marginBottom: 14 }}>
            <label className="form-label-custom">Product</label>
            {/* Only products with currentStock > 0 appear in the dropdown */}
            <select className={`form-control-custom${formErrors.productId ? ' input-error' : ''}`} value={form.productId} onChange={e => { set('productId')(e); setFormErrors(f => ({ ...f, productId: undefined })) }}>
              <option value="">— Select Product —</option>
              {stock.length === 0 && <option disabled>Loading stock data...</option>}
              {products
                .filter(p => {
                  if (stock.length === 0) return false
                  const s = stock.find(st => Number(st.productId) === Number(p.productId))
                  return s && Number(s.currentStock) > 0
                })
                .map(p => {
                  const s = stock.find(st => Number(st.productId) === Number(p.productId))
                  return <option key={p.productId} value={p.productId}>{p.name} — ₹{p.price} (Stock: {s?.currentStock ?? 0})</option>
                })}
            </select>
            {formErrors.productId && <span className="field-error-text">{formErrors.productId}</span>}
            {/* Hint showing the price that will be recorded when this item is saved */}
            {form.productId && (
              <small style={{ color: 'var(--text-400)', fontSize: 11 }}>Price auto-fetched from product (₹{products.find(p => p.productId === Number(form.productId))?.price ?? '—'})</small>
            )}
          </div>
        )}
        {/* In Edit mode the product is read-only; only quantity can be changed */}
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

      {/* Confirmation dialog before removing an item from the order */}
      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Remove Item" message="Remove this item from the order?" confirmLabel="Remove" loading={saving} />
      {/* Toast notification container rendered at the root of this component */}
      {ToastContainer}
    </div>
  )
}