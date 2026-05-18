import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import { getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../services/supplierService'

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
    setSaving(true)
    try {
      if (editing) await updateSupplier(editing.supplierId, form)
      else await createSupplier(form)
      setShowForm(false); load()
    } catch { alert('Save failed.') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try { await deleteSupplier(delId); setShowDel(false); load() }
    catch { alert('Delete failed.') }
    finally { setSaving(false) }
  }

  const filtered = data.filter(d =>
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
    { key: 'address', label: 'Address', render: r => <span style={{ color: 'var(--text-600)', fontSize: 12 }}>{r.address || '—'}</span> },
    { key: 'actions', label: 'Actions', render: r => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon" onClick={() => openEdit(r)}><i className="bi bi-pencil"></i></button>
        <button className="btn-icon danger" onClick={() => openDel(r.supplierId)}><i className="bi bi-trash"></i></button>
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

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title={editing ? 'Edit Supplier' : 'Add Supplier'} loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Company Name</label>
          <input className="form-control-custom" placeholder="e.g. ABC Distributors" value={form.name} onChange={set('name')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Contact Person</label>
          <input className="form-control-custom" placeholder="e.g. Ravi Kumar" value={form.contact} onChange={set('contact')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Email</label>
          <input className="form-control-custom" type="email" placeholder="supplier@company.com" value={form.email} onChange={set('email')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Address</label>
          <input className="form-control-custom" placeholder="Full address" value={form.address} onChange={set('address')} />
        </div>
      </FormModal>

      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Delete Supplier" message="Are you sure you want to delete this supplier?"
        confirmLabel="Delete" loading={saving} />
    </div>
  )
}