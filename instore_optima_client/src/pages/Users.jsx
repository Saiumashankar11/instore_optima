// Users.jsx
// Read-only view of all registered system users (Staff, Manager, Admin).
// Admins can deactivate (soft-delete) a user from here.
// There is no "Add User" flow on this page — new accounts are created through the Register page.

import { useEffect, useState } from 'react'
// Shared UI components
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import ConfirmModal from '../components/shared/ConfirmModal'
// API functions for fetching and deleting users
import { getAllUsers, deleteUser } from '../services/userService'
// isAdmin flag tells us whether to show the delete (deactivate) button
import { useAuth } from '../context/AuthContext'
// Utility: format dates and parse API error messages into readable text
import { fmtDate, parseApiError } from '../utils/validators'
// Undo-delete behaviour and toast notifications
import { useUndoDelete } from '../hooks/useUndoDelete'
import { useToast } from '../hooks/useToast'

export default function Users() {
  const { isAdmin } = useAuth()

  // --- Component State ---
  const [data, setData]       = useState([]) // All user records from the API
  const [loading, setLoading] = useState(true)  // True while the fetch is running
  const [error, setError]     = useState('')     // Error message if the fetch fails
  const [search, setSearch]   = useState('')     // Live search-box text
  const [showDel, setShowDel] = useState(false)  // Controls the deactivate confirmation modal
  const [delId, setDelId]     = useState(null)   // ID of the user to be deactivated
  const [saving, setSaving]   = useState(false)  // True while the deactivate API call is in flight

  const { scheduleDelete, UndoToast } = useUndoDelete()
  const { show: toast, ToastContainer } = useToast()

  // Loads the full user list from the API
  const load = async () => {
    setLoading(true)
    try { setData((await getAllUsers()).data || []) }
    catch { setError('Failed to load users.') }
    finally { setLoading(false) }
  }

  // Fetch once on mount
  useEffect(() => { load() }, [])

  // --- Deactivate handler ---
  // Optimistically removes the user from the UI, then schedules the API delete with an undo window.
  const handleDelete = async () => {
    const row = data.find(d => d.userId === delId)
    setShowDel(false)
    // Remove from UI immediately for instant feedback
    setData(prev => prev.filter(d => d.userId !== delId))
    scheduleDelete({
      id: delId,
      label: `User "${row?.name || '#' + delId}"`,
      deleteFn: () => deleteUser(delId),
      onUndo: () => load(), // Restore user list if undo is clicked
      onError: (err) => { toast(parseApiError(err), 'error'); load() },
    })
  }

  // Background and text colour per user role, used when rendering the role pill
  const ROLE_STYLE = {
    Admin:   { bg: 'rgba(139,92,246,.1)',  color: '#a78bfa' },
    Manager: { bg: 'rgba(8,145,178,.1)',   color: '#22d3ee' },
    Staff:   { bg: 'rgba(16,185,129,.1)',  color: '#34d399' },
  }

  // Filter the user list by ID, name, email, or role as the user types
  const filtered = data.filter(d =>
    String(d.userId).includes(search) ||
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.role?.toLowerCase().includes(search.toLowerCase())
  )

  // --- Table column definitions ---
  const columns = [
    { key: 'userId', label: 'ID',     render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.userId}</span> },
    // User column shows an avatar circle with the first initial, plus name and email below
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
      // Look up the colour style for this role, falling back to a neutral style for unknown roles
      const s = ROLE_STYLE[r.role] || { bg: 'rgba(255,255,255,.06)', color: 'var(--text-500)' }
      return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{r.role}</span>
    }},
    { key: 'createdAt', label: 'Joined', render: r => fmtDate(r.createdAt) },
    { key: 'actions',   label: 'Actions', render: r => isAdmin ? (
      <button className="btn-icon danger" aria-label={`Deactivate user #${r.userId}`} title="Deactivate" onClick={() => { setDelId(r.userId); setShowDel(true) }}>
        <i className="bi bi-trash" aria-hidden="true"></i>
      </button>
    ) : <span style={{ color: 'var(--text-700)', fontSize: 12 }}>—</span> }
  ]

  // --- Render ---
  return (
    <div className="animate-in">
      <PageHeader title="Users" subtitle="View and manage system users" />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            {/* Count reflects filtered results */}
            All Users <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, role..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      {/* Deactivate confirmation — warns that the user will be immediately logged out */}
      <ConfirmModal show={showDel} onHide={() => setShowDel(false)} onConfirm={handleDelete}
        title="Deactivate User"
        message="⚠️ This user account will be deactivated (set to Inactive). They will be immediately logged out and blocked from signing in. Proceed?"
        confirmLabel="Deactivate" loading={saving} />
      {UndoToast}
      {ToastContainer}
    </div>
  )
}