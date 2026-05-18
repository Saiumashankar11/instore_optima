import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import ConfirmModal from '../components/shared/ConfirmModal'
import StatusBadge from '../components/shared/StatusBadge'
import { getAllOrders, createOrder, updateOrder, deleteOrder } from '../services/ordersService'
import { useAuth } from '../context/AuthContext'

const EMPTY = { totalAmount: '', status: 'Pending' }

export default function Orders() {
  const { user } = useAuth()
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDel, setShowDel]   = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [delId, setDelId]       = useState(null)

  const load = async () => {
    setLoading(true)
    try { setData((await getAllOrders()).data || []) }
    catch { setError('Failed to load orders.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = row => { setEditing(row); setForm({ totalAmount: row.totalAmount, status: row.status }); setShowForm(true) }
  const openDel  = id  => { setDelId(id); setShowDel(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) await updateOrder(editing.orderId, { ...editing, ...form, totalAmount: Number(form.totalAmount) })
      else await createOrder({ ...form, userId: user?.userId, totalAmount: Number(form.totalAmount) })
      setShowForm(false); load()
    } catch { alert('Save failed.') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try { await deleteOrder(delId); setShowDel(false); load() }
    catch { alert('Delete failed.') }
    finally { setSaving(false) }
  }

  const filtered = data.filter(d =>
    String(d.orderId).includes(search) ||
    d.status?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'orderId',     label: 'Order ID', render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.orderId}</span> },
    { key: 'userId',      label: 'User',     render: r => <span>#{r.userId}</span> },
    { key: 'orderDate',   label: 'Date',     render: r => r.orderDate ? new Date(r.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
    { key: 'totalAmount', label: 'Total',    render: r => <span style={{ fontWeight: 600, color: 'var(--text-200)' }}>₹{Number(r.totalAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'status',      label: 'Status',   render: r => <StatusBadge status={r.status} /> },
    { key: 'items',       label: 'Items',    render: r => (
      <div style={{ fontSize: '0.9em', maxWidth: 250 }}>
        {r.orderItems && r.orderItems.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {r.orderItems.map((item, idx) => (
              <div key={idx} style={{ color: 'var(--text-200)' }}>
                <span style={{ fontWeight: 500 }}>{item.productName}</span>
                <span style={{ color: 'var(--text-300)', marginLeft: 6 }}>×{item.quantity}</span>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ color: 'var(--text-400)', fontStyle: 'italic' }}>No items</span>
        )}
      </div>
    )},
    { key: 'actions',     label: 'Actions',  render: r => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon" onClick={() => openEdit(r)}><i className="bi bi-pencil"></i></button>
        <button className="btn-icon danger" onClick={() => openDel(r.orderId)}><i className="bi bi-trash"></i></button>
      </div>
    )}
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Orders"
        subtitle="Manage customer orders"
        action={<button className="btn-primary-custom" onClick={openAdd}><i className="bi bi-plus-lg"></i> New Order</button>}
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Orders <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID or status..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title={editing ? 'Edit Order' : 'New Order'} loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Total Amount (₹)</label>
          <input className="form-control-custom" type="number" placeholder="0.00" value={form.totalAmount} onChange={set('totalAmount')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Status</label>
          <select className="form-control-custom" value={form.status} onChange={set('status')}>
            <option>Pending</option>
            <option>Processing</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </div>
      </FormModal>

      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Delete Order" message="Delete this order permanently?" confirmLabel="Delete" loading={saving} />
    </div>
  )
}