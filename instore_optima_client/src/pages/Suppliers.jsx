// Suppliers.jsx
// Lists all supplier companies and lets admins/managers add, edit, or delete them.
// Deletions are "soft" — the row is removed from the UI immediately and a short
// undo window is given before the API call commits the removal.

import { useEffect, useState } from 'react'
// Shared UI building blocks
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
// CRUD service functions for the Suppliers API endpoint
import { getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../services/supplierService'
// Provides the undo-delete toast behaviour
import { useUndoDelete } from '../hooks/useUndoDelete'
// Brief notification pop-ups
import { useToast } from '../hooks/useToast'
// Shared field validators and API error formatter
import { validateField, parseApiError } from '../utils/validators'

// Blank form state used when opening the "Add Supplier" modal
const EMPTY = { name: '', contact: '', email: '', address: '' }

export default function Suppliers() {
  // --- Component State ---
  const [data, setData]         = useState([]) // All supplier records from the API
  const [loading, setLoading]   = useState(true)  // True while the initial fetch is running
  const [error, setError]       = useState('')     // Error message shown if fetch fails
  const [search, setSearch]     = useState('')     // Current search-box text
  const [showForm, setShowForm] = useState(false)  // Controls add/edit modal visibility
  const [showDel, setShowDel]   = useState(false)  // Controls delete confirmation modal visibility
  const [editing, setEditing]   = useState(null)   // Row currently being edited; null when adding
  const [form, setForm]         = useState(EMPTY)  // Live values in the add/edit form
  const [saving, setSaving]     = useState(false)  // True while a save/delete API call is in flight
  const [delId, setDelId]       = useState(null)   // ID of the supplier queued for deletion

  const { scheduleDelete, UndoToast } = useUndoDelete()
  const { show: toast, ToastContainer } = useToast()
  const [formErrors, setFormErrors] = useState({}) // Per-field validation messages shown in the form

  // Fetches the full supplier list from the API
  const load = async () => {
    setLoading(true)
    try { setData((await getAllSuppliers()).data || []) }
    catch { setError('Failed to load suppliers.') }
    finally { setLoading(false) }
  }

  // Fetch once on initial mount
  useEffect(() => { load() }, [])

  // --- Form helpers ---
  // Generic field updater; e.g. set('name') returns an onChange handler for the name field
  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  // Open the Add form with blank values
  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  // Open the Edit form pre-filled with the selected row's data
  const openEdit = row => { setEditing(row); setForm({ ...row }); setShowForm(true) }
  // Store the supplier ID and show the delete confirmation dialog
  const openDel  = id  => { setDelId(id); setShowDel(true) }

  // --- Save handler: validates then creates or updates a supplier ---
  const handleSave = async () => {
    const errors = {}
    // Use shared validators so rules are consistent across the whole app
    const nameErr = validateField('supplierName', form.name)
    const contactErr = validateField('contact', form.contact)
    const emailErr = validateField('supplierEmail', form.email)
    if (nameErr) errors.name = nameErr
    if (contactErr) errors.contact = contactErr
    if (emailErr) errors.email = emailErr
    if (!form.address?.trim()) errors.address = 'Address is required.'
    setFormErrors(errors)
    if (Object.keys(errors).length) {
      toast(Object.values(errors)[0], 'error')
      return
    }

    setSaving(true)
    try {
      // editing is truthy when the form was opened via openEdit
      if (editing) await updateSupplier(editing.supplierId, form)
      else await createSupplier(form)
      setShowForm(false); setFormErrors({}); load()
      toast(editing ? 'Supplier updated!' : 'Supplier added!', 'success')
    } catch (err) { toast(parseApiError(err)) }
    finally { setSaving(false) }
  }

  // --- Delete handler: optimistic removal with an undo window ---
  const handleDelete = async () => {
    const row = data.find(d => d.supplierId === delId)
    setShowDel(false)
    // Remove from UI immediately so the user sees instant feedback
    setData(prev => prev.filter(d => d.supplierId !== delId))
    scheduleDelete({
      id: delId,
      label: `Supplier "${row?.name || '#' + delId}"`,
      deleteFn: () => deleteSupplier(delId),
      onUndo: () => load(), // Reload the list if the user clicks Undo
      onError: (err) => { toast(parseApiError(err), 'error'); load() },
    })
  }

  // Filter the supplier list by ID, company name, or email as the user types in the search box
  const filtered = data.filter(d =>
    String(d.supplierId).includes(search) ||
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  )

  // --- Table column definitions ---
  const columns = [
    { key: 'supplierId', label: 'ID',      render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.supplierId}</span> },
    // Name column shows a coloured avatar circle (first letter) beside the company name
    { key: 'name',       label: 'Name',    render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--cyan-muted)', border: '1px solid var(--cyan-border)', color: 'var(--cyan-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
          {r.name?.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r.name}</span>
      </div>
    )},
    { key: 'contact', label: 'Contact', render: r => r.contact || '—' },
    { key: 'email',   label: 'Email',   render: r => <span className="text-accent" style={{ fontSize: 12 }}>{r.email || '—'}</span> },
    { key: 'address', label: 'Address', render: r => <span style={{ color: 'var(--text-primary)', fontSize: 12 }}>{r.address || '—'}</span> },
    { key: 'actions', label: 'Actions', render: r => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon" aria-label={`Edit supplier #${r.supplierId}`} title="Edit" onClick={() => openEdit(r)}><i className="bi bi-pencil" aria-hidden="true"></i></button>
        <button className="btn-icon danger" aria-label={`Delete supplier #${r.supplierId}`} title="Delete" onClick={() => openDel(r.supplierId)}><i className="bi bi-trash" aria-hidden="true"></i></button>
      </div>
    )}
  ]

  // --- Render ---
  return (
    <div className="animate-in">
      {/* Page header with an inline "Add Supplier" button */}
      <PageHeader
        title="Suppliers"
        subtitle="Manage supplier information and contacts"
        action={<button className="btn-primary-custom" onClick={openAdd}><i className="bi bi-plus-lg"></i> Add Supplier</button>}
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            {/* Count badge reflects filtered results */}
            All Suppliers <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      {/* Add / Edit modal — closing it also resets validation errors */}
      <FormModal show={showForm} onHide={() => { setShowForm(false); setFormErrors({}) }} onSubmit={handleSave}
        title={editing ? 'Edit Supplier' : 'Add Supplier'} loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Company Name *</label>
          <input className={`form-control-custom ${formErrors.name ? 'input-error' : ''}`} placeholder="e.g. ABC Distributors" value={form.name} onChange={set('name')} />
          {formErrors.name && <span className="field-error-text">{formErrors.name}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Contact Person *</label>
          <input className={`form-control-custom ${formErrors.contact ? 'input-error' : ''}`} placeholder="e.g. Ravi Kumar" value={form.contact} onChange={set('contact')} />
          {formErrors.contact && <span className="field-error-text">{formErrors.contact}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Email *</label>
          <input className={`form-control-custom ${formErrors.email ? 'input-error' : ''}`} type="email" placeholder="supplier@company.com" value={form.email} onChange={set('email')} />
          {formErrors.email && <span className="field-error-text">{formErrors.email}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Address *</label>
          <input className={`form-control-custom ${formErrors.address ? 'input-error' : ''}`} placeholder="Full address" value={form.address} onChange={set('address')} />
          {formErrors.address && <span className="field-error-text">{formErrors.address}</span>}
        </div>
      </FormModal>

      {/* Warning dialog before deleting — explains that linked records will block the delete */}
      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Delete Supplier"
        message="⚠️ This supplier will be permanently deleted. If they have linked products, purchase orders, or replenishment logs, deletion will be blocked."
        confirmLabel="Delete Anyway" loading={saving} />
      {UndoToast}
      {ToastContainer}
    </div>
  )
}