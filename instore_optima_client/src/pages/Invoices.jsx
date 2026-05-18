import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import StatusBadge from '../components/shared/StatusBadge'
import { getAllInvoices, createInvoice, updateInvoice } from '../services/invoiceService'

const EMPTY = { invoiceNumber: '', totalAmount: '', taxAmount: '', dueDate: '', status: 'Draft' }

export default function Invoices() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try { setData((await getAllInvoices()).data || []) }
    catch { setError('Failed to load invoices.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await createInvoice({ ...form, totalAmount: Number(form.totalAmount), taxAmount: Number(form.taxAmount) })
      setShowForm(false); setForm(EMPTY); load()
    } catch { alert('Failed to create invoice.') }
    finally { setSaving(false) }
  }

  const handleStatusUpdate = async (row, status) => {
    try { await updateInvoice(row.invoiceId, { ...row, status }); load() }
    catch { alert('Update failed.') }
  }

  const isOverdue = row => row.dueDate && new Date(row.dueDate) < new Date() && row.status !== 'Paid'

  const filtered = data
    .map(row => ({ ...row, _rowClass: isOverdue(row) ? 'row-overdue' : '' }))
    .filter(d => d.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || String(d.invoiceId).includes(search))

  const columns = [
    { key: 'invoiceId',     label: 'ID',          render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.invoiceId}</span> },
    { key: 'invoiceNumber', label: 'Invoice No.', render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r.invoiceNumber || '—'}</span> },
    { key: 'orderId',       label: 'Order',       render: r => r.orderId ? <span>#{r.orderId}</span> : <span>—</span> },
    { key: 'paymentId',     label: 'Payment',     render: r => r.paymentId ? <span>#{r.paymentId}</span> : <span>—</span> },
    { key: 'totalAmount',   label: 'Total',       render: r => <span style={{ fontWeight: 600, color: 'var(--text-200)' }}>₹{Number(r.totalAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'taxAmount',     label: 'Tax',         render: r => <span>₹{Number(r.taxAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'dueDate',       label: 'Due Date',    render: r => (
      <span style={{ color: isOverdue(r) ? '#f87171' : 'inherit', fontWeight: isOverdue(r) ? 600 : 400 }}>
        {r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-IN') : '—'}
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
        subtitle="Manage invoices and payment status"
        action={<button className="btn-primary-custom" onClick={() => { setForm(EMPTY); setShowForm(true) }}><i className="bi bi-plus-lg"></i> Create Invoice</button>}
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Invoices <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice number..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title="Create Invoice" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Invoice Number</label>
          <input className="form-control-custom" placeholder="INV-2026-001" value={form.invoiceNumber} onChange={set('invoiceNumber')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label-custom">Total Amount (₹)</label>
            <input className="form-control-custom" type="number" placeholder="0.00" value={form.totalAmount} onChange={set('totalAmount')} />
          </div>
          <div>
            <label className="form-label-custom">Tax Amount (₹)</label>
            <input className="form-control-custom" type="number" placeholder="0.00" value={form.taxAmount} onChange={set('taxAmount')} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Due Date</label>
          <input className="form-control-custom" type="date" value={form.dueDate} onChange={set('dueDate')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Status</label>
          <select className="form-control-custom" value={form.status} onChange={set('status')}>
            <option>Draft</option><option>Issued</option><option>Paid</option><option>Overdue</option>
          </select>
        </div>
      </FormModal>
    </div>
  )
}