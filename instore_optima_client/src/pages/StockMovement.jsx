import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import StatusBadge from '../components/shared/StatusBadge'
import { getAllMovements, recordMovement, deleteMovement } from '../services/stockMovementService'
import { getAllProducts } from '../services/productsService'
import { useAuth } from '../context/AuthContext'
import { useUndoDelete } from '../hooks/useUndoDelete'

const EMPTY = { productId: '', quantity: '', movementType: 'IN', reason: '' }

export default function StockMovement() {
  const { user, isAdmin } = useAuth()
  const { scheduleDelete, UndoToast } = useUndoDelete()
  const [data, setData]         = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [showDel, setShowDel]   = useState(false)
  const [delId, setDelId]       = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [m, p] = await Promise.all([getAllMovements(), getAllProducts()])
      setData(m.data || [])
      setProducts(p.data || [])
    } catch { setError('Failed to load movements.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await recordMovement({ ...form, productId: Number(form.productId), quantity: Number(form.quantity), performedBy: user?.userId })
      setShowForm(false); setForm(EMPTY); load()
    } catch { alert('Failed to record movement.') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    const row = data.find(d => d.movementId === delId)
    const prod = products.find(p => p.productId === row?.productId)
    setShowDel(false)
    setData(prev => prev.filter(d => d.movementId !== delId))
    scheduleDelete({
      id: delId,
      label: `Movement #${delId} (${prod?.name || 'Product'})`,
      deleteFn: () => deleteMovement(delId),
      onDeleted: () => load(),
      onUndo: () => load(),
    })
  }

  const getProduct = id => products.find(p => p.productId === id)

  const enriched = data.map(row => ({
    ...row, _productName: getProduct(row.productId)?.name || `Product #${row.productId}`
  }))

  const filtered = enriched
    .filter(d => filter === 'All' || d.movementType === filter)
    .filter(d => d._productName.toLowerCase().includes(search.toLowerCase()))

  const columns = [
    { key: 'movementId',   label: 'ID',      render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.movementId}</span> },
    { key: '_productName', label: 'Product', render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r._productName}</span> },
    { key: 'quantity',     label: 'Qty',     render: r => <span style={{ fontWeight: 700, color: 'var(--text-200)' }}>{r.quantity}</span> },
    { key: 'movementType', label: 'Type',    render: r => <StatusBadge status={r.movementType} /> },
    { key: 'reason',       label: 'Reason',  render: r => <span style={{ color: 'var(--text-600)' }}>{r.reason || '—'}</span> },
    { key: 'performedAt',  label: 'Date',    render: r => r.performedAt ? new Date(r.performedAt).toLocaleString('en-IN') : '—' },
    { key: 'actions', label: 'Actions', render: r => isAdmin ? (
      <button className="btn-icon danger" title="Delete" onClick={() => { setDelId(r.movementId); setShowDel(true) }}>
        <i className="bi bi-trash"></i>
      </button>
    ) : <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span> },
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Stock Movement"
        subtitle="Track all stock ins, outs and adjustments"
        action={<button className="btn-primary-custom" onClick={() => { setForm(EMPTY); setShowForm(true) }}><i className="bi bi-plus-lg"></i> Record Movement</button>}
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Movements <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <select className="form-control-custom" style={{ width: 140 }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="All">All Types</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
            </select>
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title="Record Stock Movement" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Product</label>
          <select className="form-control-custom" value={form.productId} onChange={set('productId')}>
            <option value="">— Select Product —</option>
            {products.map(p => <option key={p.productId} value={p.productId}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Movement Type</label>
          <select className="form-control-custom" value={form.movementType} onChange={set('movementType')}>
            <option value="IN">IN — Stock received</option>
            <option value="OUT">OUT — Stock removed</option>
            <option value="ADJUSTMENT">ADJUSTMENT — Manual correction</option>
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Quantity</label>
          <input className="form-control-custom" type="number" placeholder="0" value={form.quantity} onChange={set('quantity')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Reason</label>
          <input className="form-control-custom" placeholder="e.g. Supplier delivery..." value={form.reason} onChange={set('reason')} />
        </div>
      </FormModal>

      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Delete Movement" message="Are you sure you want to delete this stock movement record?" confirmLabel="Delete" loading={saving} />
      {UndoToast}
    </div>
  )
}