import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import StatusBadge from '../components/shared/StatusBadge'
import { getAllReplenishments, createReplenishment, updateReplenishment } from '../services/replenishmentService'
import { getAllProducts } from '../services/productsService'
import { useAuth } from '../context/AuthContext'

const EMPTY = { productId: '', quantityRequested: '' }

export default function Replenishment() {
  const { user } = useAuth()
  const [data, setData]               = useState([])
  const [products, setProducts]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [search, setSearch]           = useState('')
  const [showForm, setShowForm]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [form, setForm]               = useState(EMPTY)
  const [saving, setSaving]           = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [r, p] = await Promise.all([getAllReplenishments(), getAllProducts()])
      setData(r.data || [])
      setProducts(p.data || [])
    } catch { setError('Failed to load replenishments.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await createReplenishment({ ...form, productId: Number(form.productId), quantityRequested: Number(form.quantityRequested) })
      setShowForm(false); setForm(EMPTY); load()
    } catch { alert('Failed to create replenishment order.') }
    finally { setSaving(false) }
  }

  const triggerAction = (row, action) => { setConfirmAction({ row, action }); setShowConfirm(true) }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await updateReplenishment(confirmAction.row.replenishmentOrderId, {
        ...confirmAction.row, status: confirmAction.action, approvedBy: user?.userId
      })
      setShowConfirm(false); load()
    } catch { alert('Action failed.') }
    finally { setSaving(false) }
  }

  const getProduct = id => products.find(p => p.productId === id)

  const filtered = data
    .map(row => ({ ...row, _productName: getProduct(row.productId)?.name || `Product #${row.productId}` }))
    .filter(d => d._productName.toLowerCase().includes(search.toLowerCase()))

  const columns = [
    { key: 'replenishmentOrderId', label: 'ID',       render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.replenishmentOrderId}</span> },
    { key: '_productName',         label: 'Product',  render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r._productName}</span> },
    { key: 'quantityRequested',    label: 'Qty',      render: r => <span style={{ fontWeight: 700, color: 'var(--text-200)' }}>{r.quantityRequested}</span> },
    { key: 'status',               label: 'Status',   render: r => <StatusBadge status={r.status} /> },
    { key: 'generatedAt',          label: 'Generated',render: r => r.generatedAt ? new Date(r.generatedAt).toLocaleDateString('en-IN') : '—' },
    { key: 'actions',              label: 'Actions',  render: r => r.status === 'Pending' ? (
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-primary-custom" style={{ padding: '4px 11px', fontSize: 11.5, background: '#059669' }} onClick={() => triggerAction(r, 'Approved')}>
          <i className="bi bi-check-lg"></i> Approve
        </button>
        <button className="btn-primary-custom" style={{ padding: '4px 11px', fontSize: 11.5, background: '#dc2626' }} onClick={() => triggerAction(r, 'Rejected')}>
          <i className="bi bi-x-lg"></i> Reject
        </button>
      </div>
    ) : <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span> }
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Replenishment"
        subtitle="Manage stock replenishment orders"
        action={<button className="btn-primary-custom" onClick={() => { setForm(EMPTY); setShowForm(true) }}><i className="bi bi-plus-lg"></i> New Order</button>}
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Replenishment Orders <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title="New Replenishment Order" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Product</label>
          <select className="form-control-custom" value={form.productId} onChange={set('productId')}>
            <option value="">— Select Product —</option>
            {products.map(p => <option key={p.productId} value={p.productId}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Quantity Requested</label>
          <input className="form-control-custom" type="number" placeholder="0" value={form.quantityRequested} onChange={set('quantityRequested')} />
        </div>
      </FormModal>

      <ConfirmModal show={showConfirm} onHide={() => setShowConfirm(false)} onConfirm={handleConfirm}
        title={`${confirmAction?.action} Replenishment`}
        message={`Are you sure you want to ${confirmAction?.action?.toLowerCase()} this order?`}
        confirmLabel={confirmAction?.action}
        variant={confirmAction?.action === 'Rejected' ? 'danger' : 'success'}
        loading={saving} />
    </div>
  )
}