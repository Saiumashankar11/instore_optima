import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import StatusBadge from '../components/shared/StatusBadge'
import { getAllPayments, createPayment, updatePayment, deletePayment } from '../services/paymentService'
import { getAllOrders } from '../services/ordersService'
import { useAuth } from '../context/AuthContext'
import { useUndoDelete } from '../hooks/useUndoDelete'

const EMPTY = { orderId: '', paymentMethod: 'Card' }

export default function Payments() {
  const { isAdmin } = useAuth()
  const { scheduleDelete, UndoToast } = useUndoDelete()
  const [data, setData]         = useState([])
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [showDel, setShowDel]   = useState(false)
  const [delId, setDelId]       = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [p, o] = await Promise.all([getAllPayments(), getAllOrders()])
      setData(p.data || [])
      setOrders(o.data || [])
    } catch { setError('Failed to load payments.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await createPayment({ ...form, orderId: Number(form.orderId), paymentStatus: 'Pending' })
      setShowForm(false); setForm(EMPTY); load()
    } catch (err) { alert(err?.response?.data?.message || 'Failed to record payment.') }
    finally { setSaving(false) }
  }

  const handleStatusUpdate = async (row, status) => {
    try { await updatePayment(row.paymentId, { ...row, paymentStatus: status }); load() }
    catch { alert('Update failed.') }
  }

  const handleDelete = async () => {
    const row = data.find(d => d.paymentId === delId)
    setShowDel(false)
    setData(prev => prev.filter(d => d.paymentId !== delId))
    scheduleDelete({
      id: delId,
      label: `Payment #${delId} (Order #${row?.orderId})`,
      deleteFn: () => deletePayment(delId),
      onDeleted: () => load(),
      onUndo: () => load(),
    })
  }

  const filtered = data.filter(d =>
    String(d.orderId).includes(search) ||
    d.paymentMethod?.toLowerCase().includes(search.toLowerCase()) ||
    d.paymentStatus?.toLowerCase().includes(search.toLowerCase())
  )

  const METHOD_ICON = { Card: 'credit-card', Cash: 'cash-coin', 'Bank Transfer': 'bank', UPI: 'phone' }

  const columns = [
    { key: 'paymentId',     label: 'ID',      render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.paymentId}</span> },
    { key: 'orderId',       label: 'Order',   render: r => <span>#{r.orderId}</span> },
    { key: 'paymentMethod', label: 'Method',  render: r => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <i className={`bi bi-${METHOD_ICON[r.paymentMethod] || 'wallet2'}`}></i>
        {r.paymentMethod}
      </span>
    )},
    { key: 'paymentStatus', label: 'Status',  render: r => <StatusBadge status={r.paymentStatus} /> },
    { key: 'paymentDate',   label: 'Date',    render: r => r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('en-IN') : '—' },
    { key: 'invoiceNumber', label: 'Invoice', render: r => r.invoiceId
        ? <span style={{ fontSize: 11.5, color: 'var(--cyan)', fontWeight: 500 }}>#{r.invoiceId} — {r.invoiceNumber}</span>
        : <span style={{ color: 'var(--text-700)', fontSize: 11 }}>Auto-pending</span> },
    { key: 'actions',       label: 'Actions', render: r => (
      <div style={{ display: 'flex', gap: 6 }}>
        {r.paymentStatus === 'Pending' && (
          <button className="btn-primary-custom" style={{ padding: '4px 11px', fontSize: 11.5 }}
            onClick={() => handleStatusUpdate(r, 'Completed')}>
            <i className="bi bi-check-lg"></i> Mark Paid
          </button>
        )}
        {isAdmin && (
          <button className="btn-icon danger" title="Delete payment + invoice + receipt" onClick={() => { setDelId(r.paymentId); setShowDel(true) }}>
            <i className="bi bi-trash"></i>
          </button>
        )}
      </div>
    ) }
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Payments"
        subtitle="Track and manage payment transactions"
        action={<button className="btn-primary-custom" onClick={() => { setForm(EMPTY); setShowForm(true) }}><i className="bi bi-plus-lg"></i> Record Payment</button>}
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Payments <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order, method..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title="Record Payment" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Order</label>
          <select className="form-control-custom" value={form.orderId} onChange={set('orderId')}>
            <option value="">— Select Order —</option>
            {orders
              .filter(o => !data.some(p => p.orderId === o.orderId))
              .map(o => <option key={o.orderId} value={o.orderId}>Order #{o.orderId} — ₹{Number(o.totalAmount || 0).toLocaleString('en-IN')} ({o.status})</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Payment Method</label>
          <select className="form-control-custom" value={form.paymentMethod} onChange={set('paymentMethod')}>
            <option>Card</option><option>Cash</option><option>Bank Transfer</option><option>UPI</option>
          </select>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-400)', margin: 0 }}>
          <i className="bi bi-info-circle" style={{ marginRight: 5 }}></i>
          Payment starts as <strong>Pending</strong>. An invoice is auto-generated immediately. A receipt is auto-generated when you mark the payment as Completed.
        </p>
      </FormModal>

      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Delete Payment" message="This will permanently delete the payment AND its linked invoice and receipt. This cannot be undone." confirmLabel="Delete" variant="danger" loading={saving} />
      {UndoToast}
    </div>
  )
}