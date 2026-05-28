import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import { getAllReceipts } from '../services/receiptService'
import { fmtDate, fmtDateTime } from '../utils/validators'

const EMPTY = { paymentId: '', receiptNumber: '', amountPaid: '' }

export default function Receipts() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [r] = await Promise.all([getAllReceipts()])
      setData(r.data || [])
    } catch { setError('Failed to load receipts.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handlePrint = row => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Receipt #${row.receiptId}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #fff; color: #111; padding: 48px; max-width: 440px; margin: auto; }
        .header { margin-bottom: 28px; }
        .brand { font-size: 15px; font-weight: 700; color: #0891b2; letter-spacing: -.02em; }
        .title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin-top: 4px; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
        .row .lbl { color: #94a3b8; font-weight: 500; }
        .row .val { font-weight: 600; color: #111; }
        .amount { font-size: 20px; color: #0891b2; }
        .footer { margin-top: 28px; font-size: 11px; color: #cbd5e1; text-align: center; }
      </style></head>
      <body>
        <div class="header">
          <div class="brand">InStore Optima</div>
          <div class="title">Payment Receipt</div>
        </div>
        <hr/>
        <div class="row"><span class="lbl">Receipt No.</span><span class="val">${row.receiptNumber || '—'}</span></div>
        <div class="row"><span class="lbl">Payment ID</span><span class="val">${row.paymentId ? '#' + row.paymentId : '—'}</span></div>
        <div class="row"><span class="lbl">Amount Paid</span><span class="val amount">₹${Number(row.amountPaid || 0).toLocaleString('en-IN')}</span></div>
        <div class="row"><span class="lbl">Payment Date</span><span class="val">${row.paymentDate ? new Date(row.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</span></div>
        <div class="row"><span class="lbl">Generated</span><span class="val">${row.generatedAt ? new Date(row.generatedAt).toLocaleString('en-IN') : '—'}</span></div>
        <div class="footer">Thank you for your business · InStore Optima</div>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  const filtered = data.filter(d =>
    d.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
    String(d.receiptId).includes(search)
  )

  const columns = [
    { key: 'receiptId',     label: 'ID',           render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.receiptId}</span> },
    { key: 'receiptNumber', label: 'Receipt No.',  render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r.receiptNumber || '—'}</span> },
    { key: 'paymentId',     label: 'Payment',      render: r => <span>#{r.paymentId}</span> },
    { key: 'amountPaid',    label: 'Amount Paid',  render: r => <span style={{ fontWeight: 600, color: 'var(--text-200)' }}>₹{Number(r.amountPaid || 0).toLocaleString('en-IN')}</span> },
    { key: 'paymentDate',   label: 'Payment Date', render: r => fmtDate(r.paymentDate) },
    { key: 'generatedAt',   label: 'Generated',    render: r => fmtDateTime(r.generatedAt) },
    { key: 'actions',       label: 'Actions',      render: r => (
      <button className="btn-icon" onClick={() => handlePrint(r)} title="Print Receipt">
        <i className="bi bi-printer"></i>
      </button>
    )}
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Receipts"
        subtitle="Receipts are automatically generated when a payment is marked as Completed"
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Receipts <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipt number..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>
    </div>
  )
}