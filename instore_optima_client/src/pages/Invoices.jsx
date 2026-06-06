// Invoices.jsx
// Lists all invoices in the system. Invoices are auto-created when a payment is recorded.
// Users can advance an invoice through its lifecycle: Draft → Issued → Paid.
// Overdue invoices (past due date and not yet paid) are highlighted in red.

import { useEffect, useState } from 'react'
// Shared UI components
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import StatusBadge from '../components/shared/StatusBadge'
import StatusFilter from '../components/shared/StatusFilter'
// API functions for fetching and updating invoices
import { getAllInvoices, updateInvoice } from '../services/invoiceService'
// Date formatter and API error parser
import { fmtDate, parseApiError } from '../utils/validators'
// fetchBadges refreshes the alert/notification counts in the nav bar after a status change
import { useAlertBadges } from '../context/AlertBadgesContext'
import { useToast } from '../hooks/useToast'

// All possible invoice statuses — used to populate the status filter dropdown
const INVOICE_STATUSES = ['Draft', 'Issued', 'Paid', 'Overdue']

export default function Invoices() {
  // fetchBadges updates the navbar badge count (e.g. overdue invoice count)
  const { fetchBadges } = useAlertBadges()
  const { show: toast, ToastContainer } = useToast()

  // --- Component State ---
  const [data, setData]         = useState([]) // All invoices from the API
  const [loading, setLoading]   = useState(true)  // True while the initial fetch runs
  const [error, setError]       = useState('')     // Error message if the fetch fails
  const [search, setSearch]     = useState('')     // Live search-box text
  const [statusFilter, setStatusFilter] = useState('') // Currently selected status filter (empty = All)

  // Fetches all invoices from the API
  const load = async () => {
    setLoading(true)
    try { setData((await getAllInvoices()).data || []) }
    catch { setError('Failed to load invoices.') }
    finally { setLoading(false) }
  }

  // Fetch once on mount
  useEffect(() => { load() }, [])

  // Updates the invoice status via the API, refreshes the list, and updates nav badges
  const handleStatusUpdate = async (row, status) => {
    try { await updateInvoice(row.invoiceId, { ...row, status }); load(); fetchBadges(); toast('Invoice status updated!', 'success') }
    catch (err) { toast(parseApiError(err), 'error') }
  }

  // Returns true if the invoice's due date has passed and it has not been paid yet
  const isOverdue = row => row.dueDate && new Date(row.dueDate) < new Date() && row.status !== 'Paid'

  // Build the filtered list:
  // 1. Attach a CSS class for overdue rows so the table can highlight them
  // 2. Filter by search text (invoice number or ID)
  // 3. Filter by selected status
  const filtered = data
    .map(row => ({ ...row, _rowClass: isOverdue(row) ? 'row-overdue' : '' }))
    .filter(d => d.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || String(d.invoiceId).includes(search))
    .filter(d => !statusFilter || d.status === statusFilter)

  // --- Table column definitions ---
  const columns = [
    { key: 'invoiceId',     label: 'ID',          render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.invoiceId}</span> },
    { key: 'invoiceNumber', label: 'Invoice No.', render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r.invoiceNumber || '—'}</span> },
    { key: 'orderId',       label: 'Order',       render: r => r.orderId ? <span>#{r.orderId}</span> : <span>—</span> },
    { key: 'paymentId',     label: 'Payment',     render: r => r.paymentId ? <span>#{r.paymentId}</span> : <span>—</span> },
    { key: 'totalAmount',   label: 'Total',       render: r => <span style={{ fontWeight: 600, color: 'var(--text-200)' }}>₹{Number(r.totalAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'taxAmount',     label: 'Tax',         render: r => <span>₹{Number(r.taxAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'dueDate',       label: 'Due Date',    render: r => (
      // Overdue dates are shown in red with an "Overdue" badge
      <span style={{ color: isOverdue(r) ? '#f87171' : 'inherit', fontWeight: isOverdue(r) ? 600 : 400 }}>
        {fmtDate(r.dueDate)}
        {isOverdue(r) && <span className="badge-custom badge-danger" style={{ marginLeft: 6 }}>Overdue</span>}
      </span>
    )},
    { key: 'status',  label: 'Status',  render: r => <StatusBadge status={r.status} /> },
    { key: 'actions', label: 'Actions', render: r => r.status !== 'Paid' ? (
      // Action buttons only appear for invoices that are not yet Paid
      // Draft → Issue button; Issued → Mark Paid button
      <div style={{ display: 'flex', gap: 6 }}>
        {r.status === 'Draft'  && <button className="btn-primary-custom" style={{ padding: '4px 10px', fontSize: 11.5 }} onClick={() => handleStatusUpdate(r, 'Issued')}>Issue</button>}
        {r.status === 'Issued' && <button className="btn-primary-custom" style={{ padding: '4px 10px', fontSize: 11.5, background: '#059669' }} onClick={() => handleStatusUpdate(r, 'Paid')}>Mark Paid</button>}
      </div>
    ) : <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span> }
  ]

  // --- Render ---
  return (
    <div className="animate-in">
      {/* Subtitle explains that invoices are auto-created, not manually entered */}
      <PageHeader
        title="Invoices"
        subtitle="Invoices are automatically generated when a payment is recorded"
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Invoices <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            {/* Status filter dropdown (Draft / Issued / Paid / Overdue) */}
            <StatusFilter value={statusFilter} onChange={setStatusFilter} options={INVOICE_STATUSES} />
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice number..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>
      {ToastContainer}
    </div>
  )
}