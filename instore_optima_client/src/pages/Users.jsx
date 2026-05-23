import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import ConfirmModal from '../components/shared/ConfirmModal'
import { getAllUsers, deleteUser } from '../services/userService'
import { useAuth } from '../context/AuthContext'
import { useUndoDelete } from '../hooks/useUndoDelete'

export default function Users() {
  const { isAdmin } = useAuth()
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')
  const [showDel, setShowDel] = useState(false)
  const [delId, setDelId]     = useState(null)
  const [saving, setSaving]   = useState(false)

  const { scheduleDelete, UndoToast } = useUndoDelete()

  const load = async () => {
    setLoading(true)
    try { setData((await getAllUsers()).data || []) }
    catch { setError('Failed to load users.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    const row = data.find(d => d.userId === delId)
    setShowDel(false)
    setData(prev => prev.filter(d => d.userId !== delId))
    scheduleDelete({
      id: delId,
      label: `User "${row?.name || '#' + delId}"`,
      deleteFn: () => deleteUser(delId),      onUndo: () => load(),
    })
  }

  const ROLE_STYLE = {
    Admin:   { bg: 'rgba(139,92,246,.1)',  color: '#a78bfa' },
    Manager: { bg: 'rgba(8,145,178,.1)',   color: '#22d3ee' },
    Staff:   { bg: 'rgba(16,185,129,.1)',  color: '#34d399' },
  }

  const filtered = data.filter(d =>
    String(d.userId).includes(search) ||
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.role?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'userId', label: 'ID',     render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.userId}</span> },
    { key: 'name',   label: 'User',   render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--cyan-muted)', border: '1px solid var(--cyan-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--cyan-light)', flexShrink: 0 }}>
          {r.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-200)', fontSize: 12.5 }}>{r.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-600)' }}>{r.email}</div>
        </div>
      </div>
    )},
    { key: 'role',      label: 'Role',   render: r => {
      const s = ROLE_STYLE[r.role] || { bg: 'rgba(255,255,255,.06)', color: 'var(--text-500)' }
      return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{r.role}</span>
    }},
    { key: 'createdAt', label: 'Joined', render: r => r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
    { key: 'actions',   label: 'Actions', render: r => isAdmin ? (
      <button className="btn-icon danger" onClick={() => { setDelId(r.userId); setShowDel(true) }}>
        <i className="bi bi-trash"></i>
      </button>
    ) : <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span> }
  ]

  return (
    <div className="animate-in">
      <PageHeader title="Users" subtitle="View and manage system users" />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Users <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, role..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Delete User" message="Are you sure you want to delete this user?" confirmLabel="Delete" loading={saving} />
      {UndoToast}
    </div>
  )
}