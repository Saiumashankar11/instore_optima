import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import { getAllReceipts, createReceipt } from '../services/receiptService'
import { getAllPayments } from '../services/paymentService'

const EMPTY = { paymentId: '', receiptNumber: '', amountPaid: '' }

export default function Receipts() {
  const [data, setData]         = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [r, p] = await Promise.all([getAllReceipts(), getAllPayments()])
      setData(r.data || [])
      setPayments(p.data || [])
    } catch { setError('Failed to load receipts.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await createReceipt({ ...form, paymentId: Number(form.paymentId), amountPaid: Number(form.amountPaid) })
      setShowForm(false); setForm(EMPTY); load()
    } catch { alert('Failed to create receipt.') }
    finally { setSaving(false) }
  }

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
    { key: 'paymentDate',   label: 'Payment Date', render: r => r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('en-IN') : '—' },
    { key: 'generatedAt',   label: 'Generated',    render: r => r.generatedAt ? new Date(r.generatedAt).toLocaleString('en-IN') : '—' },
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
        subtitle="View and print payment receipts"
        action={<button className="btn-primary-custom" onClick={() => { setForm(EMPTY); setShowForm(true) }}><i className="bi bi-plus-lg"></i> Generate Receipt</button>}
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

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title="Generate Receipt" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Payment</label>
          <select className="form-control-custom" value={form.paymentId} onChange={set('paymentId')}>
            <option value="">— Select Completed Payment —</option>
            {payments.filter(p => p.paymentStatus === 'Completed').map(p => (
              <option key={p.paymentId} value={p.paymentId}>
                Payment #{p.paymentId} — Order #{p.orderId}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Receipt Number</label>
          <input className="form-control-custom" placeholder="RCP-2026-001" value={form.receiptNumber} onChange={set('receiptNumber')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Amount Paid (₹)</label>
          <input className="form-control-custom" type="number" placeholder="0.00" value={form.amountPaid} onChange={set('amountPaid')} />
        </div>
      </FormModal>
    </div>
  )
}