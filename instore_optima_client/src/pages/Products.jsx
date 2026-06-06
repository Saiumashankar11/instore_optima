// =============================================================================
// Products.jsx
// =============================================================================
// CRUD management page for the product catalog. Only Admins and Managers reach
// this page (Staff see a read-only stock view instead).
//
// Responsibilities:
//   - List all products with their price, stock thresholds, and supplier.
//   - Filter by supplier dropdown and by free-text search (ID or name).
//   - Create or edit a product via a modal form with field-level validation.
//   - Delete a product with an optimistic UI update and an "Undo" toast that
//     cancels the server-side delete if clicked within a few seconds.
// =============================================================================

// React hooks.
import { useEffect, useState } from 'react'
// Shared UI components.
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
// CRUD API calls for products and suppliers.
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../services/productsService'
import { getAllSuppliers } from '../services/supplierService'
// Custom hooks for undo-delete behavior and toast notifications.
import { useUndoDelete } from '../hooks/useUndoDelete'
import { useToast } from '../hooks/useToast'
// Field-level validation and API error parsing utilities.
import { validateField, parseApiError } from '../utils/validators'

// Default blank form values — used when opening the "Add Product" modal.
// Pre-filling with empty strings keeps all inputs as controlled components.
const EMPTY = { name: '', description: '', price: '', minStock: '', maxStock: '', supplierId: '' }

export default function Products() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [data, setData]           = useState([])          // all products from the API
  const [suppliers, setSuppliers] = useState([])          // used for the supplier name lookup + filter dropdown
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]           = useState('')       // name / ID search input
  const [supplierFilter, setSupplierFilter] = useState('') // '' means "all suppliers"
  const [showForm, setShowForm]   = useState(false)        // controls Add/Edit modal visibility
  const [showDel, setShowDel]     = useState(false)        // controls delete-confirm modal
  // editing holds the full row object when in Edit mode, or null for Add mode.
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)        // controlled form field values
  const [saving, setSaving]       = useState(false)        // true while save API call is in flight
  const [delId, setDelId]         = useState(null)         // product ID queued for deletion

  // scheduleDelete provides the undo-able delete pattern; UndoToast is the
  // banner element that should be rendered at the bottom of the page.
  const { scheduleDelete, UndoToast } = useUndoDelete()
  const { show: toast, ToastContainer } = useToast()
  const [formErrors, setFormErrors] = useState({})         // per-field validation messages

  // ── Data fetching ──────────────────────────────────────────────────────────
  // Loads products and suppliers in parallel. Suppliers are needed to resolve
  // supplierId → supplier name in the table and to populate the dropdown.
  const load = async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([getAllProducts(), getAllSuppliers()])
      setData(p.data || [])
      setSuppliers(s.data || [])
    } catch { setError('Failed to load products.') }
    finally { setLoading(false) }
  }

  // Fetch data once on mount (empty dependency array = run once).
  useEffect(() => { load() }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────
  // Generic form-field updater: set('fieldName') returns an onChange handler.
  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  // Opens the modal in Add mode (no pre-filled data).
  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  // Opens the modal in Edit mode, pre-filling the form with the selected row's data.
  const openEdit = row => { setEditing(row); setForm({ ...row }); setShowForm(true) }
  // Stores the target ID and opens the delete confirmation modal.
  const openDel  = id  => { setDelId(id); setShowDel(true) }

  // ── Save handler ───────────────────────────────────────────────────────────
  // Validates every field before calling the API. maxStock validation receives
  // the current minStock value as context so it can enforce max > min.
  // After validation passes, calls either createProduct or updateProduct
  // depending on whether we are in Add or Edit mode.
  const handleSave = async () => {
    const errors = {}
    const nameErr = validateField('productName', form.name)
    const descErr = validateField('description', form.description)
    const priceErr = validateField('price', form.price)
    const supplierErr = validateField('supplierId', form.supplierId)
    const minErr = validateField('minStock', form.minStock)
    const maxErr = validateField('maxStock', form.maxStock, { minStock: form.minStock })
    if (nameErr) errors.name = nameErr
    if (descErr) errors.description = descErr
    if (priceErr) errors.price = priceErr
    if (supplierErr) errors.supplierId = supplierErr
    if (minErr) errors.minStock = minErr
    if (maxErr) errors.maxStock = maxErr
    setFormErrors(errors)
    if (Object.keys(errors).length) {
      toast(Object.values(errors)[0], 'error')
      return
    }

    setSaving(true)
    try {
      if (editing) await updateProduct(editing.productId, form)
      else await createProduct(form)
      setShowForm(false); setFormErrors({}); load()
      toast(editing ? 'Product updated successfully!' : 'Product created successfully!', 'success')
    } catch (err) { toast(parseApiError(err)) }
    finally { setSaving(false) }
  }

  // ── Delete handler ─────────────────────────────────────────────────────────
  // Closes the confirm modal, removes the row from local state immediately
  // (optimistic update), then delegates the actual API delete to scheduleDelete
  // which provides the "Undo" toast window.
  const handleDelete = async () => {
    const row = data.find(d => d.productId === delId)
    setShowDel(false)
    // Optimistically remove from view
    setData(prev => prev.filter(d => d.productId !== delId))
    scheduleDelete({
      id: delId,
      label: `Product "${row?.name || '#' + delId}"`,
      deleteFn: () => deleteProduct(delId),
      onUndo: () => load(),
      onError: (err) => { toast(parseApiError(err), 'error'); load() },
    })
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  // Combines supplier dropdown filter and text search. Both must match for a
  // row to appear. supplierFilter is a string ID so we compare with String(d.supplierId).
  const filtered = data.filter(d => {
    const matchesSearch = String(d.productId).includes(search) || d.name?.toLowerCase().includes(search.toLowerCase())
    const matchesSupplier = !supplierFilter || String(d.supplierId) === supplierFilter
    return matchesSearch && matchesSupplier
  })

  // ── Table column definitions ───────────────────────────────────────────────
  // The 'actions' column always shows Edit and Delete buttons (this page is
  // only reachable by Admin / Manager, so no role-check is needed here).
  const columns = [
    { key: 'productId',   label: 'ID',          render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.productId}</span> },
    { key: 'name',        label: 'Name',         render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r.name}</span> },
    { key: 'description', label: 'Description',  render: r => <span style={{ color: 'var(--text-primary)' }}>{r.description || '—'}</span> },
    { key: 'price',       label: 'Price',        render: r => <span style={{ fontWeight: 600, color: 'var(--text-200)' }}>₹{Number(r.price || 0).toLocaleString('en-IN')}</span> },
    { key: 'minStock',    label: 'Min Stock' },
    { key: 'maxStock',    label: 'Max Stock' },
    { key: 'supplierId',  label: 'Supplier',     render: r => suppliers.find(s => s.supplierId === r.supplierId)?.name || '—' },
    { key: 'actions',     label: 'Actions',      render: r => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon" aria-label={`Edit product #${r.productId}`} title="Edit" onClick={() => openEdit(r)}><i className="bi bi-pencil" aria-hidden="true"></i></button>
        <button className="btn-icon danger" aria-label={`Delete product #${r.productId}`} title="Delete" onClick={() => openDel(r.productId)}><i className="bi bi-trash" aria-hidden="true"></i></button>
      </div>
    )}
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog"
        action={<button className="btn-primary-custom" onClick={openAdd}><i className="bi bi-plus-lg"></i> Add Product</button>}
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Products <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <select
              className="form-control-custom"
              style={{ width: 160 }}
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.supplierId} value={String(s.supplierId)}>{s.name}</option>
              ))}
            </select>
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      <FormModal show={showForm} onHide={() => { setShowForm(false); setFormErrors({}) }} onSubmit={handleSave}
        title={editing ? 'Edit Product' : 'Add Product'} loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Product Name *</label>
          <input className={`form-control-custom ${formErrors.name ? 'input-error' : ''}`} placeholder="e.g. Rice 5kg" value={form.name} onChange={set('name')} />
          {formErrors.name && <span className="field-error-text">{formErrors.name}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Description</label>
          <input className={`form-control-custom ${formErrors.description ? 'input-error' : ''}`} placeholder="Optional description" value={form.description} onChange={set('description')} />
          {formErrors.description && <span className="field-error-text">{formErrors.description}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Price (₹) *</label>
          <input className={`form-control-custom ${formErrors.price ? 'input-error' : ''}`} type="number" placeholder="0.00" value={form.price} onChange={set('price')} />
          {formErrors.price && <span className="field-error-text">{formErrors.price}</span>}
        </div>
        {/* Min and Max Stock are shown side-by-side to save vertical space.
            maxStock validation depends on minStock, handled in handleSave. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label-custom">Min Stock</label>
            <input className={`form-control-custom ${formErrors.minStock ? 'input-error' : ''}`} type="number" placeholder="10" value={form.minStock} onChange={set('minStock')} />
            {formErrors.minStock && <span className="field-error-text">{formErrors.minStock}</span>}
          </div>
          <div>
            <label className="form-label-custom">Max Stock</label>
            <input className={`form-control-custom ${formErrors.maxStock ? 'input-error' : ''}`} type="number" placeholder="100" value={form.maxStock} onChange={set('maxStock')} />
            {formErrors.maxStock && <span className="field-error-text">{formErrors.maxStock}</span>}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Supplier *</label>
          <select className={`form-control-custom ${formErrors.supplierId ? 'input-error' : ''}`} value={form.supplierId} onChange={set('supplierId')}>
            <option value="">— Select Supplier —</option>
            {suppliers.map(s => <option key={s.supplierId} value={s.supplierId}>{s.name}</option>)}
          </select>
          {formErrors.supplierId && <span className="field-error-text">{formErrors.supplierId}</span>}
        </div>
      </FormModal>

      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Delete Product"
        message="⚠️ This product will be permanently deleted. If it is referenced by any orders, stock movements, or replenishment records, deletion will be blocked."
        confirmLabel="Delete Anyway" loading={saving} />
      {UndoToast}
      {ToastContainer}
    </div>
  )
}