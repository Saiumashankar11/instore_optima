// StockMovement.jsx
// Shows a log of every stock movement (IN, OUT, ADJUSTMENT, WRITE_OFF) recorded in the system.
// Admins can delete entries; any logged-in user can record a new movement.
// Deletions use an "undo" pattern: the row disappears immediately but the API call is
// delayed briefly so the user can cancel before data is permanently removed.

// React hooks for state and side-effects
import { useEffect, useState } from 'react'
// Shared UI components used across the app
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import StatusBadge from '../components/shared/StatusBadge'
// API service functions for movements and products
import { getAllMovements, recordMovement, deleteMovement } from '../services/stockMovementService'
import { getAllProducts } from '../services/productsService'
// Auth context gives us the current user and whether they are an admin
import { useAuth } from '../context/AuthContext'
// Provides the "soft delete with undo toast" behaviour
import { useUndoDelete } from '../hooks/useUndoDelete'
// Brief notification messages
import { useToast } from '../hooks/useToast'
// Utility helpers: error parsing, field validation, and date formatting
import { parseApiError, validateField, fmtDateTime } from '../utils/validators'

// Blank form values shown when opening the Record Movement modal
const EMPTY = { productId: '', quantity: '', movementType: 'IN', reason: '' }

export default function StockMovement() {
  // Current user info and admin flag from auth context
  const { user, isAdmin } = useAuth()
  // Undo-delete helper; UndoToast is the JSX element that renders the undo banner
  const { scheduleDelete, UndoToast } = useUndoDelete()
  const { show: toast, ToastContainer } = useToast()

  // --- Component State ---
  const [data, setData]         = useState([]) // All movement records from the API
  const [products, setProducts] = useState([]) // Product list used for resolving names in the table
  const [loading, setLoading]   = useState(true)  // True while the initial data fetch is running
  const [error, setError]       = useState('')     // Error message if the fetch fails
  const [search, setSearch]     = useState('')     // Live text in the search box
  const [filter, setFilter]     = useState('All') // Currently selected movement-type filter
  const [showForm, setShowForm] = useState(false)  // Whether the Record Movement modal is open
  const [form, setForm]         = useState(EMPTY)  // Current values in the Record Movement form
  const [saving, setSaving]     = useState(false)  // True while the save/delete API call is in flight
  const [showDel, setShowDel]   = useState(false)  // Whether the delete confirmation modal is open
  const [delId, setDelId]       = useState(null)   // ID of the movement scheduled for deletion
  const [formErrors, setFormErrors] = useState({}) // Per-field validation errors shown in the form

  // Loads all movements and products from the API in parallel
  const load = async () => {
    setLoading(true)
    try {
      const [m, p] = await Promise.all([getAllMovements(), getAllProducts()])
      setData(m.data || [])
      setProducts(p.data || [])
    } catch { setError('Failed to load movements.') }
    finally { setLoading(false) }
  }

  // Fetch data once when the component first mounts
  useEffect(() => { load() }, [])

  // Generic field updater factory used by all form inputs
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // --- Save handler: validates and records a new movement ---
  const handleSave = async () => {
    const errors = {}
    if (!form.productId) errors.productId = 'Please select a product.'
    if (!form.quantity || Number(form.quantity) < 1) errors.quantity = 'Quantity must be at least 1.'
    // Use the shared validateField utility to check the reason text
    const reasonErr = validateField('reason', form.reason)
    if (reasonErr) errors.reason = reasonErr
    setFormErrors(errors)
    if (Object.keys(errors).length) { toast(Object.values(errors)[0], 'warning'); return }
    setSaving(true)
    try {
      // performedBy records which user created this entry
      await recordMovement({ ...form, productId: Number(form.productId), quantity: Number(form.quantity), performedBy: user?.userId })
      setShowForm(false); setForm(EMPTY); load()
      toast('Movement recorded!', 'success')
    } catch (err) { toast(parseApiError(err)) }
    finally { setSaving(false) }
  }

  // --- Delete handler: optimistically removes the row, then schedules the real API delete ---
  // The user sees the row disappear instantly, and has a short window to click "Undo".
  const handleDelete = async () => {
    const row = data.find(d => d.movementId === delId)
    const prod = products.find(p => p.productId === row?.productId)
    setShowDel(false)
    // Remove from UI immediately before the API call completes
    setData(prev => prev.filter(d => d.movementId !== delId))
    scheduleDelete({
      id: delId,
      label: `Movement #${delId} (${prod?.name || 'Product'})`,
      deleteFn: () => deleteMovement(delId),
      onUndo: () => load(), // Reload the full list if the user clicks Undo
      onError: (err) => { toast(parseApiError(err), 'error'); load() },
    })
  }

  // Looks up a product object by its ID
  const getProduct = id => products.find(p => p.productId === id)

  // Attach a readable product name to every row so the table doesn't need to call getProduct repeatedly
  const enriched = data.map(row => ({
    ...row, _productName: getProduct(row.productId)?.name || `Product #${row.productId}`
  }))

  // Apply type filter first, then text search across ID and product name
  const filtered = enriched
    .filter(d => filter === 'All' || d.movementType === filter)
    .filter(d =>
      String(d.movementId).includes(search) ||
      d._productName.toLowerCase().includes(search.toLowerCase())
    )

  // --- Table column definitions ---
  const columns = [
    { key: 'movementId',   label: 'ID',      render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.movementId}</span> },
    // _productName was attached during the enrichment step above
    { key: '_productName', label: 'Product', render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r._productName}</span> },
    { key: 'quantity',     label: 'Qty',     render: r => <span style={{ fontWeight: 700, color: 'var(--text-200)' }}>{r.quantity}</span> },
    // StatusBadge renders a coloured pill matching the movement type (IN, OUT, etc.)
    { key: 'movementType', label: 'Type',    render: r => <StatusBadge status={r.movementType} /> },
    { key: 'reason',       label: 'Reason',  render: r => <span style={{ color: 'var(--text-primary)' }}>{r.reason || '—'}</span> },
    { key: 'performedAt',  label: 'Date',    render: r => fmtDateTime(r.performedAt) },
    // Delete button is only shown to admins; other users see a dash
    { key: 'actions', label: 'Actions', render: r => isAdmin ? (
      <button className="btn-icon danger" title="Delete" onClick={() => { setDelId(r.movementId); setShowDel(true) }}>
        <i className="bi bi-trash"></i>
      </button>
    ) : <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span> },
  ]

  // --- Render ---
  return (
    <div className="animate-in">
      {/* Page header with an inline "Record Movement" button passed as the action prop */}
      <PageHeader
        title="Stock Movement"
        subtitle="Track all stock ins, outs and adjustments"
        action={<button className="btn-primary-custom" onClick={() => { setForm(EMPTY); setShowForm(true) }}><i className="bi bi-plus-lg"></i> Record Movement</button>}
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            {/* Count badge reflects the post-filter row count */}
            All Movements <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            {/* Movement-type dropdown filter */}
            <select className="form-control-custom" style={{ width: 140 }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="All">All Types</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
              <option value="WRITE_OFF">WRITE_OFF</option>
            </select>
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      {/* Modal form for recording a new stock movement */}
      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title="Record Stock Movement" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Product</label>
          <select className={`form-control-custom${formErrors.productId ? ' input-error' : ''}`} value={form.productId} onChange={e => { set('productId')(e); setFormErrors(f => ({ ...f, productId: undefined })) }}>
            <option value="">— Select Product —</option>
            {products.map(p => <option key={p.productId} value={p.productId}>{p.name}</option>)}
          </select>
          {formErrors.productId && <span className="field-error-text">{formErrors.productId}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          {/* Each option includes a short description to help users choose the right type */}
          <label className="form-label-custom">Movement Type</label>
          <select className="form-control-custom" value={form.movementType} onChange={set('movementType')}>
            <option value="IN">IN — Stock received</option>
            <option value="OUT">OUT — Stock removed / sold</option>
            <option value="ADJUSTMENT">ADJUSTMENT — Manual count correction</option>
            <option value="WRITE_OFF">WRITE_OFF — Expiry, damage or loss</option>
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Quantity</label>
          <input className={`form-control-custom${formErrors.quantity ? ' input-error' : ''}`} type="number" placeholder="0" value={form.quantity} onChange={e => { set('quantity')(e); setFormErrors(f => ({ ...f, quantity: undefined })) }} />
          {formErrors.quantity && <span className="field-error-text">{formErrors.quantity}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Reason</label>
          <input className={`form-control-custom${formErrors.reason ? ' input-error' : ''}`} placeholder="e.g. Supplier delivery..." value={form.reason} onChange={e => { set('reason')(e); setFormErrors(f => ({ ...f, reason: undefined })) }} />
          {formErrors.reason && <span className="field-error-text">{formErrors.reason}</span>}
        </div>
      </FormModal>

      {/* Confirm before permanently deleting a movement record */}
      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Delete Movement" message="⚠️ This stock movement record will be permanently deleted. This action cannot be undone. Delete anyway?" confirmLabel="Delete Anyway" loading={saving} />
      {/* Undo banner appears briefly after a deletion is triggered */}
      {UndoToast}
      {ToastContainer}
    </div>
  )
}