import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import StatusBadge from '../components/shared/StatusBadge'
import { getAllReplenishments, createReplenishment, updateReplenishment, deleteReplenishment } from '../services/replenishmentService'
import { getAllProducts } from '../services/productsService'
import { getAllSuppliers } from '../services/supplierService'
import { createPO } from '../services/purchaseOrderService'
import { useAuth } from '../context/AuthContext'
import { useAlertBadges } from '../context/AlertBadgesContext'
import { useUndoDelete } from '../hooks/useUndoDelete'
import { useToast } from '../hooks/useToast'
import { parseApiError } from '../utils/validators'
import { fmtDate } from '../utils/validators'

const EMPTY = { productId: '', quantityRequested: '' }
const EMPTY_PO = { supplierId: '', expectedDeliveryDate: '' }

export default function Replenishment() {
  const { user, canManage } = useAuth()
  const { fetchBadges } = useAlertBadges()
  const { scheduleDelete, UndoToast } = useUndoDelete()
  const { show: toast, ToastContainer } = useToast()
  const [data, setData]               = useState([])
  const [products, setProducts]       = useState([])
  const [suppliers, setSuppliers]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [search, setSearch]           = useState('')
  const [showForm, setShowForm]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [form, setForm]               = useState(EMPTY)
  const [saving, setSaving]           = useState(false)
  const [formErrors, setFormErrors]   = useState({})

  // PO creation popup state
  const [showPoPrompt, setShowPoPrompt]   = useState(false)
  const [showPoForm, setShowPoForm]       = useState(false)
  const [pendingReplId, setPendingReplId] = useState(null)
  const [poForm, setPoForm]               = useState(EMPTY_PO)
  const [poFormErrors, setPoFormErrors]   = useState({})
  const [poSaving, setPoSaving]           = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [r, p, s] = await Promise.all([getAllReplenishments(), getAllProducts(), getAllSuppliers()])
      setData(r.data || [])
      setProducts(p.data || [])
      setSuppliers(s.data || [])
    } catch { setError('Failed to load replenishments.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    const errors = {}
    if (!form.productId) errors.productId = 'Please select a product.'
    if (!form.quantityRequested || Number(form.quantityRequested) < 1) errors.quantityRequested = 'Quantity must be at least 1.'
    setFormErrors(errors)
    if (Object.keys(errors).length) { toast(Object.values(errors)[0], 'warning'); return }
    setSaving(true)
    try {
      await createReplenishment({ ...form, productId: Number(form.productId), quantityRequested: Number(form.quantityRequested) })
      setShowForm(false); setForm(EMPTY); load()
      toast('Replenishment order created!', 'success')
    } catch (err) { toast(parseApiError(err)) }
    finally { setSaving(false) }
  }

  const handlePoYes = () => {
    setShowPoPrompt(false)
    setShowPoForm(true)
  }

  const handlePoNo = () => {
    setShowPoPrompt(false)
    setPendingReplId(null)
  }

  const handlePoSave = async () => {
    const errors = {}
    if (!poForm.supplierId) errors.supplierId = 'Please select a supplier.'
    if (!poForm.expectedDeliveryDate) errors.expectedDeliveryDate = 'Please set an expected delivery date.'
    else if (poForm.expectedDeliveryDate < new Date().toLocaleDateString('en-CA')) errors.expectedDeliveryDate = 'Delivery date must be today or in the future.'
    setPoFormErrors(errors)
    if (Object.keys(errors).length) { toast(Object.values(errors)[0], 'warning'); return }
    setPoSaving(true)
    try {
      await createPO({
        replenishmentOrderId: pendingReplId,
        supplierId: Number(poForm.supplierId),
        issuedAt: new Date().toISOString(),
        expectedDeliveryDate: new Date(poForm.expectedDeliveryDate).toISOString()
      })
      setShowPoForm(false)
      setPendingReplId(null)
      setPoForm(EMPTY_PO)
      fetchBadges()
      toast('Purchase Order created successfully!', 'success')
    } catch (err) { toast(parseApiError(err), 'error') }
    finally { setPoSaving(false) }
  }

  const triggerAction = (row, action) => { setConfirmAction({ row, action }); setShowConfirm(true) }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      if (confirmAction.action === 'Delete') {
        const row = confirmAction.row
        const prod = products.find(p => p.productId === row.productId)
        setShowConfirm(false)
        setData(prev => prev.filter(d => d.replenishmentOrderId !== row.replenishmentOrderId))
        scheduleDelete({
          id: row.replenishmentOrderId,
          label: `Replenishment #${row.replenishmentOrderId} (${prod?.name || 'Product'})`,
          deleteFn: () => deleteReplenishment(row.replenishmentOrderId),
          onUndo: () => load(),
          onError: (err) => { toast(parseApiError(err), 'error'); load() },
        })
        setSaving(false)
        return
      } else {
        await updateReplenishment(confirmAction.row.replenishmentOrderId, {
          ...confirmAction.row, status: confirmAction.action, approvedBy: user?.userId
        })
      }
      setShowConfirm(false); load(); fetchBadges()
      toast('Action completed!', 'success')
      // Show PO prompt only after Approved
      if (confirmAction.action === 'Approved') {
        setPendingReplId(confirmAction.row.replenishmentOrderId)
        setPoForm(EMPTY_PO)
        setPoFormErrors({})
        setShowPoPrompt(true)
      }
    } catch (err) { toast(parseApiError(err)) }
    finally { setSaving(false) }
  }

  const getProduct = id => products.find(p => p.productId === id)

  const filtered = data
    .map(row => ({ ...row, _productName: getProduct(row.productId)?.name || `Product #${row.productId}` }))
    .filter(d =>
      String(d.replenishmentOrderId).includes(search) ||
      d._productName.toLowerCase().includes(search.toLowerCase())
    )

  const columns = [
    { key: 'replenishmentOrderId', label: 'ID',       render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.replenishmentOrderId}</span> },
    { key: '_productName',         label: 'Product',  render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r._productName}</span> },
    { key: 'quantityRequested',    label: 'Qty',      render: r => <span style={{ fontWeight: 700, color: 'var(--text-200)' }}>{r.quantityRequested}</span> },
    { key: 'status',               label: 'Status',   render: r => <StatusBadge status={r.status} /> },
    { key: 'generatedAt',          label: 'Generated',render: r => fmtDate(r.generatedAt) },
    { key: 'actions', label: 'Actions', render: r => {
      if (!canManage) return <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span>
      if (r.status === 'Pending') return (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-primary-custom" style={{ padding: '4px 11px', fontSize: 11.5, background: '#059669' }} onClick={() => triggerAction(r, 'Approved')}>
            <i className="bi bi-check-lg"></i> Approve
          </button>
          <button className="btn-primary-custom" style={{ padding: '4px 11px', fontSize: 11.5, background: '#dc2626' }} onClick={() => triggerAction(r, 'Rejected')}>
            <i className="bi bi-x-lg"></i> Reject
          </button>
          <button className="btn-icon danger" title="Delete" onClick={() => triggerAction(r, 'Delete')}>
            <i className="bi bi-trash"></i>
          </button>
        </div>
      )
      if (r.status === 'Rejected') return (
        <button className="btn-icon danger" title="Delete" onClick={() => triggerAction(r, 'Delete')}>
          <i className="bi bi-trash"></i>
        </button>
      )
      return <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span>
    }}
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Replenishment"
        subtitle="Manage stock replenishment orders"
        action={canManage
          ? <button className="btn-primary-custom" onClick={() => { setForm(EMPTY); setShowForm(true) }}><i className="bi bi-plus-lg"></i> New Order</button>
          : null
        }
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
          <select className={`form-control-custom${formErrors.productId ? ' input-error' : ''}`} value={form.productId} onChange={e => { set('productId')(e); setFormErrors(f => ({ ...f, productId: undefined })) }}>
            <option value="">— Select Product —</option>
            {products.map(p => <option key={p.productId} value={p.productId}>{p.name}</option>)}
          </select>
          {formErrors.productId && <span className="field-error-text">{formErrors.productId}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Quantity Requested</label>
          <input className={`form-control-custom${formErrors.quantityRequested ? ' input-error' : ''}`} type="number" placeholder="0" value={form.quantityRequested} onChange={e => { set('quantityRequested')(e); setFormErrors(f => ({ ...f, quantityRequested: undefined })) }} />
          {formErrors.quantityRequested && <span className="field-error-text">{formErrors.quantityRequested}</span>}
        </div>
      </FormModal>

      <ConfirmModal show={showConfirm} onHide={() => setShowConfirm(false)} onConfirm={handleConfirm}
        title={
          confirmAction?.action === 'Delete'   ? 'Delete Replenishment Order' :
          confirmAction?.action === 'Approved' ? 'Approve Replenishment' :
          confirmAction?.action === 'Rejected' ? 'Reject Replenishment' :
          `${confirmAction?.action} Replenishment`
        }
        message={confirmAction?.action === 'Delete'
          ? 'Are you sure you want to permanently delete this replenishment order?'
          : `Are you sure you want to ${confirmAction?.action === 'Approved' ? 'approve' : 'reject'} this order?`}
        confirmLabel={confirmAction?.action === 'Approved' ? 'Approve' : confirmAction?.action === 'Rejected' ? 'Reject' : confirmAction?.action}
        variant={confirmAction?.action === 'Rejected' || confirmAction?.action === 'Delete' ? 'danger' : 'success'}
        loading={saving} />

      {/* PO Prompt Popup */}
      <ConfirmModal
        show={showPoPrompt}
        onHide={handlePoNo}
        onConfirm={handlePoYes}
        title="Create Purchase Order?"
        message={`Replenishment #${pendingReplId} created. Would you like to automatically create a Purchase Order for this replenishment now?`}
        confirmLabel="Yes, Create PO"
        variant="primary"
      />

      {/* PO Form Modal */}
      <FormModal show={showPoForm} onHide={() => { setShowPoForm(false); setPendingReplId(null) }} onSubmit={handlePoSave}
        title="Create Purchase Order" loading={poSaving}>
        <p style={{ color: 'var(--text-400)', fontSize: 13, marginBottom: 16 }}>
          <i className="bi bi-info-circle" style={{ marginRight: 6 }}></i>
          The supplier and expected delivery date will be linked to replenishment <strong>#{pendingReplId}</strong>.
        </p>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Supplier *</label>
          <select className={`form-control-custom${poFormErrors.supplierId ? ' input-error' : ''}`}
            value={poForm.supplierId}
            onChange={e => { setPoForm(f => ({ ...f, supplierId: e.target.value })); setPoFormErrors(fe => ({ ...fe, supplierId: undefined })) }}>
            <option value="">— Select Supplier —</option>
            {suppliers.map(s => <option key={s.supplierId} value={s.supplierId}>{s.name}</option>)}
          </select>
          {poFormErrors.supplierId && <span className="field-error-text">{poFormErrors.supplierId}</span>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Expected Delivery Date *</label>
          <input className={`form-control-custom${poFormErrors.expectedDeliveryDate ? ' input-error' : ''}`}
            type="date"
            min={new Date().toLocaleDateString('en-CA')}
            value={poForm.expectedDeliveryDate}
            onChange={e => { setPoForm(f => ({ ...f, expectedDeliveryDate: e.target.value })); setPoFormErrors(fe => ({ ...fe, expectedDeliveryDate: undefined })) }} />
          {poFormErrors.expectedDeliveryDate && <span className="field-error-text">{poFormErrors.expectedDeliveryDate}</span>}
        </div>
      </FormModal>

      {UndoToast}
      {ToastContainer}
    </div>
  )
}