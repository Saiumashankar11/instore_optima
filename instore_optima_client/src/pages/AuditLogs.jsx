// =============================================================================
// AuditLogs.jsx
// =============================================================================
// Read-only compliance page that surfaces every action recorded by the backend
// audit trail (logins, creates, updates, deletes across all entities).
//
// Features:
//   - Filter by action type (Added, Modified, Deleted, Login, etc.)
//   - Free-text search across user name, entity type, ID, and description
//   - Expandable rows that show the "Before" and "After" field values for
//     any change event
//   - One-click CSV export of the currently visible rows
//
// No create / edit / delete actions are available here — the log is immutable.
// =============================================================================

// React hooks for state management and running side-effects.
import { useEffect, useState } from 'react'
// Shared UI building blocks.
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
// API helpers: getAllAuditLogs fetches the full log; getAllUsers is used to
// resolve numeric userId values into human-readable names and roles.
import { getAllAuditLogs, getAllUsers } from '../services/userService'
// fmtDateTime formats ISO timestamp strings into a locale-aware date+time string.
import { fmtDateTime } from '../utils/validators'

export default function AuditLogs() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [data, setData]       = useState([])          // raw audit log entries from API
  const [users, setUsers]     = useState([])          // user list for resolving userId → name
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')           // free-text search input
  const [actionFilter, setActionFilter] = useState('All')  // dropdown: filter by action type
  // expanded holds the auditLogId of the currently open detail row (or null).
  // Only one row can be expanded at a time; clicking again collapses it.
  const [expanded, setExpanded] = useState(null)

  // ── Data fetching ──────────────────────────────────────────────────────────
  // Fetch audit logs and the full user list in parallel on mount.
  // The user list is needed to display names instead of raw user IDs.
  useEffect(() => {
    Promise.all([getAllAuditLogs(), getAllUsers()])
      .then(([logs, u]) => {
        setData(logs.data || [])
        setUsers(u.data || [])
      })
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false))
  }, [])

  // Helper: look up a user object by their numeric ID (returns undefined if not found).
  const getUser = id => users.find(u => u.userId === id)

  // ── Action styling map ─────────────────────────────────────────────────────
  // Maps each action keyword to a background colour, text colour, and Bootstrap
  // icon class. These are used to render coloured badge chips in the Action column.
  const ACTION_STYLE = {
    Added:    { bg: 'rgba(16,185,129,.12)', color: '#34d399', icon: 'bi-plus-circle' },
    Modified: { bg: 'rgba(8,145,178,.12)',  color: '#22d3ee', icon: 'bi-pencil' },
    Deleted:  { bg: 'rgba(239,68,68,.12)',  color: '#f87171', icon: 'bi-trash' },
    Create:   { bg: 'rgba(16,185,129,.12)', color: '#34d399', icon: 'bi-plus-circle' },
    Update:   { bg: 'rgba(8,145,178,.12)',  color: '#22d3ee', icon: 'bi-pencil' },
    Delete:   { bg: 'rgba(239,68,68,.12)',  color: '#f87171', icon: 'bi-trash' },
    Login:    { bg: 'rgba(139,92,246,.12)', color: '#a78bfa', icon: 'bi-box-arrow-in-right' },
    Register: { bg: 'rgba(245,158,11,.12)', color: '#fbbf24', icon: 'bi-person-plus' },
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  // Two-pass filter: first narrow by the selected action type, then apply the
  // free-text search across multiple fields including the resolved user name.
  const filtered = data
    .filter(d => actionFilter === 'All' || d.action === actionFilter)
    .filter(d =>
      String(d.auditLogId).includes(search) ||
      d.action?.toLowerCase().includes(search.toLowerCase()) ||
      d.entityType?.toLowerCase().includes(search.toLowerCase()) ||
      String(d.entityId).includes(search) ||
      String(d.userId).includes(search) ||
      getUser(d.userId)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase())
    )

  // ── formatValues ───────────────────────────────────────────────────────────
  // The oldValues / newValues fields from the API are JSON strings.
  // This helper tries to parse them and render each key-value pair on its own
  // line. If parsing fails (e.g. the field is plain text), it falls back to
  // rendering the raw string as-is.
  const formatValues = (raw) => {
    if (!raw || raw === '—' || raw === 'N/A') return null
    try {
      const obj = JSON.parse(raw)
      return Object.entries(obj).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 2 }}>
          <span style={{ color: 'var(--text-muted)', minWidth: 110, flexShrink: 0 }}>{k}</span>
          <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{v}</span>
        </div>
      ))
    } catch {
      return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{raw}</span>
    }
  }

  // Build the action-type dropdown options from the actual data so the list
  // always reflects what is in the log rather than a hard-coded enum.
  const uniqueActions = ['All', ...new Set(data.map(d => d.action).filter(Boolean))]

  // ── CSV export ─────────────────────────────────────────────────────────────
  // Builds a CSV string from the currently filtered rows (respecting both the
  // action filter and the search input), creates an in-memory Blob, and
  // triggers a browser download without hitting the server.
  const exportCsv = () => {
    const headers = ['#', 'Timestamp', 'User', 'Role', 'Action', 'Entity', 'Entity ID', 'Description']
    const rows = filtered.map(r => {
      const u = getUser(r.userId)
      return [
        r.auditLogId,
        r.createdAt ? fmtDateTime(r.createdAt) : '',
        u?.name || `User #${r.userId}`,
        u?.role || '',
        r.action || '',
        r.entityType || '',
        r.entityId || '',
        (r.description || '').replace(/,/g, ';'),
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Table column definitions ───────────────────────────────────────────────
  // The custom table below uses these definitions to render headers and cells.
  // The 'details' column conditionally shows a toggle button only when the
  // row has actual before/after data recorded.
  const columns = [
    { key: 'auditLogId', label: '#', render: r => (
      <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>#{r.auditLogId}</span>
    )},
    { key: 'createdAt', label: 'Timestamp', render: r => (
      <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {fmtDateTime(r.createdAt)}
      </span>
    )},
    { key: 'userId', label: 'User', render: r => {
      const u = getUser(r.userId)
      return (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{u?.name || `User #${r.userId}`}</div>
          {u && <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{u.role}</div>}
        </div>
      )
    }},
    { key: 'action', label: 'Action', render: r => {
      const s = ACTION_STYLE[r.action] || { bg: 'rgba(255,255,255,.05)', color: 'var(--text-muted)', icon: 'bi-activity' }
      return (
        <span style={{ background: s.bg, color: s.color, padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <i className={`bi ${s.icon}`}></i> {r.action}
        </span>
      )
    }},
    { key: 'entityType', label: 'Entity', render: r => (
      <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 12 }}>{r.entityType || '—'}</span>
    )},
    { key: 'entityId', label: 'ID', render: r => r.entityId
      ? <span style={{ fontSize: 12, color: 'var(--cyan)' }}>#{r.entityId}</span>
      : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    { key: 'description', label: 'Description', render: r => (
      <span style={{ color: 'var(--text-secondary)', fontSize: 11.5 }}>{r.description || '—'}</span>
    )},
    { key: 'details', label: 'Changes', render: r => {
      const hasChanges = (r.oldValues && r.oldValues !== '—' && r.oldValues !== 'N/A') ||
                         (r.newValues && r.newValues !== '—' && r.newValues !== 'N/A')
      if (!hasChanges) return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
      return (
        <button className="btn-icon" title="View changes"
          onClick={() => setExpanded(expanded === r.auditLogId ? null : r.auditLogId)}>
          <i className={`bi bi-chevron-${expanded === r.auditLogId ? 'up' : 'down'}`}></i>
        </button>
      )
    }},
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable compliance record — every action, who did it, and when"
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            <i className="bi bi-shield-check" style={{ color: 'var(--cyan-light)', marginRight: 6 }}></i>
            All Activity <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <select className="form-control-custom" style={{ width: 140 }}
              value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
              {uniqueActions.map(a => <option key={a}>{a}</option>)}
            </select>
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, entity, action..." />
            <button className="btn-secondary-custom" onClick={exportCsv} title="Export visible rows to CSV">
              <i className="bi bi-download" style={{ marginRight: 5 }}></i>Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner" style={{ padding: 32 }}><span/><span/><span/></div>
        ) : error ? (
          <div style={{ padding: 24, color: 'var(--danger)', textAlign: 'center' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No audit logs found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {columns.map(c => (
                  <th key={c.key} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-header)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <>
                  <tr key={row.auditLogId}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {columns.map(c => (
                      <td key={c.key} style={{ padding: '10px 12px' }}>{c.render(row)}</td>
                    ))}
                  </tr>
                  {/* Expandable detail row: appears directly below the parent row when
                      the user clicks the chevron button. Shows old (Before) and new
                      (After) field values side-by-side in a two-column grid. */}
                  {expanded === row.auditLogId && (
                    <tr key={`exp-${row.auditLogId}`}
                      style={{ background: 'rgba(8,145,178,.04)', borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={columns.length} style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          {row.oldValues && row.oldValues !== '—' && row.oldValues !== 'N/A' && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#f87171', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                <i className="bi bi-dash-circle" style={{ marginRight: 5 }}></i>Before
                              </div>
                              <div style={{ background: 'rgba(239,68,68,.06)', borderRadius: 6, padding: '8px 10px' }}>
                                {formatValues(row.oldValues)}
                              </div>
                            </div>
                          )}
                          {row.newValues && row.newValues !== '—' && row.newValues !== 'N/A' && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#34d399', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                <i className="bi bi-plus-circle" style={{ marginRight: 5 }}></i>After
                              </div>
                              <div style={{ background: 'rgba(16,185,129,.06)', borderRadius: 6, padding: '8px 10px' }}>
                                {formatValues(row.newValues)}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}