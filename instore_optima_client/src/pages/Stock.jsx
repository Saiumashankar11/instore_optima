// Stock.jsx
// Displays and manages the current stock level for every product in the warehouse.
// Key behaviours:
//   • Any user can update a stock quantity (edit).
//   • Only Admins can delete a stock record entirely.
//   • If the new stock quantity is at or below half of the product's minStock threshold,
//     a replenishment order is automatically created on the user's behalf.
//   • Products that have no stock record yet can be initialised via "Create Stock".
//   • A "Low Stock" filter badge lets users quickly spot items that need attention.

// ── Imports ────────────────────────────────────────────────────────────────────
// React lifecycle and state hooks
import { useEffect, useState } from 'react'
// Shared UI components
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
// API service functions: stock CRUD, product list, and replenishment creation
import { getAllStock, updateStock, createStock, deleteStock } from '../services/stockService'
import { getAllProducts } from '../services/productsService'
import { createReplenishment } from '../services/replenishmentService'
// App-wide context and utility hooks
import { useAuth } from '../context/AuthContext'
import { useAlertBadges } from '../context/AlertBadgesContext'
import { useUndoDelete } from '../hooks/useUndoDelete'
import { useToast } from '../hooks/useToast'
// Validation utilities: validateField checks individual field rules; parseApiError extracts API error text
import { validateField, parseApiError } from '../utils/validators'
import { fmtDate } from '../utils/validators'

export default function Stock() {
  // ── Context & hooks ──────────────────────────────────────────────────────────
  // isAdmin: only Admins see the delete button on stock rows
  const { isAdmin } = useAuth()
  const { fetchBadges } = useAlertBadges()

  // ── State: stock list ────────────────────────────────────────────────────────
  const [data, setData]         = useState([])
  // products array is used to look up product names and minStock thresholds
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]         = useState('')
  // statusFilter: 'All' | 'Low Stock' | 'OK'
  const [statusFilter, setStatusFilter] = useState('All')

  // ── State: edit stock modal ──────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  // editing: the stock row currently being edited (null when modal is closed)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({ currentStock: '' })
  const [saving, setSaving]     = useState(false)

  // ── State: create stock modal ────────────────────────────────────────────────
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ productId: '', currentStock: '' })

  // ── State: delete confirmation ───────────────────────────────────────────────
  const [showDel, setShowDel]   = useState(false)
  const [delId, setDelId]       = useState(null)

  const { scheduleDelete, UndoToast } = useUndoDelete()
  const { show: toast, ToastContainer } = useToast()
  // formErrors: field-level validation messages displayed under their respective inputs
  const [formErrors, setFormErrors] = useState({})

  // ── Data loader ──────────────────────────────────────────────────────────────
  // Fetches stock records and product catalogue in parallel
  const load = async () => {
    setLoading(true)
    try {
      const [s, p] = await Promise.all([getAllStock(), getAllProducts()])
      setData(s.data || [])
      setProducts(p.data || [])
    } catch { setError('Failed to load stock.') }
    finally { setLoading(false) }
  }

  // Trigger the initial load once on mount
  useEffect(() => { load() }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  // Open the edit modal pre-populated with the selected row's current stock value
  const openEdit = row => {
    setEditing(row)
    setForm({ currentStock: row.currentStock })
    setShowForm(true)
  }

  // Save an updated stock quantity.
  // After persisting, checks whether the new level is critically low and, if so,
  // automatically creates a replenishment order (quantity = 2× minStock).
  const handleSave = async () => {
    const err = validateField('currentStock', form.currentStock)
    if (err) { setFormErrors({ currentStock: err }); toast(err, 'error'); return }
    setFormErrors({})
    setSaving(true)
    try {
      await updateStock(editing.stockId, { ...editing, currentStock: Number(form.currentStock) })
      setShowForm(false)
      // Auto replenishment: if new stock is between 0 and half of minStock
      const prod = products.find(p => p.productId === editing.productId)
      const newStock = Number(form.currentStock)
      const minStock = prod?.minStock || 0
      if (minStock > 0 && newStock >= 0 && newStock <= Math.floor(minStock / 2)) {
        try {
          await createReplenishment({ productId: editing.productId, quantityRequested: minStock * 2 })
          toast(`Stock updated! Auto-replenishment order created (stock critically low: ${newStock} ≤ ${Math.floor(minStock / 2)}).`, 'warning')
        } catch {
          toast('Stock updated! (Auto-replenishment failed — create manually.)', 'warning')
        }
      } else {
        toast('Stock updated successfully!', 'success')
      }
      load()
      fetchBadges()
    } catch (e) { toast(parseApiError(e)) }
    finally { setSaving(false) }
  }

  // Delete a stock record with an undo window (optimistic UI — row disappears immediately)
  const handleDelete = async () => {
    const row = data.find(d => d.stockId === delId)
    const prod = products.find(p => p.productId === row?.productId)
    setShowDel(false)
    setData(prev => prev.filter(d => d.stockId !== delId))
    scheduleDelete({
      id: delId,
      label: `Stock for "${prod?.name || '#' + delId}"`,
      deleteFn: () => deleteStock(delId),
      onUndo: () => load(),
      onError: (err) => { toast(parseApiError(err), 'error'); load() },
    })
  }

  // Create an initial stock record for a product that doesn't have one yet.
  // Same auto-replenishment logic as handleSave applies here too.
  const handleCreateStock = async () => {
    const errors = {}
    const prodErr = validateField('productId', createForm.productId)
    const stockErr = validateField('currentStock', createForm.currentStock || '0')
    if (prodErr) errors.productId = prodErr
    if (stockErr) errors.currentStock = stockErr
    setFormErrors(errors)
    if (Object.keys(errors).length) {
      toast(Object.values(errors)[0], 'error')
      return
    }

    setSaving(true)
    try {
      const newStockQty = Number(createForm.currentStock) || 0
      await createStock({ productId: Number(createForm.productId), currentStock: newStockQty })
      setShowCreateForm(false)
      setCreateForm({ productId: '', currentStock: '' })
      setFormErrors({})
      // Auto replenishment check
      const prod = products.find(p => p.productId === Number(createForm.productId))
      const minStock = prod?.minStock || 0
      if (minStock > 0 && newStockQty >= 0 && newStockQty <= Math.floor(minStock / 2)) {
        try {
          await createReplenishment({ productId: Number(createForm.productId), quantityRequested: minStock * 2 })
          toast(`Stock created! Auto-replenishment order created (stock critically low: ${newStockQty} ≤ ${Math.floor(minStock / 2)}).`, 'warning')
        } catch {
          toast('Stock created! (Auto-replenishment failed — create manually.)', 'warning')
        }
      } else {
        toast('Stock record created!', 'success')
      }
      load()
      fetchBadges()
    } catch (err) {
      toast(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  // Look up a product by ID from the cached products array
  const getProduct = id => products.find(p => p.productId === id)

  // Returns only products that don't yet have a stock record (used for the "Create Stock" dropdown)
  const getProductsWithoutStock = () => {
    const stockProductIds = new Set(data.map(s => s.productId))
    return products.filter(p => !stockProductIds.has(p.productId))
  }

  // enriched adds computed fields (_productName, _isLow, _rowClass) to each row for easy rendering.
  // _isLow is true when currentStock is at or below the product's minStock threshold.
  const enriched = data.map(row => {
    const prod = getProduct(row.productId)
    const isLow = prod && row.currentStock <= (prod.minStock || 0)
    return { ...row, _productName: prod?.name || `Product #${row.productId}`, _isLow: isLow, _rowClass: isLow ? 'row-low-stock' : '' }
  })

  // Apply text search and the status dropdown filter to the enriched rows
  const filtered = enriched.filter(d => {
    const matchesSearch = String(d.stockId).includes(search) || d._productName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All'
      || (statusFilter === 'Low Stock' && d._isLow)
      || (statusFilter === 'OK' && !d._isLow)
    return matchesSearch && matchesStatus
  })

  // lowCount drives the "X items below minimum" warning badge shown in the page header
  const lowCount = enriched.filter(r => r._isLow).length

  // Column definitions for DataTable — each entry describes one table column
  const columns = [
    { key: 'stockId',      label: 'ID',           render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.stockId}</span> },
    { key: '_productName', label: 'Product',       render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r._productName}</span> },
    { key: 'currentStock', label: 'Current Stock', render: r => (
      <span style={{ fontWeight: 700, fontSize: 14, color: r._isLow ? '#f87171' : '#34d399' }}>
        {r.currentStock}
      </span>
    )},
    { key: 'status',      label: 'Status',         render: r => r._isLow
      ? <span className="badge-custom badge-danger">Low Stock</span>
      : <span className="badge-custom badge-success">OK</span>
    },
    { key: 'lastUpdated', label: 'Last Updated',   render: r => fmtDate(r.lastUpdated) },
    { key: 'actions',     label: 'Actions',        render: r => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon" onClick={() => openEdit(r)} title="Update Stock">
          <i className="bi bi-pencil"></i>
        </button>
        {isAdmin && (
          <button className="btn-icon danger" onClick={() => { setDelId(r.stockId); setShowDel(true) }} title="Delete Stock">
            <i className="bi bi-trash"></i>
          </button>
        )}
      </div>
    )}
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Stock"
        subtitle="Monitor and update inventory stock levels"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Warning badge — only visible when at least one product is below its minimum stock level */}
            {lowCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)', color: '#fca5a5', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500 }}>
                <i className="bi bi-exclamation-triangle"></i>
                {lowCount} item{lowCount > 1 ? 's' : ''} below minimum
              </div>
            )}
            {/* "Create Stock" button only appears when there are products with no stock record yet */}
            {getProductsWithoutStock().length > 0 && (
              <button 
                className="btn-primary-custom"
                onClick={() => setShowCreateForm(true)}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className="bi bi-plus-lg"></i>
                Create Stock
              </button>
            )}
          </div>
        }
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Stock <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <select
              className="form-control-custom"
              style={{ width: 130 }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option>All</option>
              <option>Low Stock</option>
              <option>OK</option>
            </select>
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title="Update Stock Quantity" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Product</label>
          <input className="form-control-custom" value={editing?._productName || ''} disabled
            style={{ opacity: .6, cursor: 'not-allowed' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Current Stock</label>
          <input className={`form-control-custom${formErrors.currentStock ? ' input-error' : ''}`} type="number"
            value={form.currentStock}
            onChange={e => { setForm(f => ({ ...f, currentStock: e.target.value })); setFormErrors({}) }} />
          {formErrors.currentStock && <span className="field-error-text">{formErrors.currentStock}</span>}
        </div>
      </FormModal>

      <FormModal show={showCreateForm} onHide={() => setShowCreateForm(false)} onSubmit={handleCreateStock}
        title="Create Stock for Product" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Product *</label>
          <select className={`form-control-custom${formErrors.productId ? ' input-error' : ''}`} value={createForm.productId}
            onChange={e => { setCreateForm(f => ({ ...f, productId: e.target.value })); setFormErrors(fe => ({ ...fe, productId: undefined })) }}>
            <option value="">— Select a product —</option>
            {getProductsWithoutStock().map(p => (
              <option key={p.productId} value={p.productId}>{p.name}</option>
            ))}
          </select>
          {formErrors.productId && <span className="field-error-text">{formErrors.productId}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Initial Stock</label>
          <input className="form-control-custom" type="number" min="0"
            value={createForm.currentStock}
            onChange={e => setCreateForm(f => ({ ...f, currentStock: e.target.value }))}
            placeholder="0" />
        </div>
      </FormModal>

      {/* Confirm deletion of a stock record — warns that the product will disappear from tracking */}
      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Delete Stock Record"
        message="⚠️ This will permanently delete the stock record for this product. The product will no longer appear in stock tracking. Delete anyway?"
        confirmLabel="Delete Anyway" loading={saving} />
      {/* Undo snack-bar and notification toasts rendered at the bottom of the page */}
      {UndoToast}
      {ToastContainer}
    </div>
  )
}