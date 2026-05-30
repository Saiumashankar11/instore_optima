import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import StatusBadge from '../components/shared/StatusBadge'
import { getAllPOs, createPO, updatePO, deletePO } from '../services/purchaseOrderService'
import { getAllSuppliers } from '../services/supplierService'
import { getAllReplenishments } from '../services/replenishmentService'
import { useAuth } from '../context/AuthContext'
import { useAlertBadges } from '../context/AlertBadgesContext'
import { useToast } from '../hooks/useToast'
import { useUndoDelete } from '../hooks/useUndoDelete'
import { parseApiError } from '../utils/validators'
import { fmtDate } from '../utils/validators'

const EMPTY = { replenishmentOrderId: '', supplierId: '', expectedDeliveryDate: '' }

export default function PurchaseOrders() {
  const { canManage, isAdmin } = useAuth()
  const { fetchBadges } = useAlertBadges()
  const { show: toast, ToastContainer } = useToast()
  const { scheduleDelete, UndoToast } = useUndoDelete()
  const [data, setData]                     = useState([])
  const [suppliers, setSuppliers]           = useState([])
  const [replenishments, setReplenishments] = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [search, setSearch]                 = useState('')
  const [showForm, setShowForm]             = useState(false)
  const [form, setForm]                     = useState(EMPTY)
  const [saving, setSaving]                 = useState(false)
  const [formErrors, setFormErrors]         = useState({})
  const [showDel, setShowDel]               = useState(false)
  const [delId, setDelId]                   = useState(null)

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
  const getReplen   = id => replenishments.find(r => r.replenishmentOrderId === id)

  const handleSave = async () => {
    const errors = {}
    if (!form.replenishmentOrderId) errors.replenishmentOrderId = 'Please select a replenishment order.'
    if (!form.supplierId) errors.supplierId = 'Please select a supplier.'
    if (!form.expectedDeliveryDate) {
      errors.expectedDeliveryDate = 'Expected delivery date is required.'
    } else {
      const todayStr = new Date().toLocaleDateString('en-CA')
      if (form.expectedDeliveryDate < todayStr) errors.expectedDeliveryDate = 'Delivery date must be today or in the future.'
    }
    setFormErrors(errors)
    if (Object.keys(errors).length) { toast(Object.values(errors)[0], 'warning'); return }
    setSaving(true)
    try {
      await createPO({ ...form, supplierId: Number(form.supplierId), replenishmentOrderId: Number(form.replenishmentOrderId) })
      setShowForm(false); setForm(EMPTY); load()
      toast('Purchase order created!', 'success')
    } catch (err) { toast(parseApiError(err)) }
    finally { setSaving(false) }
  }

  const handleStatusUpdate = async (row, status) => {
    try { await updatePO(row.purchaseOrderId, { ...row, status }); load(); fetchBadges(); toast('Status updated!', 'success') }
    catch (err) { toast(parseApiError(err)) }
  }

  const handleDelete = () => {
    const row = data.find(d => d.purchaseOrderId === delId)
    setShowDel(false)
    setData(prev => prev.filter(d => d.purchaseOrderId !== delId))
    scheduleDelete({
      id: delId,
      label: `Purchase Order #${delId}`,
      deleteFn: () => deletePO(delId),
      onUndo: () => load(),
      onError: (err) => { toast(parseApiError(err), 'error'); load() },
    })
  }

  const printGrn = (po, supplier, replen) => {
    const win = window.open('', '_blank', 'width=680,height=800')
    win.document.write(`<!DOCTYPE html><html><head><title>GRN ${po.grnNumber || ''}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 32px 40px; color: #0f172a; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0891b2; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 11px; font-weight: 700; letter-spacing: .08em; color: #64748b; text-transform: uppercase; }
  .title { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
  .grn-num { font-size: 20px; font-weight: 800; color: #0891b2; text-align: right; }
  .grn-date { font-size: 12px; color: #64748b; text-align: right; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 28px; margin-bottom: 24px; }
  .grid-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
  .grid-val { font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
  th { background: #f1f5f9; padding: 9px 12px; text-align: left; font-weight: 700; color: #475569; }
  th:last-child { text-align: right; }
  td { padding: 11px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; }
  td:last-child { text-align: right; font-weight: 700; color: #0891b2; }
  .stamp { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px 16px; color: #15803d; font-weight: 600; font-size: 13px; }
  .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px; }
</style></head><body>
  <div class="header">
    <div><div class="brand">InStore Optima</div><div class="title">Goods Received Note</div></div>
    <div><div class="grn-num">${po.grnNumber || '—'}</div>
    <div class="grn-date">${po.deliveredAt ? new Date(po.deliveredAt).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}) : '—'}</div></div>
  </div>
  <div class="grid">
    <div><div class="grid-label">PO Number</div><div class="grid-val">#${po.purchaseOrderId}</div></div>
    <div><div class="grid-label">Replenishment Order</div><div class="grid-val">#${po.replenishmentOrderId}</div></div>
    <div><div class="grid-label">Supplier</div><div class="grid-val">${supplier?.name || '#' + po.supplierId}</div></div>
    <div><div class="grid-label">Contact</div><div class="grid-val">${supplier?.contactEmail || '—'}</div></div>
    <div><div class="grid-label">Issued Date</div><div class="grid-val">${po.issuedAt ? new Date(po.issuedAt).toLocaleDateString('en-IN') : '—'}</div></div>
    <div><div class="grid-label">Delivered Date</div><div class="grid-val">${po.deliveredAt ? new Date(po.deliveredAt).toLocaleDateString('en-IN') : '—'}</div></div>
  </div>
  <table>
    <thead><tr><th>Item</th><th>Qty Received</th></tr></thead>
    <tbody><tr><td>Product #${replen?.productId || '—'}</td><td>${replen?.quantityRequested ?? '—'} units</td></tr></tbody>
  </table>
  <div class="stamp">✓ Goods received and stock updated successfully</div>
  <div class="footer">Generated by InStore Optima · ${new Date().toLocaleString('en-IN')}</div>
</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  const filtered = data.filter(d =>
    getSupplier(d.supplierId)?.name?.toLowerCase().includes(search.toLowerCase()) ||
    String(d.purchaseOrderId).includes(search)
  )

  const columns = [
    { key: 'purchaseOrderId',      label: 'PO ID',    render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.purchaseOrderId}</span> },
    { key: 'replenishmentOrderId', label: 'Replen.',  render: r => <span>#{r.replenishmentOrderId}</span> },
    { key: 'supplierId',           label: 'Supplier', render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{getSupplier(r.supplierId)?.name || `#${r.supplierId}`}</span> },
    { key: 'issuedAt',             label: 'Issued',   render: r => fmtDate(r.issuedAt) },
    { key: 'expectedDeliveryDate', label: 'Expected', render: r => fmtDate(r.expectedDeliveryDate) },
    { key: 'grnNumber',            label: 'GRN',      render: r => r.grnNumber
        ? <span style={{ fontWeight: 600, color: 'var(--cyan)', fontSize: 12 }}>{r.grnNumber}</span>
        : <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span> },
    { key: 'deliveredAt',          label: 'Delivered', render: r => fmtDate(r.deliveredAt) },
    { key: 'status',               label: 'Status',   render: r => <StatusBadge status={r.status} /> },
    { key: 'actions', label: 'Actions', render: r => {
      if (r.status === 'Delivered') return (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'#4ade80', fontWeight:600 }}>
            <i className="bi bi-check-circle-fill" style={{ marginRight:4 }}></i>Goods received
          </span>
          <button className="btn-icon" title="Print GRN" onClick={() => printGrn(r, getSupplier(r.supplierId), getReplen(r.replenishmentOrderId))}>
            <i className="bi bi-printer"></i>
          </button>
        </div>
      )
      return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {canManage && r.status === 'Pending' && (
            <button className="btn-primary-custom" style={{ padding: '4px 11px', fontSize: 11.5 }}
              onClick={() => handleStatusUpdate(r, 'Delivered')}>
              <i className="bi bi-check-lg"></i> Mark Delivered
            </button>
          )}
          {isAdmin && r.status !== 'Delivered' && (
            <button className="btn-icon danger" title="Delete PO" onClick={() => { setDelId(r.purchaseOrderId); setShowDel(true) }}>
              <i className="bi bi-trash"></i>
            </button>
          )}
          {!canManage && !isAdmin && <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span>}
        </div>
      )
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
          <select className={`form-control-custom${formErrors.replenishmentOrderId ? ' input-error' : ''}`} value={form.replenishmentOrderId} onChange={e => { set('replenishmentOrderId')(e); setFormErrors(f => ({ ...f, replenishmentOrderId: undefined })) }}>
            <option value="">— Select Replenishment Order —</option>
            {replenishments
              .filter(r => r.status === 'Approved' && !data.some(po => po.replenishmentOrderId === r.replenishmentOrderId))
              .map(r => (
              <option key={r.replenishmentOrderId} value={r.replenishmentOrderId}>
                #{r.replenishmentOrderId} — Qty: {r.quantityRequested}
              </option>
            ))}
          </select>
          {formErrors.replenishmentOrderId && <span className="field-error-text">{formErrors.replenishmentOrderId}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Supplier</label>
          <select className={`form-control-custom${formErrors.supplierId ? ' input-error' : ''}`} value={form.supplierId} onChange={e => { set('supplierId')(e); setFormErrors(f => ({ ...f, supplierId: undefined })) }}>
            <option value="">— Select Supplier —</option>
            {suppliers.map(s => <option key={s.supplierId} value={s.supplierId}>{s.name}</option>)}
          </select>
          {formErrors.supplierId && <span className="field-error-text">{formErrors.supplierId}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Expected Delivery Date</label>
          <input className={`form-control-custom${formErrors.expectedDeliveryDate ? ' input-error' : ''}`} type="date"
            min={new Date().toLocaleDateString('en-CA')}
            value={form.expectedDeliveryDate} onChange={e => { set('expectedDeliveryDate')(e); setFormErrors(f => ({ ...f, expectedDeliveryDate: undefined })) }} />
          {formErrors.expectedDeliveryDate && <span className="field-error-text">{formErrors.expectedDeliveryDate}</span>}
        </div>
      </FormModal>

      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Delete Purchase Order"
        message="⚠️ This purchase order will be permanently deleted. Only Pending or Cancelled POs can be deleted. Delivered POs are permanent records."
        confirmLabel="Delete Anyway" loading={saving} />
      {UndoToast}
      {ToastContainer}
    </div>
  )
}