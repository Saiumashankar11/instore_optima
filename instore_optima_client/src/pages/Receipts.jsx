// Receipts.jsx
// Read-only list of all payment receipts.
// Receipts are created automatically by the backend when a payment is marked as Completed.
// Each receipt can be printed directly from this page via a browser print dialog.

import { useEffect, useState } from 'react'
// Shared UI components
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
// API function for fetching all receipts
import { getAllReceipts } from '../services/receiptService'
// Date/datetime formatting helpers
import { fmtDate, fmtDateTime } from '../utils/validators'

// Kept as a reference for the shape of a receipt object (not actively used in this page)
const EMPTY = { paymentId: '', receiptNumber: '', amountPaid: '' }

export default function Receipts() {
  // --- Component State ---
  const [data, setData]         = useState([]) // All receipt records from the API
  const [loading, setLoading]   = useState(true) // True while the fetch is running
  const [error, setError]       = useState('')    // Error message if the fetch fails
  const [search, setSearch]     = useState('')    // Current search-box text

  // Loads all receipts from the API
  const load = async () => {
    setLoading(true)
    try {
      // Wrapped in Promise.all for consistency; easily extended if more endpoints are needed
      const [r] = await Promise.all([getAllReceipts()])
      setData(r.data || [])
    } catch { setError('Failed to load receipts.') }
    finally { setLoading(false) }
  }

  // Fetch data once when the component mounts
  useEffect(() => { load() }, [])

  // --- Print handler ---
  // Opens a new browser tab, writes a minimal styled HTML receipt into it, and triggers print.
  // No server round-trip is needed — all the data is already in the `row` object.
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

  // Filter receipts by receipt number or ID as the user types in the search box
  const filtered = data.filter(d =>
    d.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
    String(d.receiptId).includes(search)
  )

  // --- Table column definitions ---
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

  // --- Render ---
  return (
    <div className="animate-in">
      {/* Subtitle reminds users that receipts are auto-generated, not created manually */}
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