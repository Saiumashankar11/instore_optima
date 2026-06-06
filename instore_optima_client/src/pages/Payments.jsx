// =============================================================================
// Payments.jsx
// =============================================================================
// Tracks payment transactions for customer orders.
//
// Workflow:
//   1. A user records a payment by selecting an unpaid order and a payment method.
//   2. The payment starts as "Pending" and an invoice is auto-generated on the server.
//   3. Clicking "Mark Paid" advances the status to "Completed" and triggers a
//      receipt to be created on the server.
//
// Special behavior:
//   - When navigating here via "Proceed to Payment" on the Orders page, the
//     location.state carries the orderId so the modal opens pre-filled.
//
// Role rules:
//   - All authenticated users can record and view payments.
//   - Only Admins can delete a payment (which also removes the linked invoice
//     and receipt).
// =============================================================================

// React hooks.
import { useEffect, useState } from 'react'
// useLocation reads navigation state passed by other pages; useNavigate is used
// to clear that state after consuming it.
import { useLocation, useNavigate } from 'react-router-dom'
// Shared UI components.
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import StatusFilter from '../components/shared/StatusFilter'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import StatusBadge from '../components/shared/StatusBadge'
// API service calls for payments and orders.
import { getAllPayments, createPayment, updatePayment, deletePayment } from '../services/paymentService'
import { getAllOrders } from '../services/ordersService'
// Context and custom hooks.
import { useAuth } from '../context/AuthContext'
import { useAlertBadges } from '../context/AlertBadgesContext'
import { useUndoDelete } from '../hooks/useUndoDelete'
import { useToast } from '../hooks/useToast'
// Validation and error utilities; fmtDate formats ISO dates for display.
import { validateField, parseApiError } from '../utils/validators'
import { fmtDate } from '../utils/validators'

// Default blank form state — reset to this after closing the modal.
const EMPTY = { orderId: '', paymentMethod: 'Card' }
// The set of valid payment status values, used to populate the StatusFilter dropdown.
const PAYMENT_STATUSES = ['Pending', 'Completed', 'Failed', 'Refunded']

export default function Payments() {
  // isAdmin gates the delete button so only admins can remove payments.
  const { isAdmin } = useAuth()
  // fetchBadges refreshes sidebar notification counts after status changes
  // (e.g. a pending payment count badge).
  const { fetchBadges } = useAlertBadges()
  const { scheduleDelete, UndoToast } = useUndoDelete()
  const { show: toast, ToastContainer } = useToast()
  // location.state may carry an orderId when navigating from the Orders page.
  const location = useLocation()
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────────────────────
  const [formErrors, setFormErrors] = useState({})          // per-field validation messages
  const [data, setData]         = useState([])              // all payments from the API
  const [orders, setOrders]     = useState([])              // all orders (used in the order dropdown)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')              // free-text search input
  const [statusFilter, setStatusFilter] = useState('')      // status dropdown filter ('' = all)
  const [showForm, setShowForm] = useState(false)           // controls Record-Payment modal
  const [form, setForm]         = useState(EMPTY)           // controlled form values
  const [saving, setSaving]     = useState(false)           // true while API call is in flight
  const [showDel, setShowDel]   = useState(false)           // controls delete-confirm modal
  const [delId, setDelId]       = useState(null)            // payment ID queued for deletion

  // ── Data fetching ──────────────────────────────────────────────────────────
  // Fetches payments and orders in parallel. The orders list is needed so the
  // "Record Payment" modal can show a dropdown of eligible unpaid orders.
  const load = async () => {
    setLoading(true)
    try {
      const [p, o] = await Promise.all([getAllPayments(), getAllOrders()])
      setData(p.data || [])
      setOrders(o.data || [])
    } catch { setError('Failed to load payments.') }
    finally { setLoading(false) }
  }

  // Fetch on mount only.
  useEffect(() => { load() }, [])

  // ── Deep-link from Orders page ─────────────────────────────────────────────
  // "Proceed to payment" from the Orders page: auto-open the form pre-filled.
  // After reading the state we immediately replace the history entry with an
  // empty state so that a page refresh or pressing Back doesn't re-open the modal.
  useEffect(() => {
    const orderId = location.state?.openPaymentForOrder
    if (orderId) {
      setForm({ orderId: String(orderId), paymentMethod: 'Card' })
      setShowForm(true)
      // Clear the navigation state so a refresh / back doesn't re-open the form
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state])

  // Generic form field updater.
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Handlers ───────────────────────────────────────────────────────────────
  // Validates the order selection, then submits the payment. The orderId from
  // the <select> is a string, so it's cast to Number before sending to the API.
  // paymentStatus is always 'Pending' on creation — the server advances it.
  const handleSave = async () => {
    const err = validateField('orderId', form.orderId)
    if (err) { setFormErrors({ orderId: err }); toast(err, 'error'); return }
    setFormErrors({})
    setSaving(true)
    try {
      await createPayment({ ...form, orderId: Number(form.orderId), paymentStatus: 'Pending' })
      setShowForm(false); setForm(EMPTY); load(); fetchBadges()
      toast('Payment recorded successfully!', 'success')
    } catch (err) { toast(parseApiError(err)) }
    finally { setSaving(false) }
  }

  // Updates the payment status (e.g. Pending → Completed) and refreshes both
  // the table and the sidebar badge counts.
  const handleStatusUpdate = async (row, status) => {
    try { await updatePayment(row.paymentId, { ...row, paymentStatus: status }); load(); fetchBadges(); toast('Payment status updated!', 'success') }
    catch (err) { toast(parseApiError(err)) }
  }

  // Optimistically removes the payment row from local state, then schedules the
  // actual API delete with an undo window. If the user clicks Undo the local
  // state is restored via load(). If an error occurs after the undo window,
  // an error toast is shown and the list is re-fetched.
  const handleDelete = async () => {
    const row = data.find(d => d.paymentId === delId)
    setShowDel(false)
    setData(prev => prev.filter(d => d.paymentId !== delId))
    scheduleDelete({
      id: delId,
      label: `Payment #${delId} (Order #${row?.orderId})`,
      deleteFn: () => deletePayment(delId),
      onUndo: () => load(),
      onError: (err) => { toast(parseApiError(err), 'error'); load() },
    })
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  // First, apply the free-text search across payment ID, order ID, method, and status.
  // Then narrow by the selected status dropdown value.
  const filtered = data
    .filter(d =>
      String(d.paymentId).includes(search) ||
      String(d.orderId).includes(search) ||
      d.paymentMethod?.toLowerCase().includes(search.toLowerCase()) ||
      d.paymentStatus?.toLowerCase().includes(search.toLowerCase())
    )
    .filter(d => !statusFilter || d.paymentStatus === statusFilter)

  // Maps payment method strings to Bootstrap icon names for visual labeling.
  const METHOD_ICON = { Card: 'credit-card', Cash: 'cash-coin', 'Bank Transfer': 'bank', UPI: 'phone' }

  // ── Table column definitions ───────────────────────────────────────────────
  // The 'actions' column shows "Mark Paid" for Pending rows (all roles) and a
  // delete button only for Admins.
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
    { key: 'paymentDate',   label: 'Date',    render: r => fmtDate(r.paymentDate) },
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
            <StatusFilter value={statusFilter} onChange={setStatusFilter} options={PAYMENT_STATUSES} />
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order, method..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title="Record Payment" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Order</label>
          <select className={`form-control-custom${formErrors.orderId ? ' input-error' : ''}`} value={form.orderId} onChange={e => { set('orderId')(e); setFormErrors({}) }}>
            <option value="">— Select Order —</option>
            {/* Only show orders that are not already paid, not Cancelled, and not Completed. */}
            {orders
              .filter(o => o.status !== 'Cancelled' && o.status !== 'Completed' && !data.some(p => p.orderId === o.orderId))
              .map(o => <option key={o.orderId} value={o.orderId}>Order #{o.orderId} — ₹{Number(o.totalAmount || 0).toLocaleString('en-IN')} ({o.status})</option>)}
          </select>
          {formErrors.orderId && <span className="field-error-text">{formErrors.orderId}</span>}
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
        title="Delete Payment"
        message="⚠️ This will permanently delete the payment AND its linked invoice and receipt. This cannot be undone. Delete anyway?"
        confirmLabel="Delete Anyway" variant="danger" loading={saving} />
      {UndoToast}
      {ToastContainer}
    </div>
  )
}