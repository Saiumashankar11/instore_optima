import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import StatusBadge from '../components/shared/StatusBadge'
import { getAllPOs, createPO, updatePO } from '../services/purchaseOrderService'
import { getAllSuppliers } from '../services/supplierService'
import { getAllReplenishments } from '../services/replenishmentService'
import { useAuth } from '../context/AuthContext'

const EMPTY = { replenishmentOrderId: '', supplierId: '', expectedDeliveryDate: '' }

export default function PurchaseOrders() {
  const { canManage } = useAuth()
  const [data, setData]                     = useState([])
  const [suppliers, setSuppliers]           = useState([])
  const [replenishments, setReplenishments] = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [search, setSearch]                 = useState('')
  const [showForm, setShowForm]             = useState(false)
  const [form, setForm]                     = useState(EMPTY)
  const [saving, setSaving]                 = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [po, s, r] = await Promise.all([getAllPOs(), getAllSuppliers(), getAllReplenishments()])
      setData(po.data || [])
      setSuppliers(s.data || [])
      setReplenishments(r.data || [])
    } catch { setError('Failed to load purchase orders.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const getSupplier = id => suppliers.find(s => s.supplierId === id)

  const handleSave = async () => {
    setSaving(true)
    try {
      await createPO({ ...form, supplierId: Number(form.supplierId), replenishmentOrderId: Number(form.replenishmentOrderId) })
      setShowForm(false); setForm(EMPTY); load()
    } catch { alert('Failed to create purchase order.') }
    finally { setSaving(false) }
  }

  const handleStatusUpdate = async (row, status) => {
    try { await updatePO(row.purchaseOrderId, { ...row, status }); load() }
    catch { alert('Status update failed.') }
  }

  const filtered = data.filter(d =>
    getSupplier(d.supplierId)?.name?.toLowerCase().includes(search.toLowerCase()) ||
    String(d.purchaseOrderId).includes(search)
  )

  const columns = [
    { key: 'purchaseOrderId',      label: 'PO ID',    render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.purchaseOrderId}</span> },
    { key: 'replenishmentOrderId', label: 'Replen.',  render: r => <span>#{r.replenishmentOrderId}</span> },
    { key: 'supplierId',           label: 'Supplier', render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{getSupplier(r.supplierId)?.name || `#${r.supplierId}`}</span> },
    { key: 'issuedAt',             label: 'Issued',   render: r => r.issuedAt ? new Date(r.issuedAt).toLocaleDateString('en-IN') : '—' },
    { key: 'expectedDeliveryDate', label: 'Expected', render: r => r.expectedDeliveryDate ? new Date(r.expectedDeliveryDate).toLocaleDateString('en-IN') : '—' },
    { key: 'status',               label: 'Status',   render: r => <StatusBadge status={r.status} /> },
    { key: 'actions', label: 'Actions', render: r => {
      if (!canManage) return <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span>
      return r.status === 'Pending' ? (
        <button className="btn-primary-custom" style={{ padding: '4px 11px', fontSize: 11.5 }}
          onClick={() => handleStatusUpdate(r, 'Delivered')}>
          <i className="bi bi-check-lg"></i> Mark Delivered
        </button>
      ) : <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span>
    }}
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Purchase Orders"
        subtitle="Track purchase orders sent to suppliers"
        action={canManage
          ? <button className="btn-primary-custom" onClick={() => { setForm(EMPTY); setShowForm(true) }}><i className="bi bi-plus-lg"></i> Create PO</button>
          : null
        }
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Purchase Orders <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title="Create Purchase Order" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Replenishment Order</label>
          <select className="form-control-custom" value={form.replenishmentOrderId} onChange={set('replenishmentOrderId')}>
            <option value="">— Select Replenishment Order —</option>
            {replenishments.filter(r => r.status === 'Approved').map(r => (
              <option key={r.replenishmentOrderId} value={r.replenishmentOrderId}>
                #{r.replenishmentOrderId} — Qty: {r.quantityRequested}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Supplier</label>
          <select className="form-control-custom" value={form.supplierId} onChange={set('supplierId')}>
            <option value="">— Select Supplier —</option>
            {suppliers.map(s => <option key={s.supplierId} value={s.supplierId}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Expected Delivery Date</label>
          <input className="form-control-custom" type="date" value={form.expectedDeliveryDate} onChange={set('expectedDeliveryDate')} />
        </div>
      </FormModal>
    </div>
  )
}