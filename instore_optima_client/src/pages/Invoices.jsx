import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import StatusBadge from '../components/shared/StatusBadge'
import StatusFilter from '../components/shared/StatusFilter'
import { getAllInvoices, updateInvoice } from '../services/invoiceService'
import { fmtDate, parseApiError } from '../utils/validators'
import { useAlertBadges } from '../context/AlertBadgesContext'
import { useToast } from '../hooks/useToast'

const INVOICE_STATUSES = ['Draft', 'Issued', 'Paid', 'Overdue']

export default function Invoices() {
  const { fetchBadges } = useAlertBadges()
  const { show: toast, ToastContainer } = useToast()
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try { setData((await getAllInvoices()).data || []) }
    catch { setError('Failed to load invoices.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleStatusUpdate = async (row, status) => {
    try { await updateInvoice(row.invoiceId, { ...row, status }); load(); fetchBadges(); toast('Invoice status updated!', 'success') }
    catch (err) { toast(parseApiError(err), 'error') }
  }

  const isOverdue = row => row.dueDate && new Date(row.dueDate) < new Date() && row.status !== 'Paid'

  const filtered = data
    .map(row => ({ ...row, _rowClass: isOverdue(row) ? 'row-overdue' : '' }))
    .filter(d => d.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || String(d.invoiceId).includes(search))
    .filter(d => !statusFilter || d.status === statusFilter)

  const columns = [
    { key: 'invoiceId',     label: 'ID',          render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.invoiceId}</span> },
    { key: 'invoiceNumber', label: 'Invoice No.', render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r.invoiceNumber || '—'}</span> },
    { key: 'orderId',       label: 'Order',       render: r => r.orderId ? <span>#{r.orderId}</span> : <span>—</span> },
    { key: 'paymentId',     label: 'Payment',     render: r => r.paymentId ? <span>#{r.paymentId}</span> : <span>—</span> },
    { key: 'totalAmount',   label: 'Total',       render: r => <span style={{ fontWeight: 600, color: 'var(--text-200)' }}>₹{Number(r.totalAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'taxAmount',     label: 'Tax',         render: r => <span>₹{Number(r.taxAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'dueDate',       label: 'Due Date',    render: r => (
      <span style={{ color: isOverdue(r) ? '#f87171' : 'inherit', fontWeight: isOverdue(r) ? 600 : 400 }}>
        {fmtDate(r.dueDate)}
        {isOverdue(r) && <span className="badge-custom badge-danger" style={{ marginLeft: 6 }}>Overdue</span>}
      </span>
    )},
    { key: 'status',  label: 'Status',  render: r => <StatusBadge status={r.status} /> },
    { key: 'actions', label: 'Actions', render: r => r.status !== 'Paid' ? (
      <div style={{ display: 'flex', gap: 6 }}>
        {r.status === 'Draft'  && <button className="btn-primary-custom" style={{ padding: '4px 10px', fontSize: 11.5 }} onClick={() => handleStatusUpdate(r, 'Issued')}>Issue</button>}
        {r.status === 'Issued' && <button className="btn-primary-custom" style={{ padding: '4px 10px', fontSize: 11.5, background: '#059669' }} onClick={() => handleStatusUpdate(r, 'Paid')}>Mark Paid</button>}
      </div>
    ) : <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span> }
  ]

  return (
    <div className="animate-in">
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