import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../services/productsService'
import { getAllSuppliers } from '../services/supplierService'
import { useUndoDelete } from '../hooks/useUndoDelete'
import { useToast } from '../hooks/useToast'
import { validateField, parseApiError } from '../utils/validators'

const EMPTY = { name: '', description: '', price: '', minStock: '', maxStock: '', supplierId: '' }

export default function Products() {
  const [data, setData]           = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [showDel, setShowDel]     = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [delId, setDelId]         = useState(null)

  const { scheduleDelete, UndoToast } = useUndoDelete()
  const { show: toast, ToastContainer } = useToast()
  const [formErrors, setFormErrors] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([getAllProducts(), getAllSuppliers()])
      setData(p.data || [])
      setSuppliers(s.data || [])
    } catch { setError('Failed to load products.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = row => { setEditing(row); setForm({ ...row }); setShowForm(true) }
  const openDel  = id  => { setDelId(id); setShowDel(true) }

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

  const filtered = data.filter(d =>
    String(d.productId).includes(search) ||
    d.name?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'productId',   label: 'ID',          render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.productId}</span> },
    { key: 'name',        label: 'Name',         render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r.name}</span> },
    { key: 'description', label: 'Description',  render: r => <span style={{ color: 'var(--text-600)' }}>{r.description || '—'}</span> },
    { key: 'price',       label: 'Price',        render: r => <span style={{ fontWeight: 600, color: 'var(--text-200)' }}>₹{Number(r.price || 0).toLocaleString('en-IN')}</span> },
    { key: 'minStock',    label: 'Min Stock' },
    { key: 'maxStock',    label: 'Max Stock' },
    { key: 'supplierId',  label: 'Supplier',     render: r => suppliers.find(s => s.supplierId === r.supplierId)?.name || '—' },
    { key: 'actions',     label: 'Actions',      render: r => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon" onClick={() => openEdit(r)}><i className="bi bi-pencil"></i></button>
        <button className="btn-icon danger" onClick={() => openDel(r.productId)}><i className="bi bi-trash"></i></button>
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