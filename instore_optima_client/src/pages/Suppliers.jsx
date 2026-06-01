import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import { getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../services/supplierService'
import { useUndoDelete } from '../hooks/useUndoDelete'
import { useToast } from '../hooks/useToast'
import { validateField, parseApiError } from '../utils/validators'

const EMPTY = { name: '', contact: '', email: '', address: '' }

export default function Suppliers() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDel, setShowDel]   = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [delId, setDelId]       = useState(null)

  const { scheduleDelete, UndoToast } = useUndoDelete()
  const { show: toast, ToastContainer } = useToast()
  const [formErrors, setFormErrors] = useState({})

  const load = async () => {
    setLoading(true)
    try { setData((await getAllSuppliers()).data || []) }
    catch { setError('Failed to load suppliers.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = row => { setEditing(row); setForm({ ...row }); setShowForm(true) }
  const openDel  = id  => { setDelId(id); setShowDel(true) }

  const handleSave = async () => {
    const errors = {}
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
      if (editing) await updateSupplier(editing.supplierId, form)
      else await createSupplier(form)
      setShowForm(false); setFormErrors({}); load()
      toast(editing ? 'Supplier updated!' : 'Supplier added!', 'success')
    } catch (err) { toast(parseApiError(err)) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    const row = data.find(d => d.supplierId === delId)
    setShowDel(false)
    setData(prev => prev.filter(d => d.supplierId !== delId))
    scheduleDelete({
      id: delId,
      label: `Supplier "${row?.name || '#' + delId}"`,
      deleteFn: () => deleteSupplier(delId),
      onUndo: () => load(),
      onError: (err) => { toast(parseApiError(err), 'error'); load() },
    })
  }

  const filtered = data.filter(d =>
    String(d.supplierId).includes(search) ||
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'supplierId', label: 'ID',      render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.supplierId}</span> },
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

  return (
    <div className="animate-in">
      <PageHeader
        title="Suppliers"
        subtitle="Manage supplier information and contacts"
        action={<button className="btn-primary-custom" onClick={openAdd}><i className="bi bi-plus-lg"></i> Add Supplier</button>}
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Suppliers <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

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

      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Delete Supplier"
        message="⚠️ This supplier will be permanently deleted. If they have linked products, purchase orders, or replenishment logs, deletion will be blocked."
        confirmLabel="Delete Anyway" loading={saving} />
      {UndoToast}
      {ToastContainer}
    </div>
  )
}